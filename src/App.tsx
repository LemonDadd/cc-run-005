import { useCallback, useEffect, useRef, useState } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAppStore } from "./store/appStore";
import { preloadSounds } from "./feedback/sound";
import { usageController } from "./feedback/usage";
import { FeedbackToast } from "./components/FeedbackToast";
import { Loading } from "./components/Loading";
import { RestOverlay } from "./components/RestOverlay";
import { PlayerSelect } from "./pages/PlayerSelect";
import { ProfileForm } from "./pages/ProfileForm";
import { Home } from "./pages/Home";
import { GameContainer } from "./game/GameContainer";
import { Reward } from "./pages/Reward";
import { Gallery } from "./pages/Gallery";
import { ParentPanel } from "./pages/ParentPanel";
import type { UsageStatus } from "./types";

// 监听每日时长，到点统一跳转首页并弹出休息动画（游戏页先自行保存进度）。
function TimeGuard({ onLimit }: { onLimit: (s: UsageStatus) => void }) {
  const location = useLocation();
  const firedRef = useRef(false);

  useEffect(() => {
    const unsub = usageController.subscribe((s) => {
      if (s.limitReached && !firedRef.current) {
        firedRef.current = true;
        onLimit(s);
      }
      if (!s.limitReached) firedRef.current = false;
    });
    return unsub;
  }, [onLimit]);

  // 玩家选择/家长面板不计入游玩计时。
  useEffect(() => {
    const path = location.pathname;
    if (path === "/" || path.startsWith("/parent")) {
      void usageController.stop();
    }
  }, [location.pathname]);

  return null;
}

function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { booted, current } = useAppStore();
  const [rest, setRest] = useState<UsageStatus | null>(null);

  // 当前玩家存在且不在玩家选择/家长面板时开始计时。
  useEffect(() => {
    if (!booted || !current) return;
    const path = location.pathname;
    if (path === "/" || path.startsWith("/parent")) return;
    void usageController.start(current.id);
    return () => {
      // 切到本 effect 不再覆盖的路径时由 TimeGuard / 切换档案负责停止。
    };
  }, [booted, current?.id, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换到不同玩家或退出时复位休息遮罩。
  useEffect(() => {
    setRest(null);
  }, [current?.id, location.pathname]);

  const handleLimit = useCallback(
    (s: UsageStatus) => {
      setRest(s);
      navigate("/home");
    },
    [navigate]
  );

  if (!booted) {
    return (
      <div className="app-screen">
        <Loading label="正在准备好玩的游戏…" />
      </div>
    );
  }

  return (
    <div className="app-screen">
      <TimeGuard onLimit={handleLimit} />
      <Routes>
        <Route path="/" element={<PlayerSelect />} />
        <Route path="/profile/new" element={<ProfileForm mode="create" />} />
        <Route path="/profile/:id/edit" element={<ProfileForm mode="edit" />} />
        <Route
          path="/home"
          element={current ? <Home /> : <Navigate to="/" replace />}
        />
        <Route
          path="/game/:gameType"
          element={current ? <GameContainer /> : <Navigate to="/" replace />}
        />
        <Route
          path="/reward"
          element={current ? <Reward /> : <Navigate to="/" replace />}
        />
        <Route
          path="/gallery"
          element={current ? <Gallery /> : <Navigate to="/" replace />}
        />
        <Route path="/parent/*" element={<ParentPanel />} />
        <Route path="*" element={<Navigate to={current ? "/home" : "/"} replace />} />
      </Routes>

      <FeedbackToast />
      {rest && (
        <RestOverlay
          usedMinutes={rest.usedSeconds / 60}
          onGoHome={() => setRest(null)}
        />
      )}
    </div>
  );
}

export function App() {
  const boot = useAppStore((s) => s.boot);

  useEffect(() => {
    preloadSounds();
    void boot();
  }, [boot]);

  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
