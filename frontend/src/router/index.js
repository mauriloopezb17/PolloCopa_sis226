import { createRouter, createWebHistory } from 'vue-router'
import MainPage from '../views/MainPage.vue'
import Cocina from '../views/cocina/Cocina.vue'

const routes = [
  {
    path: '/',
    name: 'MainPage',
    component: MainPage,
  },

  {//agregue la ruta de cocina
    path: '/cocinaIngre',
    name: 'Cocina',
    component: Cocina,
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router