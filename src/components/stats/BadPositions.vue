<script lang="ts" setup>
import { computed } from 'vue';
import type { AnalysedGame } from '../../analysis/types';
import StatsTable from './StatsTable.vue';

const props = defineProps<{
    games: AnalysedGame[]
}>();

const MIN_MOVE = 7

const lichessUrl = (fen: string) =>
    `https://lichess.org/analysis/standard/${fen.replace(/ /g, '_')}`

function openLichess(fen: string) {
    window.open(lichessUrl(fen), '_blank')
}

const rows = computed(() => {
    const fenMap: Record<string, { wins: number; gameUuids: Set<string> }> = {}

    props.games.forEach((game) => {
        const seenInGame = new Set<string>()
        game.frames.forEach((frame) => {
            if (frame.moveNumber < MIN_MOVE) return
            const fen = frame.fenAfter
            if (seenInGame.has(fen)) return
            seenInGame.add(fen)

            if (!fenMap[fen]) {
                fenMap[fen] = { wins: 0, gameUuids: new Set() }
            }
            fenMap[fen].gameUuids.add(game.uuid)
            if (game.result === 'win') {
                fenMap[fen].wins += 1
            }
        })
    })

    return Object.entries(fenMap)
        .filter(([, data]) => data.gameUuids.size > 1)
        .map(([fen, data]) => ({
            fieldName: fen,
            count: data.gameUuids.size,
            winrate: (data.wins / data.gameUuids.size) * 100,
        }))
        .sort((a, b) => a.winrate - b.winrate)
})
</script>

<template>
    <StatsTable
        title="Recurring Positions"
        fieldNameLabel="FEN"
        countLabel="Games"
        :rows="rows"
        :onRowClick="openLichess"
        :description="`Positions (after move ${MIN_MOVE - 1}) that appear in more than one game. Click a position to open it in Lichess analysis.`"
    />
</template>
