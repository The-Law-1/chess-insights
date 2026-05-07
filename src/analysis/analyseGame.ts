import type { RawGame } from '../games/chessCom'
import StockfishWorker from '../engine/StockfishWorker'
import { extractKeyPositions } from '../pgn/extractKeyPositions'
import { parseGame } from '../pgn/parseGame'
import type { EndgameType } from '../pgn/types'
import type {
  AnalysedGame,
  Blunder,
  EvaluatedPosition,
  PhaseBlunderCounts,
  PieceActivityEntry,
  PieceActivityMap,
  PlayerResult,
  PlayerSide,
  TimeProfile,
} from './types'

const ANALYSIS_DEPTH = 6
const BLUNDER_THRESHOLD = -150

const ENDGAME_TYPE_RE = /^K([QBNRP]*)K([QBNRP]*)(?:_(\d{4}))?(?:_([KQkq]+))?$/

const swapCase = (s: string) =>
  s.replace(/[a-zA-Z]/g, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))

const normalizeEndgameType = (type: EndgameType, playerColor: PlayerSide): EndgameType => {
  if (playerColor === 'white') {
    return type
  }

  const match = type.match(ENDGAME_TYPE_RE)
  if (!match) {
    return type
  }

  const [, wMat, bMat, bishopSig, castlingSig] = match

  const swappedBishopSig = bishopSig ? bishopSig.slice(2) + bishopSig.slice(0, 2) : undefined
  const swappedCastlingSig = castlingSig ? swapCase(castlingSig) : undefined

  let result = `K${bMat}K${wMat}`
  if (swappedBishopSig) {
    result += `_${swappedBishopSig}`
  }
  if (swappedCastlingSig) {
    result += `_${swappedCastlingSig}`
  }

  return result as EndgameType
}

const DRAW_RESULTS = new Set([
  'draw',
  'stalemate',
  'repetition',
  'agreed',
  'insufficient',
  'timevsinsufficient',
  '50move',
  'abandoned',
])

const normalizeUsername = (value: string) => value.trim().toLowerCase()

const getPlayerColor = (raw: RawGame, username: string): PlayerSide => {
  const target = normalizeUsername(username)
  if (normalizeUsername(raw.white.username) === target) {
    return 'white'
  }
  if (normalizeUsername(raw.black.username) === target) {
    return 'black'
  }
  return 'white'
}

const toPlayerResult = (result: string | undefined): PlayerResult => {
  if (!result) {
    return 'draw'
  }
  const normalized = result.toLowerCase()
  if (normalized === 'win') {
    return 'win'
  }
  if (DRAW_RESULTS.has(normalized)) {
    return 'draw'
  }
  return 'loss'
}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0

const normalizeEvaluation = (score: number, fen: string, playerColor: PlayerSide) => {
  const sideToMove = fen.split(' ')[1]
  const playerSide = playerColor === 'white' ? 'w' : 'b'
  return sideToMove === playerSide ? score : -score
}

type PieceMeta = { type: PieceActivityEntry['type']; color: PieceActivityEntry['color'] }

type ActivityEntry = PieceActivityEntry & { squares: Set<string> }

type PieceMaps = {
  squareToId: Map<string, string>
  idMeta: Map<string, PieceMeta>
}

const parseFenBoard = (fen: string) => {
  const board = new Map<string, PieceMeta>()
  const [placement] = fen.split(' ')
  const ranks = placement.split('/')
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  ranks.forEach((rank, rankIndex) => {
    let fileIndex = 0
    for (const char of rank) {
      if (char >= '1' && char <= '8') {
        fileIndex += Number(char)
        continue
      }

      const file = files[fileIndex]
      const rankNumber = 8 - rankIndex
      const square = `${file}${rankNumber}`
      const isUpper = char === char.toUpperCase()
      const type = char.toUpperCase() as PieceActivityEntry['type']
      const color = isUpper ? 'w' : 'b'

      board.set(square, { type, color })
      fileIndex += 1
    }
  })

  return board
}

const buildInitialPieceMaps = (fen: string): PieceMaps => {
  const squareToId = new Map<string, string>()
  const idMeta = new Map<string, PieceMeta>()
  const board = parseFenBoard(fen)

  board.forEach((piece, square) => {
    const id = `${piece.color}${piece.type}_${square}`
    squareToId.set(square, id)
    idMeta.set(id, piece)
  })

  return { squareToId, idMeta }
}

const resolvePieceId = (
  maps: PieceMaps,
  fen: string,
  square: string,
): { id: string | null; meta: PieceMeta | null } => {
  const existing = maps.squareToId.get(square)
  if (existing) {
    return { id: existing, meta: maps.idMeta.get(existing) ?? null }
  }

  const board = parseFenBoard(fen)
  const piece = board.get(square)
  if (!piece) {
    return { id: null, meta: null }
  }

  const id = `${piece.color}${piece.type}_${square}`
  maps.squareToId.set(square, id)
  maps.idMeta.set(id, piece)
  return { id, meta: piece }
}

const applyCapture = (maps: PieceMaps, from: string, to: string, isPawn: boolean) => {
  if (maps.squareToId.has(to)) {
    maps.squareToId.delete(to)
    return
  }

  if (isPawn && from[0] !== to[0]) {
    const captureSquare = `${to[0]}${from[1]}`
    maps.squareToId.delete(captureSquare)
  }
}

const buildPieceActivity = (frames: ReturnType<typeof parseGame>['frames']): PieceActivityMap => {
  if (!frames.length) {
    return {}
  }

  const activity = new Map<string, ActivityEntry>()
  const maps = buildInitialPieceMaps(frames[0].fenBefore)

  const ensureEntry = (id: string, meta: PieceMeta) => {
    const existing = activity.get(id)
    if (existing) {
      return existing
    }

    const entry: ActivityEntry = {
      type: meta.type,
      color: meta.color,
      uniqueSquares: [],
      moveCount: 0,
      firstMovedAtMove: null,
      squares: new Set<string>(),
    }
    activity.set(id, entry)
    return entry
  }

  const recordMove = (fen: string, from: string, to: string, moveNumber: number) => {
    const resolved = resolvePieceId(maps, fen, from)
    if (!resolved.id || !resolved.meta) {
      return
    }

    const entry = ensureEntry(resolved.id, resolved.meta)
    if (entry.firstMovedAtMove === null) {
      entry.firstMovedAtMove = moveNumber
    }
    entry.moveCount += 1
    entry.squares.add(from)
    entry.squares.add(to)

    maps.squareToId.delete(from)
    maps.squareToId.set(to, resolved.id)
  }

  frames.forEach((frame) => {
    const from = frame.uci.slice(0, 2)
    const to = frame.uci.slice(2, 4)

    if (frame.isCapture) {
      const piece = resolvePieceId(maps, frame.fenBefore, from)
      const isPawn = piece.meta?.type === 'P'
      applyCapture(maps, from, to, Boolean(isPawn))
    }

    recordMove(frame.fenBefore, from, to, frame.moveNumber)

    if (frame.isCastling) {
      const isKingSide = to[0] === 'g'
      const isWhite = from[1] === '1'
      const rookFrom = isKingSide ? (isWhite ? 'h1' : 'h8') : isWhite ? 'a1' : 'a8'
      const rookTo = isKingSide ? (isWhite ? 'f1' : 'f8') : isWhite ? 'd1' : 'd8'
      recordMove(frame.fenBefore, rookFrom, rookTo, frame.moveNumber)
    }
  })

  const result: PieceActivityMap = {}
  activity.forEach((entry, id) => {
    result[id] = {
      type: entry.type,
      color: entry.color,
      uniqueSquares: Array.from(entry.squares),
      moveCount: entry.moveCount,
      firstMovedAtMove: entry.firstMovedAtMove,
    }
  })

  return result
}

const buildTimeProfile = (frames: ReturnType<typeof parseGame>['frames'], playerSide: 'w' | 'b'): TimeProfile => {
  const playerFrames = frames.filter((frame) => frame.color === playerSide)
  const withTime = playerFrames.filter((frame) => frame.timeSpentSeconds !== null)

  const allTimes = withTime.map((frame) => frame.timeSpentSeconds ?? 0)
  const openingTimes = withTime
    .filter((frame) => frame.moveNumber <= 10)
    .map((frame) => frame.timeSpentSeconds ?? 0)
  const middlegameTimes = withTime
    .filter((frame) => frame.moveNumber >= 11 && frame.moveNumber <= 30)
    .map((frame) => frame.timeSpentSeconds ?? 0)
  const endgameTimes = withTime
    .filter((frame) => frame.moveNumber >= 31)
    .map((frame) => frame.timeSpentSeconds ?? 0)

  let longestThinkPly: number | null = null
  let longestThinkSeconds: number | null = null
  withTime.forEach((frame) => {
    if (frame.timeSpentSeconds === null) {
      return
    }
    if (longestThinkSeconds === null || frame.timeSpentSeconds > longestThinkSeconds) {
      longestThinkSeconds = frame.timeSpentSeconds
      longestThinkPly = frame.plyIndex
    }
  })

  return {
    averageSecondsPerMove: average(allTimes),
    averageSecondsOpening: average(openingTimes),
    averageSecondsMiddlegame: average(middlegameTimes),
    averageSecondsEndgame: average(endgameTimes),
    movesBelowThirtySeconds: playerFrames.filter(
      (frame) => frame.timeSpentSeconds !== null && frame.timeSpentSeconds < 30,
    ).length,
    longestThinkPly,
    longestThinkSeconds,
  }
}

const buildPhaseBlunderCounts = (blunders: Blunder[]): PhaseBlunderCounts => {
  const counts = { opening: 0, middlegame: 0, endgame: 0 }
  blunders.forEach((blunder) => {
    if (blunder.moveNumber <= 10) {
      counts.opening += 1
    } else if (blunder.moveNumber <= 30) {
      counts.middlegame += 1
    } else {
      counts.endgame += 1
    }
  })
  return counts
}

export const analyseGame = async (
  raw: RawGame,
  username: string,
  worker: StockfishWorker,
): Promise<AnalysedGame> => {
  const parsed = parseGame(raw.pgn)
  const playerColor = getPlayerColor(raw, username)
  const playerSide = playerColor === 'white' ? 'w' : 'b'
  const opponentSide = playerSide === 'w' ? 'b' : 'w'
  const keyPositions = extractKeyPositions(parsed.frames, {
    startPlyIndex: parsed.metadata.firstNonBookMoveIndex,
  })

  const evaluated: EvaluatedPosition[] = []

  for (const position of keyPositions) {
    const frame = parsed.frames[position.plyIndex]
    const evalBeforeRaw = await worker.evaluate(frame.fenBefore, ANALYSIS_DEPTH)
    const evalAfterRaw = await worker.evaluate(frame.fenAfter, ANALYSIS_DEPTH)
    const bestMove = await worker.getBestMove(frame.fenBefore, ANALYSIS_DEPTH)

    const evalBefore = normalizeEvaluation(evalBeforeRaw, frame.fenBefore, playerColor)
    const evalAfter = normalizeEvaluation(evalAfterRaw, frame.fenAfter, playerColor)

    evaluated.push({
      plyIndex: position.plyIndex,
      fen: position.fen,
      reasons: position.reasons,
      evalBefore,
      evalAfter,
      swing: evalAfter - evalBefore,
      bestMove,
      actualMove: frame.uci,
      wasBestMove: bestMove !== '' && bestMove === frame.uci,
    })
  }

  const blunders: Blunder[] = evaluated
    .filter((position) => {
      const frame = parsed.frames[position.plyIndex]
      return frame.color === playerSide && position.swing <= BLUNDER_THRESHOLD
    })
    .map((position) => {
      const frame = parsed.frames[position.plyIndex]
      return {
        plyIndex: position.plyIndex,
        moveNumber: frame.moveNumber,
        color: frame.color,
        san: frame.san,
        swing: position.swing,
        fenBefore: frame.fenBefore,
        bestMove: position.bestMove,
        timeSpentSeconds: frame.timeSpentSeconds,
      }
    })

  const totalMoves = parsed.frames.length
    ? parsed.frames[parsed.frames.length - 1].moveNumber
    : 0

  return {
    uuid: raw.uuid,
    url: raw.url,
    endTime: raw.end_time,
    date: parsed.metadata.date ?? null,
    timeClass: raw.time_class,
    timeControl: raw.time_control,

    playerColor,
    playerRating: playerColor === 'white' ? raw.white.rating : raw.black.rating,
    opponentRating: playerColor === 'white' ? raw.black.rating : raw.white.rating,
    result: toPlayerResult(playerColor === 'white' ? raw.white.result : raw.black.result),

    eco: raw.eco,
    openingName: parsed.metadata.opening ?? raw.eco.name ?? null,
    openingDeviationPly: parsed.metadata.firstNonBookMoveIndex ?? null,

    playerAccuracy: playerColor === 'white' ? raw.accuracies?.white ?? null : raw.accuracies?.black ?? null,
    opponentAccuracy: playerColor === 'white' ? raw.accuracies?.black ?? null : raw.accuracies?.white ?? null,

    frames: parsed.frames,
    metadata: parsed.metadata,
    keyPositions: evaluated,

    blunders,
    phaseBlunderCounts: buildPhaseBlunderCounts(blunders),
    timeProfile: buildTimeProfile(parsed.frames, playerSide),
    pieceActivity: buildPieceActivity(parsed.frames),
    playerCastledAtMove:
      playerSide === 'w' ? parsed.metadata.whiteCastledAtMove ?? null : parsed.metadata.blackCastledAtMove ?? null,
    opponentCastledAtMove:
      opponentSide === 'w' ? parsed.metadata.whiteCastledAtMove ?? null : parsed.metadata.blackCastledAtMove ?? null,
    endgameType: parsed.metadata.endgameType
      ? normalizeEndgameType(parsed.metadata.endgameType, playerColor)
      : null,
    totalMoves,
  }
}

export const analyseAllGames = async (
  raws: RawGame[],
  username: string,
  worker: StockfishWorker,
  onProgress?: (done: number, total: number, current: RawGame | null) => void,
): Promise<AnalysedGame[]> => {
  const results: AnalysedGame[] = []

  for (let index = 0; index < raws.length; index += 1) {
    const raw = raws[index]
    onProgress?.(index, raws.length, raw)
    const analysed = await analyseGame(raw, username, worker)
    results.push(analysed)
    onProgress?.(index + 1, raws.length, raw)
  }

  return results
}
