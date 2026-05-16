import { defineStore } from "pinia";
import type { FetchParams, FetchProgress, RawGame } from "../games/chessCom";
import { fetchGamesSequential } from "../games/chessCom";

interface GameStoreState {
	games: RawGame[];
	status: "idle" | "loading" | "error" | "ready";
	error: string | null;
	progress: FetchProgress;
}

const emptyProgress: FetchProgress = {
	monthsDone: 0,
	monthsTotal: 0,
	gamesFetched: 0
};

export const useGameStore = defineStore("gameStore", {
	state: (): GameStoreState => ({
		games: [],
		status: "idle",
		error: null,
		progress: { ...emptyProgress }
	}),
	actions: {
		async loadGames(params: FetchParams): Promise<void> {
			this.status = "loading";
			this.error = null;
			this.games = [];
			this.progress = { ...emptyProgress };

			try {
				const games = await fetchGamesSequential(params, (progress) => {
					this.progress = progress;
				});

				this.games = games;
				this.status = "ready";
			} catch (error) {
				this.status = "error";
				this.error = error instanceof Error ? error.message : "Unknown error";
			}
		}
	}
});
