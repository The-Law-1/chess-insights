import { Chess } from 'chess.js'
import type { EndgameType } from './types'
import ecoData from '../assets/eco_data.json'

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

interface EcoEntry {
  code: string
  name: string
  move_sequences: string
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
  gameUrl?: string | null
  averageMoveTimeSecondsWhite?: number | null
  averageMoveTimeSecondsBlack?: number | null
  whiteCastledAtMove?: number | null
  blackCastledAtMove?: number | null
  endgameType?: EndgameType | null
  firstNonBookMoveIndex?: number | null
  deviatedFromBookMove?: {
    plyIndex: number
    moveNumber: number
    color: PlayerColor
    played: string
    expected: string | null
  } | null
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

const average = (values: number[]) => {
  if (!values.length) {
    return null
  }

  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

const findCastlingMoveNumber = (frames: MoveFrame[], color: PlayerColor) => {
  const castlingMove = frames.find((frame) => frame.color === color && frame.isCastling)
  return castlingMove ? castlingMove.moveNumber : null
}

const buildEndgameType = (chess: Chess): EndgameType | null => {
  const board = chess.board()
  const counts = {
    w: { q: 0, b: 0, n: 0, r: 0, p: 0, bl: 0, bd: 0 },
    b: { q: 0, b: 0, n: 0, r: 0, p: 0, bl: 0, bd: 0 },
  }

  board.forEach((rank, rankIndex) => {
    rank.forEach((piece, fileIndex) => {
      if (!piece) {
        return
      }

      if (piece.type === 'k') {
        return
      }

      const isDarkSquare = (fileIndex + 1 + (8 - rankIndex)) % 2 === 0
      const target = counts[piece.color]

      if (piece.type === 'q') {
        target.q += 1
      } else if (piece.type === 'b') {
        target.b += 1
        if (isDarkSquare) {
          target.bd += 1
        } else {
          target.bl += 1
        }
      } else if (piece.type === 'n') {
        target.n += 1
      } else if (piece.type === 'r') {
        target.r += 1
      } else if (piece.type === 'p') {
        target.p += 1
      }
    })
  })

  const nonPawnTotal = counts.w.q + counts.w.b + counts.w.n + counts.w.r +
    counts.b.q + counts.b.b + counts.b.n + counts.b.r
  if (nonPawnTotal > 4) {
    return null
  }

  const buildMaterial = (count: typeof counts.w) =>
    `K${'Q'.repeat(count.q)}${'B'.repeat(count.b)}${'N'.repeat(count.n)}${
      'R'.repeat(count.r)
    }${'P'.repeat(count.p)}`

  const base = `${buildMaterial(counts.w)}${buildMaterial(counts.b)}`
  const bishopTotal = counts.w.b + counts.b.b
  const bishopSignature =
    bishopTotal >= 2 ? `${counts.w.bl}${counts.w.bd}${counts.b.bl}${counts.b.bd}` : null
  const castlingRights = chess.fen().split(' ')[2]
  const castlingSignature = castlingRights !== '-' ? castlingRights : null

  if (bishopSignature && castlingSignature) {
    return `${base}_${bishopSignature}_${castlingSignature}` as EndgameType
  }

  if (bishopSignature) {
    return `${base}_${bishopSignature}` as EndgameType
  }

  if (castlingSignature) {
    return `${base}_${castlingSignature}` as EndgameType
  }

  return base as EndgameType
}

const normalizeSan = (san: string) =>
  san
    .replace(/0-0-0/g, 'O-O-O')
    .replace(/0-0/g, 'O-O')
    .replace(/[+#]/g, '')
    .replace(/[!?]+/g, '')
    .trim()

const parseEcoMoves = (sequence: string) =>
  sequence
    .split(/\s+/)
    .filter((token) => token && !/^\d+\.?$/.test(token))
    .map((token) => normalizeSan(token))

const findEcoEntry = (ecoCode: string | null) => {
  if (!ecoCode) {
    return null
  }

  return (ecoData as EcoEntry[]).find((entry) => entry.code === ecoCode) ?? null
}

const detectBookDeviation = (frames: MoveFrame[], ecoEntry: EcoEntry | null) => {
  if (!ecoEntry) {
    return { firstNonBookMoveIndex: null, deviatedFromBookMove: null }
  }

  const expectedMoves = parseEcoMoves(ecoEntry.move_sequences)
  const maxCompare = Math.min(expectedMoves.length, frames.length)

  for (let plyIndex = 0; plyIndex < maxCompare; plyIndex += 1) {
    const expected = expectedMoves[plyIndex]
    const played = normalizeSan(frames[plyIndex].san)

    if (expected !== played) {
      const frame = frames[plyIndex]
      return {
        firstNonBookMoveIndex: plyIndex,
        deviatedFromBookMove: {
          plyIndex,
          moveNumber: frame.moveNumber,
          color: frame.color,
          played: frame.san,
          expected,
        },
      }
    }
  }

  if (frames.length > expectedMoves.length) {
    const frame = frames[expectedMoves.length]
    return {
      firstNonBookMoveIndex: expectedMoves.length,
      deviatedFromBookMove: frame
        ? {
            plyIndex: expectedMoves.length,
            moveNumber: frame.moveNumber,
            color: frame.color,
            played: frame.san,
            expected: null,
          }
        : null,
    }
  }

  return { firstNonBookMoveIndex: null, deviatedFromBookMove: null }
}

const buildMetadata = (chess: Chess, frames: MoveFrame[]): GameMetadata => {
  const headers = chess.getHeaders() as ChessHeaderMap
  const ecoUrl = headers.ECOUrl ?? headers.ECOURL ?? headers.EcoUrl ?? null
  const eco = readHeader(headers, 'ECO')
  const ecoEntry = findEcoEntry(eco)
  const opening = headers.Opening ?? ecoEntry?.name ?? parseEcoName(ecoUrl)
  const whiteTimes = frames
    .filter((frame) => frame.color === 'w' && frame.timeSpentSeconds !== null)
    .map((frame) => frame.timeSpentSeconds as number)
  const blackTimes = frames
    .filter((frame) => frame.color === 'b' && frame.timeSpentSeconds !== null)
    .map((frame) => frame.timeSpentSeconds as number)

  const deviation = detectBookDeviation(frames, ecoEntry)

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
    eco,
    ecoUrl,
    opening,
    termination: readHeader(headers, 'Termination'),
    headers,
    // https://www.chess.com/analysis/game/live/168083133804/analysis?move=15
    gameUrl: readHeader(headers, 'Link') ?? null, // can be used to visualise a key moment on chess.com using this syntax
    averageMoveTimeSecondsWhite: average(whiteTimes),
    averageMoveTimeSecondsBlack: average(blackTimes),
    whiteCastledAtMove: findCastlingMoveNumber(frames, 'w'),
    blackCastledAtMove: findCastlingMoveNumber(frames, 'b'),
    endgameType: buildEndgameType(chess),
    firstNonBookMoveIndex: deviation.firstNonBookMoveIndex,
    deviatedFromBookMove: deviation.deviatedFromBookMove,
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
    console.log('Error parsing PGN:', error)

    throw new Error('PGN could not be parsed. Check the input format.')
  }

  const frames = buildFrames(chess)

  return {
    chess,
    frames,
    metadata: buildMetadata(chess, frames),
  }
}
