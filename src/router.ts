import { createRouter, createWebHistory } from 'vue-router'


import Engine from './pages/Engine.vue'
import Home from './pages/Home.vue'
import Pgn from './pages/Pgn.vue'

const routes = [
    {path: '/', component: Home},
{ path: '/engine', component: Engine },
  { path: '/pgn', component: Pgn },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})