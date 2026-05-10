<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronUpIcon } from '@heroicons/vue/16/solid';

type StatsRow = {
    fieldName: string;
    count: number;
    winrate?: number;
};

const props = withDefaults(defineProps<{
    title: string;
    rows: StatsRow[];
    fieldNameLabel?: string;
    countLabel?: string;
    winrateLabel?: string;
    winrateSuffix?: string;
    description?: string;
    onRowClick?: (fieldName: string) => void;
}>(), {
    fieldNameLabel: 'Field',
    countLabel: 'Count',
    winrateLabel: 'Win Rate',
    winrateSuffix: '%'
});

const sortKey = ref<'count' | 'winrate'>('count');
const sortDir = ref<'asc' | 'desc'>('desc');

const showWinrate = computed(() => props.rows.some((row) => row.winrate !== undefined));

const sortedRows = computed(() => {
    const sorted = [...props.rows];
    const direction = sortDir.value === 'asc' ? 1 : -1;
    if (sortKey.value === 'winrate') {
        return sorted.sort((a, b) => direction * ((a.winrate ?? 0) - (b.winrate ?? 0)));
    }
    return sorted.sort((a, b) => direction * (a.count - b.count));
});

function toggleSort(key: 'count' | 'winrate') {
    if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortDir.value = 'desc';
    }
}
</script>

<template>
    <div class="stats-table">
        <h2>{{ title }}</h2>

        <div>
            <p v-if="description" class="stats-table__description">{{ description }}</p>
        </div>

        <table class="stats-table__table" :class="{ 'stats-table__table--no-winrate': !showWinrate }">
            <thead>
                <tr>
                    <th class="stats-table__name">{{ fieldNameLabel }}</th>
                    <th class="stats-table__numeric">
                        <button type="button" class="stats-table__sort" @click="toggleSort('count')">
                            <span>{{ countLabel }}</span>
                            <ChevronUpIcon
                                class="stats-table__chevron"
                                :class="sortKey === 'count' && sortDir === 'asc' ? 'is-asc' : ''"
                            />
                        </button>
                    </th>
                    <th v-if="showWinrate" class="stats-table__numeric">
                        <button type="button" class="stats-table__sort" @click="toggleSort('winrate')">
                            <span>{{ winrateLabel }}</span>
                            <ChevronUpIcon
                                class="stats-table__chevron"
                                :class="sortKey === 'winrate' && sortDir === 'asc' ? 'is-asc' : ''"
                            />
                        </button>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="row in sortedRows"
                    :key="row.fieldName"
                    :class="{ 'stats-table__row--clickable': props.onRowClick }"
                >
                    <td
                        :class="{ 'stats-table__name--clickable': props.onRowClick }"
                        @click="props.onRowClick?.(row.fieldName)"
                    >{{ row.fieldName }}</td>
                    <td class="stats-table__numeric">{{ row.count }}</td>
                    <td
                        v-if="showWinrate"
                        class="stats-table__numeric"
                        :class="(row.winrate ?? 0) >= 50 ? 'stats-table__win--good' : 'stats-table__win--bad'"
                    >
                        {{ (row.winrate ?? 0).toFixed(2) }}{{ props.winrateSuffix }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
.stats-table {
    width: 100%;
    padding: 1.5rem 1.75rem 2rem;
    border-radius: 20px;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
    text-align: left;
    color: var(--accent);
}

.stats-table h2 {
    margin-bottom: 1.25rem;
}

.stats-table__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.35);
}

.stats-table__table thead {
    background: #0f172a;
    color: #f8fafc;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.75rem;
}

.stats-table__table th,
.stats-table__table td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.stats-table__table tbody tr {
    transition: background 0.2s ease;
}

.stats-table__table tbody tr:nth-child(2n) {
    background: rgba(241, 245, 249, 0.65);
}

.stats-table__table tbody tr:hover {
    background: rgba(226, 232, 240, 0.8);
}

.stats-table__name {
    width: 55%;
}

.stats-table__numeric {
    width: 22.5%;
    text-align: right;
}

.stats-table__sort {
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

.stats-table__sort:focus-visible {
    outline: 2px solid #38bdf8;
    outline-offset: 2px;
    border-radius: 999px;
}

.stats-table__chevron {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
}

.stats-table__chevron.is-asc {
    transform: rotate(180deg);
}

.stats-table__win--good {
    color: #16a34a;
    font-weight: 600;
}

.stats-table__win--bad {
    color: #dc2626;
    font-weight: 600;
}

.stats-table__row--clickable {
    cursor: pointer;
}

.stats-table__name--clickable {
    color: var(--tabs-accent, #2b7a78);
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: text-decoration-color 0.15s ease;
}

.stats-table__row--clickable:hover .stats-table__name--clickable {
    text-decoration-color: currentColor;
}

.stats-table__description {
    margin-bottom: 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.stats-table__table--no-winrate .stats-table__name {
    width: 70%;
}

.stats-table__table--no-winrate .stats-table__numeric {
    width: 30%;
}

@media (max-width: 768px) {
    .stats-table {
        padding: 1.25rem;
    }

    .stats-table__table th,
    .stats-table__table td {
        padding: 0.75rem;
    }

    .stats-table__name {
        width: 50%;
    }
}
</style>
