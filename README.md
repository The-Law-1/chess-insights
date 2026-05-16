<div align="center">
  <h1>♟️ Chess Insights</h1>
  <p>
    <strong>Your chess.com games, dissected by a local chess engine.</strong><br/>
    Fetch any player's games, extract critical positions, and run Stockfish in the browser —<br/>
    no server, no sign-up, just stats.
  </p>
</div>

---

### How it works

1. **Fetch** — pulls every game from a chess.com profile via their public API, month by month.
2. **Parse** — extracts key moments from each PGN: captures, promotions, blunders, clock drops, castling.
3. **Analyze** — Stockfish 10 WASM runs locally in a Web Worker at depth 6, position by position.
4. **Visualize** — interactive stats: blunder heatmaps, opening win rates, rating by phase, piece activity, and more.

All analysis happens client-side. No backend, no API keys, no storage.

### Run locally

```bash
git clone git@github.com:The-Law-1/chess-insights.git
cd chess-insights
npm install
npm run dev
```

Requires Node ≥18. The dev server sends COOP/COEP headers needed for Stockfish WASM's `SharedArrayBuffer` — these come configured out of the box.

### Stack

| Layer       | Tech                        |
| ----------- | --------------------------- |
| Framework   | Vue 3 + TypeScript          |
| Build       | Vite 8                      |
| State       | Pinia                       |
| Router      | Vue Router 5                |
| Chess logic | chess.js                    |
| Engine      | Stockfish WASM (Web Worker) |
| Charts      | Chart.js                    |
