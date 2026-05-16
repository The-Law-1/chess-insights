<script setup lang="ts">
import { computed, ref } from "vue";
import type { AnalysedGame } from "../../analysis/types";
import { blunderPieceHeatmap } from "../../analysis/blunderPieceHeatmap";
import Board from "./Board.vue";

const props = defineProps<{
	games: AnalysedGame[];
}>();

const perspective = ref<"white" | "black">("white");

const heatmap = computed(() => {
	const filteredGames =
		perspective.value === "white"
			? props.games.filter((g) => g.playerColor === "white")
			: props.games.filter((g) => g.playerColor === "black");
	return blunderPieceHeatmap(filteredGames);
});

const gameCount = computed(() => {
	return perspective.value === "white"
		? props.games.filter((g) => g.playerColor === "white").length
		: props.games.filter((g) => g.playerColor === "black").length;
});

const description = computed(
	() =>
		`From what square your blunders originated, from ${gameCount.value} game${gameCount.value !== 1 ? "s" : ""} as ${perspective.value}. Darker red = higher average centipawn loss. Hover for exact values.`
);

const emptyMessage = computed(
	() => `No blunders found in ${gameCount.value} game${gameCount.value !== 1 ? "s" : ""} as ${perspective.value}.`
);
</script>

<template>
	<Board
		title="Worst Piece Positions (Blunder Origins)"
		:description="description"
		:perspective="perspective"
		:heatmap="heatmap"
		:empty-message="emptyMessage"
		@update:perspective="perspective = $event" />
</template>
