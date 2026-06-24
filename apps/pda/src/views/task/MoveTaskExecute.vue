<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showFailToast } from 'vant'
import { completeMoveTask, getMoveTaskDetails, MoveTaskStatus, MoveTaskType } from '@/api/wms/moveTask'
import type { MoveTaskDto } from '@/api/wms/moveTask'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => {
  const rawId = route.params.id
  return typeof rawId === 'string' ? rawId.trim() : ''
})

const locationCode = ref('')
const loading = ref(false)
const submitting = ref(false)
const task = ref<MoveTaskDto | null>(null)

const statusText = computed(() => {
  if (!task.value) {
    return '加载中'
  }

  switch (task.value.status) {
    case MoveTaskStatus.Pending:
      return '待执行'
    case MoveTaskStatus.InProgress:
      return '执行中'
    case MoveTaskStatus.Completed:
      return '已完成'
    case MoveTaskStatus.Cancelled:
      return '已取消'
    default:
      return '搬运中'
  }
})

const taskTypeText = computed(() => {
  if (!task.value) {
    return '--'
  }

  switch (task.value.taskType) {
    case MoveTaskType.Putaway:
      return '上架搬运'
    case MoveTaskType.MoveToQc:
      return '送检搬运'
    case MoveTaskType.InternalMove:
      return '库内搬运'
    case MoveTaskType.PickDown:
      return '拣货下架'
    default:
      return '搬运任务'
  }
})

function goBack() {
  router.back()
}

function reportException() {
  if (!task.value) {
    showFailToast('搬运任务尚未加载完成')
    return
  }

  router.push({
    path: '/exception-report',
    query: {
      type: 'LocationIssue',
      orderNo: task.value.taskNo || taskId.value,
      containerCode: task.value.containerCode || '',
      locationCode: task.value.targetLocationCode || task.value.sourceLocationCode || '',
      description: `搬运作业异常，任务 ${task.value.taskNo || taskId.value} 待处理`,
    },
  })
}

async function loadTaskDetail() {
  if (!taskId.value) {
    showFailToast('缺少搬运任务 Id')
    return
  }

  loading.value = true
  try {
    task.value = await getMoveTaskDetails(taskId.value)
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '加载搬运任务失败')
  } finally {
    loading.value = false
  }
}

function onScanTrigger() {
  locationCode.value = task.value?.targetLocationCode?.trim() || ''
}

async function handleComplete() {
  if (!taskId.value) {
    showFailToast('缺少搬运任务 Id')
    return
  }

  if (!task.value) {
    showFailToast('搬运任务尚未加载完成')
    return
  }

  if (!locationCode.value.trim()) {
    showFailToast('请先扫描目标库位')
    return
  }

  const scannedLocation = locationCode.value.trim().toUpperCase()
  const targetLocation = String(task.value.targetLocationCode || '').trim().toUpperCase()
  if (targetLocation && scannedLocation !== targetLocation) {
    showFailToast(`目标库位不匹配，应为 ${task.value.targetLocationCode}`)
    return
  }

  submitting.value = true
  try {
    await completeMoveTask({
      taskId: taskId.value,
      scannedLocationCode: locationCode.value.trim()
    })
    showSuccessToast('搬运已完成')
    router.replace('/task')
  } catch (e: any) {
    console.error(e)
    showFailToast(e?.message || '提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadTaskDetail()
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-100">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="goBack">
      <template #title>
        <span class="text-white font-bold tracking-wide">{{ task?.taskNo || '搬运执行' }}</span>
      </template>
      <template #right>
        <van-tag color="#f59e0b" text-color="#fff" size="medium" class="font-bold shadow-sm">{{ statusText }}</van-tag>
      </template>
    </van-nav-bar>

    <div class="flex-1 p-4 space-y-5 overflow-y-auto">
      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div class="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Move Task / 搬运任务</div>
        <div class="space-y-3">
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-blue-50 flex items-center justify-center mr-3">
              <van-icon name="points" size="18" class="text-blue-600" />
            </div>
            <span>任务号：</span>
            <span class="ml-auto font-mono font-bold text-gray-900">{{ task?.taskNo || '--' }}</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-purple-50 flex items-center justify-center mr-3">
              <van-icon name="circle" size="18" class="text-purple-600" />
            </div>
            <span>任务类型：</span>
            <span class="ml-auto font-bold text-gray-900">{{ taskTypeText }}</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-orange-50 flex items-center justify-center mr-3">
              <van-icon name="coupon-o" size="18" class="text-orange-600" />
            </div>
            <span>容器：</span>
            <span class="ml-auto font-mono font-bold text-gray-900">{{ task?.containerCode || '--' }}</span>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div class="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Route / 搬运路径</div>
        <div class="space-y-3">
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-slate-50 flex items-center justify-center mr-3">
              <van-icon name="location-o" size="18" class="text-slate-600" />
            </div>
            <span>来源库位：</span>
            <span class="ml-auto font-mono font-bold text-gray-900">{{ task?.sourceLocationCode || '--' }}</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-green-50 flex items-center justify-center mr-3">
              <van-icon name="guide-o" size="18" class="text-green-600" />
            </div>
            <span>目标库位：</span>
            <span class="ml-auto font-mono font-bold text-green-700">{{ task?.targetLocationCode || '--' }}</span>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl p-5 border-2 border-blue-500 shadow-lg shadow-blue-100/50">
        <div class="text-center font-extrabold text-lg text-slate-800 mb-5 tracking-wide">
          请扫描目标库位条码
        </div>

        <div class="flex items-stretch space-x-3 h-14">
          <van-field
            v-model="locationCode"
            clearable
            placeholder="扫描库位条码"
            class="flex-1 !bg-gray-100 !rounded-xl !p-0 custom-field flex items-center justify-center"
            :disabled="loading || submitting"
          />
          <div
            role="button"
            class="w-14 bg-green-500 rounded-xl flex items-center justify-center shadow-md active:bg-green-600 transition-all active:scale-95 cursor-pointer shrink-0"
            :class="{ 'opacity-50 pointer-events-none': loading || submitting }"
            @click="onScanTrigger"
          >
            <van-icon name="scan" size="26" color="white" />
          </div>
        </div>

        <div v-if="loading" class="mt-4 text-sm text-slate-500 text-center">正在加载任务详情...</div>

        <div v-if="locationCode" class="mt-4 bg-green-50 border border-green-100 py-2.5 rounded-lg text-green-700 font-bold flex items-center justify-center animate-fade-in">
          <van-icon name="checked" size="18" class="mr-1.5" />
          库位 [{{ locationCode }}] 已就绪
        </div>
      </section>
    </div>

    <div class="p-4 bg-white border-t border-gray-200 shrink-0 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <van-button
        block
        round
        plain
        :disabled="loading || submitting"
        class="!mb-3 !border-rose-300 !text-rose-600 !h-12"
        @click="reportException"
      >
        搬运异常上报
      </van-button>

      <van-button
        block
        round
        :loading="loading || submitting"
        :disabled="!locationCode || loading || submitting || !task"
        class="!bg-green-600 active:!bg-green-700 !text-white text-xl font-bold !h-14 !border-none shadow-lg disabled:opacity-50 disabled:shadow-none"
        @click="handleComplete"
      >
        COMPLETE / 完成搬运
      </van-button>
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
:deep(.custom-field .van-field__control) {
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 1.25rem; 
  font-weight: 700;
  color: #0f172a; 
  text-transform: uppercase;
}
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
</style>
