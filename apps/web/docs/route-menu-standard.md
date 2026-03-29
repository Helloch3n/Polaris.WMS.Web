# 路由驱动菜单规范

适用范围：`apps/web/src/router/index.ts`、`apps/web/src/layout/LayoutIndex.vue`。

## 目标

- 以路由作为菜单唯一数据源（Single Source of Truth）。
- 避免“菜单配置 + 路由配置”双维护。
- 保证菜单显示权限与路由访问权限一致。

## 必须满足

- 菜单由路由 `meta` 自动生成，禁止在布局里手写独立菜单数组。
- 所有“应出现在菜单”的页面路由必须配置：
  - `meta.title`：菜单文案
  - `meta.order`：同级排序（数字越小越靠前）
- 所有“详情页/新建页/编辑页/过程页”等非菜单页面必须配置：
  - `meta.hidden = true`
- 需要权限控制的页面必须配置：
  - `meta.requiredPolicy`（如 `WMS.Inventory.Transactions`）
- 路由守卫必须继续做最终鉴权，菜单隐藏不能替代接口和路由权限校验。

## 推荐约定

- 分组路由（父级菜单）只负责分组与标题，建议配置 `meta.title + meta.order`。
- 动态参数路由（如 `:id`）默认不进入菜单，且应显式设置 `meta.hidden = true`。
- `meta.title` 同时用于标签页标题（tab title），确保菜单与标签语义一致。

## 路由示例

```ts
{
  path: 'inventory',
  meta: { title: '库存管理', order: 2 },
  children: [
    {
      path: 'inventory',
      name: 'InventoryList',
      component: () => import('../views/inventory/InventoryIndex.vue'),
      meta: { title: '库存管理', requiresAuth: true, requiredPolicy: 'WMS.Inventory', order: 1 },
    },
    {
      path: 'transactions',
      name: 'InventoryTransactionList',
      component: () => import('../views/inventory/transaction/InventoryTransactionIndex.vue'),
      meta: { title: '库存流水', requiresAuth: true, requiredPolicy: 'WMS.Inventory.Transactions', order: 2 },
    },
    {
      path: 'receipt/:id',
      name: 'ReceiptDetail',
      component: () => import('../views/inbound/receipt/detail.vue'),
      meta: { title: '入库单详情', requiresAuth: true, hidden: true },
    },
  ],
}
```

## 新增页面检查清单

- 菜单页已配置 `meta.title`
- 菜单页已配置 `meta.order`
- 受控页面已配置 `meta.requiredPolicy`（如需要）
- 非菜单页面已配置 `meta.hidden = true`
- 本地验证通过：菜单可见性、排序、跳转、403 拦截
