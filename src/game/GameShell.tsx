import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GAMES, ageFromBirthday, effectiveLevel, questionCountForLevel } from "../game/catalog";
import { makeQuestion, type GameQuestion } from "../game/generators";
import { useAppStore, useSessionStore } from "../store/sessionStore";
import { triggerFeedback } from "../feedback";
import { readQuestion, stopSpeaking } from "../feedback/tts";
import { playSound } from "../feedback/sound";
import { usageController } from "../feedback/usage";
import { api } from "../tauri/api";
import type { GameType } from "../types";

interface GameShellProps {
  // 渲染单题；返回是否答对，以及题面朗读文本。
  renderQuestion: (ctx: QuestionContext) => React.ReactNode;
  /** 生成题面朗读文本（可选）。 */
  questionSpeech?: (q: GameQuestion) => string;
}

export interface QuestionContext {
  question: GameQuestion;
  index: number;
  total: number;
  /** 提交一次作答：true 表示答对（外壳负责反馈与推进）。 */
  submit: (correct: boolean, sourceEl?: Element | null) => void;
  locked: boolean;
}

export function GameShell({ renderQuestion, questionSpeech }: GameShellProps) {
  const navigate = useNavigate();
  const { gameType } = useParams();
  const type = gameType as GameType;
  const meta = GAMES[type];

  const current = useAppStore((s) => s.current);
  const setSession = useSessionStore((s) => s.setSession);

  // 每个游戏类型按“当前玩家有效等级”进行，家长覆盖优先，否则按年龄自动推算。
  const level = useMemo(() => {
    if (!current) return 1;
    return effectiveLevel(
      current.levelOverride,
      Math.max(3, ageFromBirthday(current.birthday))
    );
  }, [current]);

  const total = questionCountForLevel(level);
  const [questions] = useState<GameQuestion[]>(() =>
    Array.from({ length: total }, () => makeQuestion(type, level))
  );
  const [index, setIndex] = useState(0);
  const correctCount = useRef(0);
  const firstTryCorrect = useRef<boolean[]>([]);
  const [locked, setLocked] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedRef = useRef(false);
  const [ending, setEnding] = useState(false);

  const question = questions[index];

  // 朗读题面（Web Speech 不可用时静默降级）。
  useEffect(() => {
    stopSpeaking();
    if (questionSpeech && question) {
      const t = questionSpeech(question);
      const id = window.setTimeout(() => readQuestion(t), 250);
      return () => window.clearTimeout(id);
    }
  }, [index, question, questionSpeech]);

  const finishRound = useCallback(
    async (destination: "/reward" | "/home" = "/reward") => {
      if (!current || savedRef.current) return;
      savedRef.current = true;
      setSaved(true);
      setEnding(true);
      stopSpeaking();
      try {
        const result = await api.recordGame({
          profileId: current.id,
          gameType: type,
          level,
          correct: correctCount.current,
          total,
        });
        await useAppStore.getState().refreshCurrent();
        setSession({
          gameType: type,
          level,
          result,
        });
        await usageController.flush();
        navigate(destination, { replace: true });
      } catch (e) {
        savedRef.current = false;
        setSaved(false);
        setEnding(false);
        console.error(e);
        alert("保存进度时出了点小问题，请重试");
      }
    },
    [current, level, navigate, setSession, total, type]
  );

  const submit = useCallback(
    (correct: boolean, sourceEl?: Element | null) => {
      if (locked || ending) return;
      if (correct) {
        triggerFeedback("correct", sourceEl);
        if (!firstTryCorrect.current[index]) {
          firstTryCorrect.current[index] = true;
          correctCount.current += 1;
        }
        setLocked(true);
        window.setTimeout(() => {
          if (index + 1 >= total) {
            void finishRound();
          } else {
            setIndex((i) => i + 1);
            setLocked(false);
          }
        }, 650);
      } else {
        // 答错：温和反馈，可重试、不计惩罚、不推进。
        triggerFeedback("wrong", sourceEl);
      }
    },
    [locked, ending, index, total, finishRound]
  );

  // 每日时长到限：保存当前（可能不完整的）进度，回首页触发“该休息啦”动画。
  useEffect(() => {
    const unsub = usageController.subscribe((s) => {
      if (s.limitReached && !savedRef.current) {
        void finishRound("/home");
      }
    });
    return unsub;
  }, [finishRound]);

  if (!current) return null;

  return (
    <div className="app-screen">
      <header className="topbar">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            playSound("click");
            stopSpeaking();
            if (correctCount.current > 0 && !savedRef.current) {
              void finishRound("/home");
            } else {
              navigate("/home");
            }
          }}
        >
          🏠 回家
        </button>
        <div className="grow" style={{ maxWidth: 420 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <strong style={{ fontSize: 22 }}>
              {meta.emoji} {meta.name}
            </strong>
            <span className="muted" style={{ fontSize: 18 }}>
              第 {index + 1} / {total} 题 · Level {level}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(index / total) * 100}%` }}
            />
          </div>
        </div>
        <button
          className="pill"
          title="再听一次题目"
          onClick={() => {
            playSound("click");
            if (questionSpeech && question) readQuestion(questionSpeech(question));
          }}
        >
          🔁 听题
        </button>
      </header>

      <div className="content center" style={{ paddingTop: 8 }}>
        {question &&
          renderQuestion({
            question,
            index,
            total,
            submit,
            locked,
          })}
      </div>

      {saved && (
        <div className="overlay">
          <div className="card center" style={{ gap: 12, textAlign: "center" }}>
            <div className="float" style={{ fontSize: 80 }}>
              🌟
            </div>
            <h2 style={{ fontSize: 30 }}>正在保存你的小星星…</h2>
          </div>
        </div>
      )}
    </div>
  );
}
