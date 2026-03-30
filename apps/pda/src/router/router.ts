import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('../layout/PdaLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/pda',
    children: [
      { path: 'home', name: 'Home', component: () => import('../views/home/HomeView.vue'), meta: { title: '主页' } },
      { path: 'pda', name: 'PdaHome', component: () => import('../views/PdaHome.vue'), meta: { title: 'PDA' } },
      { path: 'task', name: 'Task', component: () => import('../views/task/TaskView.vue'), meta: { title: '任务' } },
      { path: 'task/move/:id', name: 'MoveTaskExecute', component: () => import('../views/task/MoveTaskExecute.vue'), meta: { title: '执行搬运', hideTabbar: true } },
      { path: 'scan', name: 'Scan', component: () => import('../views/scan/ScanView.vue'), meta: { title: '扫码' } },
      { path: 'exception', name: 'Exception', component: () => import('../views/exception/ExceptionView.vue'), meta: { title: '异常' } },
      { path: 'mine', name: 'Mine', component: () => import('../views/mine/MineView.vue'), meta: { title: '我的' } },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta?.requiresAuth !== false

  if (requiresAuth && !authStore.accessToken) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.path === '/login' && authStore.accessToken) {
    return { path: '/task' }
  }

  return true
})
