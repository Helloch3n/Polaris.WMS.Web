<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getCycleCountList, CycleCountOrderStatus, CycleCountType } from '@/api/wms/cycleCount'
import type { CycleCountOrderDto } from '@/api/wms/cycleCount'
import dayjs from 'dayjs'

const router = useRouter()

const activeTab = ref<CycleCountOrderStatus>(CycleCountOrderStatus.New)
const tabOptions = [
  { title: '新建', value: CycleCountOrderStatus.New },
  { title: '盘点中', value: CycleCountOrderStatus.Counting },
  { title: '已完成', value: CycleCountOrderStatus.Completed },
]

const orders = ref<CycleCountOrderDto[]>([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

function goBack() {
  router.back()
}

function getCountTypeText(type: CycleCountType) {
  return type === CycleCountType.Open ? '明盘' : '暗盘'
}

function getStatusStyle(status: CycleCountOrderStatus) {
  switch (status) {
    case CycleCountOrderStatus.New:
      return { color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' } // Sky blue
    case CycleCountOrderStatus.Counting:
      return { color: '#eab308', bg: '#fefce8', border: '#fef08a' } // Yellow
    case CycleCountOrderStatus.Completed:
      return { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' } // Green
    default:
      return { color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' }
  }
}

function getStatusText(status: CycleCountOrderStatus) {
  switch (status) {
    case CycleCountOrderStatus.New:
      return '待执行'
    case CycleCountOrderStatus.Counting:
      return '进行中'
    case CycleCountOrderStatus.Completed:
      return '已完成'
    case CycleCountOrderStatus.Voided:
      return '已作废'
    default:
      return '-'
  }
}

function formatDate(dateString: string) {
  if (!dateString) return '-'
  return dayjs(dateString).format('MM-DD HH:mm')
}

async function fetchOrders(isRefresh = false) {
  try {
    if (isRefresh) {
      currentPage.value = 1
      finished.value = false
    }

    const skipCount = (currentPage.value - 1) * pageSize.value
    const res = await getCycleCountList({
      skipCount,
      maxResultCount: pageSize.value,
      status: activeTab.value,
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
    showToast(error?.message || '加载盘点列表失败')
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

function openOrder(order: CycleCountOrderDto) {
  if (!order.id) return
  router.push({ name: 'CycleCountExecute', params: { id: order.id } })
}

watch(activeTab, () => {
  orders.value = []
  loading.value = true
  fetchOrders(true)
})

onMounted(() => {
  fetchOrders(true)
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <!-- 头部 -->
    <div class="bg-slate-800 px-5 pt-8 pb-4 shrink-0 shadow-sm relative z-10">
      <div class="flex items-center text-white">
        <van-icon name="arrow-left" size="22" class="mr-3 cursor-pointer" @click="goBack" />
        <div class="font-extrabold text-2xl tracking-wider">盘点单任务</div>
      </div>
    </div>

    <!-- 状态 Tabs -->
    <van-tabs
      v-model:active="activeTab"
      sticky
      swipeable
      color="#10b981"
      title-active-color="#059669"
      class="shrink-0 custom-tabs z-10 shadow-sm"
    >
      <van-tab v-for="tab in tabOptions" :key="tab.value" :title="tab.title" :name="tab.value" />
    </van-tabs>

    <!-- 盘点单列表 -->
    <div class="flex-1 overflow-y-auto p-4 relative">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多盘点单了"
          :immediate-check="false"
          @load="onLoad"
          class="space-y-4 pb-20"
        >
          <van-empty v-if="orders.length === 0 && !loading" description="暂无盘点任务" class="mt-10" />

          <div
            v-for="order in orders"
            :key="order.id"
            class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            @click="openOrder(order)"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="font-black text-lg text-slate-800 font-mono">{{ order.orderNo }}</div>
                <div class="text-xs text-gray-400 mt-1">创建时间: {{ formatDate(order.creationTime) }}</div>
              </div>
              <div
                class="px-2 py-0.5 rounded-lg text-xs font-black border"
                :style="{
                  color: getStatusStyle(order.status).color,
                  backgroundColor: getStatusStyle(order.status).bg,
                  borderColor: getStatusStyle(order.status).border,
                }"
              >
                {{ getStatusText(order.status) }}
              </div>
            </div>

            <div class="bg-[#f0fdf4] rounded-xl p-3 text-sm text-slate-600 space-y-2 border border-emerald-100">
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="filter-o" class="text-emerald-500 class-base" /></div>
                <span class="text-slate-500">盘点模式:</span>
                <span class="ml-auto font-bold text-slate-800">{{ getCountTypeText(order.countType) }}</span>
              </div>
              <div class="border-t border-dashed border-emerald-100 my-1"></div>
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="todo-list-o" class="text-emerald-500 class-base" /></div>
                <span class="text-slate-500">盘点行数:</span>
                <span class="ml-auto font-mono font-bold text-emerald-600">{{ order.details?.length || 0 }} 行</span>
              </div>
            </div>

            <div class="mt-4" v-if="order.status !== CycleCountOrderStatus.Completed">
              <van-button block round class="!bg-emerald-500 active:!bg-emerald-600 !border-none font-bold text-white shadow-md">
                {{ order.status === CycleCountOrderStatus.New ? '开始盘点作业' : '继续盘点作业' }}
              </van-button>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<style scoped>
:deep(.custom-tabs .van-tabs__nav) {
  background-color: #ffffff;
}

:deep(.custom-tabs .van-tab) {
  font-weight: 600;
  color: #64748b;
}

:deep(.custom-tabs .van-tab--active) {
  font-weight: 900;
  color: #059669;
}

:deep(.van-pull-refresh) {
  min-height: 100%;
}
</style>