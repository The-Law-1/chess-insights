import { defineStore } from 'pinia'
import type { AnalysedGame } from '../analysis/types'
import type { RawGame } from '../games/chessCom'
import StockfishWorker from '../engine/StockfishWorker'
import { analyseGame } from '../analysis/analyseGame'

export interface AnalysisProgress {
  gamesDone: number
  gamesTotal: number
  currentLabel: string | null
}

interface AnalysisStoreState {
  analysedGames: AnalysedGame[]
  status: 'idle' | 'loading' | 'error' | 'ready'
  error: string | null
  progress: AnalysisProgress
  cancelled: boolean
}

const emptyProgress: AnalysisProgress = {
  gamesDone: 0,
  gamesTotal: 0,
  currentLabel: null,
}

export const useAnalysisStore = defineStore('analysisStore', {
  state: (): AnalysisStoreState => ({
    analysedGames: [],
    status: 'idle',
    error: null,
    progress: { ...emptyProgress },
    cancelled: false,
  }),
  actions: {
    async analyseGames(raws: RawGame[], username: string): Promise<void> {
      this.status = 'loading'
      this.error = null
      this.cancelled = false
      this.analysedGames = []
      this.progress = { gamesDone: 0, gamesTotal: raws.length, currentLabel: null }

      const worker = new StockfishWorker()

      try {
        await worker.sendCommand('uci')
        await worker.sendCommand('isready')

        for (let index = 0; index < raws.length; index += 1) {
          if (this.cancelled) break

          const raw = raws[index]
          this.progress = {
            gamesDone: index,
            gamesTotal: raws.length,
            currentLabel: raw.url || raw.uuid || null,
          }

          const analysed = await analyseGame(raw, username, worker)
          this.analysedGames.push(analysed)

          this.progress = {
            gamesDone: index + 1,
            gamesTotal: raws.length,
            currentLabel: raw.url || raw.uuid || null,
          }
        }

        this.status = 'ready'
      } catch (error) {
        this.status = 'error'
        this.error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        worker.terminate()
      }
    },
    cancel(): void {
      this.cancelled = true
    },
  },
})
