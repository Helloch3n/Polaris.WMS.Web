<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import dayjs from 'dayjs'
import { getHandoverList, HandoverStatus, type HandoverOrderDto } from '@/api/outbound/handover'

const router = useRouter()
const orders = ref<HandoverOrderDto[]>([])
const loading = ref(false)
const refreshing = ref(false)

function statusLabel(status: number) {
  if (status === HandoverStatus.Created) return '待交接'
  if (status === HandoverStatus.InProgress) return '交接中'
  if (status === HandoverStatus.Exception) return '有异常'
  return String(status)
}

function statusType(status: number) {
  if (status === HandoverStatus.Exception) return 'danger'
  if (status === HandoverStatus.InProgress) return 'primary'
  return 'warning'
}

async function load() {
  loading.value = true
  try {
    const responses = await Promise.all([
      getHandoverList({ skipCount: 0, maxResultCount: 100, status: HandoverStatus.Created }),
      getHandoverList({ skipCount: 0, maxResultCount: 100, status: HandoverStatus.InProgress }),
      getHandoverList({ skipCount: 0, maxResultCount: 100, status: HandoverStatus.Exception }),
    ])
    orders.value = responses.flatMap(response => response.items ?? [])
      .sort((a, b) => b.creationTime.localeCompare(a.creationTime))
  } catch (error: any) {
    showFailToast(error?.message || '加载出库交接失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="router.back()">
      <template #title><span class="text-white font-bold">出库交接</span></template>
    </van-nav-bar>
    <div class="flex-1 overflow-y-auto p-3">
      <van-pull-refresh v-model="refreshing" @refresh="load">
        <van-empty v-if="orders.length === 0 && !loading" description="暂无待处理交接单" />
        <div class="space-y-3">
          <article
            v-for="order in orders"
            :key="order.id"
            class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.99]"
            @click="router.push({ name: 'PdaHandoverExecute', params: { id: order.id } })"
          >
            <div class="flex justify-between items-start">
              <div class="font-black text-slate-800 font-mono">{{ order.handoverNo }}</div>
              <van-tag :type="statusType(order.status)">{{ statusLabel(order.status) }}</van-tag>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>车辆：<b class="text-slate-700">{{ order.vehicleNo || '-' }}</b></div>
              <div>仓库：<b class="text-slate-700">{{ order.warehouseCode }}</b></div>
              <div>进度：<b class="text-sky-600">{{ order.loadedLineCount }}/{{ order.totalLineCount }}</b></div>
              <div>创建：<b class="text-slate-700">{{ dayjs(order.creationTime).format('MM-DD HH:mm') }}</b></div>
            </div>
          </article>
        </div>
      </van-pull-refresh>
      <van-loading v-if="loading" class="py-10 text-center" />
    </div>
  </div>
</template>

<style scoped>
.custom-nav-bar {
  --van-nav-bar-background: #1e293b;
  --van-nav-bar-icon-color: #fff;
  --van-nav-bar-text-color: #fff;
}
</style>
