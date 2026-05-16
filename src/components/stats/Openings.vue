<script lang="ts" setup>
import { computed } from "vue";
import type { AnalysedGame } from "../../analysis/types";
import StatsTable from "./StatsTable.vue";

const props = defineProps<{
	games: AnalysedGame[];
}>();

type OpeningStats = {
	name: string;
	count: number;
	winRate: number;
};

const openings = computed((): OpeningStats[] => {
	const openingMap: Record<string, { name: string; count: number; winRate: number }> = {};

	props.games.forEach((game) => {
		const openingName = game.openingName || "Unknown";
		if (!openingMap[openingName]) {
			openingMap[openingName] = { name: openingName, count: 0, winRate: 0 };
		}
		openingMap[openingName].count += 1;
		if (game.result === "win") {
			openingMap[openingName].winRate += 1;
		}
	});

	Object.values(openingMap).forEach((opening) => {
		opening.winRate = opening.count > 0 ? (opening.winRate / opening.count) * 100 : 0;
	});

	return Object.values(openingMap).sort((a, b) => b.count - a.count);
});

const rows = computed(() =>
	openings.value.map((opening) => ({
		fieldName: opening.name,
		count: opening.count,
		winrate: opening.winRate
	}))
);
</script>

<template>
	<StatsTable
		title="Openings"
		fieldNameLabel="Opening"
		:rows="rows" />
</template>
