declare module "stockfish.wasm" {
	export default function Stockfish(options?: {}): Promise<{
		postMessage: (command: string) => void;
		addMessageListener: (listener: (line: string) => void) => void;
	}>;
}
