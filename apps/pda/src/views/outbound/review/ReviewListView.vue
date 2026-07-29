<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import dayjs from 'dayjs'
import { getReviewList, ReviewStatus, type ReviewOrderDto } from '@/api/outbound/review'

const router = useRouter()
const orders = ref<ReviewOrderDto[]>([])
const loading = ref(false)
const refreshing = ref(false)

function statusLabel(status: number) {
  if (status === ReviewStatus.Created) return '待复核'
  if (status === ReviewStatus.Reviewing) return '复核中'
  if (status === ReviewStatus.Exception) return '有异常'
  return String(status)
}

function statusType(status: number) {
  if (status === ReviewStatus.Exception) return 'danger'
  if (status === ReviewStatus.Reviewing) return 'primary'
  return 'warning'
}

async function load() {
  loading.value = true
  try {
    const responses = await Promise.all([
      getReviewList({ skipCount: 0, maxResultCount: 100, status: ReviewStatus.Created }),
      getReviewList({ skipCount: 0, maxResultCount: 100, status: ReviewStatus.Reviewing }),
      getReviewList({ skipCount: 0, maxResultCount: 100, status: ReviewStatus.Exception }),
    ])
    orders.value = responses.flatMap(response => response.items ?? [])
      .sort((a, b) => b.creationTime.localeCompare(a.creationTime))
  } catch (error: any) {
    showFailToast(error?.message || '加载出库复核失败')
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
      <template #title><span class="text-white font-bold">出库复核</span></template>
    </van-nav-bar>
    <div class="flex-1 overflow-y-auto p-3">
      <van-pull-refresh v-model="refreshing" @refresh="load">
        <van-empty v-if="orders.length === 0 && !loading" description="暂无待处理复核单" />
        <div class="space-y-3">
          <article
            v-for="order in orders"
            :key="order.id"
            class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.99]"
            @click="router.push({ name: 'PdaReviewExecute', params: { id: order.id } })"
          >
            <div class="flex justify-between items-start">
              <div class="font-black text-slate-800 font-mono">{{ order.reviewNo }}</div>
              <van-tag :type="statusType(order.status)">{{ statusLabel(order.status) }}</van-tag>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>拣货单：<b class="text-slate-700">{{ order.pickListNo || '-' }}</b></div>
              <div>仓库：<b class="text-slate-700">{{ order.warehouseCode }}</b></div>
              <div>进度：<b class="text-sky-600">{{ order.reviewedLineCount }}/{{ order.totalLineCount }}</b></div>
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
