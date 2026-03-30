<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showFailToast } from 'vant'
import { completeMoveTask } from '@/api/wms/moveTask'

const route = useRoute()
const router = useRouter()
const taskId = String(route.params.id ?? 'MOVE-001')

const locationCode = ref('')
const submitting = ref(false)

function goBack() {
  router.back()
}

function onScanTrigger() {
  // 占位：在真实 PDA 上应触发扫码 SDK
  // 这里模拟快速填充示例条码以方便测试
  locationCode.value = 'A-01-01'
}

async function handleComplete() {
  if (!locationCode.value) {
    showFailToast('请先扫描或输入目标库位')
    return
  }
  submitting.value = true
  try {
    await completeMoveTask(taskId, { actualLocationCode: locationCode.value })
    showSuccessToast('完成搬运')
    setTimeout(() => router.back(), 1000)
  } catch (e: any) {
    console.error(e)
    showFailToast(e?.message || '提交失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- NavBar -->
    <van-nav-bar class="!bg-slate-800" title="" left-arrow @click-left="goBack">
      <template #title>
        <div class="text-white font-semibold">Task #MOVE-{{ taskId }}</div>
      </template>
      <template #right>
        <van-tag type="warning" size="medium">已领用</van-tag>
      </template>
    </van-nav-bar>

    <!-- Content -->
    <div class="flex-1 p-4 space-y-5 overflow-y-auto">
      <!-- Moving Container -->
      <div class="bg-white rounded-xl shadow-sm p-4 border">
        <div class="flex items-center mb-2 text-gray-800 font-medium text-base">
          <van-icon name="points" class="mr-2" /> 托盘: <span class="ml-2 font-bold">P12345</span>
        </div>
        <div class="flex items-center text-gray-800 font-medium text-base">
          <van-icon name="circle" class="mr-2" /> 盘具: <span class="ml-2 font-bold">REEL_999</span>
        </div>
      </div>

      <!-- Target Location (焦点) -->
      <div class="bg-white rounded-2xl p-5 border-2 border-blue-500 shadow-md shadow-blue-100">
        <div class="text-center font-bold text-lg text-gray-800 mb-4">请扫描目标库位条码</div>

        <div class="flex items-center space-x-3">
          <van-field
            v-model="locationCode"
            clearable
            placeholder="请输入或扫描库位码"
            class="flex-1 !bg-gray-100 !rounded-lg text-center font-mono text-xl"
          />

          <div
            role="button"
            class="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center shadow-md active:bg-green-600 transition-colors"
            @click="onScanTrigger"
          >
            <van-icon name="scan" size="28" color="white" />
          </div>
        </div>

        <div v-if="locationCode" class="mt-4 bg-green-50 py-2 rounded-lg text-green-600 font-bold flex items-center justify-center">
          ✓ 库位验证就绪
        </div>
      </div>
    </div>

    <!-- Footer Action -->
    <div class="p-4 bg-white border-t border-gray-200 shrink-0 pb-safe">
      <van-button
        block
        round
        :loading="submitting"
        :disabled="!locationCode || submitting"
        class="!bg-green-600 active:!bg-green-700 !text-white text-xl font-bold !h-14 !border-none"
        @click="handleComplete"
      >
        COMPLETE MOVE / 完成搬运
      </van-button>
    </div>
  </div>
</template>

<style scoped>
:deep(.van-nav-bar__title), :deep(.van-nav-bar__left) {
  color: #fff !important;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 12px);
}
</style>
