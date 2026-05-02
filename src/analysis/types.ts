import type { KeyReason } from '../pgn/extractKeyPositions'
import type { MoveFrame, GameMetadata } from '../pgn/parseGame'
import type { EndgameType } from '../pgn/types'

export type PlayerSide = 'white' | 'black'

export type PlayerResult = 'win' | 'loss' | 'draw'

export interface EvaluatedPosition {
  plyIndex: number
  fen: string
  reasons: KeyReason[]
  evalBefore: number
  evalAfter: number
  swing: number
  bestMove: string
  actualMove: string
  wasBestMove: boolean
}

export interface Blunder {
  plyIndex: number
  moveNumber: number
  color: MoveFrame['color']
  san: string
  swing: number
  fenBefore: string
  bestMove: string
  timeSpentSeconds: number | null
}

export interface PhaseBlunderCounts {
  opening: number
  middlegame: number
  endgame: number
}

export interface TimeProfile {
  averageSecondsPerMove: number
  averageSecondsOpening: number
  averageSecondsMiddlegame: number
  averageSecondsEndgame: number
  movesBelowThirtySeconds: number
  longestThinkPly: number | null
  longestThinkSeconds: number | null
}

export interface PieceActivityEntry {
  type: 'P' | 'N' | 'B' | 'R' | 'Q' | 'K'
  color: MoveFrame['color']
  uniqueSquares: string[]
  moveCount: number
}

// Keyed by piece identifier, e.g. "wN_g1".
export type PieceActivityMap = Record<string, PieceActivityEntry>

export interface AnalysedGame {
  uuid: string
  url: string
  endTime: number
  date: string | null
  timeClass: string
  timeControl: string

  playerColor: PlayerSide
  playerRating: number
  opponentRating: number
  result: PlayerResult

  eco: {
    code: string | null
    name: string | null
    url: string | null
  }
  openingName: string | null
  openingDeviationPly: number | null

  playerAccuracy: number | null
  opponentAccuracy: number | null

  frames: MoveFrame[]
  metadata: GameMetadata
  keyPositions: EvaluatedPosition[]

  blunders: Blunder[]
  phaseBlunderCounts: PhaseBlunderCounts
  timeProfile: TimeProfile
  pieceActivity: PieceActivityMap
  playerCastledAtMove: number | null
  opponentCastledAtMove: number | null
  endgameType: EndgameType | null
  totalMoves: number
}
