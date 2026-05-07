interface PawnPosition {
  file: string
  rank: number
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

export function parsePawns(fen: string, color: 'w' | 'b'): PawnPosition[] {
  const [placement] = fen.split(' ')
  const ranks = placement.split('/')
  const pawnChar = color === 'w' ? 'P' : 'p'
  const pawns: PawnPosition[] = []

  ranks.forEach((rankStr, rankIndex) => {
    let fileIndex = 0
    for (const char of rankStr) {
      if (char >= '1' && char <= '8') {
        fileIndex += Number(char)
        continue
      }
      if (char === pawnChar) {
        pawns.push({ file: FILES[fileIndex], rank: 8 - rankIndex })
      }
      fileIndex += 1
    }
  })

  return pawns
}

export function countIsolatedPawns(fen: string, color: 'w' | 'b'): number {
  const pawns = parsePawns(fen, color)
  let isolated = 0

  for (const pawn of pawns) {
    const fileIdx = FILES.indexOf(pawn.file)
    const leftFile = fileIdx > 0 ? FILES[fileIdx - 1] : null
    const rightFile = fileIdx < 7 ? FILES[fileIdx + 1] : null

    const hasNeighbor = pawns.some((p) => p.file === leftFile || p.file === rightFile)
    if (!hasNeighbor) {
      isolated++
    }
  }

  return isolated
}

export function hasPassedPawnOnAdvanceRank(fen: string, color: 'w' | 'b'): boolean {
  const friendlyPawns = parsePawns(fen, color)
  const enemyPawns = parsePawns(fen, color === 'w' ? 'b' : 'w')
  const targetRanks = color === 'w' ? [6, 7] : [2, 3]

  for (const pawn of friendlyPawns) {
    if (!targetRanks.includes(pawn.rank)) continue

    const fileIdx = FILES.indexOf(pawn.file)
    const checkFiles = [pawn.file]
    if (fileIdx > 0) checkFiles.push(FILES[fileIdx - 1])
    if (fileIdx < 7) checkFiles.push(FILES[fileIdx + 1])

    const blocked = enemyPawns.some((ep) => {
      if (!checkFiles.includes(ep.file)) return false
      return color === 'w' ? ep.rank > pawn.rank : ep.rank < pawn.rank
    })

    if (!blocked) return true
  }

  return false
}
