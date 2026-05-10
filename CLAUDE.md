# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm run dev        # Start Vite dev server
npm run build      # Type-check (vue-tsc -b) then production build (vite build)
npm run preview    # Preview production build locally
```

No test framework is configured yet.

## Architecture

A browser-only SPA (Vue 3 + TypeScript + Vite) that fetches a player's chess.com games, identifies critical positions via PGN parsing, runs shallow Stockfish WASM analysis on those positions in a Web Worker, and displays statistics.

**Routes** (vue-router, `src/router.ts`):
- `/` — Home (placeholder)
- `/engine` — Stockfish debug console (raw UCI commands)
- `/pgn` — Manual PGN paste + parsing verification
- `/games` — Main dashboard: fetch games, trigger analysis, view stats

**Core data flow:**
1. `fetchGamesSequential()` (`src/games/chessCom.ts`) fetches games month-by-month from chess.com's public API with rate-limit retry (3 attempts, 800ms backoff). Results stored in `useGameStore` Pinia store.
2. `analyseGames()` action on `useAnalysisStore` creates a `StockfishWorker`, initializes the engine (`uci` + `isready`), then processes games sequentially through `analyseGame()`.
3. `analyseGame()` (`src/analysis/analyseGame.ts`): parses PGN → extracts key positions → evaluates each position with Stockfish at depth 6 → computes derived stats (time profile, piece activity, blunder classification, phase counts).

**Key modules:**

- `src/engine/StockfishWorker.ts` — Typed wrapper around the WASM Web Worker. Serializes UCI commands through a queue (one at a time). `getBestMove(fen, depth)` returns the UCI best move string. `evaluate(fen, depth)` returns centipawns from the side-to-move perspective (parses `info depth ... score cp` lines; maps `mate` to ±9999).

- `src/engine/stockfish.worker.ts` — The actual Web Worker entry point. Loads stockfish.wasm and forwards messages between the main thread and the engine.

- `src/pgn/parseGame.ts` — Parses a PGN string via chess.js into `MoveFrame[]` and `GameMetadata`. Extracts clock times from `[%clk]` annotations, detects ECO book deviations (by comparing played moves against the ECO move sequence in `src/assets/eco_data.json`), classifies endgame type by material + bishop square colors + castling rights.

- `src/pgn/extractKeyPositions.ts` — Selects up to 15 critical positions per game using priority buckets: always-include (major captures, promotions, checks-after-capture, pre-checkmate), primary optional (minor captures, large clock drops >60s, castling), secondary optional (pawn captures, consecutive captures). Deduplicates same-square consecutive captures.

- `src/analysis/types.ts` — The central `AnalysedGame` interface. Everything downstream reads from this.

**Stockfish constraints:**
- The Vite dev/preview server sends `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` headers (`vite.config.ts`). These are required for SharedArrayBuffer in Stockfish WASM.
- Never import or call Stockfish on the main thread — always through `StockfishWorker`.
- Centipawn scores from Stockfish are from the side-to-move perspective. `analyseGame` normalizes them to the player's perspective by flipping the sign when the player is Black.

**UI components** (`src/components/`):

- `StatsTabs.vue` — Tab container that hosts all stat sub-components. Each tab is a Vue component receiving `games: AnalysedGame[]` as a prop. To add a new stat: (1) create a new `.vue` file in `src/components/stats/`, (2) import it and add an entry to the `tabs` object in `StatsTabs.vue`. The tab key (object key) is the display name shown in the UI. Tab keys use PascalCase names that condense well: e.g. `'BishopPair'`, `'BlunderHeatmap'`, `'RatingByPhase'`.

- `StatsTable.vue` — Reusable sortable table for tabular stats. Props: `title` (string), `rows` (array of `{ fieldName: string, count: number, winrate?: number }`), optional `fieldNameLabel`, `countLabel`, `winrateLabel` to rename column headers, optional `description` (string, shown below title), optional `onRowClick` (callback receiving fieldName). The `winrate` column auto-hides when no rows have `winrate` defined. Use this component for any stat that is naturally a ranked list (openings, endgames, piece blunders, nemeses, etc.). The `winrate` column can be relabeled for non-winrate numeric values (e.g. ACPL, rating) via `winrateLabel`.

- `chart.ts` — Chart.js setup helpers. `registerCharts()` registers all Chart.js components. `baseChartOptions(overrides?)` returns default chart config (responsive, legend at bottom). `winRateYAxis()` returns a y-axis config clamped to 0-100% with ticks at 0/25/50/75/100. Use Chart.js (via `<canvas ref="canvasRef">`) for line/bar charts. Import `Chart` from `chart.js` directly, call `registerCharts()` once in `<script setup>`, manage chart instances manually (create in `onMounted`, destroy in `onUnmounted`, watch computed data to re-render).

- **Custom chessboard** — The project has no npm chessboard package. For square-based visualizations (heatmaps, piece positions), build an 8x8 CSS grid. Files are a1 to h8 where a1 is bottom-left (white's perspective, rank 1). Rank 8 at top, file a at left. Squares alternate light/dark with CSS.

- **Stat component pattern** — Every component in `src/components/stats/` follows this structure:
  ```vue
  <script setup lang="ts">
  import { computed } from 'vue';
  import type { AnalysedGame } from '../../analysis/types';
  // Optional: import StatsTable from './StatsTable.vue';
  // Optional: import { Chart } from 'chart.js';

  const props = defineProps<{ games: AnalysedGame[] }>();

  const computedData = computed(() => {
    // Pure computation from props.games
  });
  </script>
  ```
  All data computation happens in computed properties. No API calls, no store access. The component is purely a function of `games`.

**Chess.com API notes:**
- No auth required, but a `User-Agent` header is required (otherwise 403).
- Games are served by month at `api.chess.com/pub/player/{username}/games/{YYYY}/{MM}`.
- ECO name is parsed from the `[Opening]` PGN header, or from `[ECOUrl]` as a fallback (last path segment with hyphens replaced by spaces).
