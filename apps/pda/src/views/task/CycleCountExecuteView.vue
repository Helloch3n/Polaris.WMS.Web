<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import { getCycleCountDetail, submitCountResult, CycleCountType } from '@/api/wms/cycleCount'
import type { CycleCountOrderDto, CycleCountOrderDetailDto } from '@/api/wms/cycleCount'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => String(route.params.id ?? ''))
const order = ref<CycleCountOrderDto | null>(null)
const loading = ref(false)
const submitting = ref(false)

// 盘点弹窗控制器
const countDialogVisible = ref(false)
const selectedDetailIndex = ref<number | null>(null)
const scanLocationText = ref('')
const scanContainerText = ref('')
const countedQtyInput = ref<number>(0)

function goBack() {
  router.back()
}

function normalizeCode(value?: string | null) {
  return String(value || '').trim().toUpperCase()
}

const isBlindType = computed(() => order.value?.countType === CycleCountType.Blind)

const totalBookQty = computed(() => {
  if (isBlindType.value || !order.value) return '***'
  return order.value.details.reduce((sum, d) => sum + (d.systemQty || 0), 0)
})

const countedRowsCount = computed(() => {
  if (!order.value) return 0
  return order.value.details.filter((d) => d.isCounted).length
})

const diffRowsCount = computed(() => {
  if (isBlindType.value || !order.value) return '***'
  return order.value.details.filter((d) => d.isCounted && d.systemQty !== d.countedQty).length
})

async function loadDetail() {
  if (!orderId.value) {
    showFailToast('缺少盘点单 ID')
    return
  }
  loading.value = true
  try {
    order.value = await getCycleCountDetail(orderId.value)
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '加载盘点详情失败')
  } finally {
    loading.value = false
  }
}

function openCountDialog(index: number) {
  if (!order.value) return
  const detail = order.value.details[index]
  selectedDetailIndex.value = index
  scanLocationText.value = ''
  scanContainerText.value = ''
  countedQtyInput.value = detail.countedQty || 0
  countDialogVisible.value = true
}

async function handleConfirmCount(): Promise<boolean> {
  if (selectedDetailIndex.value === null || !order.value) return false

  const detail = order.value.details[selectedDetailIndex.value]
  const locationCode = scanLocationText.value.trim()
  const containerCode = scanContainerText.value.trim()

  if (!locationCode) {
    showToast('请扫描/输入源库位')
    return false
  }
  if (!containerCode) {
    showToast('请扫描/输入容器条码')
    return false
  }
  if (countedQtyInput.value < 0) {
    showToast('盘点数量不能小于0')
    return false
  }

  // 条码防呆校验
  const expectedLocation = normalizeCode(detail.locationCode)
  const expectedContainer = normalizeCode(detail.containerCode)

  if (expectedLocation && normalizeCode(locationCode) !== expectedLocation) {
    showFailToast(`库位核对不匹配，请按指示盘点`)
    return false
  }

  if (expectedContainer && normalizeCode(containerCode) !== expectedContainer) {
    showFailToast(`容器编码核对不匹配，请按指示盘点`)
    return false
  }

  // 发起后台同步提交
  showToast({ message: '提交盘点数据中...', type: 'loading', duration: 0 })
  try {
    await submitCountResult({
      orderId: orderId.value,
      containerCode: detail.containerCode,
      productId: detail.productId,
      countedQty: countedQtyInput.value,
    })
    
    showSuccessToast('本行盘点已记录')
    
    // 重新拉取最新的服务端数据以更新列表显示
    await loadDetail()
    return true
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '盘点数据提交失败')
    return false
  }
}

async function handleBeforeClose(action: string) {
  if (action === 'confirm') {
    return await handleConfirmCount()
  }
  return true
}

async function quickMatch(index: number) {
  if (!order.value) return
  const detail = order.value.details[index]
  
  if (isBlindType.value) {
    showToast('暗盘模式下无法进行一键快捷确认，请依次扫描核对实盘数量！')
    return
  }

  const sysQty = detail.systemQty || 0
  
  showToast({ message: '快捷同步中...', type: 'loading', duration: 0 })
  try {
    await submitCountResult({
      orderId: orderId.value,
      containerCode: detail.containerCode,
      productId: detail.productId,
      countedQty: sysQty,
    })
    showSuccessToast('快捷盘点记录成功')
    await loadDetail()
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '快捷同步失败')
  }
}

function handleFinishOrder() {
  if (!order.value) return
  const uncounted = order.value.details.filter((d) => !d.isCounted)
  if (uncounted.length > 0) {
    showToast('仍有未盘点物料行！请先全部清点完毕。')
    return
  }
  
  showSuccessToast('本张盘点单已全部清点并完成')
  router.replace({ name: 'CycleCountList' })
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="goBack">
      <template #title>
        <span class="text-white font-bold tracking-wide">执行盘点作业</span>
      </template>
      <template #right>
        <van-tag :type="isBlindType ? 'danger' : 'primary'" size="medium" class="font-bold">
          {{ isBlindType ? '暗盘模式' : '明盘模式' }}
        </van-tag>
      </template>
    </van-nav-bar>

    <div v-if="order" class="flex-1 overflow-y-auto pb-32">
      <!-- 汇总卡片 -->
      <section class="bg-white p-4 border-b border-gray-100 grid grid-cols-3 gap-2 text-center shrink-0">
        <div class="border-r border-gray-100">
          <div class="text-[11px] text-slate-400">账面总数</div>
          <div class="mt-1 text-base font-black text-slate-700">{{ totalBookQty }}</div>
        </div>
        <div class="border-r border-gray-100">
          <div class="text-[11px] text-slate-400">盘点行数</div>
          <div class="mt-1 text-base font-black text-slate-700">{{ countedRowsCount }}/{{ order.details.length }}</div>
        </div>
        <div>
          <div class="text-[11px] text-slate-400">差异行数</div>
          <div class="mt-1 text-base font-black text-rose-600">{{ diffRowsCount }}</div>
        </div>
      </section>

      <!-- 盘点明细列表 -->
      <section class="p-3 space-y-3">
        <article
          v-for="(detail, index) in order.details"
          :key="detail.id"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden"
          :class="detail.isCounted ? 'border-l-[6px] border-l-emerald-500' : 'border-l-[6px] border-l-amber-500'"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1 min-w-0 pr-2">
              <div class="text-base font-extrabold text-slate-800 font-mono truncate">{{ detail.productCode }}</div>
              <div class="text-xs text-slate-500 mt-0.5 truncate">{{ detail.productName }}</div>
            </div>
            <van-tag :type="detail.isCounted ? 'success' : 'warning'" size="medium" class="font-bold shrink-0">
              {{ detail.isCounted ? '已盘点' : '待盘点' }}
            </van-tag>
          </div>

          <div class="border-t border-dashed border-gray-100 my-3"></div>

          <div class="grid grid-cols-2 gap-y-2 text-xs text-slate-500">
            <div>建议库位: <span class="font-mono font-bold text-slate-700">{{ detail.locationCode }}</span></div>
            <div>建议托盘: <span class="font-mono font-bold text-slate-700">{{ detail.containerCode }}</span></div>
            
            <div class="col-span-2 flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
              <div v-if="!isBlindType" class="text-slate-500 text-xs">
                账面: <span class="font-bold text-slate-800 text-sm">{{ detail.systemQty }}</span>
              </div>
              <div v-else class="text-slate-400 text-xs italic">
                账面数量隐藏 (暗盘)
              </div>

              <div class="text-right">
                实盘: <span class="font-extrabold text-sm" :class="detail.isCounted ? 'text-emerald-600' : 'text-slate-400'">{{ detail.isCounted ? detail.countedQty : '未录入' }}</span>
              </div>
            </div>
          </div>

          <!-- 快捷操作区 -->
          <div class="mt-4 flex gap-2">
            <van-button
              v-if="!isBlindType && !detail.isCounted"
              plain
              round
              size="small"
              class="!flex-1 !border-emerald-200 !text-emerald-700 bg-emerald-50/50"
              @click="quickMatch(index)"
            >
              账实一致
            </van-button>
            <van-button
              block
              round
              size="small"
              :type="detail.isCounted ? 'default' : 'primary'"
              class="!flex-[1.5] font-bold"
              :class="detail.isCounted ? '' : '!bg-emerald-500 !border-none text-white'"
              @click="openCountDialog(index)"
            >
              <van-icon name="scan" class="mr-1" />
              {{ detail.isCounted ? '重新录入' : '扫描清点' }}
            </van-button>
          </div>
        </article>
      </section>
    </div>

    <!-- 底部确认 -->
    <footer v-if="order" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 pb-safe z-30 shadow-lg">
      <van-button
        block
        round
        type="primary"
        size="large"
        class="!bg-slate-800 active:!bg-slate-700 !border-none font-bold text-lg !h-14"
        :loading="submitting"
        :disabled="submitting"
        @click="handleFinishOrder"
      >
        完成盘点作业
      </van-button>
    </footer>

    <!-- 盘点扫码核对弹窗 -->
    <van-dialog
      v-model:show="countDialogVisible"
      title="扫盘库位与载具"
      show-cancel-button
      confirm-button-text="校验并提交"
      cancel-button-text="取消"
      :before-close="handleBeforeClose"
    >
      <div class="p-4 space-y-4">
        <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
          <div>目标库位: <span class="font-bold font-mono">{{ selectedDetailIndex !== null ? order?.details[selectedDetailIndex].locationCode : '-' }}</span></div>
          <div>目标容器: <span class="font-bold font-mono">{{ selectedDetailIndex !== null ? order?.details[selectedDetailIndex].containerCode : '-' }}</span></div>
        </div>

        <van-field
          v-model="scanLocationText"
          label="源库位扫码"
          clearable
          placeholder="扫描库位条码以核对"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanContainerText"
          label="容器扫码"
          clearable
          placeholder="扫描载具条码以核对"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="countedQtyInput"
          label="实盘数量"
          type="number"
          clearable
          placeholder="请输入实际清点数量"
          class="!bg-gray-100 !rounded-xl"
        />
      </div>
    </van-dialog>
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
