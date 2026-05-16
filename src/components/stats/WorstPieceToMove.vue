<script lang="ts" setup>
import { computed } from "vue";
import type { AnalysedGame } from "../../analysis/types";
import StatsTable from "./StatsTable.vue";

const props = defineProps<{
	games: AnalysedGame[];
}>();

const PIECE_NAMES: Record<string, string> = {
	N: "Knight",
	B: "Bishop",
	R: "Rook",
	Q: "Queen",
	K: "King"
};

function getPieceName(san: string): string {
	const firstChar = san[0];
	if (firstChar === "O") return "King";
	return PIECE_NAMES[firstChar] ?? "Pawn";
}

const pieceBlunders = computed(() => {
	const counts: Record<string, number> = {
		Pawn: 0,
		Knight: 0,
		Bishop: 0,
		Rook: 0,
		Queen: 0,
		King: 0
	};

	for (const game of props.games) {
		for (const blunder of game.blunders) {
			const pieceName = getPieceName(blunder.san);
			counts[pieceName] += 1;
		}
	}

	return Object.entries(counts)
		.filter(([, count]) => count > 0)
		.map(([piece, count]) => ({
			fieldName: piece,
			count
		}));
});

const rows = computed(() => pieceBlunders.value);
</script>

<template>
	<StatsTable
		title="Worst Piece to Move"
		fieldNameLabel="Piece"
		countLabel="Blunders"
		:rows="rows" />
</template>
