import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import { ACCESS_TOKEN_STORAGE_KEY, useAuthStore } from '../stores/auth'
import { useTabsStore } from '../stores/tabs'

async function resolveRouteComponentName(route: RouteLocationNormalized): Promise<string> {
  const matchedRecord = route.matched[route.matched.length - 1]
  if (!matchedRecord) {
    return (route.name as string) ?? route.path
  }

  const routeComponent = matchedRecord.components?.default
  if (!routeComponent) {
    return (route.name as string) ?? route.path
  }

  if (typeof routeComponent !== 'function') {
    const resolvedComponent = routeComponent as { name?: string; __name?: string }
    return resolvedComponent.name || resolvedComponent.__name || (route.name as string) || route.path
  }

  try {
    const lazyLoader = routeComponent as unknown as () => Promise<unknown>
    const loaded = await lazyLoader()
    const resolvedModule = loaded as { default?: { name?: string; __name?: string } }
    const resolvedComponent = resolvedModule.default ?? (loaded as { name?: string; __name?: string })
    return resolvedComponent.name || resolvedComponent.__name || (route.name as string) || route.path
  } catch {
    return (route.name as string) ?? route.path
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/403',
      name: 'Forbidden',
      component: () => import('../views/exception/ForbiddenView.vue'),
      meta: { requiresAuth: false, title: '无权限' },
    },
    {
      path: '/',
      component: () => import('../layout/LayoutIndex.vue'),
      meta: { requiresAuth: true },
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/dashboard/DashboardIndex.vue'),
          meta: { title: '首页', hidden: true },
        },
        {
          path: 'internalManagement',
          meta: { title: '库内作业', order: 2, requiresAuth: true, requiredPolicy: 'WMS.InternalOps' },
          children: [
            {
              path: 'order',
              name: 'TransferOrderList',
              component: () => import('../views/transfer/TransferOrderIndex.vue'),
              meta: { title: '调拨单', requiresAuth: true, requiredPolicy: 'WMS.InternalOps.TransferOrders', order: 1 },
            },
            {
              path: 'order/create',
              name: 'TransferOrderCreate',
              component: () => import('../views/transfer/create.vue'),
              meta: { title: '新增调拨单', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InternalOps.TransferOrders.Create' },
            },
            {
              path: 'order/:id',
              name: 'TransferOrderDetail',
              component: () => import('../views/transfer/detail.vue'),
              meta: { title: '调拨单详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'order/:id/edit',
              name: 'TransferOrderEdit',
              component: () => import('../views/transfer/edit.vue'),
              meta: { title: '编辑调拨单', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InternalOps.TransferOrders.Update' },
            },
            {
              path: 'stocktake',
              name: 'StocktakeManagement',
              component: () => import('../views/inventory/stocktake/StocktakeIndex.vue'),
              meta: { title: '盘点管理', requiresAuth: true, requiredPolicy: 'WMS.InternalOps.Stocktake', order: 3 },
            },
            {
              path: 'pallet-merge',
              name: 'PalletMergeManagement',
              component: () => import('../views/inventory/palletMerge/PalletMergeIndex.vue'),
              meta: { title: '分拆合盘', requiresAuth: true, requiredPolicy: 'WMS.InternalOps.PalletMerge', order: 4 },
            },
          ]
        },
        {
          path: 'inventoryManagement',
          meta: { title: '库存管理', order: 2, requiresAuth: true, requiredPolicy: 'WMS.InventoryOps' },
          children: [
            {
              path: 'inventory',
              name: 'InventoryList',
              component: () => import('../views/inventory/InventoryIndex.vue'),
              meta: { title: '库存查询', requiresAuth: true, requiredPolicy: 'WMS.InventoryOps.InventoryViews', order: 2 },
            },
            {
              path: 'transactions',
              name: 'InventoryTransactionList',
              component: () => import('../views/inventory/transaction/InventoryTransactionIndex.vue'),
              meta: { title: '库存流水', requiresAuth: true, requiredPolicy: 'WMS.InventoryOps.InventoryTransactions', order: 3 },
            },
            {
              path: 'reel',
              name: 'ReelList',
              component: () => import('../views/masterData/reel/ReelIndex.vue'),
              meta: { title: '盘具管理', requiresAuth: true, order: 1 },
            },
          ],
        },
        {
          path: 'inboundManagement',
          meta: { title: '入库管理', order: 3 },
          children: [
            {
              path: 'receipt',
              name: 'ReceiptList',
              component: () => import('../views/inbound/receipt/ReceiptIndex.vue'),
              meta: { title: '入库管理', requiresAuth: true, order: 1 },
            },
            {
              path: 'receipt/:id',
              name: 'ReceiptDetail',
              component: () => import('../views/inbound/receipt/detail.vue'),
              meta: { title: '入库单详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'purchase-receipt',
              name: 'PurchaseReceiptManagement',
              component: () => import('../views/inbound/purchaseReceipt/PurchaseReceiptIndex.vue'),
              meta: { title: '采购收货', requiresAuth: true, order: 2 },
            },
            {
              path: 'purchase-inbound',
              name: 'PurchaseInboundManagement',
              component: () => import('../views/inbound/purchaseInbound/PurchaseInboundIndex.vue'),
              meta: { title: '采购入库', requiresAuth: true, order: 3 },
            },
            {
              path: 'asn',
              name: 'AsnList',
              component: () => import('../views/inbound/asn/AsnIndex.vue'),
              meta: { title: 'ASN 查询', requiresAuth: true, order: 4 },
            },
            {
              path: 'purchase-order',
              name: 'PurchaseOrderList',
              component: () => import('../views/inbound/purchaseOrder/PurchaseOrderIndex.vue'),
              meta: { title: '采购单查询', requiresAuth: true, order: 5 },
            },
            {
              path: 'production-inbound',
              name: 'ProductionInboundManagement',
              component: () => import('../views/inbound/productionInbound/ProductionInboundIndex.vue'),
              meta: { title: '生产入库', requiresAuth: true, order: 4 },
            },
            {
              path: 'production-inbound/create',
              name: 'ProductionInboundCreate',
              component: () => import('../views/inbound/productionInbound/create.vue'),
              meta: { title: '新增生产入库', requiresAuth: true, hidden: true },
            },
            {
              path: 'production-inbound/edit/:orderId',
              name: 'ProductionInboundEdit',
              component: () => import('../views/inbound/productionInbound/edit.vue'),
              meta: { title: '编辑生产入库', requiresAuth: true, hidden: true },
            },
            {
              path: 'production-inbound/:orderId',
              name: 'ProductionInboundDetail',
              component: () => import('../views/inbound/productionInbound/detail.vue'),
              meta: { title: '生产入库详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'return',
              name: 'ReturnManagement',
              component: () => import('../views/inbound/return/ReturnIndex.vue'),
              meta: { title: '退货管理', requiresAuth: true, order: 5 },
            },
            {
              path: 'putaway',
              name: 'PutawayIndex',
              component: () => import('../views/putaway/PutawayIndex.vue'),
              meta: { title: '上架管理', requiresAuth: true, order: 6 },
            },
          ],
        },
        {
          path: 'master-data',
          meta: { title: '基础数据', order: 1 },
          children: [
            {
              path: 'product',
              name: 'ProductList',
              component: () => import('../views/masterData/product/ProductIndex.vue'),
              meta: { title: '物料管理', requiresAuth: true, order: 1 },
            },
            {
              path: 'supplier',
              name: 'SupplierList',
              component: () => import('../views/masterData/supplier/SupplierIndex.vue'),
              meta: { title: '供应商管理', requiresAuth: true, order: 2 },
            },
            {
              path: 'warehouse',
              name: 'WarehouseList',
              component: () => import('../views/masterData/warehouse/WarehouseIndex.vue'),
              meta: { title: '仓库管理', requiresAuth: true, order: 3 },
            },
            {
              path: 'zone',
              name: 'ZoneList',
              component: () => import('../views/masterData/zone/ZoneIndex.vue'),
              meta: { title: '库区管理', requiresAuth: true, order: 4 },
            },
            {
              path: 'location',
              name: 'LocationList',
              component: () => import('../views/masterData/location/LocationIndex.vue'),
              meta: { title: '库位管理', requiresAuth: true, order: 5 },
            },
                      ],
        },
        {
          path: 'outboundManagement',
          meta: { title: '出库管理', order: 5 },
          children: [
            {
              path: 'outbound',
              name: 'OutboundList',
              component: () => import('../views/outbound/OutboundIndex.vue'),
              meta: { title: '出库管理', requiresAuth: true, order: 1 },
            },
            {
              path: 'pick-task',
              name: 'PickTaskView',
              component: () => import('../views/outbound/PickTaskView.vue'),
              meta: { title: '拣货执行', requiresAuth: true, order: 2 },
            },
            {
              path: 'wave',
              name: 'WaveManagement',
              component: () => import('../views/outbound/wave/WaveIndex.vue'),
              meta: { title: '波次管理', requiresAuth: true, order: 3 },
            },
          ],
        },
        {
          path: 'system',
          meta: { title: '系统管理', order: 7 },
          children: [
            {
              path: 'role',
              name: 'RoleManagement',
              component: () => import('../views/system/role/RoleIndex.vue'),
              meta: { title: '角色管理', requiresAuth: true, order: 1 },
            },
            {
              path: 'organization-unit',
              name: 'DepartmentManagement',
              component: () => import('../views/system/organizationUnit/OrganizationUnitIndex.vue'),
              meta: { title: '部门管理', requiresAuth: true, order: 2 },
            },
            {
              path: 'user',
              name: 'UserManagement',
              component: () => import('../views/system/user/UserIndex.vue'),
              meta: { title: '用户管理', requiresAuth: true, order: 3 },
            },
            {
              path: 'data-sync-task',
              name: 'DataSyncTaskList',
              component: () => import('../views/system/dataSyncTask/DataSyncTaskIndex.vue'),
              meta: { title: '数据同步中心', requiresAuth: true, order: 4 },
            },
            {
              path: 'operation-log',
              name: 'OperationLogManagement',
              component: () => import('../views/system/operationLog/OperationLogIndex.vue'),
              meta: { title: '操作日志', requiresAuth: true, order: 5 },
            },
            {
              path: 'interface-log',
              name: 'InterfaceLogManagement',
              component: () => import('../views/system/interfaceLog/InterfaceLogIndex.vue'),
              meta: { title: '接口日志', requiresAuth: true, order: 6 },
            },
          ],
        },
      ],
    },
  ],
})

//路由守卫
router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta?.requiresAuth !== false
  const accessToken = authStore.accessToken || localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || ''
  const isLoginRoute = to.path === '/login'

  if (!requiresAuth && !isLoginRoute) {
    return true
  }

  if (!accessToken) {
    if (isLoginRoute) {
      return true
    }
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (authStore.accessToken !== accessToken) {
    authStore.accessToken = accessToken
  }

  const shouldBootstrap =
    !authStore.appConfigLoaded ||
    authStore.appConfigLoadedToken !== accessToken

  if (shouldBootstrap) {
    try {
      await authStore.loadApplicationConfiguration(true)
    } catch {
      await authStore.logout({ redirect: true, redirectTarget: to.fullPath })
      return false
    }
  }

  if (isLoginRoute) {
    return { path: '/dashboard' }
  }

  if (requiresAuth) {
    const requiredPolicy = typeof to.meta?.requiredPolicy === 'string' ? to.meta.requiredPolicy : ''
    if (requiredPolicy && !authStore.hasPermission(requiredPolicy)) {
      return { path: '/403', query: { from: to.fullPath } }
    }

    if (to.meta?.title && to.path !== '/login') {
      const tabsStore = useTabsStore()
      const componentName = await resolveRouteComponentName(to)
      tabsStore.addTab({
        path: to.path,
        name: componentName,
        title: to.meta.title as string,
      })
    }
  }

  return true
})

export default router
