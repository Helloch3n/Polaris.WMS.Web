<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface StatCard {
  title: string
  value: string | number
  meta: string
  color: string
}

const loading = ref(false)
const stats = ref<StatCard[]>([])

interface QuickAction {
  label: string
  route: string
  description: string
  color: string
  bg: string
}

const quickActions = ref<QuickAction[]>([])

interface FocusMetric {
  label: string
  value: string
  hint: string
  color: string
  bg: string
}

interface WorkflowItem {
  label: string
  done: number
  total: number
  color: string
}

interface TodoItem {
  title: string
  detail: string
  count: string
  color: string
  bg: string
}

const focusMetrics = ref<FocusMetric[]>([])
const workflowItems = ref<WorkflowItem[]>([])
const todoItems = ref<TodoItem[]>([])

function loadDashboardSnapshot() {
  loading.value = true
  try {
    stats.value = [
      { title: '今日处理', value: 128, meta: '入库 / 出库 / 调拨', color: '#2563eb' },
      { title: '待处理', value: 24, meta: '待审核 / 待拣货', color: '#f59e0b' },
      { title: '库存预警', value: 6, meta: '低于安全库存', color: '#ef4444' },
      { title: '在途任务', value: 9, meta: '运输 / 质检', color: '#22c55e' },
    ]
    focusMetrics.value = [
      { label: '在线仓库', value: '12', hint: '作业状态正常', color: '#2563eb', bg: '#eff6ff' },
      { label: '今日入库', value: '46', hint: '已完成 82%', color: '#0f766e', bg: '#ecfeff' },
      { label: '今日出库', value: '31', hint: '拣货执行中', color: '#7c3aed', bg: '#f5f3ff' },
      { label: '异常工单', value: '3', hint: '建议优先处理', color: '#dc2626', bg: '#fef2f2' },
    ]
    workflowItems.value = [
      { label: '采购收货', done: 38, total: 52, color: '#2563eb' },
      { label: '上架任务', done: 24, total: 32, color: '#0ea5e9' },
      { label: '拣货波次', done: 18, total: 27, color: '#f59e0b' },
      { label: '调拨执行', done: 11, total: 16, color: '#22c55e' },
    ]
    todoItems.value = [
      { title: '待审核单据', detail: '采购入库单、其他出库单待审核', count: '08', color: '#2563eb', bg: '#eff6ff' },
      { title: '库存预警', detail: '6 个物料低于安全库存', count: '06', color: '#ef4444', bg: '#fef2f2' },
      { title: '超时任务', detail: '搬运与上架任务超过计划时长', count: '04', color: '#f59e0b', bg: '#fffbeb' },
    ]
    quickActions.value = [
      { label: '采购收货', route: '/inboundManagement/purchase-receipt', description: '快速进入到货签收与明细确认', color: '#2563eb', bg: '#eff6ff' },
      { label: '库存查询', route: '/inventoryManagement/inventory', description: '查看实时库存、批次和库位分布', color: '#0891b2', bg: '#ecfeff' },
      { label: '库存流水', route: '/inventoryManagement/transactions', description: '追踪入出库流水与操作来源', color: '#7c3aed', bg: '#f5f3ff' },
      { label: '仓库管理', route: '/master-data/warehouse', description: '维护仓库主数据与基础配置', color: '#059669', bg: '#ecfdf5' },
    ]
  } finally {
    loading.value = false
  }
}

function navigateTo(route: string) {
  router.push(route)
}

onMounted(() => {
  loadDashboardSnapshot()
})
</script>

<template>
  <div class="dashboard" :data-loading="loading">
    <section class="hero-panel">
      <div class="welcome-section">
        <div class="welcome-text">
          <div class="eyebrow">WORKSPACE OVERVIEW</div>
          <h1 class="welcome-title">欢迎回来</h1>
          <p class="welcome-subtitle">这里是你的工作台概览，核心数据、待办提醒和常用入口都集中在这里。</p>
        </div>
        <div class="welcome-date">
          {{ new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}
        </div>
      </div>

      <div class="hero-metrics">
        <div v-for="(metric, idx) in focusMetrics" :key="idx" class="hero-metric" :style="{ '--metric-color': metric.color, '--metric-bg': metric.bg }">
          <div class="hero-metric-label">{{ metric.label }}</div>
          <div class="hero-metric-value">{{ metric.value }}</div>
          <div class="hero-metric-hint">{{ metric.hint }}</div>
        </div>
      </div>
    </section>

    <div class="stats-grid">
      <div v-for="(stat, idx) in stats" :key="idx" class="stat-card">
        <div class="stat-indicator" :style="{ background: stat.color }" />
        <div class="stat-body">
          <div class="stat-title">{{ stat.title }}</div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-meta">{{ stat.meta }}</div>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="section-title">业务进度</h3>
            <p class="section-caption">今日关键流程执行情况</p>
          </div>
        </div>
        <div class="workflow-list">
          <div v-for="(item, idx) in workflowItems" :key="idx" class="workflow-item">
            <div class="workflow-top">
              <span class="workflow-label">{{ item.label }}</span>
              <span class="workflow-value">{{ item.done }}/{{ item.total }}</span>
            </div>
            <div class="workflow-track">
              <div class="workflow-bar" :style="{ width: `${(item.done / item.total) * 100}%`, background: item.color }" />
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="section-title">待办提醒</h3>
            <p class="section-caption">建议优先处理的事项</p>
          </div>
        </div>
        <div class="todo-list">
          <div v-for="(item, idx) in todoItems" :key="idx" class="todo-item" :style="{ '--todo-color': item.color, '--todo-bg': item.bg }">
            <div class="todo-count">{{ item.count }}</div>
            <div class="todo-body">
              <div class="todo-title">{{ item.title }}</div>
              <div class="todo-detail">{{ item.detail }}</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="section">
      <h3 class="section-title">快捷入口</h3>
      <p class="section-caption">常用业务入口，减少层级跳转</p>
      <div class="actions-grid">
        <div
          v-for="(action, idx) in quickActions"
          :key="idx"
          class="action-card"
          :style="{ '--action-color': action.color, '--action-bg': action.bg }"
          @click="navigateTo(action.route)"
        >
          <div class="action-top">
            <div class="action-dot" :style="{ background: action.color }" />
            <svg class="action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div class="action-label">{{ action.label }}</div>
          <div class="action-description">{{ action.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.dashboard[data-loading='true'] {
  opacity: 0.9;
}

.hero-panel {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.98));
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.04);
}

.welcome-section {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 0.24em;
  font-weight: 700;
  color: #94a3b8;
}

.welcome-title {
  margin: 8px 0 0;
  font-size: 34px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.welcome-subtitle {
  margin: 10px 0 0;
  max-width: 720px;
  font-size: 14px;
  line-height: 1.75;
  color: #64748b;
}

.welcome-date {
  font-size: 13px;
  color: #94a3b8;
  white-space: nowrap;
  padding-top: 4px;
}

.hero-metrics {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.hero-metric {
  padding: 16px 18px;
  border-radius: 16px;
  background: var(--metric-bg);
  border: 1px solid rgba(255, 255, 255, 0.7);
}

.hero-metric-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.hero-metric-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 800;
  color: var(--metric-color);
  line-height: 1;
}

.hero-metric-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: stretch;
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.03);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
}

.stat-indicator {
  width: 3px;
  border-radius: 2px;
  margin-right: 16px;
  flex-shrink: 0;
}

.stat-title {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}

.stat-value {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
}

.stat-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #cbd5e1;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.panel {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.03);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.section-caption {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.workflow-list,
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.workflow-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workflow-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workflow-label,
.workflow-value {
  font-size: 13px;
  color: #475569;
}

.workflow-value {
  font-weight: 600;
}

.workflow-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.workflow-bar {
  height: 100%;
  border-radius: inherit;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--todo-bg);
}

.todo-count {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  color: var(--todo-color);
  font-size: 18px;
  font-weight: 800;
  flex-shrink: 0;
}

.todo-body {
  min-width: 0;
}

.todo-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.todo-detail {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #64748b;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 18px;
  background: #ffffff;
  border-radius: 16px;
  cursor: pointer;
  border: 1px solid #f1f5f9;
  min-height: 132px;
  transition: all 0.2s ease;
}

.action-card:hover {
  border-color: var(--action-color);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.action-top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.action-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  flex-shrink: 0;
}

.action-label {
  font-size: 16px;
  font-weight: 700;
  color: #334155;
}

.action-description {
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
}

.action-arrow {
  color: #cbd5e1;
  transition: transform 0.2s ease, color 0.2s ease;
}

.action-card:hover .action-arrow {
  color: var(--action-color);
  transform: translateX(3px);
}

@media (max-width: 1280px) {
  .hero-metrics,
  .stats-grid,
  .actions-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .hero-panel {
    padding: 20px;
  }

  .welcome-section,
  .content-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .welcome-date {
    padding-top: 0;
  }
}

@media (max-width: 720px) {
  .dashboard {
    gap: 18px;
  }

  .hero-metrics,
  .stats-grid,
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .welcome-title {
    font-size: 28px;
  }

  .hero-panel,
  .panel,
  .stat-card,
  .action-card {
    padding: 16px;
  }
}
</style>