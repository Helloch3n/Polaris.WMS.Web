<script setup lang="ts">
import dayjs from 'dayjs'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getPickTaskList } from '@/api/pickTask'
import type { GetPickTaskListParams, PickTaskDto } from '@/api/pickTask'

const router = useRouter()

const activeTab = ref<'Pending' | 'Completed'>('Pending')
const tabOptions = [
  { title: '待执行', value: 'Pending' as const },
  { title: '已完成', value: 'Completed' as const },
]

const tasks = ref<PickTaskDto[]>([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

function resolveStatus(status: string | number | undefined) {
  if (typeof status === 'string') return status
  if (status === 0) return 'Pending'
  if (status === 1) return 'InProgress'
  if (status === 2) return 'Completed'
  if (status === 3) return 'Cancelled'
  return 'Pending'
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = dayjs(value)
  return date.isValid() ? date.format('MM-DD HH:mm') : value
}

function resolveTargetDisplay(task: PickTaskDto) {
  const targetLength = Number(task.targetLength ?? 0)
  if (Number.isFinite(targetLength) && targetLength > 0) {
    return `${targetLength}`
  }
  return '-'
}

async function fetchTasks(isRefresh = false) {
  try {
    if (isRefresh) {
      currentPage.value = 1
      finished.value = false
    }

    const params: GetPickTaskListParams = {
      skipCount: (currentPage.value - 1) * pageSize.value,
      maxResultCount: pageSize.value,
      status: activeTab.value,
    }
    const res = await getPickTaskList(params)

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
    showToast('加载拣货任务失败')
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

function openTask(task: PickTaskDto) {
  if (!task.id) {
    showToast('缺少拣货任务 Id')
    return
  }
  router.push({ name: 'PickTaskExecute', params: { id: task.id } })
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
      <div class="text-white font-extrabold text-2xl tracking-wider">拣货作业</div>
    </div>

    <van-tabs
      v-model:active="activeTab"
      sticky
      swipeable
      color="#8b5cf6"
      title-active-color="#7c3aed"
      class="shrink-0 custom-tabs z-10 shadow-sm"
    >
      <van-tab v-for="tab in tabOptions" :key="tab.value" :title="tab.title" :name="tab.value" />
    </van-tabs>

    <div class="flex-1 overflow-y-auto relative p-4">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          :loading="loading"
          :finished="finished"
          finished-text="没有更多拣货任务了"
          :immediate-check="false"
          @load="onLoad"
          class="space-y-4 pb-20"
        >
          <van-empty v-if="tasks.length === 0 && !loading" description="暂无该状态下的拣货任务" class="mt-10" />

          <div
            v-for="task in tasks"
            :key="task.id"
            class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            @click="openTask(task)"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="font-black text-lg text-slate-800 font-mono">{{ task.containerNo || '-' }}</div>
                <div class="text-xs text-gray-400 mt-0.5">{{ formatDateTime(task.creationTime) }}</div>
              </div>
              <div class="px-2.5 py-1 rounded-lg text-xs font-black border text-purple-700 bg-purple-50 border-purple-200">
                {{ activeTab === 'Pending' ? '待执行' : '已完成' }}
              </div>
            </div>

            <div class="bg-[#faf5ff] rounded-xl p-3 text-sm text-slate-600 space-y-2.5 border border-purple-100">
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="location-o" class="text-slate-400 text-base" /></div>
                <span class="text-slate-500">源库位:</span>
                <span class="ml-auto font-mono font-bold text-slate-800">{{ task.fromLocationCode || '-' }}</span>
              </div>
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="guide-o" class="text-purple-500 text-base" /></div>
                <span class="text-slate-500">目标位置:</span>
                <span class="ml-auto font-mono font-bold text-purple-700">{{ task.toLocationCode || '-' }}</span>
              </div>
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="apps-o" class="text-purple-400 text-base" /></div>
                <span class="text-slate-500">物料编码:</span>
                <span class="ml-auto font-mono font-bold text-slate-800">{{ task.productCode || '-' }}</span>
              </div>
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="balance-o" class="text-purple-400 text-base" /></div>
                <span class="text-slate-500">目标数量/长度:</span>
                <span class="ml-auto font-bold text-slate-800">{{ resolveTargetDisplay(task) }}</span>
              </div>
            </div>

            <div class="mt-4" v-if="resolveStatus(task.status) !== 'Completed'">
              <van-button block round class="!bg-purple-600 active:!bg-purple-700 !border-none font-bold text-white shadow-md shadow-purple-600/20">
                进入拣货
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
  color: #7c3aed;
}

:deep(.van-pull-refresh) {
  min-height: 100%;
}
</style>