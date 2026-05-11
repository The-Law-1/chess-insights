import { createRouter, createWebHistory } from 'vue-router'


import Engine from './pages/Engine.vue'
import Games from './pages/Games.vue'
import Pgn from './pages/Pgn.vue'

const root = '/chess-insights'

const routes = [
  { path: root, component: Games },
  { path: `${root}/engine`, component: Engine },
  { path: `${root}/pgn`, component: Pgn },
  { path: `${root}/games`, component: Games },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})