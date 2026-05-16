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
    draws: number;
    total: number;
}

const BUCKET_SIZE = 5;

const chartData = computed(() => {
    const buckets: Record<number, Bucket> = {};
    let maxBucket = 0;

    props.games.forEach(game => {
        if (game.totalMoves < 1) return;
        const bucket = Math.ceil(game.totalMoves / BUCKET_SIZE);
        if (!buckets[bucket]) buckets[bucket] = { wins: 0, draws: 0, total: 0 };
        buckets[bucket].total++;
        if (game.result === 'win') buckets[bucket].wins++;
        if (game.result === 'draw') buckets[bucket].draws++;
        if (bucket > maxBucket) maxBucket = bucket;
    });

    const labels: string[] = [];
    const winrates: (number | null)[] = [];
    const drawrates: (number | null)[] = [];
    const lossrates: (number | null)[] = [];
    const counts: number[] = [];

    for (let b = 1; b <= maxBucket; b++) {
        const start = (b - 1) * BUCKET_SIZE + 1;
        const end = b * BUCKET_SIZE;
        labels.push(`${start}-${end}`);

        const bucket = buckets[b];
        if (bucket && bucket.total >= 3) {
            const wr = (bucket.wins / bucket.total) * 100;
            const dr = (bucket.draws / bucket.total) * 100;
            winrates.push(wr);
            drawrates.push(dr);
            lossrates.push(100 - wr - dr);
            counts.push(bucket.total);
        } else {
            winrates.push(null);
            drawrates.push(null);
            lossrates.push(null);
            counts.push(bucket ? bucket.total : 0);
        }
    }

    return { labels, winrates, drawrates, lossrates, counts, maxBucket };
});

const totalGames = computed(() =>
    props.games.filter(g => g.totalMoves > 0).length
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
                        text: 'Game length (moves)',
                    },
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (items: any) => `${items[0].label} moves`,
                        label: (ctx: any) => {
                            const i = ctx.dataIndex;
                            const count = d.counts[i];
                            const wr = d.winrates[i];
                            const dr = d.drawrates[i];
                            const lr = d.lossrates[i];
                            return [
                                `Win: ${wr?.toFixed(1)}%`,
                                `Draw: ${dr?.toFixed(1)}%`,
                                `Loss: ${lr?.toFixed(1)}%`,
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
    if (canvasRef.value && chartData.value.maxBucket > 0) {
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
    <div class="game-length-chart">
        <h3 class="title">Game Length vs Result</h3>
        <p class="description">
            How game length correlates with outcome.
            <span v-if="totalGames > 0">
                {{ totalGames }} game{{ totalGames !== 1 ? 's' : '' }} analysed, bucketed by {{ BUCKET_SIZE }}-move intervals (min 3 games shown).
            </span>
        </p>

        <div v-if="chartData.maxBucket > 0" class="chart-wrapper">
            <canvas ref="canvasRef" />
        </div>
        <p v-else class="empty-state">No game data available.</p>
    </div>
</template>

<style scoped>
.game-length-chart {
    width: 100%;
}

.title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
    margin: 0 0 0.25rem 0;
    color: var(--text-primary);
}

.description {
    color: var(--text-primary);
    font-size: 1rem;
    margin: 0 0 1rem 0;
}

.chart-wrapper {
    position: relative;
    height: 380px;
    width: 100%;
    margin-top: 10px;
}

.empty-state {
    color: var(--text-muted);
    text-align: center;
    padding: 3rem 0;
}
</style>
