import { createRouter, createWebHistory } from 'vue-router'
import MainPage      from '../views/MainPage.vue'
import CocinaPedidos from '../views/CocinaPedidos.vue'



const routes = [
  {
    path: '/',
    name: 'MainPage',
    component: MainPage,
  },
  {
    path: '/cocina',
    name: 'CocinaPedidos',
    component: CocinaPedidos,
  },

  
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router