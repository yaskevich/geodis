import { createWebHistory, createRouter } from 'vue-router';

const routes = [
  {
    path: '/',
    alias: ['/home'],
    name: 'Home',
    // component: Home,
    component: () => import('./components/Home.vue'),
  },
  {
    path: '/list',
    name: 'List',
    component: () => import('./components/List.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
