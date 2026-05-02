import { createRouter, createWebHistory } from 'vue-router'


import Engine from './pages/Engine.vue'
import Games from './pages/Games.vue'
import Home from './pages/Home.vue'
import Pgn from './pages/Pgn.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/engine', component: Engine },
  { path: '/pgn', component: Pgn },
  { path: '/games', component: Games },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})