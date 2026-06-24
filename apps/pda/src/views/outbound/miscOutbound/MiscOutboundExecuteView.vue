<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import { getMiscOutboundDetail, updateMiscOutbound, approveAndExecuteMiscOutbound } from '@/api/outbound/miscOutbound'
import { getLocationByCode } from '@/api/wms/location'
import { getContainerByCode } from '@/api/wms/container'
import type { MiscOutboundOrderDto, MiscOutboundOrderDetailDto, CreateUpdateMiscOutboundOrderDetailDto } from '@/api/outbound/miscOutbound'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => String(route.params.shipmentId ?? ''))
const order = ref<MiscOutboundOrderDto | null>(null)
const loading = ref(false)
const submitting = ref(false)

// 扫描校验弹出框控制
const executeDialogVisible = ref(false)
const selectedDetailIndex = ref<number | null>(null)
const scanLocationText = ref('')
const scanContainerText = ref('')
const scanQty = ref<number>(0)
const scanBatchNo = ref('')
const scanSN = ref('')

// 用于在明细列表上跟踪每个明细行的本地校验状态 (例如是否扫描完成)
const verifiedLines = ref<Record<string, boolean>>({})

function goBack() {
  router.back()
}

function normalizeCode(value?: string | null) {
  return String(value || '').trim().toUpperCase()
}

async function loadDetail() {
  if (!orderId.value) {
    showFailToast('缺少单据 ID')
    return
  }
  loading.value = true
  try {
    order.value = await getMiscOutboundDetail(orderId.value)
    // 初始化校验状态
    if (order.value) {
      order.value.details.forEach((d) => {
        // 如果原本就已经有库位和容器配置，且用户只想执行，我们默认可以重新扫码校验。
        verifiedLines.value[d.id] = false
      })
    }
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '加载详情失败')
  } finally {
    loading.value = false
  }
}

function openExecuteDialog(index: number) {
  if (!order.value) return
  const detail = order.value.details[index]
  selectedDetailIndex.value = index
  scanLocationText.value = ''
  scanContainerText.value = ''
  scanQty.value = detail.qty || 0
  scanBatchNo.value = detail.batchNo || ''
  scanSN.value = detail.sn || ''
  executeDialogVisible.value = true
}

async function handleConfirmVerification(): Promise<boolean> {
  if (selectedDetailIndex.value === null || !order.value) return false

  const detail = order.value.details[selectedDetailIndex.value]
  const locationCode = scanLocationText.value.trim()
  const containerCode = scanContainerText.value.trim()

  if (!locationCode) {
    showToast('请扫描源库位')
    return false
  }
  if (!containerCode) {
    showToast('请扫描源容器编码')
    return false
  }

  // 1. 防呆：校验条码是否与计划单据一致
  const expectedLocation = normalizeCode(detail.locationCode)
  const expectedContainer = normalizeCode(detail.containerCode)

  if (expectedLocation && normalizeCode(locationCode) !== expectedLocation) {
    showFailToast(`库位校验不匹配，应为 ${detail.locationCode}`)
    return false
  }

  if (expectedContainer && normalizeCode(containerCode) !== expectedContainer) {
    showFailToast(`容器校验不匹配，应为 ${detail.containerCode}`)
    return false
  }

  // 2. 异步校验库位和容器并检索 Guid 写入
  showToast({ message: '核对库位中...', type: 'loading', duration: 0 })
  const locationDto = await getLocationByCode(locationCode)
  if (!locationDto) {
    showFailToast(`系统找不到库位 ${locationCode}`)
    return false
  }

  showToast({ message: '核对容器中...', type: 'loading', duration: 0 })
  const containerDto = await getContainerByCode(containerCode)
  if (!containerDto) {
    showFailToast(`系统找不到容器 ${containerCode}`)
    return false
  }

  if (scanQty.value <= 0) {
    showToast('出库数量必须大于0')
    return false
  }

  // 更新本地数据
  detail.locationId = locationDto.id
  detail.locationCode = locationDto.code
  detail.warehouseId = locationDto.warehouseId
  detail.warehouseCode = locationDto.warehouseCode || ''
  detail.warehouseName = locationDto.warehouseName || ''
  detail.containerId = containerDto.id
  detail.containerCode = containerDto.containerCode
  detail.qty = scanQty.value
  detail.batchNo = scanBatchNo.value.trim()
  detail.sn = scanSN.value.trim()

  // 标记当前行已通过校验
  verifiedLines.value[detail.id] = true
  showSuccessToast('校验通过')
  return true
}

async function handleBeforeClose(action: string) {
  if (action === 'confirm') {
    return await handleConfirmVerification()
  }
  return true
}

async function executeOutbound() {
  if (!order.value) return

  // 检查是否所有明细行都通过了 PDA 实物校验
  const unverified = order.value.details.filter((d) => !verifiedLines.value[d.id])
  if (unverified.length > 0) {
    showToast('仍有物料行未完成扫码校验！请先逐行扫描。')
    return
  }

  submitting.value = true
  try {
    const detailsPayload: CreateUpdateMiscOutboundOrderDetailDto[] = order.value.details.map((x) => ({
      warehouseId: x.warehouseId,
      warehouseCode: x.warehouseCode,
      warehouseName: x.warehouseName,
      locationId: x.locationId,
      locationCode: x.locationCode,
      containerId: x.containerId,
      containerCode: x.containerCode,
      productId: x.productId,
      productCode: x.productCode,
      productName: x.productName,
      sn: x.sn,
      batchNo: x.batchNo,
      craftVersion: x.craftVersion,
      unit: x.unit,
      qty: x.qty,
      remark: x.remark,
    }))

    // 1. 先把修改好的物理容器与库位参数更新到草稿单
    await updateMiscOutbound(orderId.value, {
      accountAliasId: order.value.accountAliasId,
      accountAliasDescription: order.value.accountAliasDescription,
      costCenterId: order.value.costCenterId,
      costCenterCode: order.value.costCenterCode,
      costCenterName: order.value.costCenterName,
      remark: order.value.remark,
      details: detailsPayload,
    })

    // 2. 审核并下架执行
    await approveAndExecuteMiscOutbound(orderId.value)
    showSuccessToast('其他出库单执行发货成功')
    router.replace({ name: 'MiscOutboundList' })
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '执行出库扣账失败')
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
        <span class="text-white font-bold tracking-wide">执行其他发货</span>
      </template>
    </van-nav-bar>

    <div v-if="order" class="flex-1 overflow-y-auto pb-24">
      <!-- 头部卡片 -->
      <section class="bg-white p-4 border-b border-gray-100">
        <div class="text-xs text-slate-500">其他出库单号</div>
        <div class="mt-1 text-lg font-black text-slate-900 break-all">{{ order.orderNo }}</div>
        <div class="mt-2 text-sm text-slate-600">
          成本中心: {{ order.costCenterName }}
        </div>
        <div class="mt-1 text-sm text-slate-600">
          账户别名: {{ order.accountAliasDescription }}
        </div>
      </section>

      <!-- 明细列表 -->
      <section class="p-3 space-y-3">
        <div class="text-xs text-slate-500 font-bold px-1 uppercase tracking-wider">待出库物料明细</div>

        <article
          v-for="(detail, index) in order.details"
          :key="detail.id"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden"
          :class="verifiedLines[detail.id] ? 'border-l-[6px] border-l-green-500' : 'border-l-[6px] border-l-sky-500'"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="text-base font-extrabold text-slate-800 font-mono">{{ detail.productCode }}</div>
              <div class="text-sm text-slate-500 mt-0.5">{{ detail.productName }}</div>
            </div>
            <van-tag :type="verifiedLines[detail.id] ? 'success' : 'primary'" size="medium" class="font-bold">
              {{ verifiedLines[detail.id] ? '已核对' : '待扫描' }}
            </van-tag>
          </div>

          <div class="border-t border-dashed border-gray-100 my-3"></div>

          <div class="grid grid-cols-2 gap-y-2 text-xs text-slate-500">
            <div>需求数量: <span class="font-bold text-slate-800">{{ detail.qty }} {{ detail.unit }}</span></div>
            <div>源库位: <span class="font-mono font-bold text-slate-700">{{ detail.locationCode || '-' }}</span></div>
            <div>批次: <span class="font-mono font-bold text-slate-700">{{ detail.batchNo || '-' }}</span></div>
            <div>载具: <span class="font-mono font-bold text-slate-700">{{ detail.containerCode || '-' }}</span></div>
          </div>

          <div class="mt-4">
            <van-button
              block
              round
              size="small"
              :class="verifiedLines[detail.id]
                ? '!bg-green-50 !text-green-700 !border-green-200'
                : '!bg-sky-50 !text-sky-700 !border-sky-200'"
              class="font-bold"
              @click="openExecuteDialog(index)"
            >
              <van-icon name="scan" class="mr-1" />
              {{ verifiedLines[detail.id] ? '重新扫描校验' : '扫描下架校验' }}
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
        class="!bg-sky-600 active:!bg-sky-700 !border-none font-bold text-lg !h-14"
        :loading="submitting"
        :disabled="submitting"
        @click="executeOutbound"
      >
        确认并出库完成
      </van-button>
    </footer>

    <!-- 扫描弹出框 -->
    <van-dialog
      v-model:show="executeDialogVisible"
      title="扫码核对确认"
      show-cancel-button
      confirm-button-text="确认通过"
      cancel-button-text="取消"
      :before-close="handleBeforeClose"
    >
      <div class="p-4 space-y-4">
        <div class="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-sky-800 space-y-1">
          <div>目标库位: <span class="font-bold font-mono">{{ selectedDetailIndex !== null ? order?.details[selectedDetailIndex].locationCode : '-' }}</span></div>
          <div>目标容器: <span class="font-bold font-mono">{{ selectedDetailIndex !== null ? order?.details[selectedDetailIndex].containerCode : '-' }}</span></div>
        </div>

        <van-field
          v-model="scanLocationText"
          label="源库位扫码"
          clearable
          placeholder="请扫描源库位条码"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanContainerText"
          label="容器扫码"
          clearable
          placeholder="请扫描容器编码条码"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanQty"
          label="出库实发数"
          type="number"
          clearable
          placeholder="请输入出库数量"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanBatchNo"
          label="批次核对"
          clearable
          placeholder="请输入批次"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanSN"
          label="序列号 (SN)"
          clearable
          placeholder="请输入序列号"
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
