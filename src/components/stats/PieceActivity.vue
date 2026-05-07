<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { Chart } from 'chart.js';
import { registerCharts, winRateYAxis, baseChartOptions } from '../chart';
import type { AnalysedGame } from '../../analysis/types';

registerCharts();

const props = defineProps<{
    games: AnalysedGame[]
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

interface Bucket {
    wins: number;
    total: number;
}

function allMinorDevelopedAt(game: AnalysedGame): number | null {
    const playerSideChar = game.playerColor === 'white' ? 'w' : 'b';
    const minorMoves: number[] = [];

    for (const entry of Object.values(game.pieceActivity)) {
        if (
            entry.color === playerSideChar &&
            (entry.type === 'N' || entry.type === 'B') &&
            entry.firstMovedAtMove !== null
        ) {
            minorMoves.push(entry.firstMovedAtMove);
        }
    }

    if (minorMoves.length < 4) return null;
    return Math.max(...minorMoves);
}

const chartData = computed(() => {
    const buckets: Record<number, Bucket> = {};
    let maxMove = 0;

    props.games.forEach(game => {
        const developedAt = allMinorDevelopedAt(game);
        if (developedAt === null) return;

        if (!buckets[developedAt]) {
            buckets[developedAt] = { wins: 0, total: 0 };
        }
        buckets[developedAt].total++;
        if (game.result === 'win') buckets[developedAt].wins++;
        if (developedAt > maxMove) maxMove = developedAt;
    });

    const labels: string[] = [];
    const winrates: (number | null)[] = [];
    const counts: number[] = [];

    for (let move = 1; move <= maxMove; move++) {
        labels.push(String(move));
        const b = buckets[move];
        if (b && b.total >= 1) {
            winrates.push((b.wins / b.total) * 100);
            counts.push(b.total);
        } else {
            winrates.push(null);
            counts.push(0);
        }
    }

    return { labels, winrates, counts, maxMove };
});

const gamesWithoutData = computed(() =>
    props.games.filter(g => allMinorDevelopedAt(g) === null).length
);

const gamesWithData = computed(() =>
    props.games.length - gamesWithoutData.value
);

function buildConfig() {
    const d = chartData.value;

    return {
        type: 'line' as const,
        data: {
            labels: d.labels,
            datasets: [
                {
                    label: 'Win rate',
                    data: d.winrates,
                    borderColor: '#3B82F6',
                    backgroundColor: '#3B82F6',
                    tension: 0,
                    spanGaps: false,
                    pointRadius: 4,
                    pointHoverRadius: 4,
                },
            ],
        },
        options: baseChartOptions({
            scales: {
                y: winRateYAxis(),
                x: {
                    title: {
                        display: true,
                        text: 'Move when last minor piece developed',
                    },
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (items: any) => `Move ${items[0].label}`,
                        label: (ctx: any) => {
                            const i = ctx.dataIndex;
                            const count = d.counts[i];
                            return [
                                `Win rate: ${ctx.parsed.y.toFixed(1)}%`,
                                `${count} game${count !== 1 ? 's' : ''}`,
                            ];
                        },
                    },
                },
            },
        }),
    };
}

function renderChart() {
    destroyChart();
    if (canvasRef.value && chartData.value.maxMove > 0) {
        chartInstance = new Chart(canvasRef.value, buildConfig());
    }
}

function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

onMounted(() => renderChart());
watch(chartData, () => renderChart());
onUnmounted(() => destroyChart());
</script>

<template>
    <div class="piece-activity">
        <h3 class="title">Piece Development vs Win Rate</h3>
        <p class="description">
            How quickly developing all minor pieces correlates with winning.
            <span v-if="gamesWithData > 0">
                {{ gamesWithData }} game{{ gamesWithData !== 1 ? 's' : '' }} with data
                <template v-if="gamesWithoutData > 0">
                    ({{ gamesWithoutData }} excluded — piece{{ gamesWithoutData !== 1 ? 's' : '' }} never moved).
                </template>
            </span>
        </p>

        <div v-if="chartData.maxMove > 0" class="chart-wrapper">
            <canvas ref="canvasRef" />
        </div>
        <p v-else class="empty-state">No piece activity data available.</p>
    </div>
</template>

<style scoped>
.piece-activity {
    width: 100%;
}

.title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
}

.description {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0 0 1rem 0;
}

.chart-wrapper {
    position: relative;
    height: 380px;
    width: 100%;
    margin-top: 10px;
}

.empty-state {
    color: #9ca3af;
    text-align: center;
    padding: 3rem 0;
}
</style>
