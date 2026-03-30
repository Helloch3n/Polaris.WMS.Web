import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PdaLayout from '@/layout/PdaLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/login/LoginView.vue'),
      meta: { requiresAuth: false, title: '登录' }
    },
    {
      path: '/', 
      component: PdaLayout,
      redirect: '/home', // 🚀 修复点：访问根目录直接重定向到明确的 /home
      children: [
        {
          path: 'home', // 🚀 明确的独立路径
          name: 'PdaHome',
          component: () => import('@/views/home/HomeView.vue'),
          meta: { title: '工作台' }
        },
        {
          path: 'inventory',
          name: 'Inventory',
          component: () => import('@/views/scan/ScanView.vue'),
          meta: { title: '库存管理' }
        },
        {
          path: 'task',
          name: 'Task',
          component: () => import('@/views/task/TaskView.vue'),
          meta: { title: '任务大厅' }
        },
        {
          path: 'task/move/:id',
          name: 'MoveTaskExecute',
          component: () => import('@/views/task/MoveTaskExecute.vue'),
          meta: { title: '执行搬运', hideTabbar: true }
        },
        {
          path: 'mine',
          name: 'Mine',
          component: () => import('@/views/mine/MineView.vue'),
          meta: { title: '个人中心' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/exception/ExceptionView.vue')
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  document.title = (to.meta.title as string) || 'Polaris WMS PDA'
  
  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router