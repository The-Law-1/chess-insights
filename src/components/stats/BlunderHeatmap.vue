<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AnalysedGame } from '../../analysis/types';
import Board from './Board.vue';

const props = defineProps<{
    games: AnalysedGame[]
}>();

const perspective = ref<'white' | 'black'>('white');

interface SquareData {
    count: number;
    totalSwing: number;
}

function extractToSquare(san: string): string | null {
    const matches = san.match(/[a-h][1-8]/g);
    if (!matches || matches.length === 0) return null;
    return matches[matches.length - 1];
}

const heatmap = computed(() => {
    const squares: Record<string, SquareData> = {};

    for (let rank = 1; rank <= 8; rank++) {
        for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
            squares[file + String(rank)] = { count: 0, totalSwing: 0 };
        }
    }

    const filteredGames = perspective.value === 'white'
        ? props.games.filter(g => g.playerColor === 'white')
        : props.games.filter(g => g.playerColor === 'black');

    for (const game of filteredGames) {
        for (const blunder of game.blunders) {
            const toSquare = extractToSquare(blunder.san);
            if (!toSquare) continue;
            squares[toSquare].count += 1;
            squares[toSquare].totalSwing += Math.abs(blunder.swing);
        }
    }

    return squares;
});

const gameCount = computed(() => {
    return perspective.value === 'white'
        ? props.games.filter(g => g.playerColor === 'white').length
        : props.games.filter(g => g.playerColor === 'black').length;
});

const description = computed(() =>
    `What squares did your blunders land on, from ${gameCount.value} game${gameCount.value !== 1 ? 's' : ''} as ${perspective.value}. Darker red = higher average centipawn loss. Hover for exact values.`
);

const emptyMessage = computed(() =>
    `No blunders found in ${gameCount.value} game${gameCount.value !== 1 ? 's' : ''} as ${perspective.value}.`
);
</script>

<template>
    <Board
        title="Blunder Heatmap"
        :description="description"
        :perspective="perspective"
        :heatmap="heatmap"
        :empty-message="emptyMessage"
        @update:perspective="perspective = $event"
    />
</template>
