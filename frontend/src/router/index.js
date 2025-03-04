import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import SubmitTraffic from '../views/SubmitTraffic.vue'
import UserProfile from '../views/UserProfile.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/submit',
    name: 'SubmitTraffic',
    component: SubmitTraffic
  },
  {
    path: '/profile',
    name: 'UserProfile',
    component: UserProfile
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 