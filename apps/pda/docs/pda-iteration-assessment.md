# PDA 迭代评估

更新时间：2026-04-30

## 第二阶段现状

已落地：

- 收货超收控制
- 库存查询中的容器明细、库位明细
- 拣货短拣异常联动
- 上架、搬运异常联动

当前仍受后端依赖阻塞：任务领取、暂停、继续。

PDA 现有任务 API 仅覆盖以下动作：

- 拣货：列表、详情、完成
- 上架：列表、详情、完成
- 搬运：列表、详情、完成

对应文件：

- apps/pda/src/api/pickTask.ts
- apps/pda/src/api/wms/putaway.ts
- apps/pda/src/api/wms/moveTask.ts

缺少的最小后端接口建议：

1. 领取任务
   - POST /api/app/pick-task/{id}/claim
   - POST /api/app/putaway-task/{id}/claim
   - POST /api/app/move-task/{id}/claim
2. 暂停任务
   - POST /api/app/pick-task/{id}/pause
   - POST /api/app/putaway-task/{id}/pause
   - POST /api/app/move-task/{id}/pause
3. 恢复任务
   - POST /api/app/pick-task/{id}/resume
   - POST /api/app/putaway-task/{id}/resume
   - POST /api/app/move-task/{id}/resume
4. 状态流转约束
   - 至少支持 Pending -> InProgress -> Completed
   - 可选支持 InProgress -> Paused -> InProgress

没有这些接口前，不建议在 PDA 上做假的生命周期按钮。

## 第三阶段评估

### 1. 生产入库

结论：优先级高，可下沉到 PDA。

原因：

- Web 端已有真实 API，支持列表、详情、创建、更新、审核执行
- 数据结构里包含容器、批次、SN、实际上架库位等现场要素

关键文件：

- apps/web/src/api/inbound/productionInbound.ts
- apps/web/src/views/inbound/productionInbound/index.vue

PDA 建议切入点：

- 按生产单号扫码建单或定位单据
- 明细扫码录入容器、批次、SN、库位
- 完成后调用 approve-and-execute

### 2. 调拨执行

结论：优先级高，可下沉到 PDA。

原因：

- Web 端已有真实 API，支持列表、详情、创建、更新、审核执行
- 明细结构中已经包含源库位、目标库位、容器、库存、物料等执行要素

关键文件：

- apps/web/src/api/transfer/transfer.ts
- apps/web/src/views/operation/transfer/index.vue

PDA 建议切入点：

- 只下沉执行页，不下沉完整管理页
- 操作员按调拨单或调拨明细执行扫码搬运
- 与现有搬运执行页复用库位、容器、防呆校验逻辑

### 3. 退货管理

结论：暂不建议进入开发，先做业务澄清。

原因：

- Web 页面明确写了业务边界待确认
- 采购退货、销售退货、生产退料可能不是同一套 PDA 流程
- 当前未看到对应真实 API 封装

关键文件：

- apps/web/src/views/inbound/return/index.vue

进入 PDA 之前至少要先明确：

- 退货类型是否拆分
- 每种退货是否都需要扫码收退/发退
- 是否复用现有采购收货或出库拣货的交互模型

### 4. 分拆合盘

结论：业务价值高，但当前工程准备度低。

原因：

- Web 路由已挂载，但页面仍是占位式管理壳
- 当前未找到对应 API 封装
- 现场动作强依赖容器级库存和事务接口

关键文件：

- apps/web/src/router/index.ts
- apps/web/src/views/operation/merge/index.vue

建议：

- 先补后端容器合盘/拆盘接口
- 再做 PDA 单页流：扫描来源容器 -> 扫描目标容器 -> 确认转移数量 -> 提交

### 5. 复核装车

结论：当前不建议进入 PDA 开发。

原因：

- review 和 shipment 页面都是 placeholder
- 当前未找到对应 API 封装
- 说明出库后段流程尚未形成可复用业务面

关键文件：

- apps/web/src/views/outbound/review/index.vue
- apps/web/src/views/outbound/shipment/index.vue

## 建议顺序

1. 先补第二阶段缺失的任务生命周期后端接口。
2. 第三阶段优先做生产入库 PDA。
3. 然后做调拨执行 PDA。
4. 退货管理待业务边界清楚后再排期。
5. 分拆合盘和复核装车等待后端与 Web 业务面成熟后再进入 PDA。