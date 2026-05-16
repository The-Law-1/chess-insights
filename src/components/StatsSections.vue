<script setup lang="ts">
import type { AnalysedGame } from "../analysis/types";
import Openings from "./stats/Openings.vue";
import Endgames from "./stats/Endgames.vue";
import CastlingTiming from "./stats/CastlingTiming.vue";
import CastlingSide from "./stats/CastlingSide.vue";
import WorstPieceToMove from "./stats/WorstPieceToMove.vue";
import WorstPieceToDefend from "./stats/WorstPieceToDefend.vue";
import BishopPair from "./stats/BishopPair.vue";
import BlunderHeatmap from "./stats/BlunderHeatmap.vue";
import BlunderPieceHeatmap from "./stats/BlunderPieceHeatmap.vue";
import GameLengthVsResult from "./stats/GameLengthVsResult.vue";
import PieceActivity from "./stats/PieceActivity.vue";
import AverageTimePerMove from "./stats/AverageTimePerMove.vue";
import PawnStructure from "./stats/PawnStructure.vue";
import BadPositions from "./stats/BadPositions.vue";

const props = defineProps<{
	games: AnalysedGame[];
}>();

interface Section {
	id: string;
	label: string;
	component: any;
}

const sections: Section[] = [
	{ id: "openings", label: "Openings", component: Openings },
	{ id: "endgames", label: "Endgames", component: Endgames },
	{ id: "castling-timing", label: "Castling Timing", component: CastlingTiming },
	{ id: "castling-side", label: "Castling Side", component: CastlingSide },
	{ id: "worst-piece-to-move", label: "Worst Piece to Move", component: WorstPieceToMove },
	{ id: "worst-piece-to-defend", label: "Worst Piece to Defend", component: WorstPieceToDefend },
	{ id: "bishop-pair", label: "Bishop Pair", component: BishopPair },
	{ id: "blunder-heatmap", label: "Blunder Heatmap", component: BlunderHeatmap },
	{ id: "blunder-piece-heatmap", label: "Blunder Piece Heatmap", component: BlunderPieceHeatmap },
	{ id: "game-length-vs-result", label: "Game Length vs Result", component: GameLengthVsResult },
	{ id: "piece-activity", label: "Piece Development", component: PieceActivity },
	{ id: "avg-time-per-move", label: "Avg Time Per Move", component: AverageTimePerMove },
	{ id: "pawn-structure", label: "Pawn Structure", component: PawnStructure },
	{ id: "recurring-positions", label: "Recurring Positions", component: BadPositions }
];
</script>

<template>
	<div class="stats-sections">
		<section
			v-for="(section, i) in sections"
			:id="section.id"
			:key="section.id"
			class="stats-section"
			:style="{ animationDelay: `${i * 40}ms` }">
			<header class="section-header">
				<span class="section-number">{{ String(i + 1).padStart(2, "0") }}</span>
				<h2 class="section-title">{{ section.label }}</h2>
				<div class="section-line"></div>
			</header>
			<div class="section-body">
				<component
					:is="section.component"
					:games="props.games" />
			</div>
		</section>
	</div>
</template>

<style scoped>
.stats-sections {
	display: flex;
	flex-direction: column;
	gap: 0;
}

.stats-section {
	padding: 48px 0;
	border-bottom: 1px solid var(--border-subtle);
	opacity: 0;
	transform: translateY(16px);
	animation: section-enter 0.5s ease forwards;
}

.stats-section:first-child {
	padding-top: 24px;
}

.stats-section:last-child {
	border-bottom: none;
}

@keyframes section-enter {
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.section-header {
	display: flex;
	align-items: baseline;
	gap: 14px;
	margin-bottom: 32px;
}

.section-number {
	font-family: var(--font-mono);
	font-size: 0.75rem;
	font-weight: 500;
	color: var(--accent);
	letter-spacing: 0.08em;
	opacity: 0.7;
}

.section-title {
	font-family: var(--font-display);
	font-size: 1.65rem;
	font-weight: 500;
	color: var(--text-primary);
	letter-spacing: -0.01em;
	white-space: nowrap;
}

.section-line {
	flex: 1;
	height: 1px;
	background: var(--border-subtle);
	margin-left: 4px;
	align-self: center;
}

.section-body {
	padding-left: 0;
}

@media (max-width: 768px) {
	.stats-section {
		padding: 36px 0;
	}
	.section-title {
		font-size: 1.35rem;
	}
}
</style>
