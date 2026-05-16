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

const chartData = computed(() => {
    const playerCastleBuckets: Record<number, Bucket> = {};
    const opponentCastleBuckets: Record<number, Bucket> = {};
    let maxMove = 0;

    props.games.forEach(game => {
        if (game.playerCastledAtMove !== null) {
            const m = game.playerCastledAtMove;
            if (!playerCastleBuckets[m]) playerCastleBuckets[m] = { wins: 0, total: 0 };
            playerCastleBuckets[m].total++;
            if (game.result === 'win') playerCastleBuckets[m].wins++;
            if (m > maxMove) maxMove = m;
        }
        if (game.opponentCastledAtMove !== null) {
            const m = game.opponentCastledAtMove;
            if (!opponentCastleBuckets[m]) opponentCastleBuckets[m] = { wins: 0, total: 0 };
            opponentCastleBuckets[m].total++;
            if (game.result === 'win') opponentCastleBuckets[m].wins++;
            if (m > maxMove) maxMove = m;
        }
    });

    const labels: string[] = [];
    const playerCastleWinrate: (number | null)[] = [];
    const playerCastleCounts: number[] = [];
    const opponentCastleWinrate: (number | null)[] = [];
    const opponentCastleCounts: number[] = [];

    for (let move = 1; move <= maxMove; move++) {
        labels.push(String(move));

        const p = playerCastleBuckets[move];
        playerCastleWinrate.push(p ? (p.wins / p.total) * 100 : null);
        playerCastleCounts.push(p ? p.total : 0);

        const o = opponentCastleBuckets[move];
        opponentCastleWinrate.push(o ? (o.wins / o.total) * 100 : null);
        opponentCastleCounts.push(o ? o.total : 0);
    }

    return { labels, playerCastleWinrate, playerCastleCounts, opponentCastleWinrate, opponentCastleCounts, maxMove };
});

const didNotCastleCount = computed(() =>
    props.games.filter(g => g.playerCastledAtMove === null).length
);

function buildConfig() {
    const d = chartData.value;

    return {
        type: 'line' as const,
        data: {
            labels: d.labels,
            datasets: [
                {
                    label: 'You castle',
                    data: d.playerCastleWinrate,
                    borderColor: '#3B82F6',
                    backgroundColor: '#3B82F6',
                    tension: 0,
                    spanGaps: false,
                    pointRadius: 4,
                    pointHoverRadius: 4,
                },
                {
                    label: 'Opponent castles',
                    data: d.opponentCastleWinrate,
                    borderColor: '#EF4444',
                    backgroundColor: '#EF4444',
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
                        text: 'Move number',
                    },
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (items: any) => `Move ${items[0].label}`,
                        label: (ctx: any) => {
                            const isPlayer = ctx.datasetIndex === 0;
                            const counts = isPlayer ? d.playerCastleCounts : d.opponentCastleCounts;
                            const count = counts[ctx.dataIndex];
                            const who = isPlayer ? 'you' : 'your opponent';
                            return [
                                `Your win rate when ${who} castled: ${ctx.parsed.y.toFixed(1)}%`,
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
    <div class="castling-timing">
        <h3 class="title">Castling Timing</h3>
        <p class="description">
            Your win rate by the move you (or your opponent) castled.
            <span v-if="didNotCastleCount > 0">
                You did not castle in {{ didNotCastleCount }} game{{ didNotCastleCount !== 1 ? 's' : '' }}.
            </span>
        </p>

        <div v-if="chartData.maxMove > 0" class="chart-wrapper">
            <canvas ref="canvasRef" />
        </div>
        <p v-else class="empty-state">No castling data available.</p>
    </div>
</template>

<style scoped>
.castling-timing {
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
