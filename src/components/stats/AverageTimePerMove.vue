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

const BUCKET_SIZE = 1;

const chartData = computed(() => {
    const buckets: Record<number, Bucket> = {};
    let maxSec = 0;

    props.games.forEach(game => {
        const sec = game.timeProfile.averageSecondsPerMove;
        if (sec == null || sec <= 0) return;
        const bucket = Math.ceil(sec / BUCKET_SIZE);
        if (!buckets[bucket]) buckets[bucket] = { wins: 0, draws: 0, total: 0 };
        buckets[bucket].total++;
        if (game.result === 'win') buckets[bucket].wins++;
        if (game.result === 'draw') buckets[bucket].draws++;
        if (bucket > maxSec) maxSec = bucket;
    });

    const labels: string[] = [];
    const winrates: (number | null)[] = [];
    const lossrates: (number | null)[] = [];
    const counts: number[] = [];

    for (let b = 1; b <= maxSec; b++) {
        const start = (b - 1) * BUCKET_SIZE;
        const end = b * BUCKET_SIZE;
        labels.push(`${start}-${end}s`);

        const bucket = buckets[b];
        if (bucket && bucket.total >= 3) {
            const wr = (bucket.wins / bucket.total) * 100;
            const dr = (bucket.draws / bucket.total) * 100;
            winrates.push(wr);
            lossrates.push(100 - wr - dr);
            counts.push(bucket.total);
        } else {
            winrates.push(null);
            lossrates.push(null);
            counts.push(bucket ? bucket.total : 0);
        }
    }

    return { labels, winrates, lossrates, counts, maxSec };
});

const gamesWithoutData = computed(() =>
    props.games.filter(g => !g.timeProfile.averageSecondsPerMove || g.timeProfile.averageSecondsPerMove <= 0).length
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
                        text: 'Average time spent per move',
                    },
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (items: any) => items[0].label,
                        label: (ctx: any) => {
                            const i = ctx.dataIndex;
                            const count = d.counts[i];
                            const wr = d.winrates[i];
                            const lr = d.lossrates[i];
                            const lines = [
                                `Win: ${wr?.toFixed(1)}%`,
                                `Loss: ${lr?.toFixed(1)}%`,
                                `${count} game${count !== 1 ? 's' : ''}`,
                            ];
                            return lines;
                        },
                    },
                },
            },
        }),
    };
}

function renderChart() {
    destroyChart();
    if (canvasRef.value && chartData.value.maxSec > 0) {
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
    <div class="avg-time-chart">
        <h3 class="title">Average Time Per Move vs Win Rate</h3>
        <p class="description">
            How average think time correlates with winning.
            <span v-if="gamesWithData > 0">
                {{ gamesWithData }} game{{ gamesWithData !== 1 ? 's' : '' }} with data, bucketed by {{ BUCKET_SIZE }}-second intervals (min 3 games shown)
                <template v-if="gamesWithoutData > 0">
                    ({{ gamesWithoutData }} excluded — no time data).
                </template>
            </span>
        </p>

        <div v-if="chartData.maxSec > 0" class="chart-wrapper">
            <canvas ref="canvasRef" />
        </div>
        <p v-else class="empty-state">No time data available.</p>
    </div>
</template>

<style scoped>
.avg-time-chart {
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
    color: var(--text-secondary);
    font-size: 0.85rem;
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
