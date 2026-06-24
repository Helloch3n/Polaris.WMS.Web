<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import { confirmPickTask, getPickTaskDetail } from '@/api/pickTask'
import type { PickTaskDto } from '@/api/pickTask'

const route = useRoute()
const router = useRouter()

const taskId = computed(() => String(route.params.id ?? ''))
const loading = ref(false)
const submitting = ref(false)
const detail = ref<PickTaskDto | null>(null)
const scannedFromLocationCode = ref('')
const scannedContainerCode = ref('')

function goBack() {
  router.back()
}

function reportShortPick() {
  if (!detail.value) {
    showToast('拣货任务尚未加载完成')
    return
  }

  router.push({
    path: '/exception-report',
    query: {
      type: 'ShortPick',
      orderNo: detail.value.outboundOrderId || taskId.value,
      containerCode: detail.value.containerNo || '',
      locationCode: detail.value.fromLocationCode || '',
      description: `拣货任务短拣，物料 ${detail.value.productCode || '-'} 待处理`,
    },
  })
}

function normalizeCode(value?: string | null) {
  return String(value || '').trim().toUpperCase()
}

async function loadDetail() {
  if (!taskId.value) {
    showFailToast('缺少拣货任务 Id')
    return
  }
  loading.value = true
  try {
    detail.value = await getPickTaskDetail(taskId.value)
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '加载拣货任务失败')
  } finally {
    loading.value = false
  }
}

async function handleConfirm() {
  if (submitting.value) {
    return
  }
  if (!taskId.value) {
    showToast('缺少拣货任务 Id')
    return
  }
  if (!detail.value) {
    showToast('拣货任务尚未加载完成')
    return
  }

  if (!scannedFromLocationCode.value.trim()) {
    showToast('请先扫描源库位')
    return
  }

  if (!scannedContainerCode.value.trim()) {
    showToast('请先扫描容器编码')
    return
  }

  const expectedFromLocation = normalizeCode(detail.value.fromLocationCode)
  const expectedContainer = normalizeCode(detail.value.containerNo)
  if (expectedFromLocation && normalizeCode(scannedFromLocationCode.value) !== expectedFromLocation) {
    showToast(`源库位不匹配，应为 ${detail.value.fromLocationCode}`)
    return
  }

  if (expectedContainer && normalizeCode(scannedContainerCode.value) !== expectedContainer) {
    showToast(`容器编码不匹配，应为 ${detail.value.containerNo}`)
    return
  }

  submitting.value = true
  try {
    await confirmPickTask(taskId.value)
    showSuccessToast('拣货任务已完成')
    router.back()
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '提交拣货任务失败')
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
        <span class="text-white font-bold tracking-wide">拣货执行</span>
      </template>
      <template #right>
        <van-tag color="#8b5cf6" text-color="#fff" size="medium" class="font-bold shadow-sm">待确认</van-tag>
      </template>
    </van-nav-bar>

    <div class="flex-1 p-4 space-y-5 overflow-y-auto">
      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div class="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Pick Task / 拣货任务</div>
        <div class="space-y-3">
          <div class="flex items-center text-gray-700 text-base">
            <span>物料编码：</span>
            <span class="ml-auto font-mono font-bold text-gray-900">{{ detail?.productCode || '-' }}</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <span>容器编码：</span>
            <span class="ml-auto font-mono font-bold text-gray-900">{{ detail?.containerNo || '-' }}</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <span>源库位：</span>
            <span class="ml-auto font-mono font-bold text-gray-900">{{ detail?.fromLocationCode || '-' }}</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <span>目标位置：</span>
            <span class="ml-auto font-mono font-bold text-purple-700">{{ detail?.toLocationCode || '-' }}</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <span>目标数量/长度：</span>
            <span class="ml-auto font-bold text-gray-900">{{ detail?.targetLength ?? '-' }}</span>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl p-5 border-2 border-purple-500 shadow-lg shadow-purple-100/50">
        <div class="text-center font-extrabold text-lg text-slate-800 mb-5 tracking-wide">请先完成拣货校验</div>

        <div class="space-y-3">
          <van-field
            v-model="scannedFromLocationCode"
            clearable
            placeholder="扫描源库位"
            class="!bg-gray-100 !rounded-xl"
            :disabled="loading || submitting"
          >
            <template #label>
              <span class="font-semibold text-slate-600">源库位</span>
            </template>
          </van-field>

          <van-field
            v-model="scannedContainerCode"
            clearable
            placeholder="扫描容器编码"
            class="!bg-gray-100 !rounded-xl"
            :disabled="loading || submitting"
          >
            <template #label>
              <span class="font-semibold text-slate-600">容器编码</span>
            </template>
          </van-field>
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
        @click="reportShortPick"
      >
        短拣异常上报
      </van-button>

      <van-button
        block
        round
        :loading="loading || submitting"
        :disabled="loading || submitting"
        class="!bg-purple-600 active:!bg-purple-700 !text-white text-xl font-bold !h-14 !border-none shadow-lg disabled:opacity-50 disabled:shadow-none"
        @click="handleConfirm"
      >
        确认拣货完成
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

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
</style>