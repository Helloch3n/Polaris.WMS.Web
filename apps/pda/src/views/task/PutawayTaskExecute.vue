<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import { completePutawayTask, getPutawayTaskDetail, PutawayTaskStatus } from '@/api/wms/putaway'
import type { PutawayTaskDto } from '@/api/wms/putaway'

const route = useRoute()
const router = useRouter()

const taskId = computed(() => String(route.params.id ?? ''))
const loading = ref(false)
const submitting = ref(false)
const task = ref<PutawayTaskDto | null>(null)
const actualLocationCode = ref('')

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

function goBack() {
  router.back()
}

function reportException() {
  if (!task.value) {
    showToast('上架任务尚未加载完成')
    return
  }

  router.push({
    path: '/exception-report',
    query: {
      type: 'LocationIssue',
      orderNo: task.value.taskNo || taskId.value,
      containerCode: task.value.containerCode || '',
      locationCode: task.value.suggestedLocationCode || task.value.targetLocationCode || task.value.sourceLocationCode || '',
      description: `上架作业异常，任务 ${task.value.taskNo || taskId.value} 待处理`,
    },
  })
}

function simulateScan() {
  actualLocationCode.value = task.value?.suggestedLocationCode || task.value?.targetLocationCode || 'A-01-01'
}

async function loadDetail() {
  if (!taskId.value) {
    showFailToast('缺少上架任务 Id')
    return
  }
  loading.value = true
  try {
    task.value = await getPutawayTaskDetail(taskId.value)
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '加载上架任务失败')
  } finally {
    loading.value = false
  }
}

async function handleComplete() {
  if (submitting.value) {
    return
  }
  if (!actualLocationCode.value.trim()) {
    showToast('请先扫描或输入实际上架库位')
    return
  }
  if (!taskId.value) {
    showFailToast('缺少上架任务 Id')
    return
  }

  if (!task.value) {
    showFailToast('上架任务尚未加载完成')
    return
  }

  const scannedLocation = actualLocationCode.value.trim().toUpperCase()
  const expectedLocation = String(task.value.suggestedLocationCode || task.value.targetLocationCode || '').trim().toUpperCase()
  if (expectedLocation && scannedLocation !== expectedLocation) {
    showFailToast(`上架库位不匹配，应为 ${task.value.suggestedLocationCode || task.value.targetLocationCode}`)
    return
  }

  submitting.value = true
  try {
    await completePutawayTask(taskId.value, { actualLocationCode: actualLocationCode.value.trim() })
    showSuccessToast('上架任务完成')
    router.back()
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '提交上架任务失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-100">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="goBack">
      <template #title>
        <span class="text-white font-bold tracking-wide">{{ task?.taskNo || '上架作业' }}</span>
      </template>
      <template #right>
        <van-tag color="#f97316" text-color="#fff" size="medium" class="font-bold shadow-sm">
          {{ getStatusText(task?.status) }}
        </van-tag>
      </template>
    </van-nav-bar>

    <div class="flex-1 p-4 space-y-5 overflow-y-auto">
      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div class="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Putaway Task / 上架任务</div>
        <div class="space-y-3">
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-orange-50 flex items-center justify-center mr-3">
              <van-icon name="coupon-o" size="18" class="text-orange-600" />
            </div>
            <span>容器：</span>
            <span class="ml-auto font-mono font-bold text-gray-900">{{ task?.containerCode || '-' }}</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-slate-50 flex items-center justify-center mr-3">
              <van-icon name="location-o" size="18" class="text-slate-600" />
            </div>
            <span>来源库位：</span>
            <span class="ml-auto font-mono font-bold text-gray-900">{{ task?.sourceLocationCode || '-' }}</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-green-50 flex items-center justify-center mr-3">
              <van-icon name="guide-o" size="18" class="text-green-600" />
            </div>
            <span>建议库位：</span>
            <span class="ml-auto font-mono font-extrabold text-green-700">{{ task?.suggestedLocationCode || task?.targetLocationCode || '-' }}</span>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl p-5 border-2 border-orange-500 shadow-lg shadow-orange-100/50">
        <div class="text-center font-extrabold text-lg text-slate-800 mb-5 tracking-wide">请确认实际上架库位</div>

        <div class="flex items-stretch space-x-3 h-14">
          <van-field
            v-model="actualLocationCode"
            clearable
            placeholder="扫描或输入实际上架库位"
            class="flex-1 !bg-gray-100 !rounded-xl !p-0 custom-field flex items-center justify-center"
          />
          <div
            role="button"
            class="w-14 bg-orange-500 rounded-xl flex items-center justify-center shadow-md active:bg-orange-600 transition-all active:scale-95 cursor-pointer shrink-0"
            @click="simulateScan"
          >
            <van-icon name="scan" size="26" color="white" />
          </div>
        </div>

        <div v-if="actualLocationCode" class="mt-4 bg-orange-50 border border-orange-100 py-2.5 rounded-lg text-orange-700 font-bold flex items-center justify-center animate-fade-in">
          <van-icon name="checked" size="18" class="mr-1.5" />
          库位 [{{ actualLocationCode }}] 已就绪
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
        上架异常上报
      </van-button>

      <van-button
        block
        round
        :loading="loading || submitting"
        :disabled="loading || submitting"
        class="!bg-orange-500 active:!bg-orange-600 !text-white text-xl font-bold !h-14 !border-none shadow-lg disabled:opacity-50 disabled:shadow-none"
        @click="handleComplete"
      >
        完成上架
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

:deep(.van-nav-bar::after) {
  display: none;
}

:deep(.custom-field .van-field__control) {
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
</style>