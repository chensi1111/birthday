import { createRouter, createWebHashHistory } from "vue-router";

const home = () => import("../pages/home.vue");

const routes = [
  {
    path: "/:name?",
    name: "Home",
    component: home,
  }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

