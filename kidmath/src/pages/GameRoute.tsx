// /game/:gameType 游戏容器路由：根据类型挂载对应游戏
import { Navigate, useParams } from 'react-router-dom'
import { ArithmeticGame } from '../games/arithmetic/ArithmeticGame'
import { ClockGame } from '../games/clock/ClockGame'
import { CompareGame } from '../games/compare/CompareGame'
import { CountingGame } from '../games/counting/CountingGame'
import { PatternsGame } from '../games/patterns/PatternsGame'
import { ShapesGame } from '../games/shapes/ShapesGame'
import type { GameType } from '../types'

const GAME_COMPONENTS: Record<GameType, () => JSX.Element> = {
  counting: CountingGame,
  compare: CompareGame,
  arithmetic: ArithmeticGame,
  shapes: ShapesGame,
  patterns: PatternsGame,
  clock: ClockGame,
}

const VALID: GameType[] = ['counting', 'compare', 'arithmetic', 'shapes', 'patterns', 'clock']

export function GameRoute() {
  const { gameType } = useParams<{ gameType: string }>()
  if (!gameType || !VALID.includes(gameType as GameType)) {
    return <Navigate to="/home" replace />
  }
  const Comp = GAME_COMPONENTS[gameType as GameType]
  return <Comp />
}
