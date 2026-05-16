<script setup lang="ts">
import { computed } from 'vue';

export interface SquareData {
    count: number;
    totalSwing: number;
}

interface SquareDisplay {
    name: string;
    isLight: boolean;
    data: SquareData;
}

const props = defineProps<{
    title: string;
    description: string;
    perspective: 'white' | 'black';
    heatmap: Record<string, SquareData>;
    emptyMessage: string;
}>();

const emit = defineEmits<{
    'update:perspective': [value: 'white' | 'black'];
}>();

const maxAvgSwing = computed(() => {
    let max = 0;
    for (const key in props.heatmap) {
        const sq = props.heatmap[key];
        if (sq.count > 0) {
            const avg = sq.totalSwing / sq.count;
            if (avg > max) max = avg;
        }
    }
    return max;
});

const allSquares = computed<SquareDisplay[]>(() => {
    const result: SquareDisplay[] = [];
    if (props.perspective === 'white') {
        for (let rank = 8; rank >= 1; rank--) {
            for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
                const name = file + String(rank);
                const fileIdx = file.charCodeAt(0) - 'a'.charCodeAt(0);
                result.push({
                    name,
                    isLight: (fileIdx + rank - 1) % 2 === 1,
                    data: props.heatmap[name],
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
                    data: props.heatmap[name],
                });
            }
        }
    }
    return result;
});

const rankLabels = computed(() => {
    return props.perspective === 'white'
        ? ['8', '7', '6', '5', '4', '3', '2', '1']
        : ['1', '2', '3', '4', '5', '6', '7', '8'];
});

const fileLabels = computed(() => {
    return props.perspective === 'white'
        ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
});

const totalBlunders = computed(() => {
    let count = 0;
    for (const key in props.heatmap) {
        count += props.heatmap[key].count;
    }
    return count;
});

function setPerspective(value: 'white' | 'black') {
    emit('update:perspective', value);
}

function hasBlunder(sq: SquareData): boolean {
    return sq.count > 0;
}

function getHeatColor(sq: SquareData): string {
    if (sq.count === 0 || maxAvgSwing.value === 0) return '';
    const avgSwing = sq.totalSwing / sq.count;
    const t = avgSwing / maxAvgSwing.value;
    const r = Math.round(220 - t * 110);
    const g = Math.round(70 - t * 55);
    const b = Math.round(70 - t * 55);
    return `rgb(${r}, ${g}, ${b})`;
}

function getTooltip(name: string, sq: SquareData): string | undefined {
    if (sq.count === 0) return undefined;
    const avg = Math.round(sq.totalSwing / sq.count);
    return `${name} — ${sq.count} blunder${sq.count !== 1 ? 's' : ''}, avg ${avg} cp loss`;
}
</script>

<template>
    <div class="board-heatmap">
        <div class="bh-header">
            <div class="bh-title-row">
                <h3 class="bh-title">{{ title }}</h3>
                <div class="bh-toggle" role="radiogroup" aria-label="Perspective">
                    <button
                        type="button"
                        class="bh-toggle-btn"
                        :class="{ active: perspective === 'white' }"
                        role="radio"
                        :aria-checked="perspective === 'white'"
                        @click="setPerspective('white')"
                    >White</button>
                    <button
                        type="button"
                        class="bh-toggle-btn"
                        :class="{ active: perspective === 'black' }"
                        role="radio"
                        :aria-checked="perspective === 'black'"
                        @click="setPerspective('black')"
                    >Black</button>
                </div>
            </div>
            <p class="bh-desc">{{ description }}</p>
        </div>

        <div v-if="totalBlunders === 0" class="bh-empty">
            {{ emptyMessage }}
        </div>

        <template v-else>
            <div class="bh-board-area">
                <div class="bh-rank-labels">
                    <span v-for="r in rankLabels" :key="r" class="bh-rank-label">{{ r }}</span>
                </div>
                <div class="bh-board-right">
                    <div class="bh-board">
                        <div
                            v-for="sq in allSquares"
                            :key="sq.name"
                            class="bh-square"
                            :class="{
                                'bh-square--light': sq.isLight && !hasBlunder(sq.data),
                                'bh-square--dark': !sq.isLight && !hasBlunder(sq.data),
                                'bh-square--blunder': hasBlunder(sq.data),
                            }"
                            :style="hasBlunder(sq.data) ? { backgroundColor: getHeatColor(sq.data) } : {}"
                            :title="getTooltip(sq.name, sq.data)"
                        >
                            <span v-if="sq.data.count > 0" class="bh-count">
                                {{ sq.data.count }}
                            </span>
                        </div>
                    </div>
                    <div class="bh-file-labels">
                        <span v-for="f in fileLabels" :key="f">{{ f }}</span>
                    </div>
                </div>
            </div>

            <div class="bh-legend">
                <span class="bh-legend-label">Low</span>
                <div class="bh-legend-bar"></div>
                <span class="bh-legend-label">High</span>
            </div>
        </template>
    </div>
</template>

<style scoped>
.board-heatmap {
    width: 100%;
}

.bh-header {
    margin-bottom: 16px;
}

.bh-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 6px;
}

.bh-title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
}

.bh-desc {
    color: var(--text-primary);
    font-size: 1rem;
    line-height: 1.5;
}

.bh-empty {
    color: var(--text-muted);
    text-align: center;
    padding: 3rem 0;
    font-size: 0.9rem;
}

/* ── Perspective toggle ── */
.bh-toggle {
    display: flex;
    border: 1px solid var(--border-default);
    border-radius: 999px;
    overflow: hidden;
    flex-shrink: 0;
}

.bh-toggle-btn {
    border: none;
    background: transparent;
    color: var(--text-muted);
    padding: 4px 14px;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: var(--font-body);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.bh-toggle-btn.active {
    background: var(--accent);
    color: #0f1118;
}

/* ── Board ── */
.bh-board-area {
    display: flex;
    gap: 4px;
}

.bh-rank-labels {
    display: grid;
    grid-template-rows: repeat(8, 1fr);
    padding-bottom: 20px;
    width: 18px;
}

.bh-rank-label {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
}

.bh-board-right {
    display: flex;
    flex-direction: column;
    flex: 1;
    max-width: min(480px, 100%);
}

.bh-board {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    aspect-ratio: 1;
    border: 1px solid var(--border-strong);
}

.bh-square {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease;
}

.bh-square--light {
    background-color: #d4c4a8;
}

.bh-square--dark {
    background-color: #7c6a54;
}

.bh-square--blunder {
    /* color set inline */
}

.bh-count {
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    font-family: var(--font-mono);
}

.bh-file-labels {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    margin-top: 3px;
}

.bh-file-labels span {
    text-align: center;
    font-size: 0.65rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
}

/* ── Legend ── */
.bh-legend {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
}

.bh-legend-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
}

.bh-legend-bar {
    width: 160px;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(to right, #f0c8c0, #c41e3a);
}
</style>
