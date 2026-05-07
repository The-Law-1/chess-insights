<script lang="ts" setup>
import { computed, ref } from 'vue';
import Openings from './stats/Openings.vue';
import Endgames from './stats/Endgames.vue';
import CastlingTiming from './stats/CastlingTiming.vue';
import GameLengthVsResult from './stats/GameLengthVsResult.vue';
import PieceActivity from './stats/PieceActivity.vue';
import AverageTimePerMove from './stats/AverageTimePerMove.vue';
import PawnStructure from './stats/PawnStructure.vue';
import BadPositions from './stats/BadPositions.vue';
import CastlingSide from './stats/CastlingSide.vue';
import type { AnalysedGame } from '../analysis/types';

const tabs = {
    Openings,
    Endgames,
    CastlingTiming,
    CastlingSide,
    GameLengthVsResult,
    PieceActivity,
    AvgTimePerMove: AverageTimePerMove,
    PawnStructure,
    BadPositions,
};

type TabKey = keyof typeof tabs;

const props = defineProps<{
    games: AnalysedGame[];
}>();

const currentTab = ref<TabKey>('Openings');

const tabNames = computed(() => Object.keys(tabs) as TabKey[]);

const setTab = (name: TabKey) => {
    currentTab.value = name;
};
</script>

<template>
    <div class="stats-tabs">
        <div class="tabs-header" role="tablist" aria-label="Stats tabs">
            <button
                v-for="name in tabNames"
                :key="name"
                class="tab-button"
                :class="{ active: name === currentTab }"
                type="button"
                role="tab"
                :aria-selected="name === currentTab"
                @click="setTab(name)"
            >
                {{ name }}
            </button>
        </div>

        <div class="tabs-body">
            <transition name="tab-fade" mode="out-in">
                <keep-alive>
                    <component :is="tabs[currentTab]" :key="currentTab" :games="props.games" />
                </keep-alive>
            </transition>
        </div>
    </div>
</template>

<style scoped>
.stats-tabs {
    --tabs-accent: #2b7a78;
    --tabs-accent-soft: #e6f4f3;
    --tabs-border: #d6e2e1;
    --tabs-text: #1f2a2a;
    --tabs-muted: #5c6b6b;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.tabs-header {
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--tabs-border);
    padding-bottom: 8px;
    overflow-x: auto;
}

.tab-button {
    border: 1px solid transparent;
    background: transparent;
    color: var(--tabs-muted);
    padding: 8px 14px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: color 160ms ease, background-color 160ms ease, border-color 160ms ease;
}

.tab-button:hover {
    color: var(--tabs-text);
    border-color: var(--tabs-border);
}

.tab-button.active {
    color: var(--tabs-accent);
    background: var(--tabs-accent-soft);
    border-color: var(--tabs-accent);
}

.tabs-body {
    min-height: 240px;
}

.tab-fade-enter-active,
.tab-fade-leave-active {
    transition: opacity 160ms ease, transform 160ms ease;
}

.tab-fade-enter-from,
.tab-fade-leave-to {
    opacity: 0;
    transform: translateY(6px);
}
</style>