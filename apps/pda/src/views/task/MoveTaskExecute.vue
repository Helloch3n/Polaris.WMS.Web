<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'vant'
import { completeMoveTask } from '@/api/wms/moveTask'

const route = useRoute()
const router = useRouter()
const idParam = route.params.id ?? ''
const taskId = String(idParam)

const locationCode = ref('')
const loading = ref(false)
const fieldRef = ref<any>(null)

function goBack() {
  router.back()
}

function focusInput() {
  const el = fieldRef.value?.$el || fieldRef.value
  const input = el?.querySelector?.('input')
  input?.focus()
}

// 模拟扫码 — 在真实设备上此处应触发扫码 SDK
function onScanClick() {
  // 尝试聚焦输入框，若用户需要可替换为二维码扫码 SDK
  focusInput()
}

async function handleComplete() {
  if (!locationCode.value) {
    Toast.fail('请先扫描或输入目标库位')
    return
  }
  if (!taskId) {
    Toast.fail('任务ID缺失')
    return
  }

  loading.value = true
  try {
    await completeMoveTask(taskId, { actualLocationCode: locationCode.value })
    Toast.success('完成搬运')
    router.back()
  } catch (err) {
    console.error(err)
    Toast.fail('提交失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Header -->
    <van-nav-bar
      class="!bg-slate-800 !text-white"
      title=""
      left-arrow
      @click-left="goBack"
    >
      <template #title>
        <div class="!text-white font-semibold">Task #MOVE-{{ taskId }}</div>
      </template>
      <template #right>
        <van-tag type="warning">已领用</van-tag>
      </template>
    </van-nav-bar>

    <!-- Content -->
    <div class="flex-1 p-4 space-y-4 overflow-y-auto">
      <!-- Card 1: Moving Container -->
      <div class="bg-white rounded-lg shadow-sm p-4 text-gray-800">
        <div class="text-sm text-gray-600">正在搬运</div>
        <div class="mt-2 text-base font-medium">托盘 [P12345] · 盘具 [REEL_999]</div>
      </div>

      <!-- Card 2: Target Location (视觉焦点) -->
      <div class="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-400">
        <div class="text-xl font-bold mb-3">请扫描目标库位条码</div>

        <div class="flex items-center space-x-3">
          <van-field
            ref="fieldRef"
            v-model="locationCode"
            placeholder="扫描或输入库位"
            input-align="center"
            class="flex-1 font-mono text-2xl text-center bg-gray-100"
          />

          <button
            type="button"
            @click="onScanClick"
            class="w-16 h-16 rounded-md flex items-center justify-center bg-green-500 text-white"
            aria-label="scan"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v4a1 1 0 001 1h4M21 7v4a1 1 0 01-1 1h-4M3 17v-4a1 1 0 011-1h4m10 5h-4a1 1 0 01-1-1v-4" />
            </svg>
          </button>
        </div>

        <div v-if="locationCode" class="mt-3 text-green-600 font-semibold">✓ 库位 [{{ locationCode }}] 已就绪</div>
      </div>
    </div>

    <!-- Footer Action -->
    <div class="p-4 bg-white border-t border-gray-200 shrink-0 pb-safe">
      <van-button
        block
        round
        :loading="loading"
        :disabled="!locationCode || loading"
        class="!bg-green-600 !text-white text-xl font-bold !h-14"
        @click="handleComplete"
      >
        COMPLETE MOVE / 完成搬运
      </van-button>
    </div>
  </div>
</template>

<style scoped>
/* 强制覆盖 vant nav-bar 内部颜色以确保高对比度 */
.van-nav-bar {
  --van-nav-bar-background: transparent;
}
.van-nav-bar__title,
.van-nav-bar__left,
.van-nav-bar__right {
  color: #fff !important;
}

/* 保证底部按钮在某些设备上有明显触控区 */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 12px);
}
</style>
