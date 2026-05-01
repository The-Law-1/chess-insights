<script setup lang="ts">
import PgnLoader from '../components/PgnLoader.vue'
</script>

<template>
  <main class="pgn-page">
    <PgnLoader />
  </main>
</template>

<style scoped>
.pgn-page {
  min-height: 100vh;
  padding: 1.5rem 0;
  background: radial-gradient(circle at top, #f1f5f9 0%, #e2e8f0 45%, #cbd5f5 100%);
}
</style>
