import Stockfish from "stockfish.wasm";
import stockfishWasmUrl from "stockfish.wasm/stockfish.wasm?url";
import stockfishWorkerUrl from "stockfish.wasm/stockfish.worker.js?url";

type StockfishEngine = {
	postMessage: (command: string) => void;
	addMessageListener: (listener: (line: string) => void) => void;
};

const pendingCommands: string[] = [];

const enginePromise: Promise<StockfishEngine> = Stockfish({
	locateFile: (path: string) => {
		if (path.endsWith(".wasm")) {
			return stockfishWasmUrl;
		}
		if (path.endsWith(".worker.js")) {
			return stockfishWorkerUrl;
		}
		return path;
	}
});

enginePromise
	.then((engine) => {
		engine.addMessageListener((line: string) => {
			self.postMessage(line);
		});

		while (pendingCommands.length > 0) {
			const command = pendingCommands.shift();
			if (command) {
				engine.postMessage(command);
			}
		}
	})
	.catch((err) => {
		// Re-throw to trigger the worker's error event, which fires
		// worker.onerror in the main thread. setTimeout lets the engine
		// initialization promise settle before throwing.
		setTimeout(() => {
			throw err instanceof Error ? err : new Error(String(err));
		}, 0);
	});

self.onmessage = (event: MessageEvent<string>) => {
	const command = event.data;
	enginePromise
		.then((engine) => {
			engine.postMessage(command);
		})
		.catch(() => {
			pendingCommands.push(command);
		});
};
