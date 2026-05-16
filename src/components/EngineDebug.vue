<script setup lang="ts">
import { onMounted, ref } from "vue";
import StockfishWorker from "../engine/StockfishWorker";

const engine = new StockfishWorker();
const commandText = ref("");
const outputLines = ref<string[]>([]);
const isBusy = ref(false);

const appendLines = (lines: string[]) => {
	outputLines.value.push(...lines);
};

const sendCommand = async () => {
	const raw = commandText.value.trim();
	if (!raw || isBusy.value) {
		return;
	}

	const lines = raw
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	isBusy.value = true;
	try {
		for (let i = 0; i < lines.length; i += 1) {
			const line = lines[i];
			appendLines([`> ${line}`]);

			if (i < lines.length - 1) {
				engine.sendRaw(line);
				continue;
			}

			const response = await engine.sendCommand(line);
			appendLines(response);
		}
	} finally {
		isBusy.value = false;
		commandText.value = "";
	}
};

onMounted(async () => {
	const uci = await engine.sendCommand("uci");
	appendLines(uci);
	const ready = await engine.sendCommand("isready");
	appendLines(ready);
});
</script>

<template>
	<section class="engine-debug">
		<h1>Stockfish Engine Debug</h1>
		<div class="engine-debug__controls">
			<textarea
				v-model="commandText"
				rows="3"
				placeholder="Type UCI commands, one per line" />
			<button
				type="button"
				:disabled="isBusy"
				@click="sendCommand">
				{{ isBusy ? "Working..." : "Send" }}
			</button>
		</div>
		<pre class="engine-debug__output"
			>{{ outputLines.join("\n") }}
    </pre
		>
	</section>
</template>

<style scoped>
.engine-debug {
	max-width: 900px;
	margin: 2rem auto;
	padding: 1.5rem;
	display: grid;
	gap: 1rem;
	font-family:
		"Fira Code", "SFMono-Regular", ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas,
		"Liberation Mono", "Courier New", monospace;
}

.engine-debug__controls {
	display: grid;
	gap: 0.75rem;
}

.engine-debug textarea {
	width: 100%;
	padding: 0.75rem;
	border-radius: 8px;
	border: 1px solid #334155;
	background: #0f172a;
	color: #e2e8f0;
}

.engine-debug button {
	align-self: flex-start;
	padding: 0.5rem 1rem;
	border-radius: 999px;
	border: none;
	background: #16a34a;
	color: #ffffff;
	font-weight: 600;
	cursor: pointer;
}

.engine-debug button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.engine-debug__output {
	min-height: 240px;
	padding: 1rem;
	border-radius: 12px;
	background: #020617;
	color: #e2e8f0;
	overflow: auto;
	white-space: pre-wrap;
}
</style>
