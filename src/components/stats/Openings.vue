<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { AnalysedGame } from '../../analysis/types';
import { ChevronUpIcon } from '@heroicons/vue/16/solid';


const props = defineProps<{
    games: AnalysedGame[]
}>();

type OpeningStats = {
    name: string;
    count: number;
    winRate: number;
}

const openings = computed(() : OpeningStats[] => {
    const openingMap: Record<string, { name: string, count: number, winRate: number }> = {};

    props.games.forEach(game => {
        const openingName = game.openingName || 'Unknown';
        if (!openingMap[openingName]) {
            openingMap[openingName] = { name: openingName, count: 0, winRate: 0 };
        }
        openingMap[openingName].count += 1;
        if (game.result === 'win') {
            openingMap[openingName].winRate += 1;
        }
    });

    Object.values(openingMap).forEach(opening => {
        opening.winRate = opening.count > 0 ? (opening.winRate / opening.count) * 100 : 0;
    });

    return Object.values(openingMap).sort((a, b) => b.count - a.count);
});

const sortedOpenings = computed(() => {
    const sorted = [...openings.value];
    const direction = sortDir.value === 'asc' ? 1 : -1;
    if (sortKey.value === 'count') {
        return sorted.sort((a, b) => direction * (a.count - b.count));
    }
    return sorted.sort((a, b) => direction * (a.winRate - b.winRate));
});


const sortKey = ref<'count' | 'winRate'>('count');
const sortDir = ref<'asc' | 'desc'>('desc');

function toggleSort(key: 'count' | 'winRate') {
    if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortDir.value = 'desc';
    }
}

</script>

<template>
    <div class="openings">
        <h2>Openings</h2>

                <table class="openings__table">
            <thead>
                <tr>
                    <th class="openings__name">Opening</th>
                    <th class="openings__numeric">
                            <button type="button" class="openings__sort" @click="toggleSort('count')">
                                    <span>Count</span>
                                    <ChevronUpIcon
                                            class="openings__chevron"
                                            :class="sortKey === 'count' && sortDir === 'asc' ? 'is-asc' : ''"
                                    />
                            </button>
                    </th>
                    <th class="openings__numeric">
                            <button type="button" class="openings__sort" @click="toggleSort('winRate')">
                                    <span>Win Rate</span>
                                    <ChevronUpIcon
                                            class="openings__chevron"
                                            :class="sortKey === 'winRate' && sortDir === 'asc' ? 'is-asc' : ''"
                                    />
                            </button>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="opening in sortedOpenings" :key="opening.name">
                    <td>{{ opening.name }}</td>
                    <td>{{ opening.count }}</td>
                                        <td :class="opening.winRate >= 50 ? 'openings__win--good' : 'openings__win--bad'">
                        {{ opening.winRate.toFixed(2) }}%
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
.openings {
    width: 100%;
    padding: 1.5rem 1.75rem 2rem;
    /* background: linear-gradient(160deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8)); */
    border-radius: 20px;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
    text-align: left;
    color: var(--accent);
}

.openings h2 {
    margin-bottom: 1.25rem;
}

.openings__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.35);
}

.openings__table thead {
    background: #0f172a;
    color: #f8fafc;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.75rem;
}

.openings__table th,
.openings__table td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.openings__table tbody tr {
    transition: background 0.2s ease;
}

.openings__table tbody tr:nth-child(2n) {
    background: rgba(241, 245, 249, 0.65);
}

.openings__table tbody tr:hover {
    background: rgba(226, 232, 240, 0.8);
}

.openings__name {
    width: 55%;
}

.openings__numeric {
    width: 22.5%;
    text-align: right;
}

.openings__sort {
    width: 100%;
    display: inline-flex;
    align-items: start;
    justify-content: flex-start;
    gap: 0.5rem;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
}

.openings__sort:focus-visible {
    outline: 2px solid #38bdf8;
    outline-offset: 2px;
    border-radius: 999px;
}

.openings__chevron {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
}

.openings__chevron.is-asc {
    transform: rotate(180deg);
}

.openings__win--good {
    color: #16a34a;
    font-weight: 600;
}

.openings__win--bad {
    color: #dc2626;
    font-weight: 600;
}

@media (max-width: 768px) {
    .openings {
        padding: 1.25rem;
    }

    .openings__table th,
    .openings__table td {
        padding: 0.75rem;
    }

    .openings__name {
        width: 50%;
    }
}
</style>