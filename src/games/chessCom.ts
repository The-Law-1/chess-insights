export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'all'

export interface FetchParams {
  username: string
  startDate: Date
  endDate: Date
  timeClass: TimeClass
  maxGames: number
}

export interface RawGame {
  pgn: string
  url: string
  uuid: string
  accuracies: { white?: number; black?: number } | null
  white: { username: string; rating: number; result: string }
  black: { username: string; rating: number; result: string }
  time_class: string
  time_control: string
  end_time: number
  eco: { url: string | null; name: string | null; code: string | null }
}

export interface FetchProgress {
  monthsDone: number
  monthsTotal: number
  gamesFetched: number
}

interface MonthRef {
  year: number
  month: number
}

const RATE_LIMIT_ERROR = 'rate-limit'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const parseHeader = (pgn: string, header: string): string | null => {
  const match = pgn.match(new RegExp(`^\\[${header} "([^"]*)"\\]`, 'm'))
  return match ? match[1] : null
}

const parseEcoName = (pgn: string, fallbackUrl: string | null): string | null => {
  const opening = parseHeader(pgn, 'Opening')
  if (opening) {
    return opening
  }

  const ecoUrl = parseHeader(pgn, 'ECOUrl') ?? fallbackUrl
  if (!ecoUrl) {
    return null
  }

  const lastSegment = ecoUrl.split('/').pop() ?? ''
  if (!lastSegment) {
    return null
  }

  try {
    return decodeURIComponent(lastSegment).replace(/-/g, ' ').trim() || null
  } catch {
    return null
  }
}

const buildMonthList = (startDate: Date, endDate: Date): MonthRef[] => {
  const months: MonthRef[] = []
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
}

const fetchMonthGames = async (username: string, year: number, month: number): Promise<RawGame[]> => {
  const monthString = String(month).padStart(2, '0')
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/${year}/${monthString}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'chess-analysis-4',
    },
  })

  if (response.status === 404) {
    return []
  }

  if (response.status === 429) {
    throw new Error(RATE_LIMIT_ERROR)
  }

  if (!response.ok) {
    throw new Error(`Chess.com request failed (${response.status}).`)
  }

  const data = await response.json()
  const games = Array.isArray(data.games) ? data.games : []

  return games.map((game) => {
    const pgn = game.pgn ?? ''
    const ecoUrl = parseHeader(pgn, 'ECOUrl') ?? game.eco ?? null
    const ecoCode = parseHeader(pgn, 'ECO') ?? null
    const openingName = parseEcoName(pgn, ecoUrl)

    return {
      pgn,
      url: game.url ?? '',
      uuid: game.uuid ?? '',
      accuracies: game.accuracies ?? null,
      white: game.white,
      black: game.black,
      time_class: game.time_class ?? 'unknown',
      time_control: game.time_control ?? '',
      end_time: game.end_time ?? 0,
      eco: {
        url: ecoUrl,
        name: openingName,
        code: ecoCode,
      },
    }
  })
}

const fetchMonthGamesWithRetry = async (username: string, year: number, month: number): Promise<RawGame[]> => {
  let attempt = 0

  while (attempt < 3) {
    try {
      return await fetchMonthGames(username, year, month)
    } catch (error) {
      if (error instanceof Error && error.message === RATE_LIMIT_ERROR) {
        attempt += 1
        await sleep(800 * attempt)
        continue
      }

      throw error
    }
  }

  return fetchMonthGames(username, year, month)
}

export const fetchGamesSequential = async (
  params: FetchParams,
  onProgress?: (progress: FetchProgress) => void,
): Promise<RawGame[]> => {
  const months = buildMonthList(params.startDate, params.endDate)
  const totalMonths = months.length
  let monthsDone = 0
  let games: RawGame[] = []

  for (const month of months) {
    const monthGames = await fetchMonthGamesWithRetry(params.username, month.year, month.month)
    const filtered =
      params.timeClass === 'all'
        ? monthGames
        : monthGames.filter((game) => game.time_class === params.timeClass)

    games = games.concat(filtered)
    monthsDone += 1

    if (games.length >= params.maxGames) {
      games = games.slice(0, params.maxGames)
    }

    onProgress?.({
      monthsDone,
      monthsTotal: totalMonths,
      gamesFetched: games.length,
    })
    if (games.length >= params.maxGames) {
      break
    }
  }

  return games
}
