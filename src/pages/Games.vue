<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAnalysisStore } from '../stores/analysisStore'
import { useGameStore } from '../stores/gameStore'
import type { TimeClass } from '../games/chessCom'
import StatsTabs from '../components/StatsTabs.vue'

const store = useGameStore()
const { games, status, error, progress } = storeToRefs(store)
const analysisStore = useAnalysisStore()
const {
  analysedGames,
  status: analysisStatus,
  error: analysisError,
  progress: analysisProgress,
} = storeToRefs(analysisStore)

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 12 }, (_, index) => currentYear - index)

const maxGames = ref(1000)
;

const username = ref('')
const startYear = ref(currentYear)
const endYear = ref(currentYear)
const timeClass = ref<TimeClass>('all')

const isLoading = computed(() => status.value === 'loading')
const isAnalyzing = computed(() => analysisStatus.value === 'loading')
const progressValue = computed(() => {
  if (progress.value.monthsTotal === 0) {
    return 0
  }

  return Math.round((progress.value.monthsDone / progress.value.monthsTotal) * 100)
})

const progressLabel = computed(() => {
  if (progress.value.monthsTotal === 0) {
    return 'No months queued yet'
  }

  return `${progress.value.monthsDone}/${progress.value.monthsTotal} months`
})

const analysisProgressValue = computed(() => {
  if (analysisProgress.value.gamesTotal === 0) {
    return 0
  }

  return Math.round(
    (analysisProgress.value.gamesDone / analysisProgress.value.gamesTotal) * 100,
  )
})

const analysisProgressLabel = computed(() => {
  if (analysisProgress.value.gamesTotal === 0) {
    return 'No analysis queued yet'
  }

  return `${analysisProgress.value.gamesDone}/${analysisProgress.value.gamesTotal} games`
})

const handleSubmit = async () => {
  const trimmed = username.value.trim()
  if (!trimmed) {
    return
  }

  const startDate = new Date(startYear.value, 0, 1)
  const endDate = new Date(endYear.value, 11, 31)

  await store.loadGames({
    username: trimmed,
    startDate,
    endDate,
    timeClass: timeClass.value,
    maxGames: maxGames.value,
  })
}

const handleAnalyse = async () => {
  if (!games.value.length || isAnalyzing.value) {
    return
  }

  const trimmed = username.value.trim()
  if (!trimmed) {
    return
  }

  await analysisStore.analyseGames(games.value, trimmed)
}
</script>

<template>
  <section class="games">
    <header>
      <h1>Fetch Chess.com Games</h1>
      <p>Load games for a player and store them locally.</p>
    </header>

    <form class="fetch-form" @submit.prevent="handleSubmit">
      <label class="field">
        <span>Chess.com username</span>
        <input v-model="username" type="text" placeholder="e.g. hikaru" />
      </label>
      <label class="field">
        <span>Max games</span>
        <input v-model.number="maxGames" type="number" min="1" max="1000" />
      </label>

      <div class="row">
        <label class="field">
          <span>Start year</span>
          <select v-model.number="startYear">
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </label>

        <label class="field">
          <span>End year</span>
          <select v-model.number="endYear">
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </label>
      </div>

      <button type="submit" :disabled="isLoading">{{ isLoading ? 'Loading…' : 'Fetch games' }}</button>
    </form>

    <section class="status">
      <div class="status-row">
        <progress :value="progressValue" max="100"></progress>
        <span>{{ progressLabel }}</span>
      </div>
      <p class="meta">Fetched {{ progress.gamesFetched }} games.</p>
      <p v-if="status === 'ready'" class="meta">Store has {{ games.length }} total games.</p>
      <p v-if="status === 'error'" class="error">{{ error }}</p>

      <div class="status-row status-row--analysis">
        <progress :value="analysisProgressValue" max="100"></progress>
        <span>{{ analysisProgressLabel }}</span>
      </div>
      <p v-if="analysisProgress.currentLabel" class="meta">
        Analysing: {{ analysisProgress.currentLabel }}
      </p>
      <p v-if="analysisStatus === 'ready'" class="meta">
        Analysed {{ analysedGames.length }} games.
      </p>
      <p v-if="analysisStatus === 'error'" class="error">{{ analysisError }}</p>
    </section>

    <section class="analysis">
      <h2>Analyse games</h2>
      <p class="meta">
        Run Stockfish analysis on the fetched games and build the analysed dataset.
      </p>
      <button type="button" :disabled="!games.length || isAnalyzing" @click="handleAnalyse">
        {{ isAnalyzing ? 'Analysing…' : 'Analyse games' }}
      </button>
    </section>

    <section>
      <StatsTabs :games="analysedGames" v-if="analysedGames.length" />
    </section>

  </section>
</template>

<style scoped>
.games {
  padding: 48px 40px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

header p {
  color: var(--text);
  margin-top: 8px;
}

.fetch-form {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  box-shadow: var(--shadow);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

input,
select {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  font-size: 16px;
  color: var(--accent);
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

button {
  padding: 12px 18px;
  border-radius: 10px;
  border: 1px solid var(--accent-border);
  background: var(--accent-bg);
  color: var(--text-h);
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.status {
  display: grid;
  gap: 8px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-row--analysis {
  margin-top: 12px;
}

progress {
  width: 100%;
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
}

progress::-webkit-progress-bar {
  background-color: var(--code-bg);
}

progress::-webkit-progress-value {
  background-color: var(--accent);
}

.meta {
  font-size: 14px;
}

.error {
  color: #b42318;
}

.analysis {
  display: grid;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  box-shadow: var(--shadow);
}

.analysis button {
  max-width: 220px;
}
</style>
