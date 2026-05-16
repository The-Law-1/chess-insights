<script setup lang="ts">
import { computed } from "vue";
import type { AnalysedGame } from "../../analysis/types";
import { countIsolatedPawns, hasPassedPawnOnAdvanceRank } from "../../analysis/pawnStructure";
import StatsTable from "./StatsTable.vue";

const props = defineProps<{
	games: AnalysedGame[];
}>();

interface PawnStatsRow {
	fieldName: string;
	count: number;
	winrate: number;
}

// --- Isolated pawns (player + enemy) ---

const isolatedRows = computed<PawnStatsRow[]>(() => {
	const playerBuckets: Record<number, { count: number; wins: number }> = {};
	const enemyBuckets: Record<number, { count: number; wins: number }> = {};

	props.games.forEach((game) => {
		const playerSide = game.playerColor === "white" ? "w" : "b";
		const enemySide = playerSide === "w" ? "b" : "w";
		const lastFrame = game.frames[game.frames.length - 1];
		if (!lastFrame) return;

		const playerIsolated = countIsolatedPawns(lastFrame.fenAfter, playerSide);
		const enemyIsolated = countIsolatedPawns(lastFrame.fenAfter, enemySide);

		const pBucket = playerIsolated >= 3 ? 3 : playerIsolated;
		const eBucket = enemyIsolated >= 3 ? 3 : enemyIsolated;

		for (const [bucket, source] of [
			[pBucket, playerBuckets],
			[eBucket, enemyBuckets]
		] as const) {
			if (!source[bucket]) {
				source[bucket] = { count: 0, wins: 0 };
			}
			source[bucket].count++;
			if (game.result === "win") {
				source[bucket].wins++;
			}
		}
	});

	const labels: Record<number, string> = {
		0: "0 isolated pawns",
		1: "1 isolated pawn",
		2: "2 isolated pawns",
		3: "3+ isolated pawns"
	};

	const rows: PawnStatsRow[] = [];

	for (const b of [0, 1, 2, 3]) {
		if (playerBuckets[b]) {
			rows.push({
				fieldName: `You: ${labels[b]}`,
				count: playerBuckets[b].count,
				winrate: playerBuckets[b].count > 0 ? (playerBuckets[b].wins / playerBuckets[b].count) * 100 : 0
			});
		}
	}

	for (const b of [0, 1, 2, 3]) {
		if (enemyBuckets[b]) {
			rows.push({
				fieldName: `Enemy: ${labels[b]}`,
				count: enemyBuckets[b].count,
				winrate: enemyBuckets[b].count > 0 ? (enemyBuckets[b].wins / enemyBuckets[b].count) * 100 : 0
			});
		}
	}

	return rows;
});

const isolatedAvg = computed(() => {
	let playerTotal = 0;
	let enemyTotal = 0;
	let n = 0;

	props.games.forEach((game) => {
		const playerSide = game.playerColor === "white" ? "w" : "b";
		const enemySide = playerSide === "w" ? "b" : "w";
		const lastFrame = game.frames[game.frames.length - 1];
		if (!lastFrame) return;

		playerTotal += countIsolatedPawns(lastFrame.fenAfter, playerSide);
		enemyTotal += countIsolatedPawns(lastFrame.fenAfter, enemySide);
		n++;
	});

	return {
		playerAvg: n > 0 ? playerTotal / n : 0,
		enemyAvg: n > 0 ? enemyTotal / n : 0,
		n
	};
});

// --- Passed pawns on rank 6/7 (player + enemy) ---

const passedRows = computed<PawnStatsRow[]>(() => {
	let playerWith = 0;
	let playerWithWins = 0;
	let playerWithout = 0;
	let playerWithoutWins = 0;

	let enemyWith = 0;
	let enemyWithWins = 0;
	let enemyWithout = 0;
	let enemyWithoutWins = 0;

	props.games.forEach((game) => {
		const playerSide = game.playerColor === "white" ? "w" : "b";
		const enemySide = playerSide === "w" ? "b" : "w";

		let playerHas = false;
		let enemyHas = false;
		for (const frame of game.frames) {
			if (!playerHas && hasPassedPawnOnAdvanceRank(frame.fenAfter, playerSide)) {
				playerHas = true;
			}
			if (!enemyHas && hasPassedPawnOnAdvanceRank(frame.fenAfter, enemySide)) {
				enemyHas = true;
			}
			if (playerHas && enemyHas) break;
		}

		if (playerHas) {
			playerWith++;
			if (game.result === "win") playerWithWins++;
		} else {
			playerWithout++;
			if (game.result === "win") playerWithoutWins++;
		}

		if (enemyHas) {
			enemyWith++;
			if (game.result === "win") enemyWithWins++;
		} else {
			enemyWithout++;
			if (game.result === "win") enemyWithoutWins++;
		}
	});

	return [
		{
			fieldName: "You: has passed pawn(s) on rank 6/7",
			count: playerWith,
			winrate: playerWith > 0 ? (playerWithWins / playerWith) * 100 : 0
		},
		{
			fieldName: "You: no passed pawn on rank 6/7",
			count: playerWithout,
			winrate: playerWithout > 0 ? (playerWithoutWins / playerWithout) * 100 : 0
		},
		{
			fieldName: "Enemy: has passed pawn(s) on rank 6/7",
			count: enemyWith,
			winrate: enemyWith > 0 ? (enemyWithWins / enemyWith) * 100 : 0
		},
		{
			fieldName: "Enemy: no passed pawn on rank 6/7",
			count: enemyWithout,
			winrate: enemyWithout > 0 ? (enemyWithoutWins / enemyWithout) * 100 : 0
		}
	].filter((r) => r.count > 0);
});

const passedAvg = computed(() => {
	let playerCount = 0;
	let enemyCount = 0;

	props.games.forEach((game) => {
		const playerSide = game.playerColor === "white" ? "w" : "b";
		const enemySide = playerSide === "w" ? "b" : "w";

		let playerHas = false;
		let enemyHas = false;
		for (const frame of game.frames) {
			if (!playerHas && hasPassedPawnOnAdvanceRank(frame.fenAfter, playerSide)) {
				playerHas = true;
			}
			if (!enemyHas && hasPassedPawnOnAdvanceRank(frame.fenAfter, enemySide)) {
				enemyHas = true;
			}
			if (playerHas && enemyHas) break;
		}

		if (playerHas) playerCount++;
		if (enemyHas) enemyCount++;
	});

	return {
		playerPct: props.games.length > 0 ? (playerCount / props.games.length) * 100 : 0,
		enemyPct: props.games.length > 0 ? (enemyCount / props.games.length) * 100 : 0,
		n: props.games.length
	};
});
</script>

<template>
	<div class="pawn-structure">
		<StatsTable
			title="Isolated Pawns vs Win Rate"
			fieldNameLabel="Isolated pawns at game end"
			:description="`Average isolated pawns per game: You ${isolatedAvg.playerAvg.toFixed(2)} · Enemy ${isolatedAvg.enemyAvg.toFixed(2)} (${isolatedAvg.n} games). An isolated pawn has no friendly pawn on an adjacent file in the final position.`"
			:rows="isolatedRows" />

		<StatsTable
			title="Passed Pawns on Rank 6/7 vs Win Rate"
			fieldNameLabel="Passed pawn on rank 6/7"
			:description="`You had a passed pawn on rank 6/7 in ${passedAvg.playerPct.toFixed(1)}% of games · Enemy in ${passedAvg.enemyPct.toFixed(1)}% (${passedAvg.n} games). A passed pawn has no enemy pawn ahead on its file or adjacent files.`"
			:rows="passedRows" />
	</div>
</template>

<style scoped>
.pawn-structure {
	display: flex;
	flex-direction: column;
	gap: 2rem;
}
</style>
