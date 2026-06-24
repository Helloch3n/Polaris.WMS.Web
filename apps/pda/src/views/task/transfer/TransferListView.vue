<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getTransferList, TransferOrderStatus } from '@/api/wms/transfer'
import type { TransferListDto } from '@/api/wms/transfer'
import dayjs from 'dayjs'

const router = useRouter()

// Tab 状态: 0 = 草稿/待执行, 2 = 进行中, 3 = 已完成
const activeTab = ref<TransferOrderStatus>(0)
const tabOptions = [
  { title: '待执行', value: 0 as TransferOrderStatus }, // Draft
  { title: '进行中', value: 2 as TransferOrderStatus }, // InProgress
  { title: '已完成', value: 3 as TransferOrderStatus }  // Completed
]

// 列表数据
const tasks = ref<TransferListDto[]>([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

const fetchTasks = async (isRefresh = false) => {
  try {
    if (isRefresh) {
      currentPage.value = 1
      finished.value = false
    }

    const skipCount = (currentPage.value - 1) * pageSize.value
    
    const res = await getTransferList({
      skipCount,
      maxResultCount: pageSize.value,
      status: activeTab.value
    })

    if (isRefresh) {
      tasks.value = res.items
    } else {
      tasks.value.push(...res.items)
    }

    if (tasks.value.length >= res.totalCount || res.items.length < pageSize.value) {
      finished.value = true
    } else {
      currentPage.value++
    }
  } catch (error) {
    console.error('Failed to fetch transfer tasks:', error)
    finished.value = true
    showToast('加载移库单列表失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onLoad = () => {
  fetchTasks()
}

const onRefresh = () => {
  finished.value = false
  loading.value = true
  fetchTasks(true)
}

watch(activeTab, () => {
  tasks.value = []
  loading.value = true
  fetchTasks(true)
}, { immediate: true })

const getStatusInfo = (status: TransferOrderStatus) => {
  switch (status) {
    case 0:
      return { text: '草稿', color: '#64748b', bg: '#f1f5f9' }
    case 2:
      return { text: '执行中', color: '#f97316', bg: '#fff7ed' }
    case 3:
      return { text: '已完成', color: '#16a34a', bg: '#f0fdf4' }
    default:
      return { text: '未知', color: '#94a3b8', bg: '#f8fafc' }
  }
}

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm')
}

const goBack = () => {
  router.push('/home')
}

const executeTask = (id: string) => {
  router.push(`/task/transfer/execute/${id}`)
}
</script>

<template>
  <div class="h-screen flex flex-col bg-[#f3f4f6]">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="goBack">
      <template #title>
        <span class="text-white font-bold tracking-wide">移库作业</span>
      </template>
    </van-nav-bar>

    <van-tabs 
      v-model:active="activeTab" 
      sticky 
      swipeable 
      color="#4f46e5" 
      title-active-color="#4f46e5" 
      class="shrink-0 custom-tabs z-10 shadow-sm"
    >
      <van-tab 
        v-for="tab in tabOptions" 
        :key="tab.value" 
        :title="tab.title" 
        :name="tab.value"
      ></van-tab>
    </van-tabs>

    <div class="flex-1 overflow-y-auto relative p-4">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多任务了"
          :immediate-check="false"
          @load="onLoad"
          class="space-y-4 pb-20"
        >
          <van-empty 
            v-if="tasks.length === 0 && !loading" 
            description="暂无该状态下的任务" 
            class="mt-10"
          />

          <div 
            v-for="task in tasks" 
            :key="task.id" 
            class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            @click="executeTask(task.id)"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="font-black text-lg text-slate-800 font-mono">{{ task.orderNo }}</div>
                <div class="text-xs text-gray-400 mt-0.5">创建时间: {{ formatDate(task.creationTime) }}</div>
              </div>
              
              <div 
                class="px-2.5 py-1 rounded-lg text-xs font-black border"
                :style="{ 
                  color: getStatusInfo(task.status).color, 
                  backgroundColor: getStatusInfo(task.status).bg,
                  borderColor: getStatusInfo(task.status).color + '30'
                }"
              >
                {{ getStatusInfo(task.status).text }}
              </div>
            </div>
            
            <div class="bg-[#f8fafc] rounded-xl p-3 text-sm text-slate-600 space-y-2 border border-gray-100">
              <div class="flex items-center">
                <span class="text-slate-500">部门:</span>
                <span class="ml-auto font-bold text-slate-800">{{ task.departmentName || '--' }}</span>
              </div>
              <div class="flex items-center">
                <span class="text-slate-500">仓库:</span>
                <span class="ml-auto font-mono font-bold text-slate-800">{{ task.warehouseCode || '--' }}</span>
              </div>
            </div>

            <div class="mt-4" v-if="task.status !== 3">
              <van-button 
                block 
                round 
                class="!bg-slate-800 active:!bg-slate-700 !border-none font-bold text-white shadow-md shadow-slate-800/20"
              >
                执行移库
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
:deep(.van-nav-bar::after) { display: none; }
:deep(.custom-tabs .van-tabs__nav) { 
  background-color: #ffffff; 
}
:deep(.custom-tabs .van-tab) {
  font-weight: 600;
  color: #64748b;
}
:deep(.custom-tabs .van-tab--active) {
  font-weight: 900;
  color: #4f46e5;
}
:deep(.van-pull-refresh) {
  min-height: 100%;
}
</style>
