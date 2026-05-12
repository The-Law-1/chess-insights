<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

export interface NavSection {
    id: string;
    label: string;
}

const props = defineProps<{
    sections: NavSection[];
}>();

const activeId = ref('');

let observer: IntersectionObserver | null = null;

onMounted(() => {
    const els = props.sections
        .map(s => document.getElementById(s.id))
        .filter(Boolean) as HTMLElement[];

    if (els.length === 0) return;

    observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    activeId.value = entry.target.id;
                }
            }
        },
        {
            rootMargin: '-15% 0px -75% 0px',
            threshold: 0,
        },
    );

    for (const el of els) observer.observe(el);
});

onUnmounted(() => observer?.disconnect());

function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
</script>

<template>
    <nav class="stats-nav" aria-label="Stats sections">
        <div class="nav-label">On this page</div>
        <ul class="nav-list">
            <li
                v-for="section in sections"
                :key="section.id"
                class="nav-item"
                :class="{ active: activeId === section.id }"
            >
                <a
                    :href="`#${section.id}`"
                    class="nav-link"
                    @click.prevent="scrollTo(section.id)"
                >{{ section.label }}</a>
            </li>
        </ul>
    </nav>
</template>

<style scoped>
.stats-nav {
    position: sticky;
    top: 48px;
    padding: 0;
}

.nav-label {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
    margin-bottom: 18px;
}

.nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.nav-item {
    position: relative;
}

.nav-link {
    display: block;
    padding: 6px 14px;
    margin: 0 -14px;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s ease, background-color 0.15s ease;
    line-height: 1.5;
}

.nav-link:hover {
    color: var(--text-primary);
    background: var(--bg-card);
}

.nav-item.active .nav-link {
    color: var(--accent);
    background: var(--accent-soft);
}

@media (max-width: 768px) {
    .stats-nav {
        display: none;
    }
}
</style>
