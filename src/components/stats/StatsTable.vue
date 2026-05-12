<script setup lang="ts">
import { computed, ref } from 'vue';

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

function sortIndicator(key: 'count' | 'winrate'): string {
    if (sortKey.value !== key) return '';
    return sortDir.value === 'asc' ? ' ↑' : ' ↓';
}
</script>

<template>
    <div class="stats-table-wrap">
        <p v-if="description" class="table-description">{{ description }}</p>

        <div class="table-container">
            <table class="st-table" :class="{ 'st-table--no-winrate': !showWinrate }">
                <thead>
                    <tr>
                        <th class="st-th st-th--name">{{ fieldNameLabel }}</th>
                        <th class="st-th st-th--num">
                            <button type="button" class="st-sort" @click="toggleSort('count')">
                                {{ countLabel }}<span class="st-sort-indicator">{{ sortIndicator('count') }}</span>
                            </button>
                        </th>
                        <th v-if="showWinrate" class="st-th st-th--num">
                            <button type="button" class="st-sort" @click="toggleSort('winrate')">
                                {{ winrateLabel }}<span class="st-sort-indicator">{{ sortIndicator('winrate') }}</span>
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="row in sortedRows"
                        :key="row.fieldName"
                        class="st-tr"
                        :class="{ 'st-tr--clickable': props.onRowClick }"
                    >
                        <td
                            class="st-td st-td--name"
                            :class="{ 'st-td--link': props.onRowClick }"
                            @click="props.onRowClick?.(row.fieldName)"
                        >
                            <span class="st-td-text">{{ row.fieldName }}</span>
                        </td>
                        <td class="st-td st-td--num">
                            <span class="st-count">{{ Number.isInteger(row.count) ? row.count.toLocaleString() : row.count.toFixed(2) }}</span>
                        </td>
                        <td
                            v-if="showWinrate"
                            class="st-td st-td--num"
                            :class="(row.winrate ?? 0) >= 50 ? 'st-td--win' : 'st-td--loss'"
                        >
                            {{ (row.winrate ?? 0).toFixed(2) }}{{ winrateSuffix }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.stats-table-wrap {
    width: 100%;
}

.table-description {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-bottom: 16px;
    line-height: 1.5;
}

.table-container {
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--border-subtle);
}

.st-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.st-th {
    text-align: left;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    padding: 10px 16px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
}

.st-th--num {
    text-align: right;
}

.st-sort {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    width: 100%;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    padding: 0;
}

.st-sort:hover {
    color: var(--text-primary);
}

.st-sort-indicator {
    font-size: 0.7rem;
    width: 10px;
}

.st-tr {
    transition: background 0.12s ease;
}

.st-tr:not(:last-child) {
    border-bottom: 1px solid var(--border-subtle);
}

.st-tr:hover {
    background: var(--bg-card-raised);
}

.st-tr--clickable {
    cursor: pointer;
}

.st-td {
    padding: 10px 16px;
    color: var(--text-primary);
}

.st-td--num {
    text-align: right;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.st-td--name {
    max-width: 400px;
}

.st-td-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
}

.st-td--link {
    color: var(--accent);
    text-decoration: none;
    transition: opacity 0.12s ease;
}

.st-td--link:hover {
    opacity: 0.75;
}

.st-td--win {
    color: var(--win) !important;
    font-weight: 500;
}

.st-td--loss {
    color: var(--loss) !important;
    font-weight: 500;
}

.st-count {
    color: var(--text-secondary);
}

.st-table--no-winrate .st-th--name {
    width: 70%;
}

.st-table--no-winrate .st-th--num {
    width: 30%;
}

@media (max-width: 768px) {
    .st-td, .st-th {
        padding: 8px 12px;
    }
    .st-td--name {
        max-width: 200px;
    }
}
</style>
