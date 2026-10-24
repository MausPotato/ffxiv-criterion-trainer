import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import KetudukeTrainerView from '../views/KetudukeTrainerView.vue';
import LalaRuTrainerView from '../views/LalaRuTrainerView.vue';

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/aloalo-island/ketuduke',
      name: 'ketuduke-trainer',
      component: KetudukeTrainerView
    },
    {
      path: '/aloalo-island/lalaru/rotation',
      name: 'lalaru-rotation-trainer',
      component: LalaRuTrainerView
    },
    {
      path: '/dungeons/aloalo-island/bosses/ketuduke/mechanics/queue-method',
      redirect: { name: 'ketuduke-trainer' }
    }
  ]
});
