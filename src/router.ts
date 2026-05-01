import { createRouter, createWebHistory } from 'vue-router'


import Engine from './pages/Engine.vue'
import Home from './pages/Home.vue'

const routes = [
    {path: '/', component: Home},
{ path: '/engine', component: Engine },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})