<script lang="ts" setup>
import { computed } from 'vue';
import type { AnalysedGame } from '../../analysis/types';
import StatsTable from './StatsTable.vue';

const props = defineProps<{
    games: AnalysedGame[]
}>();

type CastlingCombo = {
    player: 'kingside' | 'queenside';
    opponent: 'kingside' | 'queenside';
};

const COMBO_LABELS: { combo: CastlingCombo; label: string }[] = [
    { combo: { player: 'kingside', opponent: 'kingside' }, label: 'Both Kingside' },
    { combo: { player: 'queenside', opponent: 'queenside' }, label: 'Both Queenside' },
    { combo: { player: 'kingside', opponent: 'queenside' }, label: 'Player Kingside, Opponent Queenside' },
    { combo: { player: 'queenside', opponent: 'kingside' }, label: 'Player Queenside, Opponent Kingside' },
];

const castlingStats = computed(() => {
    const map = new Map<string, { count: number; wins: number }>();

    for (const label of COMBO_LABELS.map((c) => c.label)) {
        map.set(label, { count: 0, wins: 0 });
    }

    let neitherCastled = 0;
    let onlyPlayerCastled = 0;
    let onlyOpponentCastled = 0;
    let neitherWins = 0;
    let onlyPlayerWins = 0;
    let onlyOpponentWins = 0;

    for (const game of props.games) {
        const ps = game.playerCastlingSide;
        const os = game.opponentCastlingSide;

        if (ps && os) {
            const label = COMBO_LABELS.find(
                (c) => c.combo.player === ps && c.combo.opponent === os,
            )?.label;
            if (label) {
                const entry = map.get(label)!;
                entry.count += 1;
                if (game.result === 'win') entry.wins += 1;
            }
        } else if (!ps && !os) {
            neitherCastled += 1;
            if (game.result === 'win') neitherWins += 1;
        } else if (ps && !os) {
            onlyPlayerCastled += 1;
            if (game.result === 'win') onlyPlayerWins += 1;
        } else if (!ps && os) {
            onlyOpponentCastled += 1;
            if (game.result === 'win') onlyOpponentWins += 1;
        }
    }

    const rows = COMBO_LABELS.map(({ label }) => {
        const entry = map.get(label)!;
        return {
            fieldName: label,
            count: entry.count,
            winrate: entry.count > 0 ? (entry.wins / entry.count) * 100 : 0,
        };
    });

    if (onlyPlayerCastled > 0) {
        rows.push({
            fieldName: 'Only Player Castled',
            count: onlyPlayerCastled,
            winrate: (onlyPlayerWins / onlyPlayerCastled) * 100,
        });
    }
    if (onlyOpponentCastled > 0) {
        rows.push({
            fieldName: 'Only Opponent Castled',
            count: onlyOpponentCastled,
            winrate: (onlyOpponentWins / onlyOpponentCastled) * 100,
        });
    }
    if (neitherCastled > 0) {
        rows.push({
            fieldName: 'Neither Castled',
            count: neitherCastled,
            winrate: (neitherWins / neitherCastled) * 100,
        });
    }

    return rows;
});

const rows = computed(() => castlingStats.value);
</script>

<template>
    <StatsTable
        title="Castling Side Comparison"
        fieldNameLabel="Configuration"
        :rows="rows"
    />
</template>
