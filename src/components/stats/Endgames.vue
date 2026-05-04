<script setup lang="ts">
import { computed } from 'vue';
import type { AnalysedGame } from '../../analysis/types';
import type { EndgameType } from '../../pgn/types';
import StatsTable from './StatsTable.vue';

const props = defineProps<{
    games: AnalysedGame[]
}>();

type EndgameStats = {
    type: EndgameType;
    count: number;
    winrate: number;
}

const endgameTypes = computed(() => {
    const endgameMap: Record<EndgameType, EndgameStats> = {};

    props.games.forEach(game => {
        if (game.endgameType) {
            const type = game.endgameType;
            if (!endgameMap[type]) {
                endgameMap[type] = { type, count: 0, winrate: 0 };
            }
            endgameMap[type].count += 1;
            if (game.result === 'win') {
                endgameMap[type].winrate += 1;
            }
        }
    });

    return Object.values(endgameMap).map((endgame) => ({ ...endgame, winrate: endgame.count > 0 ? (endgame.winrate / endgame.count) * 100 : 0 })).sort((a, b) => b.count - a.count);
});

const rows = computed(() => endgameTypes.value.map((endgame) => ({
    fieldName: endgame.type,
    count: endgame.count,
    winrate: endgame.winrate
})));
</script>

<template>
    <StatsTable
        title="Endgames"
        field-label="Endgame"
        :rows="rows"
    />
</template>