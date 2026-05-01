import { Chess } from 'chess.js'
import type { EndgameType } from './types'

type PlayerColor = 'w' | 'b'

type ChessHeaderMap = Record<string, string>

interface CommentEntry {
  fen: string
  comment: string
}

interface VerboseMove {
  color: PlayerColor
  from: string
  to: string
  piece: string
  san: string
  flags: string
  captured?: string
  promotion?: string
}

export interface MoveFrame {
  plyIndex: number
  moveNumber: number
  color: PlayerColor
  san: string
  uci: string
  fenBefore: string
  fenAfter: string
  isCapture: boolean
  isCheck: boolean
  isCastling: boolean
  isPromotion: boolean
  clockSeconds: number | null
  timeSpentSeconds: number | null
}

export interface GameMetadata {
  event: string | null
  site: string | null
  date: string | null
  utcDate: string | null
  utcTime: string | null
  white: string | null
  black: string | null
  result: string | null
  whiteElo: number | null
  blackElo: number | null
  whiteAccuracy: number | null
  blackAccuracy: number | null
  timeControl: string | null
  eco: string | null
  ecoUrl: string | null
  opening: string | null
  termination: string | null
  headers: ChessHeaderMap
  gameUrl?: string | null;
  averageMoveTimeSecondsWhite?: number | null;
averageMoveTimeSecondsBlack?: number | null;
  whiteCastledAtMove?: number | null
  blackCastledAtMove?: number | null
  endgameType?: EndgameType | null
  firstNonBookMoveIndex?: number | null
}

export interface ParsedGame {
  chess: Chess
  frames: MoveFrame[]
  metadata: GameMetadata
}

const parseOptionalNumber = (value?: string) => {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const parseClockToSeconds = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const segments = trimmed.split(':')
  if (segments.length === 1) {
    const seconds = Number(segments[0])
    return Number.isFinite(seconds) ? seconds : null
  }

  const secondsSegment = segments.pop() ?? ''
  const minutesSegment = segments.pop() ?? ''
  const hoursSegment = segments.pop()

  const seconds = Number(secondsSegment)
  const minutes = Number(minutesSegment)
  const hours = hoursSegment ? Number(hoursSegment) : 0

  if (![seconds, minutes, hours].every(Number.isFinite)) {
    return null
  }

  return hours * 3600 + minutes * 60 + seconds
}

const parseClockFromComment = (comment: string) => {
  const match = comment.match(/\[%clk\s+([^\]]+)]/i)
  if (!match) {
    return null
  }

  return parseClockToSeconds(match[1])
}

const parseEcoName = (ecoUrl?: string | null) => {
  if (!ecoUrl) {
    return null
  }

  const lastSegment = ecoUrl.split('/').filter(Boolean).pop()
  if (!lastSegment) {
    return null
  }

  return decodeURIComponent(lastSegment).replace(/-/g, ' ')
}

const readHeader = (headers: ChessHeaderMap, key: string) => headers[key] ?? null

const buildMetadata = (chess: Chess): GameMetadata => {
  const headers = chess.getHeaders() as ChessHeaderMap
  const ecoUrl = headers.ECOUrl ?? headers.ECOURL ?? headers.EcoUrl ?? null
  const opening = headers.Opening ?? parseEcoName(ecoUrl)

  return {
    event: readHeader(headers, 'Event'),
    site: readHeader(headers, 'Site'),
    date: readHeader(headers, 'Date'),
    utcDate: readHeader(headers, 'UTCDate'),
    utcTime: readHeader(headers, 'UTCTime'),
    white: readHeader(headers, 'White'),
    black: readHeader(headers, 'Black'),
    result: readHeader(headers, 'Result'),
    whiteElo: parseOptionalNumber(headers.WhiteElo),
    blackElo: parseOptionalNumber(headers.BlackElo),
    whiteAccuracy: parseOptionalNumber(headers.WhiteAccuracy),
    blackAccuracy: parseOptionalNumber(headers.BlackAccuracy),
    timeControl: readHeader(headers, 'TimeControl'),
    eco: readHeader(headers, 'ECO'),
    ecoUrl,
    opening,
    termination: readHeader(headers, 'Termination'),
    headers,
    // https://www.chess.com/analysis/game/live/168083133804/analysis?move=15
    gameUrl: readHeader(headers, 'Link') ?? null, // can be used to visualise a key moment on chess.com using this syntax
    averageMoveTimeSecondsWhite: null, // This will be computed later
    averageMoveTimeSecondsBlack: null, // This will be computed later
    whiteCastledAtMove: null,
    blackCastledAtMove: null,
    endgameType: null,
    firstNonBookMoveIndex: null,
  }
}

const collectClockByFen = (chess: Chess) => {
  const lookup = new Map<string, number>()
  const getComments = (chess as unknown as { getComments?: () => CommentEntry[] }).getComments

  if (typeof getComments !== 'function') {
    return lookup
  }

  const comments = getComments.call(chess)
  comments.forEach(({ fen, comment }) => {
    const clockSeconds = parseClockFromComment(comment)
    if (clockSeconds !== null) {
      lookup.set(fen, clockSeconds)
    }
  })

  return lookup
}

const computeTimeSpent = (
  color: PlayerColor,
  clockSeconds: number | null,
  lastClockByColor: Record<PlayerColor, number | null>,
) => {
  if (clockSeconds === null) {
    return null
  }

  const previous = lastClockByColor[color]
  lastClockByColor[color] = clockSeconds

  if (previous === null) {
    return null
  }

  return Math.max(previous - clockSeconds, 0)
}

const buildFrames = (chess: Chess) => {
  const headerMap = chess.getHeaders() as ChessHeaderMap
  const startFen = headerMap.FEN
  const replay = startFen ? new Chess(startFen) : new Chess()
  const clockByFen = collectClockByFen(chess)
  const history = chess.history({ verbose: true }) as VerboseMove[]
  const frames: MoveFrame[] = []
  const lastClockByColor: Record<PlayerColor, number | null> = { w: null, b: null }

  history.forEach((move, plyIndex) => {
    const fenBefore = replay.fen()
    const moved = replay.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    })

    if (!moved) {
      throw new Error(`Failed to replay move ${plyIndex + 1}: ${move.san}`)
    }

    const fenAfter = replay.fen()
    const clockSeconds = clockByFen.get(fenAfter) ?? null
    const timeSpentSeconds = computeTimeSpent(move.color, clockSeconds, lastClockByColor)

    frames.push({
      plyIndex,
      moveNumber: Math.floor(plyIndex / 2) + 1,
      color: move.color,
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion ?? ''}`,
      fenBefore,
      fenAfter,
      isCapture: move.flags.includes('c') || move.flags.includes('e'),
      isCheck: move.san.includes('+') || move.san.includes('#'),
      isCastling: move.flags.includes('k') || move.flags.includes('q'),
      isPromotion: move.flags.includes('p') || Boolean(move.promotion),
      clockSeconds,
      timeSpentSeconds,
    })
  })

  return frames
}

export const parseGame = (pgn: string): ParsedGame => {
  const chess = new Chess()
  try {

      chess.loadPgn(pgn, { strict: false })
    } catch (error) {
        console.log("Error parsing PGN:", error)
        
        throw new Error('PGN could not be parsed. Check the input format.')
    }

  return {
    chess,
    frames: buildFrames(chess),
    metadata: buildMetadata(chess),
  }
}
