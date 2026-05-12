import type { MoveFrame } from './parseGame'

export type KeyReason =
  | 'major-piece-capture'
  | 'minor-piece-capture'
  | 'pawn-capture'
  | 'check-after-capture'
  | 'promotion'
  | 'castling'
  | 'large-clock-drop'
  | 'pre-checkmate'
  | 'consecutive-captures'

export interface KeyPosition {
  plyIndex: number
  fen: string
  reasons: KeyReason[]
}

interface KeyPositionOptions {
  startPlyIndex?: number | null
}

const CAPTURE_REASONS = new Set<KeyReason>([
  'major-piece-capture',
  'minor-piece-capture',
  'pawn-capture',
  'check-after-capture',
  'consecutive-captures',
])

const ALWAYS_REASONS = new Set<KeyReason>([
  'major-piece-capture',
  'promotion',
  'check-after-capture',
  'pre-checkmate',
])

const OPTIONAL_PRIMARY_REASONS = new Set<KeyReason>([
  'minor-piece-capture',
  'large-clock-drop',
  'castling',
])

const OPTIONAL_SECONDARY_REASONS = new Set<KeyReason>(['pawn-capture', 'consecutive-captures'])

const getTargetSquare = (uci: string) => uci.slice(2, 4)

const isPieceCapture = (frame: MoveFrame, pieces: string[]) => {
  if (!frame.isCapture) {
    return false
  }

  const first = frame.san[0] ?? ''
  return pieces.includes(first)
}

const isPawnCapture = (frame: MoveFrame) => {
  if (!frame.isCapture) {
    return false
  }

  const first = frame.san[0] ?? ''
  return first >= 'a' && first <= 'h'
}

const uniqueReasons = (reasons: KeyReason[]) => Array.from(new Set(reasons))

const MAX_KEY_POSITIONS = 20

export const extractKeyPositions = (
  frames: MoveFrame[],
  options: KeyPositionOptions = {},
): KeyPosition[] => {
  const candidates: KeyPosition[] = []
  let previousCaptureSquare: string | null = null
  const minPlyIndex = Math.max(options.startPlyIndex ?? 0, 0)

  frames.forEach((frame, index) => {
    if (frame.plyIndex < minPlyIndex) {
      previousCaptureSquare = null
      return
    }

    const reasons: KeyReason[] = []
    const isPreCheckmate = index >= Math.max(frames.length - 5, 0)

    if (isPieceCapture(frame, ['Q', 'R'])) {
      reasons.push('major-piece-capture')
    }

    if (isPieceCapture(frame, ['B', 'N'])) {
      reasons.push('minor-piece-capture')
    }

    if (isPawnCapture(frame)) {
      reasons.push('pawn-capture')
    }

    if (frame.isCapture && frame.isCheck) {
      reasons.push('check-after-capture')
    }

    if (frame.isPromotion) {
      reasons.push('promotion')
    }

    if (frame.isCastling) {
      reasons.push('castling')
    }

    if (frame.timeSpentSeconds !== null && frame.timeSpentSeconds > 60) {
      reasons.push('large-clock-drop')
    }

    if (isPreCheckmate) {
      reasons.push('pre-checkmate')
    }

    if (frame.isCapture) {
      const previous = frames[index - 1]
      const next = frames[index + 1]
      if (previous?.isCapture || next?.isCapture) {
        reasons.push('consecutive-captures')
      }
    }

    if (!reasons.length) {
      previousCaptureSquare = frame.isCapture ? getTargetSquare(frame.uci) : null
      return
    }

    const currentCaptureSquare = frame.isCapture ? getTargetSquare(frame.uci) : null
    const sameSquareCapture =
      frame.isCapture &&
      previousCaptureSquare !== null &&
      currentCaptureSquare === previousCaptureSquare

    const filteredReasons = sameSquareCapture
      ? reasons.filter((reason) => !CAPTURE_REASONS.has(reason))
      : reasons

    previousCaptureSquare = currentCaptureSquare

    if (!filteredReasons.length) {
      return
    }

    candidates.push({
      plyIndex: frame.plyIndex,
      fen: frame.fenAfter,
      reasons: uniqueReasons(filteredReasons),
    })
  })

  const always: KeyPosition[] = []
  const optionalPrimary: KeyPosition[] = []
  const optionalSecondary: KeyPosition[] = []

  candidates.forEach((candidate) => {
    if (candidate.reasons.some((reason) => ALWAYS_REASONS.has(reason))) {
      always.push(candidate)
      return
    }

    if (candidate.reasons.some((reason) => OPTIONAL_PRIMARY_REASONS.has(reason))) {
      optionalPrimary.push(candidate)
      return
    }

    if (candidate.reasons.some((reason) => OPTIONAL_SECONDARY_REASONS.has(reason))) {
      optionalSecondary.push(candidate)
    }
  })

  const selected: KeyPosition[] = []
  const pushUnique = (items: KeyPosition[]) => {
    items.forEach((item) => {
      if (selected.some((entry) => entry.plyIndex === item.plyIndex)) {
        return
      }

      selected.push(item)
    })
  }

  pushUnique(always)
  if (selected.length < MAX_KEY_POSITIONS) {
    pushUnique(optionalPrimary)
  }
  if (selected.length < MAX_KEY_POSITIONS) {
    pushUnique(optionalSecondary)
  }

  return selected.slice(0, MAX_KEY_POSITIONS).sort((a, b) => a.plyIndex - b.plyIndex)
}
