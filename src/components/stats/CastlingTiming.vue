<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
import type { AnalysedGame } from '../../analysis/types';

Chart.register(...registerables);

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
    const playerMap: Record<number, Bucket> = {};
    const opponentMap: Record<number, Bucket> = {};
    let maxMove = 0;

    props.games.forEach(game => {
        if (game.playerCastledAtMove !== null) {
            const m = game.playerCastledAtMove;
            if (!playerMap[m]) playerMap[m] = { wins: 0, total: 0 };
            playerMap[m].total++;
            if (game.result === 'win') playerMap[m].wins++;
            if (m > maxMove) maxMove = m;
        }
        if (game.opponentCastledAtMove !== null) {
            const m = game.opponentCastledAtMove;
            if (!opponentMap[m]) opponentMap[m] = { wins: 0, total: 0 };
            opponentMap[m].total++;
            if (game.result === 'win') opponentMap[m].wins++;
            if (m > maxMove) maxMove = m;
        }
    });

    const labels: string[] = [];
    const playerWinrates: (number | null)[] = [];
    const playerCounts: number[] = [];
    const opponentWinrates: (number | null)[] = [];
    const opponentCounts: number[] = [];

    for (let move = 1; move <= maxMove; move++) {
        labels.push(String(move));

        const p = playerMap[move];
        playerWinrates.push(p ? (p.wins / p.total) * 100 : null);
        playerCounts.push(p ? p.total : 0);

        const o = opponentMap[move];
        opponentWinrates.push(o ? (o.wins / o.total) * 100 : null);
        opponentCounts.push(o ? o.total : 0);
    }

    return { labels, playerWinrates, playerCounts, opponentWinrates, opponentCounts, maxMove };
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
                    label: 'When you castle',
                    data: d.playerWinrates,
                    borderColor: '#3B82F6',
                    backgroundColor: '#3B82F6',
                    tension: 0,
                    spanGaps: false,
                    pointRadius: 4,
                    pointHoverRadius: 4,
                },
                {
                    label: 'When opponent castles',
                    data: d.opponentWinrates,
                    borderColor: '#EF4444',
                    backgroundColor: '#EF4444',
                    tension: 0,
                    spanGaps: false,
                    pointRadius: 4,
                    pointHoverRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: -5,
                    max: 105,
                    title: {
                        display: true,
                        text: 'Win rate (%)',
                    },
                    afterBuildTicks: (axis: any) => {
                        axis.ticks = [
                            { value: 0 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 },
                        ];
                    },
                    ticks: {
                        callback: (value: any) => value + '%',
                    },
                },
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
                            const counts = isPlayer ? d.playerCounts : d.opponentCounts;
                            const count = counts[ctx.dataIndex];
                            return [
                                `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`,
                                `${count} game${count !== 1 ? 's' : ''}`,
                            ];
                        },
                    },
                },
                legend: {
                    position: 'bottom' as const,
                },
            },
            interaction: {
                intersect: false,
                mode: 'index' as const,
            },
        },
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
            When you castled and how it correlates with winning.
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
