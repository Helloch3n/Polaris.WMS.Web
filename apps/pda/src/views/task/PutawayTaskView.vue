<script setup lang="ts">
import dayjs from 'dayjs'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getPutawayTaskList, PutawayTaskStatus } from '@/api/wms/putaway'
import type { PutawayTaskDto } from '@/api/wms/putaway'

const router = useRouter()

const activeTab = ref<PutawayTaskStatus>(PutawayTaskStatus.Pending)
const tabOptions = [
  { title: '待执行', value: PutawayTaskStatus.Pending },
  { title: '执行中', value: PutawayTaskStatus.InProgress },
  { title: '已完成', value: PutawayTaskStatus.Completed },
]

const tasks = ref<PutawayTaskDto[]>([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

function normalizeStatus(value: PutawayTaskDto['status']) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'pending' || normalized === '10') return PutawayTaskStatus.Pending
    if (normalized === 'inprogress' || normalized === '20') return PutawayTaskStatus.InProgress
    if (normalized === 'completed' || normalized === '30') return PutawayTaskStatus.Completed
    if (normalized === 'cancelled' || normalized === '40') return PutawayTaskStatus.Cancelled
  }
  if (typeof value === 'number') return value
  return PutawayTaskStatus.Pending
}

function getStatusText(value: PutawayTaskDto['status']) {
  const normalized = normalizeStatus(value)
  if (normalized === PutawayTaskStatus.Pending) return '待执行'
  if (normalized === PutawayTaskStatus.InProgress) return '执行中'
  if (normalized === PutawayTaskStatus.Completed) return '已完成'
  if (normalized === PutawayTaskStatus.Cancelled) return '已取消'
  return '-'
}

function getStatusStyle(value: PutawayTaskDto['status']) {
  const normalized = normalizeStatus(value)
  if (normalized === PutawayTaskStatus.Pending) {
    return { color: '#c2410c', bg: '#fff7ed', border: '#fdba74' }
  }
  if (normalized === PutawayTaskStatus.InProgress) {
    return { color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' }
  }
  if (normalized === PutawayTaskStatus.Completed) {
    return { color: '#15803d', bg: '#f0fdf4', border: '#86efac' }
  }
  return { color: '#475569', bg: '#f8fafc', border: '#cbd5e1' }
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = dayjs(value)
  return date.isValid() ? date.format('MM-DD HH:mm') : value
}

async function fetchTasks(isRefresh = false) {
  try {
    if (isRefresh) {
      currentPage.value = 1
      finished.value = false
    }

    const skipCount = (currentPage.value - 1) * pageSize.value
    const res = await getPutawayTaskList({
      skipCount,
      maxResultCount: pageSize.value,
      status: activeTab.value,
    })

    if (isRefresh) {
      tasks.value = res.items ?? []
    } else {
      tasks.value.push(...(res.items ?? []))
    }

    if (tasks.value.length >= (res.totalCount ?? 0) || (res.items?.length ?? 0) < pageSize.value) {
      finished.value = true
    } else {
      currentPage.value += 1
    }
  } catch (error) {
    console.error(error)
    finished.value = true
    showToast('加载上架任务失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function onLoad() {
  fetchTasks()
}

function onRefresh() {
  finished.value = false
  loading.value = true
  fetchTasks(true)
}

function openTask(task: PutawayTaskDto) {
  if (!task.id) {
    showToast('缺少任务 Id')
    return
  }
  router.push({ name: 'PutawayTaskExecute', params: { id: task.id } })
}

watch(activeTab, () => {
  tasks.value = []
  loading.value = true
  fetchTasks(true)
}, { immediate: true })
</script>

<template>
  <div class="h-screen flex flex-col bg-[#f3f4f6]">
    <div class="bg-slate-800 px-5 pt-8 pb-4 shrink-0 shadow-sm relative z-10">
      <div class="text-white font-extrabold text-2xl tracking-wider">上架作业</div>
    </div>

    <van-tabs
      v-model:active="activeTab"
      sticky
      swipeable
      color="#f97316"
      title-active-color="#ea580c"
      class="shrink-0 custom-tabs z-10 shadow-sm"
    >
      <van-tab v-for="tab in tabOptions" :key="tab.value" :title="tab.title" :name="tab.value" />
    </van-tabs>

    <div class="flex-1 overflow-y-auto relative p-4">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          :loading="loading"
          :finished="finished"
          finished-text="没有更多上架任务了"
          :immediate-check="false"
          @load="onLoad"
          class="space-y-4 pb-20"
        >
          <van-empty v-if="tasks.length === 0 && !loading" description="暂无该状态下的上架任务" class="mt-10" />

          <div
            v-for="task in tasks"
            :key="task.id"
            class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            @click="openTask(task)"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="font-black text-lg text-slate-800 font-mono">{{ task.taskNo || '-' }}</div>
                <div class="text-xs text-gray-400 mt-0.5">{{ formatDateTime(task.creationTime) }}</div>
              </div>
              <div
                class="px-2.5 py-1 rounded-lg text-xs font-black border"
                :style="{
                  color: getStatusStyle(task.status).color,
                  backgroundColor: getStatusStyle(task.status).bg,
                  borderColor: getStatusStyle(task.status).border,
                }"
              >
                {{ getStatusText(task.status) }}
              </div>
            </div>

            <div class="bg-[#fff7ed] rounded-xl p-3 text-sm text-slate-600 space-y-2.5 border border-orange-100">
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="coupon-o" class="text-orange-400 text-base" /></div>
                <span class="text-slate-500">容器:</span>
                <span class="ml-auto font-mono font-bold text-slate-800">{{ task.containerCode || '-' }}</span>
              </div>
              <div class="border-t border-dashed border-orange-100 my-1"></div>
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="location-o" class="text-slate-400 text-base" /></div>
                <span class="text-slate-500">来源库位:</span>
                <span class="ml-auto font-mono font-bold text-slate-800">{{ task.sourceLocationCode || '-' }}</span>
              </div>
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="guide-o" class="text-orange-500 text-base" /></div>
                <span class="text-slate-500">建议库位:</span>
                <span class="ml-auto font-mono font-extrabold text-orange-600">{{ task.suggestedLocationCode || task.targetLocationCode || '-' }}</span>
              </div>
            </div>

            <div class="mt-4" v-if="normalizeStatus(task.status) !== PutawayTaskStatus.Completed">
              <van-button block round class="!bg-orange-500 active:!bg-orange-600 !border-none font-bold text-white shadow-md shadow-orange-500/20">
                {{ normalizeStatus(task.status) === PutawayTaskStatus.Pending ? '开始上架' : '继续执行' }}
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
  color: #ea580c;
}

:deep(.van-pull-refresh) {
  min-height: 100%;
}
</style>