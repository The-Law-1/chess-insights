<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AnalysedGame } from '../../analysis/types';

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

const maxAvgSwing = computed(() => {
    let max = 0;
    for (const key in heatmap.value) {
        const sq = heatmap.value[key];
        if (sq.count > 0) {
            const avg = sq.totalSwing / sq.count;
            if (avg > max) max = avg;
        }
    }
    return max;
});

interface SquareDisplay {
    name: string;
    isLight: boolean;
    data: SquareData;
}

const allSquares = computed<SquareDisplay[]>(() => {
    const result: SquareDisplay[] = [];
    if (perspective.value === 'white') {
        for (let rank = 8; rank >= 1; rank--) {
            for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
                const name = file + String(rank);
                const fileIdx = file.charCodeAt(0) - 'a'.charCodeAt(0);
                result.push({
                    name,
                    isLight: (fileIdx + rank - 1) % 2 === 1,
                    data: heatmap.value[name],
                });
            }
        }
    } else {
        for (let rank = 1; rank <= 8; rank++) {
            for (const file of ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']) {
                const name = file + String(rank);
                const fileIdx = file.charCodeAt(0) - 'a'.charCodeAt(0);
                result.push({
                    name,
                    isLight: (fileIdx + rank - 1) % 2 === 1,
                    data: heatmap.value[name],
                });
            }
        }
    }
    return result;
});

const rankLabels = computed(() => {
    return perspective.value === 'white'
        ? ['8', '7', '6', '5', '4', '3', '2', '1']
        : ['1', '2', '3', '4', '5', '6', '7', '8'];
});

const fileLabels = computed(() => {
    return perspective.value === 'white'
        ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
});

const totalBlunders = computed(() => {
    let count = 0;
    for (const key in heatmap.value) {
        count += heatmap.value[key].count;
    }
    return count;
});

const gameCount = computed(() => {
    return perspective.value === 'white'
        ? props.games.filter(g => g.playerColor === 'white').length
        : props.games.filter(g => g.playerColor === 'black').length;
});

function hasBlunder(sq: SquareData): boolean {
    return sq.count > 0;
}

function getHeatColor(sq: SquareData): string {
    if (sq.count === 0 || maxAvgSwing.value === 0) return '';
    const avgSwing = sq.totalSwing / sq.count;
    const t = avgSwing / maxAvgSwing.value;
    const r = Math.round(230 - t * 110);
    const g = Math.round(80 - t * 65);
    const b = Math.round(80 - t * 65);
    return `rgb(${r}, ${g}, ${b})`;
}

function getTooltip(name: string, sq: SquareData): string | undefined {
    if (sq.count === 0) return undefined;
    const avg = Math.round(sq.totalSwing / sq.count);
    return `${name} — ${sq.count} blunder${sq.count !== 1 ? 's' : ''}, avg ${avg} cp loss`;
}
</script>

<template>
    <div class="blunder-heatmap">
        <div class="header">
            <h3 class="title">Blunder Heatmap</h3>
            <div class="perspective-toggle" role="radiogroup" aria-label="Perspective">
                <button
                    type="button"
                    class="toggle-btn"
                    :class="{ active: perspective === 'white' }"
                    role="radio"
                    :aria-checked="perspective === 'white'"
                    @click="perspective = 'white'"
                >
                    White
                </button>
                <button
                    type="button"
                    class="toggle-btn"
                    :class="{ active: perspective === 'black' }"
                    role="radio"
                    :aria-checked="perspective === 'black'"
                    @click="perspective = 'black'"
                >
                    Black
                </button>
            </div>
        </div>

        <div v-if="totalBlunders === 0" class="empty-state">
            No blunders found in {{ gameCount }} game{{ gameCount !== 1 ? 's' : '' }} as {{ perspective }}.
        </div>

        <template v-else>
            <p class="description">
                Blunders from {{ gameCount }} game{{ gameCount !== 1 ? 's' : '' }} as {{ perspective }}. Darker red = higher average centipawn loss. Hover for exact values.
            </p>

            <div class="board-area">
                <div class="rank-labels">
                    <span v-for="r in rankLabels" :key="r" class="rank-label">{{ r }}</span>
                </div>
                <div class="board-right">
                    <div class="board">
                        <div
                            v-for="sq in allSquares"
                            :key="sq.name"
                            class="square"
                            :class="{
                                light: sq.isLight && !hasBlunder(sq.data),
                                dark: !sq.isLight && !hasBlunder(sq.data),
                                'has-blunder': hasBlunder(sq.data),
                            }"
                            :style="hasBlunder(sq.data) ? { backgroundColor: getHeatColor(sq.data) } : {}"
                            :title="getTooltip(sq.name, sq.data)"
                        >
                            <span
                                v-if="sq.data.count > 0"
                                class="count"
                            >
                                {{ sq.data.count }}
                            </span>
                        </div>
                    </div>
                    <div class="file-labels">
                        <span v-for="f in fileLabels" :key="f">{{ f }}</span>
                    </div>
                </div>
            </div>

            <div class="legend">
                <span class="legend-label">Low</span>
                <div class="legend-bar" />
                <span class="legend-label">High</span>
            </div>
        </template>
    </div>
</template>

<style scoped>
.blunder-heatmap {
    width: 100%;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 0.25rem;
}

.title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
}

.perspective-toggle {
    display: flex;
    border: 1px solid #d1d5db;
    border-radius: 999px;
    overflow: hidden;
}

.toggle-btn {
    border: none;
    background: transparent;
    color: #6b7280;
    padding: 4px 14px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 120ms ease, color 120ms ease;
}

.toggle-btn.active {
    background: #2b7a78;
    color: #fff;
}

.description {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0 0 1rem 0;
}

.empty-state {
    color: #9ca3af;
    text-align: center;
    padding: 3rem 0;
}

.board-area {
    display: flex;
    gap: 4px;
}

.rank-labels {
    display: grid;
    grid-template-rows: repeat(8, 1fr);
    padding-bottom: 18px;
    width: 18px;
}

.rank-label {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    color: #6b7280;
    font-weight: 500;
}

.board-right {
    display: flex;
    flex-direction: column;
    flex: 1;
    max-width: min(480px, 100%);
}

.board {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    aspect-ratio: 1;
    border: 2px solid #1f2937;
}

.square {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.square.light {
    background-color: #f0d9b5;
}

.square.dark {
    background-color: #b58863;
}

.square.has-blunder {
    background-color: #fff;
}

.count {
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
    pointer-events: none;
}

.file-labels {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    margin-top: 2px;
}

.file-labels span {
    text-align: center;
    font-size: 0.7rem;
    color: #6b7280;
    font-weight: 500;
}

.legend {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
}

.legend-label {
    font-size: 0.75rem;
    color: #6b7280;
}

.legend-bar {
    width: 160px;
    height: 14px;
    border-radius: 999px;
    background: linear-gradient(to right, rgb(250, 200, 200), rgb(155, 15, 15));
}
</style>
