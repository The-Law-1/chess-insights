<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useAnalysisStore } from '../stores/analysisStore';
import { useGameStore } from '../stores/gameStore';
import type { TimeClass } from '../games/chessCom';
import StatsSections from '../components/StatsSections.vue';
import StatsNav from '../components/StatsNav.vue';

const store = useGameStore();
const { games, status, error, progress } = storeToRefs(store);
const analysisStore = useAnalysisStore();
const {
  analysedGames,
  status: analysisStatus,
  error: analysisError,
  progress: analysisProgress,
  stockfishFailed,
} = storeToRefs(analysisStore);

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 12 }, (_, index) => currentYear - index);

const maxGames = ref(200);
const username = ref('');
const startYear = ref(currentYear);
const endYear = ref(currentYear);
const timeClass = ref<TimeClass>('all');

const isLoading = computed(() => status.value === 'loading');
const isAnalysing = computed(() => analysisStatus.value === 'loading');
const showControls = ref(true);

const hasAnalysedGames = computed(() => analysedGames.value.length > 0);

const progressValue = computed(() => {
  if (progress.value.monthsTotal === 0) return 0;
  return Math.round((progress.value.monthsDone / progress.value.monthsTotal) * 100);
});

const progressLabel = computed(() => {
  if (progress.value.monthsTotal === 0) return 'No months queued yet';
  return `${progress.value.monthsDone}/${progress.value.monthsTotal} months`;
});

const analysisProgressValue = computed(() => {
  if (analysisProgress.value.gamesTotal === 0) return 0;
  return Math.round(
    (analysisProgress.value.gamesDone / analysisProgress.value.gamesTotal) * 100,
  );
});

const analysisProgressLabel = computed(() => {
  if (analysisProgress.value.gamesTotal === 0) return 'No analysis queued yet';
  return `${analysisProgress.value.gamesDone}/${analysisProgress.value.gamesTotal} games`;
});

const navSections = [
  { id: 'openings', label: 'Openings' },
  { id: 'endgames', label: 'Endgames' },
  { id: 'castling-timing', label: 'Castling Timing' },
  { id: 'castling-side', label: 'Castling Side' },
  { id: 'worst-piece-to-move', label: 'Worst Piece to Move' },
  { id: 'worst-piece-to-defend', label: 'Worst Piece to Defend' },
  { id: 'bishop-pair', label: 'Bishop Pair' },
  { id: 'blunder-heatmap', label: 'Blunder Heatmap' },
  { id: 'blunder-piece-heatmap', label: 'Blunder Piece Heatmap' },
  { id: 'game-length-vs-result', label: 'Game Length vs Result' },
  { id: 'piece-activity', label: 'Piece Development' },
  { id: 'avg-time-per-move', label: 'Avg Time Per Move' },
  { id: 'pawn-structure', label: 'Pawn Structure' },
  { id: 'recurring-positions', label: 'Recurring Positions' },
];

const handleSubmit = async () => {
  const trimmed = username.value.trim();
  if (!trimmed) return;
  const startDate = new Date(startYear.value, 0, 1);
  const endDate = new Date(endYear.value, 11, 31);
  await store.loadGames({
    username: trimmed,
    startDate,
    endDate,
    timeClass: timeClass.value,
    maxGames: maxGames.value,
  });
};

const handleAnalyse = async () => {
  if (!games.value.length || isAnalysing.value) return;
  const trimmed = username.value.trim();
  if (!trimmed) return;
  await analysisStore.analyseGames(games.value, trimmed);
};

const handleCancel = () => {
  analysisStore.cancel();
};
</script>

<template>
  <div class="dashboard">
    <!-- Sidebar -->
    <aside v-if="hasAnalysedGames" class="sidebar">
      <div class="sidebar-brand">
        <router-link to="/chess-insights" class="brand-link">
          <span class="brand-icon">&#9823;</span>
          <span class="brand-text">Insights</span>
        </router-link>
      </div>
      <StatsNav :sections="navSections" />
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <!-- Controls panel -->
      <div class="controls-panel" :class="{ collapsed: !showControls && hasAnalysedGames }">
        <div class="controls-header" @click="showControls = !showControls">
          <div class="controls-title">
            <h1 v-if="!hasAnalysedGames" class="page-title">Chess Insights</h1>
            <h3 v-else class="page-subtitle">Analyse your chess.com games with Stockfish</h3>
          </div>
          <button
            v-if="hasAnalysedGames"
            type="button"
            class="collapse-btn"
            :aria-label="showControls ? 'Collapse controls' : 'Expand controls'"
          >
            <span class="collapse-icon" :class="{ open: showControls }">&#9660;</span>
          </button>
        </div>

        <div v-if="showControls" class="controls-body">
          <form class="fetch-form" @submit.prevent="handleSubmit">
            <div class="form-grid">
              <label class="field">
                <span class="field-label">Username</span>
                <input v-model="username" type="text" placeholder="e.g. hikaru" />
              </label>
              <label class="field">
                <span class="field-label">Max games</span>
                <input v-model.number="maxGames" type="number" min="1" max="1000" />
              </label>
              <label class="field">
                <span class="field-label">Start year</span>
                <select v-model.number="startYear">
                  <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">End year</span>
                <select v-model.number="endYear">
                  <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
                </select>
              </label>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="isLoading">
                <span v-if="isLoading" class="btn-spinner"></span>
                {{ isLoading ? 'Fetching...' : 'Fetch games' }}
              </button>
              <button
                type="button"
                class="btn btn-accent"
                :disabled="!games.length || isAnalysing"
                @click="handleAnalyse"
              >
                <span v-if="isAnalysing" class="btn-spinner"></span>
                {{ isAnalysing ? 'Analysing...' : 'Analyse games' }}
              </button>
              <button
                v-if="isAnalysing"
                type="button"
                class="btn btn-cancel"
                @click="handleCancel"
              >
                Cancel
              </button>
            </div>
            <p v-if="stockfishFailed" class="stockfish-warning">
              Continuing PGN pattern analysis without Stockfish, press Cancel to cancel.
            </p>
          </form>

          <!-- Progress -->
          <div v-if="progress.monthsTotal > 0 || analysisProgress.gamesTotal > 0" class="progress-area">
            <div class="progress-row">
              <div class="progress-info">
                <span class="progress-label">Fetching</span>
                <span class="progress-value">{{ progressLabel }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progressValue + '%' }"></div>
              </div>
              <span class="progress-meta">{{ progress.gamesFetched }} games fetched</span>
            </div>
            <div class="progress-row">
              <div class="progress-info">
                <span class="progress-label">Analysis</span>
                <span class="progress-value">{{ analysisProgressLabel }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill accent" :style="{ width: analysisProgressValue + '%' }"></div>
              </div>
              <span v-if="analysisProgress.currentLabel" class="progress-meta">
                {{ analysisProgress.currentLabel }}
              </span>
            </div>
          </div>

          <p v-if="status === 'error'" class="error-msg">{{ error }}</p>
          <p v-if="analysisStatus === 'error'" class="error-msg">{{ analysisError }}</p>
          <p v-if="status === 'ready'" class="status-text">{{ games.length }} games in store</p>
          <p v-if="analysisStatus === 'ready'" class="status-text">
            {{ analysedGames.length }} games analysed
          </p>
        </div>
        
        <div class="large-set-warning-container" v-if="maxGames > 350">
          <div class="warning-text">
            Large game sets may take a while to load.
          </div>
          <!-- only display this warning on mobile -->
          <div class="warning-text mobile-warning">
            Analysis of large game sets may be slow on mobile devices. Try on desktop for better performance.
          </div>
        </div>

      </div>

      <!-- Stats content -->
      <div v-if="hasAnalysedGames" class="stats-area">
        <StatsSections :games="analysedGames" />
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <div class="empty-icon">&#9822;</div>
        <p class="empty-title">Enter a chess.com username to get started</p>
        <p class="empty-desc">
          Your games will be fetched and analysed with Stockfish to reveal patterns
          in your play.
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>

.large-set-warning-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.mobile-warning {
  display: none;
}

@media (max-width: 480px) {
  .mobile-warning {
    display: block;
  }
}


.warning-text {
  width: 100%;
  text-align: center;
  color: orange;
  font-weight: 500;
}

/* ── Layout ── */
.dashboard {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  padding: 40px 24px 48px;
  border-right: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  min-width: 0;
  padding: 0 48px 96px;
  max-width: 960px;
}

/* ── Sidebar brand ── */
.sidebar-brand {
  margin-bottom: 36px;
}

.brand-link {
  display: flex;
  align-items: baseline;
  gap: 10px;
  text-decoration: none;
}

.brand-icon {
  font-size: 1.5rem;
  color: var(--accent);
  line-height: 1;
}

.brand-text {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

/* ── Controls panel ── */
.controls-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 24px 28px;
  margin-top: 36px;
  margin-bottom: 8px;
  transition: padding 0.2s ease;
}

.controls-panel.collapsed {
  padding: 16px 28px;
}

.controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: default;
}

.controls-panel.collapsed .controls-header {
  cursor: pointer;
}

.page-title {
  font-size: 2.25rem;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.collapse-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: color 0.15s ease, background 0.15s ease;
}

.collapse-btn:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}

.collapse-icon {
  display: inline-block;
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}

.collapse-icon.open {
  transform: rotate(180deg);
}

.controls-body {
  margin-top: 20px;
}

/* ── Form ── */
.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 14px;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border-color: var(--border-default);
}

.btn-primary:not(:disabled):hover {
  background: var(--bg-card-raised);
  border-color: var(--border-strong);
}

.btn-accent {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent-border);
}

.btn-accent:not(:disabled):hover {
  background: rgba(212, 165, 116, 0.15);
  border-color: var(--accent);
}

.btn-cancel {
  background: transparent;
  color: var(--text-muted);
  border-color: var(--border-default);
}

.btn-cancel:hover {
  color: var(--loss);
  border-color: var(--loss);
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Progress ── */
.progress-area {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.progress-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.progress-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.progress-value {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.progress-bar {
  height: 4px;
  background: var(--bg-surface);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--text-secondary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-fill.accent {
  background: var(--accent);
}

.progress-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.status-text {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 8px;
}

.error-msg {
  font-size: 0.85rem;
  color: var(--loss);
  margin-top: 8px;
}

.stockfish-warning {
  font-size: 0.85rem;
  color: orange;
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(255, 165, 0, 0.06);
  border: 1px solid rgba(255, 165, 0, 0.2);
  border-radius: var(--radius-sm);
}

/* ── Stats area ── */
.stats-area {
  margin-top: 8px;
}

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 80px 24px;
}

.empty-icon {
  font-size: 3.5rem;
  color: var(--accent);
  opacity: 0.5;
  margin-bottom: 20px;
}

.empty-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-desc {
  color: var(--text-secondary);
  font-size: 0.95rem;
  max-width: 360px;
  margin: 0 auto;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
  .main-content {
    padding: 0 24px 64px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  .main-content {
    padding: 0 16px 48px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .controls-panel {
    padding: 16px;
    margin-top: 20px;
  }
}
</style>
