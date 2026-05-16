import { defineStore } from "pinia";
import type { AnalysedGame } from "../analysis/types";
import type { RawGame } from "../games/chessCom";
import StockfishWorker from "../engine/StockfishWorker";
import { analyseGame } from "../analysis/analyseGame";

export interface AnalysisProgress {
	gamesDone: number;
	gamesTotal: number;
	currentLabel: string | null;
}

interface AnalysisStoreState {
	analysedGames: AnalysedGame[];
	status: "idle" | "loading" | "error" | "ready";
	error: string | null;
	progress: AnalysisProgress;
	cancelled: boolean;
	stockfishFailed: boolean;
}

const emptyProgress: AnalysisProgress = {
	gamesDone: 0,
	gamesTotal: 0,
	currentLabel: null
};

export const useAnalysisStore = defineStore("analysisStore", {
	state: (): AnalysisStoreState => ({
		analysedGames: [],
		status: "idle",
		error: null,
		progress: { ...emptyProgress },
		cancelled: false,
		stockfishFailed: false
	}),
	actions: {
		async analyseGames(raws: RawGame[], username: string): Promise<void> {
			this.status = "loading";
			this.error = null;
			this.cancelled = false;
			this.stockfishFailed = false;
			this.analysedGames = [];
			this.progress = { gamesDone: 0, gamesTotal: raws.length, currentLabel: null };

			let stockfishFailed = false;

			if (!window.crossOriginIsolated) {
				this.status = "error";
				this.error =
					"An error occurred while initializing Stockfish WASM. " +
					"Incognito/private browsing mode disables service workers, could also be an obscure service worker issue. " +
					"If you are on mobile, try closing the tab and re-opening, or using a desktop.";

				stockfishFailed = true;
				this.stockfishFailed = true;
			}

			let worker = null;
			if (!stockfishFailed) {
				worker = new StockfishWorker();
				try {
					await worker.sendCommand("uci");
					await worker.sendCommand("isready");
				} catch {
					stockfishFailed = true;
					this.stockfishFailed = true;
					worker?.terminate();
				}
			}

			// Accumulate in a plain (non-reactive) array to avoid triggering
			// every stat component's computed properties on each push. A single
			// assignment at the end gives one render pass instead of O(n²).
			const results: AnalysedGame[] = [];

			for (let index = 0; index < raws.length; index += 1) {
				if (this.cancelled) break;

				const raw = raws[index];
				this.progress = {
					gamesDone: index,
					gamesTotal: raws.length,
					currentLabel: raw.url || raw.uuid || null
				};

				try {
					const analysed = stockfishFailed
						? await analyseGame(raw, username, null)
						: await analyseGame(raw, username, worker);
					results.push(analysed);
					if (stockfishFailed) {
						// Yield to the event loop so Vue can re-render the progress bar.
						// Without Stockfish, analyseGame runs synchronously and the UI
						// would never see intermediate progress.
						await new Promise((resolve) => setTimeout(resolve, 0));
					}
				} catch (error) {
					if (!stockfishFailed) {
						stockfishFailed = true;
						this.stockfishFailed = true;
						worker?.terminate();
						const analysed = await analyseGame(raw, username, null);
						results.push(analysed);
						await new Promise((resolve) => setTimeout(resolve, 0));
					}
				}

				this.progress = {
					gamesDone: index + 1,
					gamesTotal: raws.length,
					currentLabel: raw.url || raw.uuid || null
				};
			}

			if (!stockfishFailed) {
				worker?.terminate();
			}

			this.analysedGames = results;
			this.status = "ready";
		},
		cancel(): void {
			this.cancelled = true;
		}
	}
});
