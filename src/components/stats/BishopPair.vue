<script lang="ts" setup>
import { computed } from 'vue';
import type { AnalysedGame } from '../../analysis/types';
import StatsTable from './StatsTable.vue';

const props = defineProps<{
    games: AnalysedGame[]
}>();

interface PhaseGroup {
    sum: number;
    count: number;
}

interface BishopPairGroups {
    opening: { withPair: PhaseGroup; withoutPair: PhaseGroup };
    middlegame: { withPair: PhaseGroup; withoutPair: PhaseGroup };
    endgame: { withPair: PhaseGroup; withoutPair: PhaseGroup };
}

function bishopPairAdvantage(games: AnalysedGame[]) {
    const groups: BishopPairGroups = {
        opening: {
            withPair: { sum: 0, count: 0 },
            withoutPair: { sum: 0, count: 0 },
        },
        middlegame: {
            withPair: { sum: 0, count: 0 },
            withoutPair: { sum: 0, count: 0 },
        },
        endgame: {
            withPair: { sum: 0, count: 0 },
            withoutPair: { sum: 0, count: 0 },
        },
    };

    for (const game of games) {
        const playerIsWhite = game.playerColor === 'white';
        const playerSide = playerIsWhite ? 'w' : 'b';

        for (const pos of game.keyPositions) {
            const frame = game.frames[pos.plyIndex];
            if (!frame) continue;

            // Only count the player's own moves
            if (frame.color !== playerSide) continue;

            const moveNumber = frame.moveNumber;
            const phase: 'opening' | 'middlegame' | 'endgame' =
                moveNumber <= 10 ? 'opening' :
                moveNumber <= 40 ? 'middlegame' : 'endgame';

            const boardPart = pos.fen.split(' ')[0];
            let whiteBishops = 0;
            let blackBishops = 0;

            for (const char of boardPart) {
                if (char === 'B') whiteBishops++;
                else if (char === 'b') blackBishops++;
            }

            const playerBishops = playerIsWhite ? whiteBishops : blackBishops;
            const opponentBishops = playerIsWhite ? blackBishops : whiteBishops;
            const hasBishopPair = playerBishops >= 2 && opponentBishops <= 1;

            const target = hasBishopPair ? groups[phase].withPair : groups[phase].withoutPair;
            // ACPL = -swing (positive = lost centipawns, lower is better)
            target.sum += -pos.swing;
            target.count += 1;
        }
    }

    const phaseLabels: Record<string, string> = {
        opening: 'Opening',
        middlegame: 'Middlegame',
        endgame: 'Endgame',
    };

    const rows: { fieldName: string; count: number; winrate: number }[] = [];

    for (const phase of ['opening', 'middlegame', 'endgame'] as const) {
        const withPair = groups[phase].withPair;
        const withoutPair = groups[phase].withoutPair;

        if (withPair.count > 0) {
            rows.push({
                fieldName: `${phaseLabels[phase]} — With Bishop Pair`,
                count: withPair.count,
                winrate: withPair.sum / withPair.count,
            });
        }

        if (withoutPair.count > 0) {
            rows.push({
                fieldName: `${phaseLabels[phase]} — Without Bishop Pair`,
                count: withoutPair.count,
                winrate: withoutPair.sum / withoutPair.count,
            });
        }
    }

    return rows;
}

const rows = computed(() => bishopPairAdvantage(props.games));
</script>

<template>
    <StatsTable
        title="Bishop Pair Advantage"
        fieldNameLabel="Phase"
        countLabel="Positions"
        winrateLabel="ACPL"
        winrateSuffix=""
        :rows="rows"
        description="Average centipawn loss by phase, with and without the bishop pair. Lower is better."
    />
</template>
