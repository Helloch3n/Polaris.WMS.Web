<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface StatCard {
  title: string
  value: string | number
  meta: string
  color: string
}

const stats: StatCard[] = [
  { title: '今日处理', value: 128, meta: '入库 / 出库 / 调拨', color: '#2563eb' },
  { title: '待处理', value: 24, meta: '待审核 / 待拣货', color: '#f59e0b' },
  { title: '库存预警', value: 6, meta: '低于安全库存', color: '#ef4444' },
  { title: '在途任务', value: 9, meta: '运输 / 质检', color: '#22c55e' },
]

interface QuickAction {
  label: string
  route: string
  color: string
  bg: string
}

const quickActions: QuickAction[] = [
  { label: '采购收货', route: '/inboundManagement/purchase-receipt', color: '#2563eb', bg: '#eff6ff' },
  { label: '库存查询', route: '/inventoryManagement/inventory', color: '#0891b2', bg: '#ecfeff' },
  { label: '库存流水', route: '/inventoryManagement/transactions', color: '#7c3aed', bg: '#f5f3ff' },
  { label: '仓库管理', route: '/master-data/warehouse', color: '#059669', bg: '#ecfdf5' },
]

function navigateTo(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="dashboard">
    <!-- 欢迎区 -->
    <div class="welcome-section">
      <div class="welcome-text">
        <h1 class="welcome-title">欢迎回来</h1>
        <p class="welcome-subtitle">这里是你的工作台概览</p>
      </div>
      <div class="welcome-date">
        {{ new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}
      </div>
    </div>

    <!-- 统计卡片 -->
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

    <!-- 快捷入口 -->
    <div class="section">
      <h3 class="section-title">快捷入口</h3>
      <div class="actions-grid">
        <div
          v-for="(action, idx) in quickActions"
          :key="idx"
          class="action-card"
          :style="{ '--action-color': action.color, '--action-bg': action.bg }"
          @click="navigateTo(action.route)"
        >
          <div class="action-dot" :style="{ background: action.color }" />
          <span class="action-label">{{ action.label }}</span>
          <svg class="action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1200px;
}

/* ---- 欢迎区 ---- */
.welcome-section {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.welcome-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.welcome-subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: #94a3b8;
}

.welcome-date {
  font-size: 13px;
  color: #94a3b8;
  white-space: nowrap;
}

/* ---- 统计卡片 ---- */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: stretch;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #f1f5f9;
  transition: box-shadow 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
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

/* ---- 快捷入口 ---- */
.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: #ffffff;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.action-card:hover {
  border-color: var(--action-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.action-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.action-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.action-arrow {
  color: #cbd5e1;
  transition: transform 0.2s ease, color 0.2s ease;
}

.action-card:hover .action-arrow {
  color: var(--action-color);
  transform: translateX(3px);
}
</style>