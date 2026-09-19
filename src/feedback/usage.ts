import { api } from "../tauri/api";
import type { UsageStatus } from "../types";

// 单例计时器：前台（首页 + 游戏内）按秒累计，每隔 20 秒向后端心跳落库；
// 到限时通知监听者弹出“该休息啦”。切换档案或进入家长面板会停止计时。
type Listener = (s: UsageStatus) => void;

const FLUSH_INTERVAL = 20; // 秒

class UsageController {
  private profileId: number | null = null;
  private status: UsageStatus | null = null;
  private listeners = new Set<Listener>();
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private pending = 0;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    if (this.status) fn(this.status);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(): void {
    const s = this.status;
    if (s) this.listeners.forEach((fn) => fn(s));
  }

  async start(profileId: number): Promise<void> {
    if (this.profileId === profileId && this.tickHandle) return;
    await this.stop();
    this.profileId = profileId;
    try {
      this.status = await api.getUsage(profileId);
    } catch {
      this.status = null;
    }
    this.pending = 0;
    this.emit();
    if (this.status?.limitReached) return;
    this.tickHandle = setInterval(() => void this.tick(), 1000);
  }

  private async tick(): Promise<void> {
    if (!this.status || this.profileId == null) return;
    const reached = this.status.remainingSeconds - 1 <= 0;
    this.status = {
      ...this.status,
      usedSeconds: this.status.usedSeconds + 1,
      remainingSeconds: Math.max(0, this.status.remainingSeconds - 1),
      limitReached: reached,
    };
    this.pending += 1;
    if (reached) {
      // 到限：最后落库一次并停止计时（监听者负责弹出休息动画）。
      if (this.tickHandle) {
        clearInterval(this.tickHandle);
        this.tickHandle = null;
      }
      await this.flush();
    } else if (this.pending >= FLUSH_INTERVAL) {
      await this.flush();
    } else {
      this.emit();
    }
  }

  async flush(): Promise<void> {
    if (this.profileId == null || this.pending <= 0) return;
    const seconds = this.pending;
    this.pending = 0;
    try {
      this.status = await api.addUsage(this.profileId, seconds);
      this.emit();
    } catch {
      // 落库失败时把秒数还回，稍后重试。
      this.pending += seconds;
    }
  }

  async stop(): Promise<void> {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    await this.flush();
  }

  /** 立即与后端同步（用于奖励页等需要准确值的场景）。 */
  async refresh(profileId?: number): Promise<UsageStatus | null> {
    const id = profileId ?? this.profileId;
    if (id == null) return null;
    await this.flush();
    this.status = await api.getUsage(id);
    if (this.profileId === id) this.emit();
    return this.status;
  }

  get current(): UsageStatus | null {
    return this.status;
  }
}

export const usageController = new UsageController();
