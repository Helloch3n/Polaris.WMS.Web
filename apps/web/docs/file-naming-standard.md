# 文件命名与大小写规范

适用范围：`src` 下前端源码（Vue + TypeScript）。

## 1. 页面文件（views）

- 列表主页统一使用：`模块名 + Index.vue`。
- 命名格式：`PascalCase`（大驼峰）。
- 示例：
  - `src/views/masterData/product/ProductIndex.vue`
  - `src/views/system/role/RoleIndex.vue`
  - `src/views/system/organizationUnitUser/OrganizationUnitUserIndex.vue`

## 2. 非列表页面

- 详情页：`模块名 + Detail.vue`（如 `ReceiptDetail.vue`）。
- 视图页：`模块名 + View.vue`（如 `PickTaskView.vue`）。
- 弹窗组件：`模块名 + Modal.vue`（如 `CreateReceiptModal.vue`）。
- 表单组件：`模块名 + Form.vue`（如 `SupplierForm.vue`）。

## 3. 通用组件与布局

- 组件文件统一 `PascalCase`：如 `BaseCrudPage.vue`、`TableColumnManager.vue`。
- 布局入口采用 `模块名 + Index.vue`：如 `LayoutIndex.vue`。

## 4. TypeScript 文件

- API、工具、store、composable 文件统一 `camelCase`（小驼峰）。
- 示例：`organizationUnits.ts`、`dataSyncTask.ts`、`useColumnConfig.ts`。
- 类型声明文件使用语义化小写：`naive-ui.d.ts`、`base-crud-page.d.ts`。

## 5. 目录命名

- 目录统一使用 `camelCase`。
- 多词目录不使用空格，不使用大写开头，不使用下划线。
- 示例：`masterData`、`organizationUnitUser`、`dataSyncTask`。

## 6. 禁止项

- 禁止在不同模块重复使用无语义文件名（如统一都叫 `index.vue`）。
- 禁止同层目录混用 `kebab-case`、`camelCase`、`PascalCase`。
- 禁止仅通过目录区分语义而文件名无语义。

## 7. 已完成本轮统一

本次已将原 `src/views/**/index.vue` 与 `src/layout/index.vue` 统一重命名为 `模块名 + Index.vue`，并同步更新路由导入路径。
