<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton, NCard } from 'naive-ui'

const router = useRouter()

const quickLinks = [
  { label: '工作台概览', route: '/dashboard' },
  { label: '库存查询', route: '/inventoryManagement/inventory' },
  { label: '采购收货', route: '/inboundManagement/purchase-receipt' },
  { label: '其他出库', route: '/outboundManagement/misc-outbound-orders' },
]

function navigateTo(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="home-entry-page">
    <n-card :bordered="false" class="hero-card">
      <div class="hero-title">Polaris WMS</div>
      <div class="hero-subtitle">统一工作台入口，后续可在此接入个性化首页、待办提醒和业务捷径。</div>
      <div class="hero-actions">
        <n-button type="primary" @click="navigateTo('/dashboard')">进入工作台</n-button>
      </div>
    </n-card>

    <div class="quick-grid">
      <n-card v-for="item in quickLinks" :key="item.route" hoverable :bordered="false" class="quick-card" @click="navigateTo(item.route)">
        <div class="quick-label">{{ item.label }}</div>
        <div class="quick-arrow">进入</div>
      </n-card>
    </div>
  </div>
</template>

<style scoped>
.home-entry-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card {
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
  color: #ffffff;
}

.hero-title {
  font-size: 30px;
  font-weight: 800;
}

.hero-subtitle {
  margin-top: 10px;
  max-width: 680px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.82);
}

.hero-actions {
  margin-top: 18px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.quick-card {
  cursor: pointer;
}

.quick-label {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.quick-arrow {
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
}
</style>
