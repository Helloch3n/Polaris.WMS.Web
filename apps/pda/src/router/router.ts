//import { createRouter, createWebHistory } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PdaLayout from '@/layout/PdaLayout.vue'

const router = createRouter({
  //history: createWebHistory(import.meta.env.BASE_URL),
  history: createWebHashHistory(),
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
      redirect: '/home', // Redirect root to /home
      children: [
        {
          path: 'home', // Home route
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
          path: 'inbound/purchase-receipt/create',
          name: 'PurchaseReceiptCreate',
          component: () => import('@/views/inbound/purchaseReceipt/PurchaseReceiptCreateView.vue'),
          meta: { title: '采购收货', hideTabbar: true }
        },
        {
          path: 'inbound/purchase-receipt/receive-draft/:draftSessionId',
          name: 'PurchaseReceiptReceiveDraft',
          component: () => import('@/views/inbound/purchaseReceipt/PurchaseReceiptReceiveView.vue'),
          meta: { title: '采购收货执行', hideTabbar: true }
        },
        {
          path: 'inbound/purchase-receipt/receive/:receiptId',
          name: 'PurchaseReceiptReceive',
          component: () => import('@/views/inbound/purchaseReceipt/PurchaseReceiptReceiveView.vue'),
          meta: { title: '采购收货执行', hideTabbar: true }
        },
        {
          path: 'task',
          name: 'Task',
          component: () => import('@/views/task/TaskView.vue'),
          meta: { title: '任务大厅' }
        },
        {
          path: 'task/pick',
          name: 'PickTaskView',
          component: () => import('@/views/task/PickTaskView.vue'),
          meta: { title: '拣货作业' }
        },
        {
          path: 'task/pick/:id',
          name: 'PickTaskExecute',
          component: () => import('@/views/task/PickTaskExecute.vue'),
          meta: { title: '执行拣货', hideTabbar: true }
        },
        {
          path: 'task/putaway',
          name: 'PutawayTaskView',
          component: () => import('@/views/task/PutawayTaskView.vue'),
          meta: { title: '上架作业' }
        },
        {
          path: 'task/putaway/:id',
          name: 'PutawayTaskExecute',
          component: () => import('@/views/task/PutawayTaskExecute.vue'),
          meta: { title: '执行上架', hideTabbar: true }
        },
        {
          path: 'task/move/:id',
          name: 'MoveTaskExecute',
          component: () => import('@/views/task/MoveTaskExecute.vue'),
          meta: { title: '执行搬运', hideTabbar: true }
        },
        {
          path: 'task/cycle-count',
          name: 'CycleCountList',
          component: () => import('@/views/task/CycleCountPlaceholderView.vue'),
          meta: { title: '盘点作业' }
        },
        {
          path: 'task/cycle-count/execute/:id',
          name: 'CycleCountExecute',
          component: () => import('@/views/task/CycleCountExecuteView.vue'),
          meta: { title: '盘点执行', hideTabbar: true }
        },
        {
          path: 'task/stocktake',
          name: 'StocktakeCount',
          component: () => import('@/views/task/StocktakeCount.vue'),
          meta: { title: '库存盘点' }
        },
        {
          path: 'task/transfer',
          name: 'TransferList',
          component: () => import('@/views/task/transfer/TransferListView.vue'),
          meta: { title: '移库作业' }
        },
        {
          path: 'task/transfer/execute/:id',
          name: 'TransferExecute',
          component: () => import('@/views/task/transfer/TransferExecuteView.vue'),
          meta: { title: '移库执行', hideTabbar: true }
        },
        {
          path: 'task/relocation',
          name: 'Relocation',
          component: () => import('@/views/task/relocation/RelocationView.vue'),
          meta: { title: '理货作业', hideTabbar: true }
        },
        {
          path: 'task/container-binding',
          name: 'ContainerBinding',
          component: () => import('@/views/task/containerBinding/ContainerBindingView.vue'),
          meta: { title: '容器组盘拆托', hideTabbar: true }
        },
        {
          path: 'exception-report',
          name: 'ExceptionReport',
          component: () => import('@/views/exception/ExceptionView.vue'),
          meta: { title: '异常上报' }
        },
        {
          path: 'mine',
          name: 'Mine',
          component: () => import('@/views/mine/MineView.vue'),
          meta: { title: '个人中心' }
        },
        {
          path: 'inbound/misc-inbound',
          name: 'MiscInboundList',
          component: () => import('@/views/inbound/miscInbound/MiscInboundListView.vue'),
          meta: { title: '其他收货' }
        },
        {
          path: 'inbound/misc-inbound/receive/:receiptId',
          name: 'MiscInboundReceive',
          component: () => import('@/views/inbound/miscInbound/MiscInboundReceiveView.vue'),
          meta: { title: '其他收货执行', hideTabbar: true }
        },
        {
          path: 'outbound/misc-outbound',
          name: 'MiscOutboundList',
          component: () => import('@/views/outbound/miscOutbound/MiscOutboundListView.vue'),
          meta: { title: '其他发货' }
        },
        {
          path: 'outbound/misc-outbound/execute/:shipmentId',
          name: 'MiscOutboundExecute',
          component: () => import('@/views/outbound/miscOutbound/MiscOutboundExecuteView.vue'),
          meta: { title: '其他发货执行', hideTabbar: true }
        },
        {
          path: 'outbound/review',
          name: 'PdaReviewList',
          component: () => import('@/views/outbound/review/ReviewListView.vue'),
          meta: { title: '出库复核', hideTabbar: true }
        },
        {
          path: 'outbound/review/:id',
          name: 'PdaReviewExecute',
          component: () => import('@/views/outbound/review/ReviewExecuteView.vue'),
          meta: { title: '复核执行', hideTabbar: true }
        },
        {
          path: 'outbound/handover',
          name: 'PdaHandoverList',
          component: () => import('@/views/outbound/handover/HandoverListView.vue'),
          meta: { title: '出库交接', hideTabbar: true }
        },
        {
          path: 'outbound/handover/:id',
          name: 'PdaHandoverExecute',
          component: () => import('@/views/outbound/handover/HandoverExecuteView.vue'),
          meta: { title: '交接装车', hideTabbar: true }
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
  document.title = (to.meta.title as string) || '极星仓储'
  
  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router
