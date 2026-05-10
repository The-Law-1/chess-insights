# Remaining Tasks — Deadline: Sunday, May 17th, 2026

Each day has one or two standalone tasks. Paste each task block as a prompt into Claude Code.

---

## Monday, May 11 — Bishop Pair Advantage

**Task 1: Compute bishop pair ACPL and wire it into StatsTabs**

```
Add a new "BishopPair" stat to the analysis dashboard. Implement a function `bishopPairAdvantage(games: AnalysedGame[])` that:

1. For each game, determine positions where the player has the bishop pair (both bishops still on board, opponent missing at least one bishop). Check this by looking at the FEN board state at each key position — if the player's color has both bishops present and the opponent has 0 or 1 bishops, the player has the bishop pair.
2. For those positions vs. positions where the player does NOT have the bishop pair, compute the average centipawn loss (ACPL). The `swing` field on `EvaluatedPosition` is already in centipawns from the player's perspective.
3. Segregate by game phase (opening, middlegame, endgame). The `analyseGame` function already computes phase information — use the `frames[].moveNumber` or `frames[].phase` to classify each position. Opening: moves 1-10, Middlegame: moves 11-40, Endgame: move 41+.
4. Create a new Vue component `src/components/stats/BishopPair.vue` that:
   - Receives `games: AnalysedGame[]` as a prop
   - Calls `bishopPairAdvantage` in a computed property
   - Renders the results using `StatsTable` (already at `src/components/stats/StatsTable.vue`)
   - Shows rows like: "Opening — With Bishop Pair", "Opening — Without Bishop Pair", "Middlegame — With Bishop Pair", etc.
   - Each row shows: the phase+pair label (fieldName), number of positions (count), and ACPL (as a numeric value; reuse the winrate column by renaming it to "ACPL" via the `winrateLabel` prop)
5. Register the new component in `src/components/StatsTabs.vue`:
   - Import `BishopPair` from `./stats/BishopPair.vue`
   - Add it to the `tabs` object with key `'BishopPair'`

Use `npm run dev` to verify the component renders without errors. The computation logic should be in the component's `<script setup>` — no separate module file needed unless the logic gets large.
```

---

## Tuesday, May 12 — Blunder Heatmap (chessboard)

**Task 1: Build a chessboard heatmap component for blunder locations**

```
Add a "BlunderHeatmap" stat that shows a 64-square chessboard heatmap of where the player's blunders occurred.

1. Implement `blunderHeatmap(games: AnalysedGame[])` that:
   - Iterates over all blunders across all games (each blunder has a `fenBefore` field)
   - Extracts the "to" square from each blunder's SAN (e.g. "Nf3" → "f3", "exd5" → "d5", "O-O" → null/skip)
   - Aggregates: per square (a1-h8), count of blunders and total centipawn swing (sum of `blunder.swing`)
   - Returns a `Record<string, { count: number; totalSwing: number }>` keyed by square name like "e4"

2. Create `src/components/stats/BlunderHeatmap.vue` that:
   - Receives `games: AnalysedGame[]` as a prop
   - Renders an 8x8 CSS grid chessboard (64 squares, alternating light/dark colors)
   - Each square shows the blunder count as a small number and has a background color intensity proportional to the average swing on that square (darker red = higher avg swing)
   - Square coordinates: a1 is bottom-left (white's perspective). Rank 8 at top, rank 1 at bottom. File a at left, file h at right.
   - Include a legend showing the color scale
   - Handle the edge case where a square has 0 blunders (show no number, no heat color)

3. Register it in `StatsTabs.vue` as key `'BlunderHeatmap'`

The chessboard should be pure CSS grid — do NOT add any new npm dependencies. Use `npm run dev` to verify it renders.
```

---

## Wednesday, May 13 — Blunder Piece Heatmap

**Task 1: Add a piece-origin heatmap variant**

```
Add a "BlunderPieceHeatmap" stat — a variant of the blunder heatmap that shows squares where the player's pieces were standing when a blunder was made (the "from" square).

1. Implement `blunderPieceHeatmap(games: AnalysedGame[])` that:
   - Iterates over all blunders across all games
   - For each blunder, finds the "from" square by:
     - Using the `fenBefore` field to reconstruct the board position BEFORE the blunder move
     - Finding which of the player's pieces could legally move to the destination square (the "to" square from the SAN)
     - If exactly one piece of the correct type can make that move, that's the "from" square
     - If multiple pieces can make the move (ambiguous), use the SAN disambiguation (e.g. "Nbd7" means the knight on the b-file)
     - If it's a castling move (O-O or O-O-O), compute the king's from-square based on the player's color
   - Aggregates: per square, count of blunders where a piece originated from that square, and total centipawn swing
   - Returns `Record<string, { count: number; totalSwing: number }>`

2. The chess.js library is already available (`import { Chess } from 'chess.js'`). Use it to load the FEN and find legal moves / piece positions.

3. Create `src/components/stats/BlunderPieceHeatmap.vue` that:
   - Reuses the same CSS grid chessboard pattern from `BlunderHeatmap.vue` (copy the template/style, or extract a shared `ChessboardHeatmap.vue` component if you prefer — your call)
   - Shows the "from" square blunder data instead of "to" square data
   - Has a distinct title: "Worst Piece Positions (Blunder Origins)"

4. Register it in `StatsTabs.vue` as key `'BlunderPieceHeatmap'`

Use `npm run dev` to verify it renders.
```

---

## Thursday, May 14 — Rating by Phase

**Task 1: Estimate rating by game phase from ACPL**

```
Add a "RatingByPhase" stat that estimates the player's performance rating broken down by opening, middlegame, and endgame.

1. Implement `ratingByPhase(games: AnalysedGame[])` that:
   - Iterates over all `EvaluatedPosition` across all games
   - Classifies each position into opening (moves 1-10), middlegame (11-40), or endgame (41+) based on the position's `plyIndex` (convert to move number: `Math.floor(plyIndex / 2) + 1`)
   - Computes ACPL (average centipawn loss) for each phase separately
   - Converts ACPL to an estimated Elo rating using the formula:
     - Base rating: use the player's average rating from `game.playerRating` across all analysed games
     - Rating adjustment: each 1 centipawn of ACPL corresponds to roughly 7 Elo points below a "perfect" baseline. Use this formula:
       - `phaseRating = baseRating - (phaseACPL - overallACPL) * 7`
     - This is a rough heuristic — the goal is a relative comparison between phases, not absolute accuracy
   - Returns: `{ opening: { acpl, rating }, middlegame: { acpl, rating }, endgame: { acpl, rating }, overall: { acpl, rating, baseRating } }`

2. Create `src/components/stats/RatingByPhase.vue` that:
   - Receives `games: AnalysedGame[]` as a prop
   - Renders the results using `StatsTable`
   - Shows rows for Opening, Middlegame, Endgame, and Overall
   - Each row shows: phase name (fieldName), ACPL (count column, labeled "ACPL"), and Estimated Rating (winrate column, labeled "Est. Rating")
   - Add a short description: "Estimated rating by game phase based on average centipawn loss. Higher is better."

3. Register it in `StatsTabs.vue` as key `'RatingByPhase'`

Use `npm run dev` to verify it renders.
```

---

## Friday, May 15 — Nemesis Detection

**Task 1: Find opponents the player struggles against**

```
Add a "Nemesis" stat that detects opponents the player has faced multiple times with a poor win rate.

1. Implement `nemesisDetection(games: AnalysedGame[])` that:
   - Groups games by opponent. The opponent's username can be derived from the game URL: `api.chess.com/pub/player/{username}/games/...` — but since we don't have opponent username directly in `AnalysedGame`, use the `url` field or check if the PGN metadata in `game.metadata` has opponent info. If opponent name is not directly available, add it to the `AnalysedGame` interface by:
     - Adding `opponentUsername: string` and `opponentRating: number` to `AnalysedGame` in `src/analysis/types.ts`
     - Extracting them during `analyseGame()` in `src/analysis/analyseGame.ts` from the PGN headers (the PGN has `[White]` and `[Black]` tags — the opponent is whichever one is not the player)
   - Filters to opponents faced 3+ times
   - Computes win rate against each: wins / total games (draws count as 0.5 wins)
   - Filters to opponents with win rate below 30%
   - Returns an array of `{ username, rating, gamesPlayed, wins, draws, losses, winRate }` sorted by win rate ascending (worst first)

2. Create `src/components/stats/Nemesis.vue` that:
   - Receives `games: AnalysedGame[]` as a prop
   - Uses `StatsTable` to render the results
   - Shows columns: opponent username (fieldName), games played (count), win rate % (winrate)
   - If no nemeses found (empty list), show a friendly empty state: "No nemeses detected. You perform well against all frequent opponents."

3. Register it in `StatsTabs.vue` as key `'Nemesis'`

Use `npm run dev` to verify it renders.
```

---

## Saturday, May 16 — Deployment

**Task 1: Deploy to GitHub Pages**

```
Deploy the app to GitHub Pages. Details are intentionally loose — I'll handle the specifics. Do the following:

1. Configure `vite.config.ts` for GitHub Pages deployment:
   - Set the `base` option to the repository name (e.g. `'/chess-analysis-4/'`)
   - The app uses client-side routing (vue-router), so figure out a strategy for SPA fallback on GitHub Pages (404.html redirect trick, or switch to hash-based routing if simpler)

2. Add a `deploy` script to `package.json` that builds and pushes to a `gh-pages` branch (or configures the `/docs` folder approach)

3. Run `npm run build` and fix any build errors

4. Provide instructions for:
   - Enabling GitHub Pages in the repo settings (Settings → Pages → Source: deploy from branch)
   - The URL where the app will be live

Keep it simple — no CI/CD pipelines, just a manual deploy script.
```

---

## Sunday, May 17 — UI Overhaul & Share

**Task 1: Full UI/UX overhaul**

```
Give the entire app a visual do-over using modern UX/UI best practices. This should be a comprehensive polish pass across all pages and components.

Design direction — dark theme, clean and data-dense but airy, professional chess tool aesthetic:
- Color palette: dark backgrounds (#0b0f14, #111827), subtle borders (#1e293b), accent (#38bdf8 or a warm amber #f59e0b for highlights), green for wins (#22c55e), red for losses/blunders (#ef4444)
- Typography: system font stack, crisp hierarchy — page titles (2rem, bold), section headers (1.25rem, semibold), body (0.875rem), mono for FENs/chess notation
- Spacing: generous padding (2rem+), cards with border-radius 12-16px, subtle box-shadows
- Transitions: subtle hover/focus states on all interactive elements, smooth tab switches (already have `tab-fade`, keep it)

Pages to overhaul:
1. **`index.html`** — Update `<title>` to "Chess Analysis" or similar. Add a `<meta name="description">` tag (good link previews on Discord/Reddit). Add a favicon link (use a simple emoji favicon via an inline SVG data URI if no icon file exists — a chess piece emoji like ♞).

2. **`src/pages/Home.vue`** — Turn the placeholder into a proper landing page:
   - Hero section with a bold title ("Chess Analysis Dashboard"), a one-line subtitle explaining what the tool does
   - A "Get Started" button that links to `/games`
   - Subtle background pattern or gradient

3. **`src/pages/Games.vue`** — The main dashboard. Improvements:
   - Card-based form layout with clearer grouping
   - Better progress bar styling (animated stripes during loading)
   - Stats tabs should feel cohesive with the rest of the page
   - Empty state when no games are loaded: show a friendly prompt instead of a blank section

4. **`src/components/StatsTabs.vue`** — Refine the tab bar:
   - Pill-style tabs are good, keep them but tweak: slightly smaller, tighter spacing, maybe a bottom-border indicator instead of full pill for the active state
   - Smooth scroll or wrap tabs if they overflow
   - Tabs should feel like a unified navigation bar

5. **`src/components/stats/StatsTable.vue`** — The workhorse component. Refinements:
   - Dark theme styling: dark table background, lighter text, accent-colored header row
   - Better hover states on rows
   - The winrate green/red colors should pop on dark backgrounds
   - Responsive: on narrow screens, reduce padding, shrink font size

6. **All stat components** — Consistent card wrappers:
   - Each stat component should live inside a card with consistent padding, border-radius, and shadow
   - Title + description pattern should be uniform across all stats

7. **Global styles** — Update `src/style.css` or the main App.vue styles:
   - Define CSS custom properties on `:root` for the new color palette
   - Dark background on `<body>`
   - Scrollbar styling (subtle, matching the theme)
   - Focus-visible ring styling (accessibility)

8. **Responsive pass** — Test at 375px width (mobile):
   - Form fields should stack vertically
   - Stats tables should scroll horizontally or reflow
   - Chessboard (heatmap) should scale down, min 280px
   - Tabs should be horizontally scrollable
   - Font sizes should not blow up on mobile

9. **Micro-interactions**:
   - Button press states (scale: 0.97 on active)
   - Smooth color transitions on all interactive elements (200ms ease)
   - Loading skeletons or subtle pulsing animations during async operations

Do NOT add new npm dependencies for styling. Pure CSS (scoped styles in each .vue component + global CSS custom properties). Keep all existing functionality intact — this is a visual refresh, not a rewrite.

Run `npm run dev` and visually inspect every page and every stat tab. Fix any layout issues or visual inconsistencies you find.
```

**Task 2: Share the deployed app**

```
The app is deployed and polished. Now share it:

1. Post the link to the chess Discord communities I've already identified (r/chess on Reddit, relevant Discord servers). I've done the research — just mention it in the prompt so I don't forget to actually post.

2. Before sharing, do a final check:
   - Run `npm run build` and fix any TypeScript errors
   - Test the deployed URL loads correctly on desktop and mobile
   - Verify the meta tags and favicon render correctly in Discord/Reddit link previews (use a tool like https://www.opengraph.xyz if needed)
   - Quick smoke test: fetch a known username, run analysis, flip through all stat tabs

Allocate ~30 min for the final check and ~90 min for sharing and monitoring responses.
```
