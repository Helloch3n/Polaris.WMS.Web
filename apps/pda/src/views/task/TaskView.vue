<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getMoveTaskList, MoveTaskStatus, MoveTaskType } from '@/api/wms/moveTask'
import type { MoveTaskDto } from '@/api/wms/moveTask'
import dayjs from 'dayjs'

const router = useRouter()

// Tab 状态映射到后端的枚举
const activeTab = ref(MoveTaskStatus.Pending)
const tabOptions = [
  { title: '待执行', value: MoveTaskStatus.Pending },
  { title: '进行中', value: MoveTaskStatus.InProgress },
  { title: '已完成', value: MoveTaskStatus.Completed }
]

// 列表状态控制
const tasks = ref<MoveTaskDto[]>([])
const loading = ref(false)     // 上拉加载状态
const finished = ref(false)    // 是否已加载所有数据
const refreshing = ref(false)  // 下拉刷新状态
const currentPage = ref(1)
const pageSize = ref(10)

// 获取任务列表核心方法
const fetchTasks = async (isRefresh = false) => {
  try {
    if (isRefresh) {
      currentPage.value = 1
      finished.value = false
    }

    const skipCount = (currentPage.value - 1) * pageSize.value
    
    // 调用 API
    const res = await getMoveTaskList({
      skipCount,
      maxResultCount: pageSize.value,
      status: activeTab.value // 根据当前 Tab 过滤状态
    })

    if (isRefresh) {
      tasks.value = res.items
    } else {
      tasks.value.push(...res.items)
    }

    // 判断是否加载完毕
    if (tasks.value.length >= res.totalCount || res.items.length < pageSize.value) {
      finished.value = true
    } else {
      currentPage.value++
    }
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    finished.value = true // 出错时停止加载
    showToast('加载任务列表失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 触发上拉加载
const onLoad = () => {
  fetchTasks()
}

// 触发下拉刷新
const onRefresh = () => {
  // 清空列表数据
  finished.value = false
  // 重新加载数据
  loading.value = true
  fetchTasks(true)
}

// 监听 Tab 切换，切换后重新刷新列表
watch(activeTab, () => {
  tasks.value = []
  loading.value = true
  fetchTasks(true)
})

// 工具函数：解析任务类型为前端展示的文字和颜色
const getTaskTypeInfo = (type: MoveTaskType) => {
  switch (type) {
    case MoveTaskType.Putaway:
      return { text: '上架', color: '#f97316', bg: '#fff7ed' } // Orange
    case MoveTaskType.MoveToQc:
      return { text: '送检', color: '#eab308', bg: '#fefce8' } // Yellow
    case MoveTaskType.InternalMove:
      return { text: '理货', color: '#3b82f6', bg: '#eff6ff' } // Blue
    case MoveTaskType.PickDown:
      return { text: '下架', color: '#8b5cf6', bg: '#faf5ff' } // Purple
    default:
      return { text: '搬运', color: '#64748b', bg: '#f8fafc' } // Slate
  }
}

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('MM-DD HH:mm')
}

const navigateToTask = (id: string) => {
  router.push(`/task/move/${id}`)
}
</script>

<template>
  <div class="h-screen flex flex-col bg-[#f3f4f6]">
    <div class="bg-slate-800 px-5 pt-8 pb-4 shrink-0 shadow-sm relative z-10">
      <div class="text-white font-extrabold text-2xl tracking-wider">任务大厅</div>
    </div>

    <van-tabs 
      v-model:active="activeTab" 
      sticky 
      swipeable 
      color="#10b981" 
      title-active-color="#10b981" 
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
            @click="navigateToTask(task.id)"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="font-black text-lg text-slate-800 font-mono">{{ task.taskNo.substring(0, 8) }}...</div>
                <div class="text-xs text-gray-400 mt-0.5">{{ formatDate(task.creationTime) }}</div>
              </div>
              
              <div 
                class="px-2.5 py-1 rounded-lg text-xs font-black border"
                :style="{ 
                  color: getTaskTypeInfo(task.taskType).color, 
                  backgroundColor: getTaskTypeInfo(task.taskType).bg,
                  borderColor: getTaskTypeInfo(task.taskType).color + '30'
                }"
              >
                {{ getTaskTypeInfo(task.taskType).text }}
              </div>
            </div>
            
            <div class="bg-[#f8fafc] rounded-xl p-3 text-sm text-slate-600 space-y-2.5 border border-gray-100">
              
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="box" class="text-slate-400 text-base"/></div>
                <span class="text-slate-500">容器:</span>
                <span class="ml-auto font-mono font-bold text-slate-800">{{ task.containerCode }}</span>
              </div>
              
              <div class="border-t border-dashed border-gray-200 my-1"></div>

              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="location-o" class="text-gray-400 text-base"/></div>
                <span class="text-slate-500">起点:</span>
                <span class="ml-auto font-mono font-bold text-slate-800">{{ task.sourceLocationCode }}</span>
              </div>
              <div class="flex items-center">
                <div class="w-6 flex justify-center"><van-icon name="guide-o" class="text-green-500 text-base"/></div>
                <span class="text-slate-500">终点:</span>
                <span class="ml-auto font-mono font-extrabold text-green-600">{{ task.targetLocationCode }}</span>
              </div>
              
            </div>

            <div class="mt-4" v-if="activeTab !== MoveTaskStatus.Completed">
              <van-button 
                block 
                round 
                class="!bg-slate-800 active:!bg-slate-700 !border-none font-bold text-white shadow-md shadow-slate-800/20"
              >
                {{ activeTab === MoveTaskStatus.Pending ? '领取任务' : '继续执行' }}
              </van-button>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<style scoped>
/* 深度修改 Vant Tabs 样式，使其更符合现代工业风 */
:deep(.custom-tabs .van-tabs__nav) { 
  background-color: #ffffff; 
}
:deep(.custom-tabs .van-tab) {
  font-weight: 600;
  color: #64748b;
}
:deep(.custom-tabs .van-tab--active) {
  font-weight: 900;
  color: #10b981;
}
:deep(.van-pull-refresh) {
  min-height: 100%;
}
</style>