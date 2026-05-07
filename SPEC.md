# Chess Analyser — Agent Spec

A TypeScript + Vue 3 SPA that fetches a player's chess.com games, identifies critical positions using chess.js, runs shallow Stockfish WASM analysis on those positions, and surfaces actionable improvement insights without requiring a backend or login.

**Stack:** Vue 3, TypeScript, Vite, chess.js, stockfish.wasm  
**Constraint:** Runs entirely in the browser. No server. No auth.

---

## Step 1 — Stockfish WASM initialisation

**Goal:** Get Stockfish running in a Web Worker and establish a clean UCI command interface.

- Install `stockfish` (the npm package that ships the WASM build)
- Instantiate Stockfish inside a Web Worker to avoid blocking the main thread
- Write a typed wrapper class `StockfishWorker` that:
  - Sends raw UCI commands to the worker (`uci`, `isready`, `position fen <fen>`, `go depth <n>`)
  - Returns a `Promise<string[]>` that resolves when the engine emits `readyok` or `bestmove`
  - Exposes a `getBestMove(fen: string, depth: number): Promise<string>` method
  - Exposes an `evaluate(fen: string, depth: number): Promise<number>` method that returns centipawns (parse the `cp` value from `info depth ... score cp` lines; handle `mate` scores by mapping them to ±9999)
- Write a minimal Vue component `EngineDebug.vue` with a text input and output panel to send raw UCI commands and see responses — useful for smoke testing throughout development

**Checkpoint:** You can type `position fen <starting FEN> go depth 10` in the debug panel and receive a valid `bestmove` response.

---

## Step 2 — PGN parsing with chess.js

**Goal:** Turn a raw PGN string into a structured, traversable game object.

- Install `chess.js`
- Write a `parseGame(pgn: string): ParsedGame` function that returns:
  - A `Chess` instance loaded with the full game
  - An ordered array of `MoveFrame` objects, one per half-move (ply):
    ```typescript
    interface MoveFrame {
      plyIndex: number         // 0-based
      moveNumber: number       // chess move number (1, 2, 3...)
      color: 'w' | 'b'
      san: string              // e.g. "Nxf7"
      uci: string              // e.g. "g5f7"
      fenBefore: string        // FEN before this move
      fenAfter: string         // FEN after this move
      isCapture: boolean
      isCheck: boolean
      isCastling: boolean
      isPromotion: boolean
      clockSeconds: number | null   // parsed from [%clk] annotation
    }
    ```
  - Game metadata (players, result, ECO, opening name, chess.com URL, date, time control, accuracies, ratings)

- Parse clock times from PGN comments (`{[%clk 0:04:55.9]}`) and attach to each `MoveFrame`
- Compute `timeSpentSeconds` per move as the difference from the previous clock value

**Checkpoint:** Given the example game JSON from chess.com, `parseGame` returns a `MoveFrame[]` where castling, captures, and clock times are all correctly flagged.

---

## Step 3 — Key position extraction (no engine)

**Goal:** Identify the 8–15 most critical positions per game worth sending to Stockfish, using only the move notation and clock data — no engine calls yet.

Write a `extractKeyPositions(frames: MoveFrame[]): KeyPosition[]` function using this priority logic:

```typescript
interface KeyPosition {
  plyIndex: number
  fen: string           // fenAfter — the position Stockfish will evaluate
  reasons: KeyReason[]  // why this position was flagged
}

type KeyReason =
  | 'major-piece-capture'   // Q or R captured (Qx, Rx)
  | 'minor-piece-capture'   // B or N captured
  | 'pawn-capture'          // pawn takes pawn
  | 'check-after-capture'   // capture that also gives check
  | 'promotion'
  | 'castling'              // opening/middlegame boundary
  | 'large-clock-drop'      // player spent >60s on this move
  | 'pre-checkmate'         // last 5 moves of the game
  | 'consecutive-captures'  // part of a forcing exchange sequence
```

Priority rules:
1. Always include: major piece captures, promotions, checks after captures, pre-checkmate moves
2. Include if budget allows: minor piece captures, large clock drops, castling moves
3. Deduplicate: if two consecutive moves are both captures on the same square, only flag the first
4. Cap at 15 positions per game to keep engine load predictable

**Checkpoint:** Run `extractKeyPositions` on the example game and print the flagged moves to the console. Verify that the Nxf7 sacrifice and the final mating sequence are included.

---

## Step 4 — Chess.com API fetch and in-memory game store

**Goal:** Fetch all of a player's games for a given date range and time format, and hold them in a typed in-memory store.

- Write a `fetchGames(params: FetchParams): Promise<RawGame[]>` function:
  ```typescript
  interface FetchParams {
    username: string
    startDate: Date
    endDate: Date
    timeClass: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'all'
  }
  ```
- Chess.com's public API serves games by month at:  
  `https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}`  
  Fetch all months in the requested range in parallel (`Promise.all`)
- Filter results by `time_class` if not `'all'`
- Map raw API response to a typed `RawGame` interface that preserves: `pgn`, `url`, `uuid`, `accuracies`, `white`, `black`, `time_class`, `time_control`, `end_time`, `eco` URL and name (parse ECO name from the PGN headers)
- Store the array in a Pinia store `useGameStore` with state: `games: RawGame[]`, `status: 'idle' | 'loading' | 'error' | 'ready'`, `error: string | null`
- Expose a `loadGames(params: FetchParams): Promise<void>` action on the store
- Handle rate limiting gracefully — chess.com can 429 on rapid requests; add a small delay between month fetches if needed

**Checkpoint:** Fetch 3 months of rapid games for a known username and log the count. Confirm ECO name is parsed from PGN headers correctly.

---

## Step 5 — Define the analysed game data model

**Goal:** Design the central data structure that all downstream analysis will read from. Define this before writing any analysis code.

```typescript
interface AnalysedGame {
  // Identity
  uuid: string
  url: string                        // chess.com game link
  date: string
  timeClass: string
  timeControl: string

  // Players
  playerColor: 'white' | 'black'
  playerRating: number
  opponentRating: number
  result: 'win' | 'loss' | 'draw'

  // Opening
  eco: string                        // e.g. "A01"
  openingName: string                // e.g. "Nimzowitsch-Larsen Attack"
  openingDeviation: number | null    // ply at which player left book

  // Accuracies (from chess.com, free)
  playerAccuracy: number | null
  opponentAccuracy: number | null

  // Move frames (full game)
  frames: MoveFrame[]

  // Key positions with engine results
  keyPositions: EvaluatedPosition[]

  // Derived per-game stats (computed after engine analysis)
  blunders: Blunder[]
  phaseBlunderCounts: { opening: number; middlegame: number; endgame: number }
  timeProfile: TimeProfile
  pieceActivity: PieceActivityMap
  castlingPly: number | null
  totalMoves: number
}

interface EvaluatedPosition {
  plyIndex: number
  fen: string
  reasons: KeyReason[]
  evalBefore: number        // centipawns, from player's perspective
  evalAfter: number         // centipawns, from player's perspective
  swing: number             // evalAfter - evalBefore (negative = bad for player)
  bestMove: string          // UCI string from Stockfish
  actualMove: string        // UCI string played
  wasBestMove: boolean
}

interface Blunder {
  plyIndex: number
  moveNumber: number
  color: 'w' | 'b'
  san: string
  swing: number             // centipawn loss
  fenBefore: string
  bestMove: string
  timeSpentSeconds: number | null
}

interface TimeProfile {
  averageSecondsPerMove: number
  averageSecondsOpening: number     // moves 1–10
  averageSecondsMiddlegame: number  // moves 11–30
  averageSecondsEndgame: number     // moves 31+
  movesBelowThirtySeconds: number   // time pressure count
  longestThinkPly: number
  longestThinkSeconds: number
}

interface PieceActivityMap {
  // keyed by piece identifier e.g. "wN_g1" (color + type + starting square)
  [pieceId: string]: {
    type: 'P' | 'N' | 'B' | 'R' | 'Q' | 'K'
    color: 'w' | 'b'
    uniqueSquares: string[]
    moveCount: number
  }
}
```

**Checkpoint:** No code runs here — review and adjust the interfaces before proceeding. Consider whether `openingDeviation` needs the ECO URL from the raw game or PGN header parsing.

---

## Step 6 — Engine analysis pipeline

**Goal:** For each game, run `extractKeyPositions`, evaluate each with Stockfish, and produce a complete `AnalysedGame` object.

- Write `analyseGame(raw: RawGame, username: string, worker: StockfishWorker): Promise<AnalysedGame>`:
  1. Parse the PGN with `parseGame`
  2. Determine `playerColor` from username matching
  3. Extract key positions with `extractKeyPositions`
  4. For each key position, call `worker.evaluate(fenBefore, depth=12)` and `worker.evaluate(fenAfter, depth=12)` and `worker.getBestMove(fenBefore, depth=12)`
  5. Normalise evaluations to always be from the player's perspective (flip sign when player is Black)
  6. Classify blunders: swing worse than -150cp = inaccuracy, -300cp = mistake, -500cp = blunder
  7. Compute all derived stats (time profile, piece activity, phase blunder counts, castling ply)
  8. Return the completed `AnalysedGame`

- Write `analyseAllGames(raws: RawGame[], username: string, worker: StockfishWorker, onProgress: (done: number, total: number) => void): Promise<AnalysedGame[]>`
  - Process games sequentially (not in parallel) to avoid overwhelming the WASM worker
  - Call `onProgress` after each game completes
  - Store results in a Pinia store `useAnalysisStore` as they arrive (don't wait for all to finish)

- Add a `AnalysisProgress.vue` component showing a progress bar and current game being processed

**Checkpoint:** Run the full pipeline on 10 games. Log the `AnalysedGame[]` to the console. Verify blunder swings look plausible, piece activity maps are populated, and time profiles are non-zero.

---

## Step 7a — Engine-free statistics

**Goal:** Compute all statistics that require only the `AnalysedGame[]` array, no further engine calls.

Implement these as pure functions in `src/stats/engineFree.ts`, each taking `AnalysedGame[]` and returning a typed result:

- `winRateByOpening(games)` — group by `openingName`, return `{ name, wins, losses, draws, winRate }[]` sorted by game count (done!)
- `castlingTimingAnalysis(games)` — distribution of castling ply, correlation with result (done!)
- `gameLengthVsResult(games)` — scatter data: total moves vs win/loss/draw (done!)
- `timeSpentVsMoveQuality(games)` — for each move that was a blunder, what was `timeSpentSeconds`? Build a histogram
- `pieceActivityCorrelation(games)` — scatter data: at what move were all your minor pieces developed (moved once) compare with winrate
- `averageTimeSpentPerMove(games)` — average time spent per move vs winrate graph
- `pawnStructureEvents(games)` — count isolated pawns, passed pawns reaching rank 6/7 per game; correlate with result
- `blundersByGamePhase(games)` — aggregate `phaseBlunderCounts` across all games
- `openingDeviationTiming(games)` — at what ply do you leave book vs winrate
- `groupedBadPositions(games)` — find positions(fens) (after opening! so after move 6 for instance) that occur in more than game, group them, order by winrate. On click open this URL with the fen https://lichess.org/analysis/{FEN}
- `castlingSideComparison(games)` — compare winrate when same-side castling, opposite side castling king side, vs queen side, etc... 

**Checkpoint:** Each function returns a non-empty result on a sample dataset. Wire one (e.g. `winRateByOpening`) to a simple table component to confirm the data flows to the UI.

---

## Step 7b — Engine-assisted statistics (stretch goals)

**Goal:** Compute statistics that require Stockfish output from the `EvaluatedPosition[]` data already stored.

These should be computed from the stored `keyPositions` already in `AnalysedGame` — no new engine calls needed.

- `worstPieceToMove(games)` — for each blunder, what piece type was moved? Aggregate by piece type
- `worstPieceToDefendAgainst(games)` — for each blunder, what piece type attacked or captured? Parse from `san`
- `commonBadPositions(games)` — cluster FENs where blunders occurred (simplify: group by ECO + ply range); surface the `bestMove` from Stockfish for each
- `blundersWhilePiecesUnmoved(games)` — cross-reference blunder ply with piece activity map; flag games where a blunder happened while ≥3 of the player's pieces had `moveCount === 0` (suggests opening development issues)
- `endgamePerformance(games)` — classify endgame type from final material FEN, compute win/draw/loss rate per type

---

## Step 7c — Advanced insights & narrative stats

**Goal:** Compute higher-level insights that tell a story about the player's style, weaknesses, and memorable moments. All of these use already-stored `EvaluatedPosition[]` and `AnalysedGame[]` data — no new engine calls.

### Positional insight

- `openVsClosedACPL(games)` — classify each game's positions as open (≥4 centre pawns missing, files with no pawns) or closed (≤2 centre pawns moved, pawn chains interlocked) using FEN analysis. Compare average centipawn loss (ACPL) in open vs. closed positions.
- `bishopPairAdvantage(games)` — detect when the player has the bishop pair (both bishops still on board, opponent missing at least one) and compute ACPL in those positions vs. positions without the bishop pair. Segregate by game phase (opening, middlegame, endgame).

*Insight:* "Your ACPL drops from 28 to 18 when you have the bishop pair — you know how to use them."

### Blunder heatmap

- `blunderHeatmap(games)` — build a 64-square heatmap showing which squares the player's blunders occurred on. Aggregate both the count of blunders and the average centipawn loss per square. Render as a chessboard with colour intensity.
- `blunderPieceHeatmap(games)` — variant: heatmap of squares where the player's *pieces* were standing when a blunder was made (i.e. the "from" square of the blundered move).

*Insight:* "You blunder most often when moving pieces from f2/f7 — watch those squares in the opening."

### True performance rating

- `estimatedPerformanceRating(games)` — use the formula `R_perf = R_avg_opponents + K * (ACPL_avg - ACPL_player) / σ` where `K = 10` and `σ` is the standard deviation of ACPL. Compute a "true" rating that reflects quality of play independent of results.
- `ratingByPhase(games)` — break the above down by opening / middlegame / endgame ACPL to estimate a distinct rating per phase.

*Insight:* "Your endgame plays like an 1800, but your opening is at 2100 level."

### Game of the Week

- `gameOfTheWeek(games)` — select one standout game based on a composite score:
  - Highest player accuracy (chess.com `playerAccuracy`)
  - Largest single-move eval swing in the player's favour (biggest comeback)
  - Most `wasBestMove` flags across key positions
- Return the game UUID, the badge label ("Most Accurate", "Biggest Comeback", "Engine-Like Precision"), and a 2–3 sentence narrative summary of why it stood out.

### Transposition analysis

- `transpositionWeaknesses(games)` — for each game, extract the first 12 moves as UCI sequences. Hash sequences of length 4–8 moves and detect repeats across games. For repeated sequences, compute the average ACPL and win rate. Flag any sequence where average ACPL > 30 or win rate < 35% — these are "trap transpositions" where the player repeatedly enters bad lines.
- Group flagged sequences by the ECO of the game they occurred in, so the player can see which opening leads to the problematic transposition.

*Insight:* "You've reached this exact same bad middlegame 6 times from 3 different openings — here's the move-order mistake."

### Phase-specific ACPL

- `acplByPhase(games)` — compute per-move ACPL aggregated by phase: opening (moves 1–10), middlegame (moves 11–30), endgame (moves 31+). Return average, median, and standard deviation for each phase.
- `phaseAcplVsRating(games)` — compare phase ACPL to opponent rating to see which phase deteriorates most under pressure.

*Insight:* "Your opening is solid (ACPL 15), but your endgame is bleeding points (ACPL 45) — you're losing winnable positions."

### Tilt detection

- `tiltAnalysis(games)` — compare the average ACPL and blunder count in games immediately following a loss vs. games following a win or draw. Compute the percentage difference and flag if it exceeds a threshold (e.g. 8% worse).
- `tiltByTimeControl(games)` — break tilt down by time class, since tilt may manifest more in blitz than rapid.
- `sessionImpact(games)` — if multiple games are played on the same day, compute whether ACPL drifts upward (worsens) over a session.

*Insight:* "You play 8% worse (ACPL +25) in games right after a loss — take a 5-minute break."

### Opponent-type tendencies

- `oppositeCastlingPerformance(games)` — detect games where the player and opponent castled on opposite sides (kingside vs. queenside). Compare win rate and ACPL to same-side castling games.
- `ratingGapAnalysis(games)` — group games by the rating difference (player minus opponent) into buckets: heavily favoured (>+200), slightly favoured (+50 to +200), even (±50), underdog (-50 to -200), heavy underdog (<-200). Compute win rate and ACPL per bucket.
- `nemesisDetection(games)` — find opponents the player has faced 3+ times with a win rate below 30%. List the opponent username, rating, and games played.

### Chess Wrapped

- `chessWrapped(games, username)` — produce a stylish summary object (and a corresponding UI component) containing:
  - Most played opening (by count)
  - Best win (highest accuracy in a won game)
  - Most painful blunder (largest single-move swing ≤ -500cp)
  - Highest accuracy game overall
  - Longest winning streak
  - Longest losing streak
  - Nemesis opponent (most losses to a single player)
  - Favourite time of day to play (from game `date` / `end_time`)
  - Total games, total moves, total hours played
  - Favourite piece to capture with (most captures by piece type)
  - Best month (highest win rate in a calendar month)

*Insight:* A single shareable card or image that sums up the player's chess year.

**Checkpoint:** Each group of functions returns typed, non-empty results on a sample dataset. Wire `gameOfTheWeek` and `chessWrapped` to the UI first — they're the most visually impactful.

---

## Step 8 — Dashboard UI

**Goal:** Wire all statistics to a readable dashboard. UI detail is up to you — this step is intentionally loose.

Suggested view structure:

- **Fetch panel** — username, date range, time class inputs, fetch + analyse buttons, progress bar
- **Overview tab** — total games, win rate, average accuracy, rating over time (line chart)
- **Openings tab** — `winRateByOpening` table, `openingDeviationTiming` chart
- **Mistakes tab** — blunders by phase (bar), worst piece to move (bar), time spent vs blunder histogram
- **Time tab** — time pressure correlation, average think time by phase
- **Endgames tab** — endgame type performance table
- **Game explorer** — filterable list of analysed games; click a game to see its `keyPositions` on a board (use `chess-board` web component or `vue3-chessboard`)

**Checkpoint:** All seven stat functions from Steps 7a/7b are rendered. The game explorer opens a game and steps through key positions.

---

## Notes for the agent

- Always keep Stockfish calls in the Web Worker — never import or call it on the main thread
- The chess.com public API does not require auth but does require a `User-Agent` header or it may 403
- ECO name lives in the PGN `[ECOUrl]` header — parse the last path segment for the human-readable name, or use the `[Opening]` tag if present
- Centipawn scores from Stockfish are always from the perspective of the side to move — you must flip the sign when it's Black's turn if you want scores from White's perspective consistently
- `chess.js` v1.x has a different API from v0.x — confirm the installed version before writing any chess.js code
- All stats functions should be pure and tested independently of Vue — put them in `src/stats/` not in components