<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface StatCard {
  title: string
  value: string | number
  meta: string
  gradient: string
  iconPath: string
  trend?: string
  trendUp?: boolean
}

const stats: StatCard[] = [
  {
    title: '今日处理',
    value: 128,
    meta: '入库 / 出库 / 调拨',
    gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    trend: '+12%',
    trendUp: true,
  },
  {
    title: '待处理',
    value: 24,
    meta: '待审核 / 待拣货',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    trend: '-3',
    trendUp: false,
  },
  {
    title: '库存预警',
    value: 6,
    meta: '低于安全库存',
    gradient: 'linear-gradient(135deg, #ef4444, #f87171)',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    trend: '+2',
    trendUp: false,
  },
  {
    title: '在途任务',
    value: 9,
    meta: '运输 / 质检',
    gradient: 'linear-gradient(135deg, #22c55e, #4ade80)',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    trend: '0',
    trendUp: true,
  },
]

interface QuickAction {
  label: string
  route: string
  color: string
  bg: string
  iconPath: string
}

const quickActions: QuickAction[] = [
  {
    label: '新增入库',
    route: '/inbound/receipt',
    color: '#4f46e5',
    bg: '#eef2ff',
    iconPath: 'M12 4v16m8-8H4',
  },
  {
    label: '库存查询',
    route: '/inventory/inventory',
    color: '#0891b2',
    bg: '#ecfeff',
    iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  {
    label: '库存流水',
    route: '/inventory/transactions',
    color: '#7c3aed',
    bg: '#f5f3ff',
    iconPath: 'M9 5l7 7-7 7',
  },
  {
    label: '仓库管理',
    route: '/master-data/warehouse',
    color: '#059669',
    bg: '#ecfdf5',
    iconPath: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  },
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
        <h1 class="welcome-title">欢迎回来 👋</h1>
        <p class="welcome-subtitle">这里是你的工作台概览，祝你今天高效愉快。</p>
      </div>
      <div class="welcome-date">
        {{ new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div v-for="(stat, idx) in stats" :key="idx" class="stat-card">
        <div class="stat-card-inner">
          <div class="stat-left">
            <div class="stat-title">{{ stat.title }}</div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-meta">{{ stat.meta }}</div>
          </div>
          <div class="stat-right">
            <div class="stat-icon" :style="{ background: stat.gradient }">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path :d="stat.iconPath" />
              </svg>
            </div>
            <div v-if="stat.trend" class="stat-trend" :class="stat.trendUp ? 'trend-up' : 'trend-down'">
              <svg v-if="stat.trendUp" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M7 7l5 5 5-5M7 17l5-5 5 5" />
              </svg>
              <span>{{ stat.trend }}</span>
            </div>
          </div>
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
          <div class="action-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" :stroke="action.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="action.iconPath" />
            </svg>
          </div>
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
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.welcome-subtitle {
  margin: 6px 0 0;
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.stat-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 22px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03), 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.03);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.stat-card-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-title {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  margin-top: 8px;
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  letter-spacing: -1px;
}

.stat-meta {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.stat-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
}

.trend-up {
  color: #059669;
  background: #ecfdf5;
}

.trend-down {
  color: #dc2626;
  background: #fef2f2;
}

/* ---- 快捷入口 ---- */
.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 14px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.07);
  border-color: var(--action-color);
}

.action-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--action-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-label {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
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