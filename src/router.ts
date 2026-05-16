import { createRouter, createWebHistory } from "vue-router";

import Engine from "./pages/Engine.vue";
import Games from "./pages/Games.vue";
import Pgn from "./pages/Pgn.vue";

const routes = [
	{ path: "/chess-insights", component: Games },
	{ path: "/", component: Games },
	{ path: "/engine", component: Engine },
	{ path: "/pgn", component: Pgn },
	{ path: "/games", component: Games },
	{ path: "/:pathMatch(.*)*", redirect: "/" }
];

export const router = createRouter({
	history: createWebHistory(),
	routes
});
