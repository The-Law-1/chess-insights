<script setup lang="ts">
import { computed, ref } from "vue";
import { extractKeyPositions, type KeyReason } from "../pgn/extractKeyPositions";
import { parseGame, type ParsedGame } from "../pgn/parseGame";

const pgnText = ref("");
const parsedGame = ref<ParsedGame | null>(null);
const errorMessage = ref<string | null>(null);

const parsePgn = () => {
	errorMessage.value = null;
	parsedGame.value = null;

	const trimmed = pgnText.value.trim();
	if (!trimmed) {
		errorMessage.value = "Paste a PGN first.";
		return;
	}

	try {
		parsedGame.value = parseGame(trimmed);
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : "Failed to parse PGN.";
	}
};

const metadataRows = computed(() => {
	if (!parsedGame.value) {
		return [];
	}

	const meta = parsedGame.value.metadata;
	const deviation = meta.deviatedFromBookMove;
	const deviationLabel = deviation
		? `Move ${deviation.moveNumber} (${deviation.color === "w" ? "White" : "Black"})`
		: null;
	const deviationDetail = deviation
		? deviation.expected
			? `Played ${deviation.played}, expected ${deviation.expected}`
			: `Played ${deviation.played}`
		: null;

	return [
		{ label: "White", value: meta.white },
		{ label: "Black", value: meta.black },
		{ label: "Result", value: meta.result },
		{ label: "Opening", value: meta.opening },
		{ label: "ECO", value: meta.eco },
		{ label: "Time Control", value: meta.timeControl },
		{ label: "UTC Date", value: meta.utcDate },
		{ label: "UTC Time", value: meta.utcTime },

		{
			label: "Average Time Spent per Move (White)",
			value: meta.averageMoveTimeSecondsWhite != null ? `${meta.averageMoveTimeSecondsWhite.toFixed(2)}s` : null
		},
		{
			label: "Average Time Spent per Move (Black)",
			value: meta.averageMoveTimeSecondsBlack != null ? `${meta.averageMoveTimeSecondsBlack.toFixed(2)}s` : null
		},
		{ label: "Book deviation", value: deviationLabel },
		{ label: "Deviation detail", value: deviationDetail }
	];
});

const summaryRows = computed(() => {
	if (!parsedGame.value) {
		return [];
	}

	const frames = parsedGame.value.frames;
	const clockedMoves = frames.filter((frame) => frame.clockSeconds !== null).length;
	const captures = frames.filter((frame) => frame.isCapture).length;
	const checks = frames.filter((frame) => frame.isCheck).length;

	return [
		{ label: "Total plies", value: frames.length },
		{ label: "Clocked plies", value: clockedMoves },
		{ label: "Captures", value: captures },
		{ label: "Checks", value: checks }
	];
});

const reasonLabels: Record<KeyReason, string> = {
	"major-piece-capture": "Major piece capture",
	"minor-piece-capture": "Minor piece capture",
	"pawn-capture": "Pawn capture",
	"check-after-capture": "Check after capture",
	promotion: "Promotion",
	castling: "Castling",
	"large-clock-drop": "Large clock drop",
	"pre-checkmate": "Pre-checkmate",
	"consecutive-captures": "Consecutive captures"
};

const keyPositionRows = computed(() => {
	if (!parsedGame.value) {
		return [];
	}

	const frames = parsedGame.value.frames;
	const startPlyIndex = parsedGame.value.metadata.firstNonBookMoveIndex;
	return extractKeyPositions(frames, { startPlyIndex }).map((position) => {
		const frame = frames[position.plyIndex];
		const colorLabel = frame.color === "w" ? "White" : "Black";
		return {
			plyIndex: position.plyIndex,
			moveNumber: frame.moveNumber,
			color: colorLabel,
			san: frame.san,
			reasons: position.reasons.map((reason) => reasonLabels[reason])
		};
	});
});
</script>

<template>
	<section class="pgn-loader">
		<header class="pgn-loader__header">
			<p class="pgn-loader__eyebrow">Step 2 - PGN Parsing</p>
			<h1>PGN loader</h1>
			<p class="pgn-loader__subtitle">
				Paste a PGN, parse it into structured frames, and verify the metadata before analysis.
			</p>
		</header>

		<div class="pgn-loader__input">
			<textarea
				v-model="pgnText"
				rows="10"
				placeholder="Paste PGN text here" />
			<button
				type="button"
				@click="parsePgn">
				Parse PGN
			</button>
		</div>

		<p
			v-if="errorMessage"
			class="pgn-loader__error">
			{{ errorMessage }}
		</p>

		<div
			v-if="parsedGame"
			class="pgn-loader__output">
			<div class="pgn-loader__panel">
				<h2>Metadata</h2>
				<dl>
					<template
						v-for="row in metadataRows"
						:key="row.label">
						<dt>{{ row.label }}</dt>
						<dd>{{ row.value ?? "-" }}</dd>
					</template>
				</dl>
			</div>

			<div class="pgn-loader__panel">
				<h2>Summary</h2>
				<dl>
					<template
						v-for="row in summaryRows"
						:key="row.label">
						<dt>{{ row.label }}</dt>
						<dd>{{ row.value }}</dd>
					</template>
				</dl>
			</div>

			<div class="pgn-loader__panel pgn-loader__panel--full">
				<h2>Key positions (Step 3)</h2>
				<p class="pgn-loader__hint">These positions will be sent to Stockfish for evaluation.</p>
				<p
					v-if="!keyPositionRows.length"
					class="pgn-loader__empty">
					No key positions found.
				</p>
				<ol
					v-else
					class="pgn-loader__key-list">
					<li
						v-for="row in keyPositionRows"
						:key="row.plyIndex">
						<strong>Move {{ row.moveNumber }} {{ row.color }}:</strong>
						{{ row.san }}
						<span class="pgn-loader__reasons">({{ row.reasons.join(", ") }})</span>
					</li>
				</ol>
			</div>
		</div>
	</section>
</template>

<style scoped>
.pgn-loader {
	max-width: 980px;
	margin: 2.5rem auto;
	padding: 2rem;
	display: grid;
	gap: 1.75rem;
	background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
	border-radius: 24px;
	box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
	color: #0f172a;
	font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
}

.pgn-loader__header {
	display: grid;
	gap: 0.35rem;
}

.pgn-loader__eyebrow {
	text-transform: uppercase;
	letter-spacing: 0.2em;
	font-size: 0.7rem;
	color: #64748b;
}

.pgn-loader__subtitle {
	max-width: 600px;
	color: #475569;
}

.pgn-loader__input {
	display: grid;
	gap: 0.75rem;
}

.pgn-loader__input textarea {
	width: 100%;
	padding: 1rem;
	border-radius: 16px;
	border: 1px solid #cbd5f5;
	background: #ffffff;
	font-family:
		"Fira Code", "SFMono-Regular", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
		"Courier New", monospace;
	font-size: 0.9rem;
	color: #0f172a;
}

.pgn-loader__input button {
	align-self: flex-start;
	padding: 0.65rem 1.4rem;
	border: none;
	border-radius: 999px;
	background: #0f172a;
	color: #f8fafc;
	font-weight: 600;
	cursor: pointer;
}

.pgn-loader__error {
	padding: 0.75rem 1rem;
	border-radius: 12px;
	background: #fee2e2;
	color: #991b1b;
}

.pgn-loader__output {
	display: grid;
	gap: 1.25rem;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.pgn-loader__panel {
	padding: 1.25rem;
	border-radius: 16px;
	background: #ffffff;
	border: 1px solid #e2e8f0;
}

.pgn-loader__panel--full {
	grid-column: 1 / -1;
}

.pgn-loader__panel h2 {
	margin: 0 0 0.75rem;
	font-size: 1.05rem;
}

.pgn-loader__panel dl {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 0.4rem 1rem;
	margin: 0;
}

.pgn-loader__panel dt {
	font-weight: 600;
	color: #1e293b;
}

.pgn-loader__panel dd {
	margin: 0;
	color: #475569;
}

.pgn-loader__hint {
	margin: 0 0 0.75rem;
	color: #64748b;
}

.pgn-loader__empty {
	margin: 0;
	color: #94a3b8;
}

.pgn-loader__key-list {
	margin: 0;
	padding-left: 1.25rem;
	display: grid;
	gap: 0.5rem;
	color: #334155;
}

.pgn-loader__reasons {
	color: #64748b;
	font-size: 0.85rem;
}

@media (max-width: 640px) {
	.pgn-loader {
		margin: 1.5rem 1rem;
		padding: 1.5rem;
	}
}
</style>
