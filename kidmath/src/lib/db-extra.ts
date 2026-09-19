// 家长专用命令（需要 PIN 校验）单独放在这里
import { invoke } from '@tauri-apps/api/core'
import type { Profile } from '../types'
import { browserBackend, isTauri } from './db'

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) return invoke<T>(cmd, args)
  return browserBackend.call<T>(cmd, args)
}

/** 家长手动调整难度：level 为 1-5，或传 null 恢复“按年龄自动” */
export function setProfileLevelOverride(
  pin: string,
  profileId: number,
  level: number | null,
): Promise<Profile> {
  return call<Profile>('set_level_override', { pin, profileId, level })
}

export function resetProgress(pin: string, profileId: number) {
  return call<Profile>('reset_progress', { pin, profileId })
}
