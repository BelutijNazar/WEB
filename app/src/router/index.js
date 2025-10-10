// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import RegistrationPage from '../components/RegistrationPage.vue'; 
import LoginPage from '../components/LoginPage.vue'; 
import ChatPage from '../components/ChatPage.vue'; 

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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;