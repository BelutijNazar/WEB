// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import RegistrationPage from '../components/RegistrationPage.vue'; 
import LoginPage from '../components/LoginPage.vue'; 
import ChatPage from '../components/ChatPage.vue';
import GoodJobPage from '../components/GoodJobPage.vue'; 

const routes = [
  {
    path: '/',
    name: 'reg',
    component: RegistrationPage,
  },
  {
    path: '/log',
    name: 'login',
    component: LoginPage,
  },
  {
    path: '/chat',
    name: 'chat',
    component: ChatPage,
  },
  {
    path: '/gj',
    name: 'GoodJobPage',
    component: GoodJobPage,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) {
    console.warn('Попытка попасть на защищённую страницу без токена.')
    next('/log')
  } else {
    next()
  }
})

export default router;