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

// 模拟扫码填充
function onScanTrigger() {
  locationCode.value = 'A-01-01'
}

async function handleComplete() {
  if (!locationCode.value) {
    showFailToast('请先扫描目标库位')
    return
  }

  submitting.value = true
  try {
    // 调用后端接口完成搬运
    await completeMoveTask(taskId, { actualLocationCode: locationCode.value })
    showSuccessToast('搬运已完成')
    setTimeout(() => router.back(), 800)
  } catch (e: any) {
    console.error(e)
    showFailToast(e?.message || '提交失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-100">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="goBack">
      <template #title>
        <span class="text-white font-bold tracking-wide">Task #{{ taskId }}</span>
      </template>
      <template #right>
        <van-tag color="#f59e0b" text-color="#fff" size="medium" class="font-bold shadow-sm">搬运中</van-tag>
      </template>
    </van-nav-bar>

    <div class="flex-1 p-4 space-y-5 overflow-y-auto">
      
      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div class="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Moving Container / 当前载具</div>
        <div class="space-y-3">
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-blue-50 flex items-center justify-center mr-3">
              <van-icon name="points" size="18" class="text-blue-600" />
            </div>
            <span>托盘：</span>
            <span class="ml-auto font-mono font-bold text-gray-900">P12345</span>
          </div>
          <div class="flex items-center text-gray-700 text-base">
            <div class="w-8 h-8 rounded bg-purple-50 flex items-center justify-center mr-3">
              <van-icon name="circle" size="18" class="text-purple-600" />
            </div>
            <span>物料：</span>
            <span class="ml-auto font-bold text-gray-900">减速机 x 20</span>
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
          />
          <div
            role="button"
            class="w-14 bg-green-500 rounded-xl flex items-center justify-center shadow-md active:bg-green-600 transition-all active:scale-95 cursor-pointer shrink-0"
            @click="onScanTrigger"
          >
            <van-icon name="scan" size="26" color="white" />
          </div>
        </div>

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
        :loading="submitting"
        :disabled="!locationCode || submitting"
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
