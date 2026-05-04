<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AnalysedGame } from '../../analysis/types';
import type { EndgameType } from '../../pgn/types';
import StatsTable from './StatsTable.vue';
import endgameTypeToReadable, { splitEndgameMaterial } from '../../utils/endgame';

const props = defineProps<{
    games: AnalysedGame[]
}>();

type EndgameStats = {
    type: EndgameType;
    count: number;
    winrate: number;
}

const showOnlyBalanced = ref(false);

const endgameTypes = computed(() => {
    const endgameMap: Record<EndgameType, EndgameStats> = {};

    props.games.forEach(game => {

        if (game.endgameType) {

            if (showOnlyBalanced.value) {
                const {black, white} = splitEndgameMaterial(game.endgameType) || { black: '', white: '' };
                if (!black || !white || black !== white) {
                    return;
                }
            }
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
    fieldName: endgameTypeToReadable(endgame.type),
    count: endgame.count,
    winrate: endgame.winrate
})));

</script>

<template>
    <div>
        <div style="margin-top: 1rem;">
            <label>
                <input type="checkbox" v-model="showOnlyBalanced" />
                Show only balanced endgames (same material on both sides)
            </label>
        </div>

        <StatsTable
        title="Endgames"
        field-label="Endgame"
        description="Your material balance at the end of the game. The player's material is on the left hand side."
        :rows="rows"
        />
        
    </div>
</template>