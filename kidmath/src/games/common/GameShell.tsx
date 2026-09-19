// 单回合通用框架：统一进度点、读题、答对延迟进入下一题、结束保存并进入奖励页。
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAME_MAP } from '../../constants/games'
import { db } from '../../lib/db'
import { useApp } from '../../lib/store'
import type { GameType } from '../../types'
import { effectiveLevel } from '../../utils/date'
import { stopTts, playTts } from '../../utils/tts'
import { sfxStar } from '../../utils/sound'
import { questionCount } from '../../constants/games'
import { ParticleLayer, useFeedback } from '../../hooks/useFeedback'
import { usePlayTime } from '../../hooks/usePlayTime'
import { TopBar } from '../../components/TopBar'
import { RestOverlay } from '../../components/RestOverlay'

interface GameShellProps {
  gameType: GameType
  /** 渲染某一题；返回“报告答对”的函数 */
  renderQuestion: (ctx: QuestionContext) => ReactNode
  /** 生成下一题的题干（用于 TTS） */
  speakQuestion: (index: number) => string | null
  /** 是否允许自动朗读题干 */
  autoSpeak?: boolean
}

export interface QuestionContext {
  index: number // 0-based
  total: number
  level: number
  /** 子游戏在判定对错后调用：firstTry=false 表示本题已经错过（重试不计正确率） */
  report: (correct: boolean, x: number, y: number) => void
  feedback: 'idle' | 'correct' | 'wrong'
  questionKey: number // 每次切题自增，供子游戏重新生成
}

export function GameShell({ gameType, renderQuestion, speakQuestion, autoSpeak = true }: GameShellProps) {
  const navigate = useNavigate()
  const current = useApp((s) => s.current)
  const finishRound = useApp((s) => s.finishRound)
  const meta = GAME_MAP[gameType]

  const level = current ? effectiveLevel(current.birthday, current.level_override) : 1
  const total = questionCount(level)

  const [index, setIndex] = useState(0)
  const [questionKey, setQuestionKey] = useState(0)
  const [firstTryWrong, setFirstTryWrong] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const startedAt = useRef(Date.now())
  const ended = useRef(false)

  const fb = useFeedback()
  const timer = usePlayTime(true)

  // speakQuestion 每次渲染都是新闭包，放进 ref，避免答题引发的重渲染重复朗读题干
  const speakRef = useRef(speakQuestion)
  speakRef.current = speakQuestion

  // 进入新题朗读题干（仅在题号变化时触发）
  useEffect(() => {
    stopTts()
    const text = speakRef.current(index)
    if (autoSpeak && text) {
      const t = window.setTimeout(() => {
        void playTts(text)
      }, 250)
      return () => window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questionKey, autoSpeak])

  const finish = useCallback(async () => {
    if (ended.current || !current) return
    ended.current = true
    setSaving(true)
    timer.commit()
    stopTts()
    const correct = total - firstTryWrong.size
    const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
    const result = await db.saveRound({
      profileId: current.id,
      gameType,
      level,
      correct,
      total,
      durationSec,
    })
    if (result.stars_earned > 0) sfxStar()
    finishRound({ result, total, correct, gameName: meta.name })
    navigate('/reward', { replace: true })
  }, [current, firstTryWrong, total, level, gameType, meta.name, finishRound, navigate, timer])

  const report = useCallback(
    (correct: boolean, x: number, y: number) => {
      if (saving) return
      const isRight = fb.answer(correct, x, y)
      if (!isRight) {
        // 答错不惩罚：标记本题“非一次答对”，孩子可继续重试
        if (!firstTryWrong.has(index)) {
          const next = new Set(firstTryWrong)
          next.add(index)
          setFirstTryWrong(next)
        }
        return
      }
      // 答对：约 950ms 后下一题（让粒子/表扬播完，反馈本身在点击当帧 <500ms 出现）
      window.setTimeout(() => {
        fb.reset()
        if (index + 1 >= total) {
          void finish()
        } else {
          setIndex((i) => i + 1)
          setQuestionKey((k) => k + 1)
        }
      }, 950)
    },
    [fb, firstTryWrong, index, total, finish, saving],
  )

  useEffect(() => {
    if (!current) navigate('/', { replace: true })
  }, [current, navigate])

  if (!current) return null

  return (
    <div className="page" style={{ background: `linear-gradient(170deg, #ffffff 0%, ${meta.color}22 100%)` }}>
      <TopBar
        title={meta.name}
        onBack={() => navigate('/home')}
        right={
          <div className="progress-dots" aria-label="进度">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`dot ${i < index ? 'done' : i === index ? 'current' : ''}`}
              />
            ))}
          </div>
        }
      />
      <div className="hint-text" style={{ textAlign: 'center', marginBottom: 4 }}>
        第 {index + 1} / {total} 题 · Level {level}
      </div>

      <div className="center-wrap">
        {renderQuestion({ index, total, level, report, feedback: fb.feedback, questionKey })}
      </div>

      <ParticleLayer particles={fb.particles} />
      {fb.praise && <div className="praise-pop">{fb.praise}</div>}
      {timer.showRest && (
        <RestOverlay
          remainingSec={timer.remainingSec}
          onGoHome={() => {
            timer.commit()
            navigate('/home', { replace: true })
          }}
        />
      )}
    </div>
  )
}
