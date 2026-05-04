<script setup lang="ts">
import { computed } from 'vue';
import type { AnalysedGame } from '../../analysis/types';
import StatsTable from './StatsTable.vue';

const props = defineProps<{
    games: AnalysedGame[]
}>();

type CastlingTimingStats = {
    castledOnMove: string;
    count: number;
    winRate: number;
}

const castlingTimingAnalysis = computed((): CastlingTimingStats[] => {
    const map: Record<string, { count: number; winRate: number }> = {};

    props.games.forEach(game => {
        const key = game.playerCastledAtMove !== null
            ? `Move ${game.playerCastledAtMove}`
            : 'Did not castle';

        if (!map[key]) {
            map[key] = { count: 0, winRate: 0 };
        }
        map[key].count += 1;
        if (game.result === 'win') {
            map[key].winRate += 1;
        }
    });

    return Object.entries(map)
        .map(([castledOnMove, stats]) => ({
            castledOnMove,
            count: stats.count,
            winRate: stats.count > 0 ? (stats.winRate / stats.count) * 100 : 0,
        }))
        .sort((a, b) => {
            // "Did not castle" always last
            if (a.castledOnMove === 'Did not castle') return 1;
            if (b.castledOnMove === 'Did not castle') return -1;
            return a.count - b.count;
        });
});

const rows = computed(() => castlingTimingAnalysis.value.map(item => ({
    fieldName: item.castledOnMove,
    count: item.count,
    winrate: item.winRate,
})));
</script>

<template>
    <StatsTable
        title="Castling Timing"
        fieldNameLabel="Castled on move"
        description="When you castled and how it correlates with winning."
        :rows="rows"
    />
</template>
