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
          meta: { title: '库内作业', order: 3, requiresAuth: true, requiredPolicy: 'WMS.InternalOps' },
          children: [
            {
              path: 'move-task',
              name: 'MoveTaskManagement',
              component: () => import('../views/taskRouting/moveTask/MoveTaskIndex.vue'),
              meta: { title: '搬运任务', requiresAuth: true, order: 1 },
            },
            {
              path: 'routing-strategy',
              name: 'RoutingStrategyList',
              component: () => import('../views/taskRouting/routingStrategy/index.vue'),
              meta: { title: '路由规则', requiresAuth: true, requiredPolicy: 'WMS.InternalOps.RoutingStrategies', order: 1.5 },
            },
            {
              path: 'order',
              name: 'TransferOrderList',
              component: () => import('../views/operation/transfer/index.vue'),
              meta: { title: '调拨单', requiresAuth: true, requiredPolicy: 'WMS.InternalOps.TransferOrders', order: 2 },
            },
            {
              path: 'order/create',
              name: 'TransferOrderCreate',
              component: () => import('../views/operation/transfer/create.vue'),
              meta: { title: '新增调拨单', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InternalOps.TransferOrders.Create' },
            },
            {
              path: 'order/:id',
              name: 'TransferOrderDetail',
              component: () => import('../views/operation/transfer/detail.vue'),
              meta: { title: '调拨单详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'order/:id/edit',
              name: 'TransferOrderEdit',
              component: () => import('../views/operation/transfer/edit.vue'),
              meta: { title: '编辑调拨单', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InternalOps.TransferOrders.Update' },
            },
            {
              path: 'stocktake',
              name: 'StocktakeManagement',
              component: () => import('../views/inventory/stocktake/index.vue'),
              meta: { title: '盘点管理', requiresAuth: true, requiredPolicy: 'WMS.InternalOps.Stocktake', order: 4 },
            },
            {
              path: 'stocktake/create',
              name: 'StocktakeCreate',
              component: () => import('../views/inventory/stocktake/create.vue'),
              meta: { title: '新增盘点', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InternalOps.Stocktake' },
            },
            {
              path: 'stocktake/:id',
              name: 'StocktakeDetail',
              component: () => import('../views/inventory/stocktake/detail.vue'),
              meta: { title: '盘点详情', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InternalOps.Stocktake' },
            },
            {
              path: 'pallet-merge',
              name: 'PalletMergeManagement',
              component: () => import('../views/operation/merge/index.vue'),
              meta: { title: '分拆合盘', requiresAuth: true, requiredPolicy: 'WMS.InternalOps.PalletMerge', order: 5 },
            },
            {
              path: 'pallet-merge/create',
              name: 'PalletMergeCreate',
              component: () => import('../views/operation/merge/create.vue'),
              meta: { title: '新增分拆合盘', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InternalOps.PalletMerge' },
            },
            {
              path: 'pallet-merge/:id',
              name: 'PalletMergeDetail',
              component: () => import('../views/operation/merge/detail.vue'),
              meta: { title: '分拆合盘详情', requiresAuth: true, hidden: true },
            },
          ]
        },
        {
          path: 'inventoryManagement',
          meta: { title: '库存管理', order: 5, requiresAuth: true, requiredPolicy: 'WMS.InventoryOps' },
          children: [
            {
              path: 'inventory',
              name: 'InventoryList',
              component: () => import('../views/inventory/stock/index.vue'),
              meta: { title: '库存查询', requiresAuth: true, requiredPolicy: 'WMS.InventoryOps.InventoryViews', order: 2 },
            },
            {
              path: 'transactions',
              name: 'InventoryTransactionList',
              component: () => import('../views/inventory/transaction/index.vue'),
              meta: { title: '库存流水', requiresAuth: true, requiredPolicy: 'WMS.InventoryOps.InventoryTransactions', order: 3 },
            },
            {
              path: 'allocation',
              name: 'InventoryAllocationList',
              component: () => import('../views/inventory/allocation/index.vue'),
              meta: { title: '订单库存预留', requiresAuth: true, requiredPolicy: 'WMS.InventoryOps.InventoryAllocations', order: 4 },
            },
            {
              path: 'container',
              name: 'ContainerList',
              component: () => import('../views/baseData/reel/index.vue'),
              meta: { title: '盘具管理', requiresAuth: true, requiredPolicy: 'WMS.MasterData.Containers', order: 1 },
            },
          ],
        },
        {
          path: 'inboundManagement',
          meta: { title: '入库管理', order: 2, requiresAuth: true, requiredPolicy: 'WMS.InboundOps' },
          children: [
            {
              path: 'purchase-receipt',
              name: 'PurchaseReceiptManagement',
              component: () => import('../views/inbound/purchaseReceipt/index.vue'),
              meta: { title: '采购收货', requiresAuth: true, requiredPolicy: 'WMS.InboundOps.PurchaseReceipts', order: 1 },
            },
            {
              path: 'purchase-receipt/:id',
              name: 'PurchaseReceiptDetail',
              component: () => import('../views/inbound/purchaseReceipt/detail.vue'),
              meta: { title: '采购收货详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'asn',
              name: 'AsnList',
              component: () => import('../views/inbound/asn/index.vue'),
              meta: { title: 'ASN 查询', requiresAuth: true, requiredPolicy: 'WMS.InboundOps.Asns', order: 2 },
            },
            {
              path: 'asn/:id',
              name: 'AsnDetail',
              component: () => import('../views/inbound/asn/detail.vue'),
              meta: { title: 'ASN 详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'purchase-order',
              name: 'PurchaseOrderList',
              component: () => import('../views/inbound/purchaseOrder/index.vue'),
              meta: { title: '采购单查询', requiresAuth: true, requiredPolicy: 'WMS.InboundOps.PurchaseOrders', order: 3 },
            },
            {
              path: 'purchase-order/:id',
              name: 'PurchaseOrderDetail',
              component: () => import('../views/inbound/purchaseOrder/detail.vue'),
              meta: { title: '采购单详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'production-inbound',
              name: 'ProductionInboundManagement',
              component: () => import('../views/inbound/productionInbound/index.vue'),
              meta: { title: '生产入库', requiresAuth: true, requiredPolicy: 'WMS.InboundOps.ProductionInbounds', order: 4 },
            },
            {
              path: 'production-inbound/create',
              name: 'ProductionInboundCreate',
              component: () => import('../views/inbound/productionInbound/create.vue'),
              meta: { title: '新增生产入库', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InboundOps.ProductionInbounds.Create' },
            },
            {
              path: 'production-inbound/edit/:orderId',
              name: 'ProductionInboundEdit',
              component: () => import('../views/inbound/productionInbound/edit.vue'),
              meta: { title: '编辑生产入库', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InboundOps.ProductionInbounds.Update' },
            },
            {
              path: 'production-inbound/:orderId',
              name: 'ProductionInboundDetail',
              component: () => import('../views/inbound/productionInbound/detail.vue'),
              meta: { title: '生产入库详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'return',
              name: 'SalesReturnManagement',
              component: () => import('../views/inbound/return/index.vue'),
              meta: { title: '销售退货', requiresAuth: true, requiredPolicy: 'WMS.InboundOps.SalesReturns', order: 5 },
            },
            {
              path: 'misc-inbound-orders',
              name: 'MiscInboundOrdersManagement',
              component: () => import('../views/inbound/miscInboundOrders/index.vue'),
              meta: { title: '其他入库', requiresAuth: true, requiredPolicy: 'WMS.InboundOps.MiscInboundOrders', order: 6 },
            },
            {
              path: 'misc-inbound-orders/create',
              name: 'MiscInboundOrdersCreate',
              component: () => import('../views/inbound/miscInboundOrders/create.vue'),
              meta: { title: '新增其他入库', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InboundOps.MiscInboundOrders.Create' },
            },
            {
              path: 'misc-inbound-orders/edit/:id',
              name: 'MiscInboundOrdersEdit',
              component: () => import('../views/inbound/miscInboundOrders/edit.vue'),
              meta: { title: '编辑其他入库', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.InboundOps.MiscInboundOrders.Update' },
            },
            {
              path: 'misc-inbound-orders/:id',
              name: 'MiscInboundOrdersDetail',
              component: () => import('../views/inbound/miscInboundOrders/detail.vue'),
              meta: { title: '其他入库详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'putaway',
              name: 'PutawayIndex',
              component: () => import('../views/operation/putaway/index.vue'),
              meta: { title: '上架管理', requiresAuth: true, requiredPolicy: 'WMS.InboundOps.Putaways', order: 7 },
            },
          ],
        },
        {
          path: 'master-data',
          meta: { title: '基础数据', order: 1, requiresAuth: true, requiredPolicy: 'WMS.MasterData' },
          children: [
            {
              path: 'product',
              name: 'ProductList',
              component: () => import('../views/baseData/product/index.vue'),
              meta: { title: '物料管理', requiresAuth: true, requiredPolicy: 'WMS.MasterData.Products', order: 1 },
            },
            {
              path: 'supplier',
              name: 'SupplierList',
              component: () => import('../views/baseData/supplier/index.vue'),
              meta: { title: '供应商管理', requiresAuth: true, requiredPolicy: 'WMS.MasterData.Suppliers', order: 2 },
            },
            {
              path: 'customer',
              name: 'CustomerList',
              component: () => import('../views/baseData/customer/index.vue'),
              meta: { title: '客户管理', requiresAuth: true, requiredPolicy: 'WMS.MasterData.Customers', order: 3 },
            },
            {
              path: 'warehouse',
              name: 'WarehouseList',
              component: () => import('../views/baseData/warehouse/index.vue'),
              meta: { title: '仓库管理', requiresAuth: true, requiredPolicy: 'WMS.MasterData.Warehouses', order: 4 },
            },
            {
              path: 'zone',
              name: 'ZoneList',
              component: () => import('../views/baseData/zone/index.vue'),
              meta: { title: '库区管理', requiresAuth: true, requiredPolicy: 'WMS.MasterData.Zones', order: 5 },
            },
            {
              path: 'location',
              name: 'LocationList',
              component: () => import('../views/baseData/location/index.vue'),
              meta: { title: '库位管理', requiresAuth: true, requiredPolicy: 'WMS.MasterData.Locations', order: 6 },
            },
            {
              path: 'account-alias',
              name: 'AccountAliasList',
              component: () => import('../views/baseData/accountAlias/index.vue'),
              meta: { title: '账户别名', requiresAuth: true, requiredPolicy: 'WMS.MasterData.AccountAliases', order: 7 },
            },
            {
              path: 'cost-center',
              name: 'CostCenterList',
              component: () => import('../views/baseData/costCenter/index.vue'),
              meta: { title: '成本中心', requiresAuth: true, requiredPolicy: 'WMS.MasterData.CostCenters', order: 8 },
            },
          ],
        },
        {
          path: 'outboundManagement',
          meta: { title: '出库管理', order: 4, requiresAuth: true, requiredPolicy: 'WMS.OutboundOps' },
          children: [
            {
              path: 'sales-order',
              name: 'SalesOrderList',
              component: () => import('../views/outbound/order/index.vue'),
              meta: { title: '销售订单', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.SalesOrders', order: 1 },
            },
            {
              path: 'sales-order/create',
              name: 'SalesOrderCreate',
              component: () => import('../views/outbound/order/create.vue'),
              meta: { title: '新增销售订单', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.SalesOrders.Create' },
            },
            {
              path: 'sales-order/:id',
              name: 'SalesOrderDetail',
              component: () => import('../views/outbound/order/detail.vue'),
              meta: { title: '销售订单详情', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.SalesOrders' },
            },
            {
              path: 'sales-delivery-plan',
              name: 'SalesDeliveryPlanList',
              component: () => import('../views/outbound/deliveryPlan/index.vue'),
              meta: { title: '销售发运计划', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.SalesDeliveryPlans', order: 2 },
            },
            {
              path: 'sales-delivery-plan/:id',
              name: 'SalesDeliveryPlanDetail',
              component: () => import('../views/outbound/deliveryPlan/detail.vue'),
              meta: { title: '销售发运计划详情', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.SalesDeliveryPlans' },
            },
            {
              path: 'sales-allocation-order',
              name: 'SalesAllocationOrderList',
              component: () => import('../views/outbound/allocation/index.vue'),
              meta: { title: '销售配货', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.SalesAllocationOrders', order: 3 },
            },
            {
              path: 'sales-allocation-order/:id',
              name: 'SalesAllocationOrderDetail',
              component: () => import('../views/outbound/allocation/detail.vue'),
              meta: { title: '销售配货详情', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.SalesAllocationOrders' },
            },
            {
              path: 'wave',
              name: 'WaveManagement',
              component: () => import('../views/outbound/wave/index.vue'),
              meta: { title: '波次管理', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.Waves', order: 4 },
            },
            {
              path: 'wave/:id',
              name: 'WaveDetail',
              component: () => import('../views/outbound/wave/detail.vue'),
              meta: { title: '波次详情', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.Waves' },
            },
            {
              path: 'pick-list',
              name: 'PickListManagement',
              component: () => import('../views/outbound/pickList/PickListIndex.vue'),
              meta: { title: '拣货单', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.PickLists', order: 5 },
            },
            {
              path: 'pick-list/:id',
              name: 'PickListDetail',
              component: () => import('../views/outbound/pickList/PickListDetail.vue'),
              meta: { title: '拣货单详情', requiresAuth: true, hidden: true },
            },
            {
              path: 'pick-task',
              name: 'PickTaskView',
              component: () => import('../views/outbound/pickTask/index.vue'),
              meta: { title: '拣货执行', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.PickTasks', order: 6 },
            },
            {
              path: 'review',
              name: 'OutboundReviewList',
              component: () => import('../views/outbound/review/index.vue'),
              meta: { title: '出库复核', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.Reviews', order: 7 },
            },
            {
              path: 'review/:id',
              name: 'OutboundReviewDetail',
              component: () => import('../views/outbound/review/detail.vue'),
              meta: { title: '出库复核详情', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.Reviews' },
            },
            {
              path: 'handover',
              name: 'OutboundHandoverList',
              component: () => import('../views/outbound/handover/HandoverIndex.vue'),
              meta: { title: '出库交接', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.Handovers', order: 8 },
            },
            {
              path: 'handover/:id',
              name: 'OutboundHandoverDetail',
              component: () => import('../views/outbound/handover/detail.vue'),
              meta: { title: '出库交接详情', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.Handovers' },
            },
            {
              path: 'purchase-return',
              name: 'PurchaseReturnManagement',
              component: () => import('../views/outbound/purchaseReturn/index.vue'),
              meta: { title: '采购退货', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.PurchaseReturns', order: 9 },
            },
            {
              path: 'purchase-return/create',
              name: 'PurchaseReturnCreate',
              component: () => import('../views/outbound/purchaseReturn/create.vue'),
              meta: { title: '新增采购退货', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.PurchaseReturns.Create' },
            },
            {
              path: 'purchase-return/:id/edit',
              name: 'PurchaseReturnEdit',
              component: () => import('../views/outbound/purchaseReturn/edit.vue'),
              meta: { title: '编辑采购退货', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.PurchaseReturns.Update' },
            },
            {
              path: 'purchase-return/:id',
              name: 'PurchaseReturnDetail',
              component: () => import('../views/outbound/purchaseReturn/detail.vue'),
              meta: { title: '采购退货详情', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.PurchaseReturns' },
            },
            {
              path: 'misc-outbound-orders',
              name: 'MiscOutboundOrdersManagement',
              component: () => import('../views/outbound/miscOutboundOrder/MiscOutboundOrderIndex.vue'),
              meta: { title: '其他出库', requiresAuth: true, requiredPolicy: 'WMS.OutboundOps.MiscOutboundOrders', order: 10 },
            },
            {
              path: 'misc-outbound-orders/create',
              name: 'MiscOutboundOrdersCreate',
              component: () => import('../views/outbound/miscOutboundOrder/create.vue'),
              meta: { title: '新增其他出库', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.MiscOutboundOrders.Create' },
            },
            {
              path: 'misc-outbound-orders/edit/:id',
              name: 'MiscOutboundOrdersEdit',
              component: () => import('../views/outbound/miscOutboundOrder/edit.vue'),
              meta: { title: '编辑其他出库', requiresAuth: true, hidden: true, requiredPolicy: 'WMS.OutboundOps.MiscOutboundOrders.Update' },
            },
            {
              path: 'misc-outbound-orders/:id',
              name: 'MiscOutboundOrdersDetail',
              component: () => import('../views/outbound/miscOutboundOrder/detail.vue'),
              meta: { title: '其他出库详情', requiresAuth: true, hidden: true },
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
              component: () => import('../views/system/role/index.vue'),
              meta: { title: '角色管理', requiresAuth: true, requiredPolicy: 'AbpIdentity.Roles', order: 1 },
            },
            {
              path: 'organization-unit',
              name: 'DepartmentManagement',
              component: () => import('../views/system/organizationUnit/index.vue'),
              meta: { title: '部门管理', requiresAuth: true, requiredPolicy: 'AbpIdentity.OrganizationUnits', order: 2 },
            },
            {
              path: 'user',
              name: 'UserManagement',
              component: () => import('../views/system/user/index.vue'),
              meta: { title: '用户管理', requiresAuth: true, requiredPolicy: 'AbpIdentity.Users', order: 3 },
            },
            {
              path: 'data-sync-task',
              name: 'DataSyncTaskList',
              component: () => import('../views/system/dataSyncTask/index.vue'),
              meta: { title: '数据同步中心', requiresAuth: true, order: 4 },
            },
            {
              path: 'operation-log',
              name: 'OperationLogManagement',
              component: () => import('../views/system/operationLog/index.vue'),
              meta: { title: '操作日志', requiresAuth: true, requiredPolicy: 'WMS.Global.AuditLog', order: 5 },
            },
            {
              path: 'interface-log',
              name: 'InterfaceLogManagement',
              component: () => import('../views/system/interfaceLog/index.vue'),
              meta: { title: '接口日志', requiresAuth: true, order: 6 },
            },
          ],
        },
      ],
    },
  ],
})

const appTitle = '极星仓储'

router.afterEach((to) => {
  const isBrandRoute = to.name === 'Login' || to.name === 'Dashboard'
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = isBrandRoute || !pageTitle ? appTitle : pageTitle
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
