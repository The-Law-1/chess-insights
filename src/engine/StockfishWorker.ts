type PendingRequest = {
	command: string;
	lines: string[];
	resolve: (lines: string[]) => void;
	reject: (error: unknown) => void;
};

export default class StockfishWorker {
	private worker: Worker;
	private queue: PendingRequest[] = [];
	private current: PendingRequest | null = null;

	constructor() {
		this.worker = new Worker(`${import.meta.env.BASE_URL}stockfish/engine-worker.js`);

		this.worker.onmessage = (event: MessageEvent<string>) => {
			this.handleMessage(event.data);
		};

		this.worker.onerror = (error) => {
			if (this.current) {
				this.current.reject(error);
				this.current = null;
			}
			for (const pending of this.queue) {
				pending.reject(error);
			}
			this.queue = [];
		};
	}

	sendRaw(command: string): void {
		this.worker.postMessage(command);
	}

	sendCommand(command: string): Promise<string[]> {
		return new Promise((resolve, reject) => {
			this.queue.push({ command, lines: [], resolve, reject });
			this.flushQueue();
		});
	}

	async getBestMove(fen: string, depth: number): Promise<string> {
		this.sendRaw(`position fen ${fen}`);
		const lines = await this.sendCommand(`go depth ${depth}`);
		const bestMoveLine = lines.find((line) => line.startsWith("bestmove "));
		return bestMoveLine ? bestMoveLine.split(" ")[1] : "";
	}

	async evaluate(fen: string, depth: number): Promise<number> {
		this.sendRaw(`position fen ${fen}`);
		const lines = await this.sendCommand(`go depth ${depth}`);
		let score: number | null = null;

		for (const line of lines) {
			const match = line.match(/score (cp|mate) (-?\d+)/);
			if (!match) {
				continue;
			}

			const type = match[1];
			const value = Number(match[2]);
			if (type === "cp") {
				score = value;
			} else if (type === "mate") {
				score = value > 0 ? 9999 : -9999;
			}
		}

		return score ?? 0;
	}

	terminate(): void {
		this.worker.terminate();
		this.queue = [];
		this.current = null;
	}

	private handleMessage(line: string): void {
		if (!this.current) {
			return;
		}

		this.current.lines.push(line);

		if (line === "readyok" || line === "uciok" || line.startsWith("bestmove")) {
			this.current.resolve(this.current.lines);
			this.current = null;
			this.flushQueue();
		}
	}

	private flushQueue(): void {
		if (this.current || this.queue.length === 0) {
			return;
		}

		this.current = this.queue.shift() ?? null;
		if (this.current) {
			this.worker.postMessage(this.current.command);
		}
	}
}
