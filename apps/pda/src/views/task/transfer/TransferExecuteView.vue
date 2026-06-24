<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import { getTransferDetail, approveAndExecute } from '@/api/wms/transfer'
import type { TransferDto, TransferDetailDto } from '@/api/wms/transfer'

const route = useRoute()
const router = useRouter()

const transferId = computed(() => String(route.params.id ?? ''))
const transfer = ref<TransferDto | null>(null)
const loading = ref(false)
const submitting = ref(false)

// 校验弹窗状态
const verifyDialogVisible = ref(false)
const selectedDetailIndex = ref<number | null>(null)
const scanContainerText = ref('')
const scanLocationText = ref('')

// 本地记录已扫描验证的明细行 ID 集合
const verifiedDetailIds = ref<Record<string, boolean>>({})

function goBack() {
  router.back()
}

function normalizeCode(value?: string | null) {
  return String(value || '').trim().toUpperCase()
}

async function loadDetail() {
  if (!transferId.value) {
    showFailToast('缺少移库单 ID')
    return
  }
  loading.value = true
  try {
    transfer.value = await getTransferDetail(transferId.value)
    
    // 初始化本地校验状态：如果是已完成的明细行，默认视为已校验
    transfer.value.details.forEach(detail => {
      if (detail.isCompleted) {
        verifiedDetailIds.value[detail.id] = true
      }
    })
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '加载移库单详情失败')
  } finally {
    loading.value = false
  }
}

function openVerifyDialog(index: number) {
  if (!transfer.value) return
  selectedDetailIndex.value = index
  scanContainerText.value = ''
  scanLocationText.value = ''
  verifyDialogVisible.value = true
}

const selectedDetail = computed(() => {
  if (selectedDetailIndex.value === null || !transfer.value) return null
  return transfer.value.details[selectedDetailIndex.value]
})

function handleConfirmVerify(): boolean {
  if (selectedDetailIndex.value === null || !transfer.value) return false
  const detail = transfer.value.details[selectedDetailIndex.value]

  const inputContainer = normalizeCode(scanContainerText.value)
  const inputLocation = normalizeCode(scanLocationText.value)

  if (!inputContainer) {
    showToast('请扫描/输入容器编号')
    return false
  }
  if (!inputLocation) {
    showToast('请扫描/输入目标库位')
    return false
  }

  const expectedContainer = normalizeCode(detail.reelCode || detail.containerCode)
  const expectedLocation = normalizeCode(detail.targetLocationCode)

  if (expectedContainer && inputContainer !== expectedContainer) {
    showFailToast(`载具编号核对不匹配，应为 ${expectedContainer}`)
    return false
  }

  if (expectedLocation && inputLocation !== expectedLocation) {
    showFailToast(`目标库位核对不匹配，应为 ${expectedLocation}`)
    return false
  }

  // 校验通过，记录到本地
  verifiedDetailIds.value[detail.id] = true
  showSuccessToast('校验通过')
  return true
}

async function handleBeforeClose(action: string) {
  if (action === 'confirm') {
    return handleConfirmVerify()
  }
  return true
}

const allVerified = computed(() => {
  if (!transfer.value) return false
  return transfer.value.details.every(detail => verifiedDetailIds.value[detail.id] === true)
})

async function submitTransfer() {
  if (!transferId.value || !allVerified.value) return
  
  submitting.value = true
  showToast({ message: '提交执行中...', type: 'loading', duration: 0 })
  try {
    await approveAndExecute(transferId.value)
    showSuccessToast('调拨移库执行成功')
    router.replace('/task/transfer')
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '提交移库失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="goBack">
      <template #title>
        <span class="text-white font-bold tracking-wide">执行移库作业</span>
      </template>
    </van-nav-bar>

    <div v-if="transfer" class="flex-1 overflow-y-auto pb-32">
      <!-- 汇总卡片 -->
      <section class="bg-slate-800 text-white p-4 shrink-0 shadow-md">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs opacity-75 font-mono">单号: {{ transfer.orderNo }}</span>
          <van-tag type="primary" size="medium" class="font-bold">移库指令</van-tag>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-3 border-t border-white/10 pt-3">
          <div>
            <div class="text-[11px] opacity-70">源仓库</div>
            <div class="text-sm font-bold font-mono mt-0.5">{{ transfer.warehouseCode || '--' }}</div>
          </div>
          <div>
            <div class="text-[11px] opacity-70">目标仓库</div>
            <div class="text-sm font-bold font-mono mt-0.5">{{ transfer.targetWarehouseCode || transfer.warehouseCode || '--' }}</div>
          </div>
        </div>
      </section>

      <!-- 明细列表 -->
      <section class="p-3 space-y-3">
        <article
          v-for="(detail, index) in transfer.details"
          :key="detail.id"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden"
          :class="verifiedDetailIds[detail.id] ? 'border-l-[6px] border-l-emerald-500' : 'border-l-[6px] border-l-amber-500'"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1 min-w-0 pr-2">
              <div class="text-base font-extrabold text-slate-800 font-mono truncate">{{ detail.productCode }}</div>
              <div class="text-xs text-slate-500 mt-0.5 truncate">{{ detail.productName }}</div>
            </div>
            <van-tag :type="verifiedDetailIds[detail.id] ? 'success' : 'warning'" size="medium" class="font-bold shrink-0">
              {{ verifiedDetailIds[detail.id] ? '已核对' : '待核对' }}
            </van-tag>
          </div>

          <div class="border-t border-dashed border-gray-100 my-3"></div>

          <div class="space-y-1.5 text-xs text-slate-600">
            <div class="flex justify-between">
              <span>容器条码:</span>
              <span class="font-mono font-bold text-slate-800">{{ detail.reelCode || detail.containerCode }}</span>
            </div>
            <div class="flex justify-between">
              <span>来源库位:</span>
              <span class="font-mono font-bold text-slate-800">{{ detail.sourceLocationCode }}</span>
            </div>
            <div class="flex justify-between">
              <span>目标库位:</span>
              <span class="font-mono font-bold text-green-700">{{ detail.targetLocationCode }}</span>
            </div>
            <div class="flex justify-between pt-1 border-t border-gray-50 text-sm">
              <span>移库数量:</span>
              <span class="font-black text-slate-800">{{ detail.qty }}</span>
            </div>
          </div>

          <!-- 扫码校验按钮 -->
          <div class="mt-4" v-if="!verifiedDetailIds[detail.id]">
            <van-button
              block
              round
              size="small"
              type="primary"
              class="!bg-emerald-500 !border-none text-white font-bold"
              @click="openVerifyDialog(index)"
            >
              <van-icon name="scan" class="mr-1" />
              扫码核对移库
            </van-button>
          </div>
        </article>
      </section>
    </div>

    <!-- 底部确认 -->
    <footer v-if="transfer" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 pb-safe z-30 shadow-lg">
      <van-button
        block
        round
        type="primary"
        size="large"
        class="!bg-slate-800 active:!bg-slate-700 !border-none font-bold text-lg !h-14"
        :loading="submitting"
        :disabled="!allVerified || submitting"
        @click="submitTransfer"
      >
        CONFIRM TRANSFER / 确认移库
      </van-button>
    </footer>

    <!-- 扫码核对弹窗 -->
    <van-dialog
      v-model:show="verifyDialogVisible"
      title="扫码核对源载具与目标库位"
      show-cancel-button
      confirm-button-text="校验通过"
      cancel-button-text="取消"
      :before-close="handleBeforeClose"
    >
      <div class="p-4 space-y-4" v-if="selectedDetail">
        <div class="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 space-y-1">
          <div>期望载具: <span class="font-bold font-mono">{{ selectedDetail.reelCode || selectedDetail.containerCode }}</span></div>
          <div>期望目标: <span class="font-bold font-mono text-green-700">{{ selectedDetail.targetLocationCode }}</span></div>
        </div>

        <van-field
          v-model="scanContainerText"
          label="容器扫码"
          clearable
          placeholder="扫描载具条码以核对"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanLocationText"
          label="目标库位扫码"
          clearable
          placeholder="扫描目标库位条码以核对"
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
