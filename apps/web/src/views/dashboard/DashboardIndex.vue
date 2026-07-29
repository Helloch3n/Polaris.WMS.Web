<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import * as dashboardApi from '../../api/dashboard'

const router = useRouter()
const message = useMessage()

type OpsMetric = {
  label: string
  value: string | number
  hint: string
  tone: 'pending' | 'progress' | 'success' | 'error'
  route: string
}

type FlowItem = {
  label: string
  done: number
  total: number
  operation: 'inbound' | 'internal' | 'outbound'
}

type TodoItem = {
  title: string
  detail: string
  count: string
  tone: 'pending' | 'progress' | 'error'
  route: string
}

type QuickAction = {
  label: string
  route: string
  description: string
  operation: 'inbound' | 'inventory' | 'outbound' | 'system'
}

const loading = ref(false)
const opsMetrics = ref<OpsMetric[]>([])
const inboundFlows = ref<FlowItem[]>([])
const internalFlows = ref<FlowItem[]>([])
const outboundFlows = ref<FlowItem[]>([])
const todoItems = ref<TodoItem[]>([])
const quickActions: QuickAction[] = [
  { label: '生产入库', route: '/inboundManagement/production-inbound', description: '查看生产入库单与执行进度', operation: 'inbound' },
  { label: '采购收货', route: '/inboundManagement/purchase-receipt', description: '进入到货签收与明细确认', operation: 'inbound' },
  { label: '库存查询', route: '/inventoryManagement/inventory', description: '查看实时库存、批次和库位分布', operation: 'inventory' },
  { label: '波次管理', route: '/outboundManagement/wave', description: '跟踪出库波次释放和执行', operation: 'outbound' },
]

async function loadDashboardSnapshot() {
  loading.value = true
  try {
    const summary = await dashboardApi.getOperationsSummary()
    opsMetrics.value = [
      { label: '待上架', value: summary.pendingPutawayCount, hint: '待执行上架任务', tone: 'pending', route: '/inboundManagement/putaway?tab=all&status=Pending' },
      { label: '待搬运', value: summary.pendingMoveCount, hint: '待执行库内搬运任务', tone: 'progress', route: '/internalManagement/move-task?status=Pending' },
      { label: '待拣货', value: summary.pendingPickCount, hint: '待执行拣货任务', tone: 'pending', route: '/outboundManagement/pick-task?status=Pending' },
      { label: '待复核', value: summary.pendingReviewCount, hint: '待完成出库复核单', tone: 'success', route: '/outboundManagement/review?status=Created' },
    ]
    inboundFlows.value = summary.inboundFlows.map((item) => ({ ...item, operation: 'inbound' }))
    internalFlows.value = summary.internalFlows.map((item) => ({ ...item, operation: 'internal' }))
    outboundFlows.value = summary.outboundFlows.map((item) => ({ ...item, operation: 'outbound' }))
    todoItems.value = [
      { title: '待上架', detail: '等待执行的上架任务', count: String(summary.pendingPutawayCount).padStart(2, '0'), tone: 'pending', route: '/inboundManagement/putaway?tab=all&status=Pending' },
      { title: '待搬运', detail: '等待执行的库内搬运任务', count: String(summary.pendingMoveCount).padStart(2, '0'), tone: 'progress', route: '/internalManagement/move-task?status=Pending' },
      { title: '待拣货', detail: '等待执行的拣货任务', count: String(summary.pendingPickCount).padStart(2, '0'), tone: 'pending', route: '/outboundManagement/pick-task?status=Pending' },
      { title: '待复核', detail: '等待完成的出库复核单', count: String(summary.pendingReviewCount).padStart(2, '0'), tone: 'progress', route: '/outboundManagement/review?status=Created' },
    ]
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载运营工作台数据失败')
  } finally {
    loading.value = false
  }
}

function navigateTo(route: string) {
  router.push(route)
}

function getProgress(item: FlowItem) {
  if (item.total <= 0) return 0
  return Math.round((item.done / item.total) * 100)
}

onMounted(() => {
  loadDashboardSnapshot()
})
</script>

<template>
  <div class="dashboard" :data-loading="loading">
    <section class="ops-header">
      <div>
        <div class="ops-kicker">运营工作台</div>
        <h1 class="ops-title">今日作业总览</h1>
        <p class="ops-subtitle">聚合待上架、待搬运、待拣货、待复核和关键流程进度，优先处理影响出入库效率的事项。</p>
      </div>
      <div class="ops-date">
        {{ new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}
      </div>
    </section>

    <section class="metric-grid">
      <button v-for="item in opsMetrics" :key="item.label" class="metric-card" :data-tone="item.tone" type="button" @click="navigateTo(item.route)">
        <div class="metric-label">{{ item.label }}</div>
        <div class="metric-value">{{ item.value }}</div>
        <div class="metric-hint">{{ item.hint }}</div>
      </button>
    </section>

    <section class="workbench-grid">
      <div class="flow-board">
        <div class="section-heading">
          <h2>流程进度</h2>
          <span>入库 / 库内 / 出库</span>
        </div>

        <div class="flow-columns">
          <div class="flow-column" data-operation="inbound">
            <div class="flow-column-title">入库作业</div>
            <div v-for="item in inboundFlows" :key="item.label" class="flow-item">
              <div class="flow-row">
                <span>{{ item.label }}</span>
                <strong>{{ item.done }}/{{ item.total }}</strong>
              </div>
              <div class="flow-track">
                <div class="flow-bar" :style="{ width: `${getProgress(item)}%` }" />
              </div>
            </div>
          </div>

          <div class="flow-column" data-operation="internal">
            <div class="flow-column-title">库内作业</div>
            <div v-for="item in internalFlows" :key="item.label" class="flow-item">
              <div class="flow-row">
                <span>{{ item.label }}</span>
                <strong>{{ item.done }}/{{ item.total }}</strong>
              </div>
              <div class="flow-track">
                <div class="flow-bar" :style="{ width: `${getProgress(item)}%` }" />
              </div>
            </div>
          </div>

          <div class="flow-column" data-operation="outbound">
            <div class="flow-column-title">出库作业</div>
            <div v-for="item in outboundFlows" :key="item.label" class="flow-item">
              <div class="flow-row">
                <span>{{ item.label }}</span>
                <strong>{{ item.done }}/{{ item.total }}</strong>
              </div>
              <div class="flow-track">
                <div class="flow-bar" :style="{ width: `${getProgress(item)}%` }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="todo-board">
        <div class="section-heading">
          <h2>待办与异常</h2>
          <span>按处理优先级排序</span>
        </div>
        <div class="todo-list">
          <button v-for="item in todoItems" :key="item.title" class="todo-item" :data-tone="item.tone" type="button" @click="navigateTo(item.route)">
            <div class="todo-count">{{ item.count }}</div>
            <div class="todo-body">
              <div class="todo-title">{{ item.title }}</div>
              <div class="todo-detail">{{ item.detail }}</div>
            </div>
          </button>
        </div>
      </aside>
    </section>

    <section class="quick-section">
      <div class="section-heading">
        <h2>快捷入口</h2>
        <span>常用业务入口</span>
      </div>
      <div class="quick-grid">
        <button
          v-for="action in quickActions"
          :key="action.label"
          class="quick-card"
          :data-operation="action.operation"
          type="button"
          @click="navigateTo(action.route)"
        >
          <span class="quick-dot" />
          <span class="quick-label">{{ action.label }}</span>
          <span class="quick-description">{{ action.description }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  color: var(--wms-text-primary);
}

.dashboard[data-loading='true'] {
  opacity: 0.92;
}

.ops-header,
.metric-card,
.flow-board,
.todo-board,
.quick-section {
  background: var(--wms-surface-panel);
  border: 1px solid var(--wms-border-subtle);
  border-radius: 8px;
  box-shadow: var(--wms-shadow-panel);
}

.ops-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
}

.ops-kicker {
  font-size: 12px;
  font-weight: 700;
  color: var(--wms-brand);
}

.ops-title {
  margin: 4px 0 0;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 760;
}

.ops-subtitle {
  margin: 8px 0 0;
  max-width: 760px;
  font-size: 13px;
  color: var(--wms-text-secondary);
}

.ops-date {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--wms-text-muted);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  position: relative;
  width: 100%;
  padding: 14px 16px 14px 18px;
  overflow: hidden;
  font: inherit;
  color: var(--wms-text-primary);
  text-align: left;
  cursor: pointer;
}

.metric-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--metric-tone);
}

.metric-card[data-tone='pending'] {
  --metric-tone: var(--wms-status-pending);
}

.metric-card[data-tone='progress'] {
  --metric-tone: var(--wms-status-progress);
}

.metric-card[data-tone='success'] {
  --metric-tone: var(--wms-status-success);
}

.metric-card[data-tone='error'] {
  --metric-tone: var(--wms-status-error);
}

.metric-label {
  font-size: 12px;
  color: var(--wms-text-muted);
}

.metric-value {
  margin-top: 6px;
  font-size: 26px;
  line-height: 1;
  font-weight: 760;
  color: var(--metric-tone);
}

.metric-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--wms-text-secondary);
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.55fr);
  gap: 12px;
}

.flow-board,
.todo-board,
.quick-section {
  padding: 14px;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-heading h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.section-heading span {
  font-size: 12px;
  color: var(--wms-text-muted);
}

.flow-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.flow-column {
  padding: 12px;
  border: 1px solid var(--wms-border-subtle);
  border-radius: 8px;
  background: var(--wms-surface-muted);
}

.flow-column[data-operation='inbound'] {
  --flow-color: var(--wms-op-inbound);
}

.flow-column[data-operation='internal'] {
  --flow-color: var(--wms-op-internal);
}

.flow-column[data-operation='outbound'] {
  --flow-color: var(--wms-op-outbound);
}

.flow-column-title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 700;
  color: var(--flow-color);
}

.flow-item + .flow-item {
  margin-top: 12px;
}

.flow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--wms-text-secondary);
}

.flow-row strong {
  font-weight: 700;
  color: var(--wms-text-primary);
}

.flow-track {
  margin-top: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--wms-border-subtle);
  overflow: hidden;
}

.flow-bar {
  height: 100%;
  border-radius: inherit;
  background: var(--flow-color);
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--wms-border-subtle);
  border-radius: 8px;
  background: var(--wms-surface-muted);
  color: var(--wms-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.todo-item[data-tone='pending'] {
  --todo-color: var(--wms-status-pending);
  --todo-bg: var(--wms-status-pending-bg);
}

.todo-item[data-tone='progress'] {
  --todo-color: var(--wms-status-progress);
  --todo-bg: var(--wms-status-progress-bg);
}

.todo-item[data-tone='error'] {
  --todo-color: var(--wms-status-error);
  --todo-bg: var(--wms-status-error-bg);
}

.todo-count {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--todo-bg);
  color: var(--todo-color);
  font-weight: 760;
}

.todo-body {
  min-width: 0;
}

.todo-title {
  font-size: 13px;
  font-weight: 700;
}

.todo-detail {
  margin-top: 3px;
  font-size: 12px;
  color: var(--wms-text-secondary);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.quick-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 8px;
  min-height: 84px;
  padding: 12px;
  text-align: left;
  border: 1px solid var(--wms-border-subtle);
  border-radius: 8px;
  background: var(--wms-surface-muted);
  color: var(--wms-text-primary);
  cursor: pointer;
}

.quick-card:hover {
  border-color: var(--quick-color);
  background: var(--wms-surface-hover);
}

.quick-card[data-operation='inbound'] {
  --quick-color: var(--wms-op-inbound);
}

.quick-card[data-operation='inventory'] {
  --quick-color: var(--wms-op-inventory);
}

.quick-card[data-operation='outbound'] {
  --quick-color: var(--wms-op-outbound);
}

.quick-card[data-operation='system'] {
  --quick-color: var(--wms-op-system);
}

.quick-dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 999px;
  background: var(--quick-color);
}

.quick-label {
  font-size: 14px;
  font-weight: 700;
}

.quick-description {
  grid-column: 2;
  font-size: 12px;
  line-height: 1.55;
  color: var(--wms-text-secondary);
}

@media (max-width: 1280px) {
  .metric-grid,
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .flow-columns {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .ops-header,
  .workbench-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .ops-date {
    justify-self: start;
  }
}

@media (max-width: 720px) {
  .metric-grid,
  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
