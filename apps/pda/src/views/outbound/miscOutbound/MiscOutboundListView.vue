<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getMiscOutboundList } from '@/api/outbound/miscOutbound'
import { MiscOrderStatus } from '@/api/inbound/miscInbound'
import type { MiscOutboundOrderDto } from '@/api/outbound/miscOutbound'
import dayjs from 'dayjs'

const router = useRouter()

const orders = ref<MiscOutboundOrderDto[]>([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

function goBack() {
  router.back()
}

function formatDate(dateString: string) {
  if (!dateString) return '-'
  return dayjs(dateString).format('YYYY-MM-DD HH:mm')
}

async function fetchOrders(isRefresh = false) {
  try {
    if (isRefresh) {
      currentPage.value = 1
      finished.value = false
    }

    const skipCount = (currentPage.value - 1) * pageSize.value
    const res = await getMiscOutboundList({
      skipCount,
      maxResultCount: pageSize.value,
      status: MiscOrderStatus.Draft // 仅展示草稿状态（待出库执行）
    })

    if (isRefresh) {
      orders.value = res.items ?? []
    } else {
      orders.value.push(...(res.items ?? []))
    }

    if (orders.value.length >= (res.totalCount ?? 0) || (res.items?.length ?? 0) < pageSize.value) {
      finished.value = true
    } else {
      currentPage.value++
    }
  } catch (error: any) {
    console.error(error)
    finished.value = true
    showToast(error?.message || '加载列表失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onLoad() {
  fetchOrders()
}

function onRefresh() {
  finished.value = false
  loading.value = true
  fetchOrders(true)
}

function openOrder(order: MiscOutboundOrderDto) {
  router.push({ name: 'MiscOutboundExecute', params: { shipmentId: order.id } })
}

onMounted(() => {
  fetchOrders(true)
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="goBack">
      <template #title>
        <span class="text-white font-bold tracking-wide">其他出库单</span>
      </template>
    </van-nav-bar>

    <div class="flex-1 overflow-y-auto p-4">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多单据了"
          :immediate-check="false"
          @load="onLoad"
          class="space-y-4 pb-20"
        >
          <van-empty v-if="orders.length === 0 && !loading" description="暂无待发货的其他出库单" class="mt-10" />

          <div
            v-for="order in orders"
            :key="order.id"
            class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 active:scale-[0.99] transition-all cursor-pointer"
            @click="openOrder(order)"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="font-black text-lg text-slate-800 font-mono">{{ order.orderNo }}</div>
                <div class="text-xs text-gray-400 mt-1">创建时间: {{ formatDate(order.creationTime) }}</div>
              </div>
              <van-tag type="warning" size="medium" class="font-bold">待出库</van-tag>
            </div>

            <div class="bg-[#eff6ff] rounded-xl p-3 text-sm text-slate-600 space-y-2 border border-sky-100">
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="user-o" class="text-sky-500 text-base" /></div>
                <span class="text-slate-500">账户别名:</span>
                <span class="ml-auto font-bold text-slate-800 truncate max-w-[180px]">{{ order.accountAliasDescription }}</span>
              </div>
              <div class="border-t border-dashed border-sky-100 my-1"></div>
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="hotel-o" class="text-sky-500 text-base" /></div>
                <span class="text-slate-500">成本中心:</span>
                <span class="ml-auto font-bold text-slate-800 truncate max-w-[180px]">{{ order.costCenterName }}</span>
              </div>
              <div class="border-t border-dashed border-sky-100 my-1"></div>
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="todo-list-o" class="text-sky-500 text-base" /></div>
                <span class="text-slate-500">明细行数:</span>
                <span class="ml-auto font-mono font-bold text-sky-600">{{ order.details?.length || 0 }} 行</span>
              </div>
            </div>

            <div class="mt-4">
              <van-button block round class="!bg-sky-600 active:!bg-sky-700 !border-none font-bold text-white shadow-md">
                开始出库执行
              </van-button>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<style scoped>
.custom-nav-bar {
  --van-nav-bar-background: #1e293b;
  --van-nav-bar-icon-color: #ffffff;
  --van-nav-bar-text-color: #ffffff;
}

:deep(.van-nav-bar::after) {
  display: none;
}
</style>
