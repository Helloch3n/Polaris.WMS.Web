<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const activeTab = ref('active')

// 模拟后端任务数据
const tasks = ref([
  { id: 'MOVE-001', type: '搬运', source: 'A-01-01', target: 'B-02-05', material: '托盘 P12345', status: '待领取' },
  { id: 'PUT-882', type: '上架', source: '收货月台', target: 'C-01-01', material: '物料箱 x 10', status: '待领取' }
])

const navigateToTask = (id: string) => {
  router.push(`/task/move/${id}`)
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50 pb-safe">
    <van-nav-bar class="!bg-slate-800 shrink-0" title="任务大厅">
      <template #title>
        <span class="text-white font-bold">任务大厅</span>
      </template>
    </van-nav-bar>

    <van-tabs v-model:active="activeTab" sticky swipeable color="#10b981" title-active-color="#10b981" class="shrink-0 custom-tabs">
      <van-tab title="待执行" name="active"></van-tab>
      <van-tab title="进行中" name="process"></van-tab>
      <van-tab title="已完成" name="done"></van-tab>
    </van-tabs>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div 
        v-for="task in tasks" 
        :key="task.id" 
        class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer"
        @click="navigateToTask(task.id)"
      >
        <div class="flex justify-between items-center mb-3">
          <div class="font-black text-lg text-slate-800">{{ task.id }}</div>
          <van-tag :type="task.type === '搬运' ? 'primary' : 'warning'" size="medium" class="font-bold">
            {{ task.type }}
          </van-tag>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-3 text-sm text-slate-600 space-y-2 mb-3 border border-gray-100">
          <div class="flex items-center"><van-icon name="location-o" class="mr-2 text-gray-400"/>起点: <span class="ml-auto font-mono font-bold text-gray-900">{{ task.source }}</span></div>
          <div class="flex items-center"><van-icon name="guide-o" class="mr-2 text-green-500"/>终点: <span class="ml-auto font-mono font-bold text-green-600">{{ task.target }}</span></div>
          <div class="flex items-center"><van-icon name="points" class="mr-2 text-gray-400"/>内容: <span class="ml-auto font-bold text-gray-900">{{ task.material }}</span></div>
        </div>

        <van-button block round size="small" type="primary" class="!bg-slate-800 !border-none font-bold">
          查看并执行
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.van-nav-bar__title) { color: #fff; }
:deep(.van-nav-bar::after) { display: none; }
:deep(.custom-tabs .van-tabs__nav) { background-color: #f8fafc; }
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 12px); }
</style>