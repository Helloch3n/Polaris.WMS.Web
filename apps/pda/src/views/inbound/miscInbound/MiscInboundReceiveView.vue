<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import { getMiscInboundDetail, updateMiscInbound, approveAndExecuteMiscInbound } from '@/api/inbound/miscInbound'
import { getLocationByCode } from '@/api/wms/location'
import { getContainerByCode } from '@/api/wms/container'
import type { MiscInboundOrderDto, MiscInboundOrderDetailDto, CreateUpdateMiscInboundOrderDetailDto } from '@/api/inbound/miscInbound'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => String(route.params.receiptId ?? ''))
const order = ref<MiscInboundOrderDto | null>(null)
const loading = ref(false)
const submitting = ref(false)

// 扫描录入模态框控制
const receiveDialogVisible = ref(false)
const selectedDetailIndex = ref<number | null>(null)
const scanLocationText = ref('')
const scanContainerText = ref('')
const scanQty = ref<number>(0)
const scanBatchNo = ref('')
const scanSN = ref('')
const scanRemark = ref('')

function goBack() {
  router.back()
}

async function loadDetail() {
  if (!orderId.value) {
    showFailToast('缺少单据 ID')
    return
  }
  loading.value = true
  try {
    order.value = await getMiscInboundDetail(orderId.value)
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '加载详情失败')
  } finally {
    loading.value = false
  }
}

function openReceiveDialog(index: number) {
  if (!order.value) return
  const detail = order.value.details[index]
  selectedDetailIndex.value = index
  scanLocationText.value = detail.locationCode || ''
  scanContainerText.value = detail.containerCode || ''
  scanQty.value = detail.qty || 0
  scanBatchNo.value = detail.batchNo || ''
  scanSN.value = detail.sn || ''
  scanRemark.value = detail.remark || ''
  receiveDialogVisible.value = true
}

async function handleConfirmReceive(): Promise<boolean> {
  if (selectedDetailIndex.value === null || !order.value) return false

  const locationCode = scanLocationText.value.trim()
  if (!locationCode) {
    showToast('请输入目标库位')
    return false
  }

  const containerCode = scanContainerText.value.trim()
  if (!containerCode) {
    showToast('请输入容器编码')
    return false
  }

  if (scanQty.value <= 0) {
    showToast('数量必须大于0')
    return false
  }

  // 1. 异步校验库位编码并获取 LocationId
  showToast({ message: '校验库位中...', type: 'loading', duration: 0 })
  const locationDto = await getLocationByCode(locationCode)
  if (!locationDto) {
    showFailToast(`库位 [${locationCode}] 不存在，请重新输入或扫描`)
    return false
  }

  // 2. 异步校验容器编码并获取 ContainerId
  showToast({ message: '校验容器中...', type: 'loading', duration: 0 })
  const containerDto = await getContainerByCode(containerCode)
  if (!containerDto) {
    showFailToast(`容器 [${containerCode}] 不存在，请先创建或使用已有容器`)
    return false
  }

  // 更新本地数据行
  const detail = order.value.details[selectedDetailIndex.value]
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
  detail.remark = scanRemark.value.trim()

  showSuccessToast('明细录入成功')
  return true
}

async function handleBeforeClose(action: string) {
  if (action === 'confirm') {
    return await handleConfirmReceive()
  }
  return true
}

async function executeReceipt() {
  if (!order.value) return

  // 简单安全校验
  const invalidDetails = order.value.details.filter(
    (x) => !x.locationCode.trim() || !x.containerCode.trim() || x.qty <= 0
  )
  if (invalidDetails.length > 0) {
    showToast('有未扫描录入库位或容器的明细行，请先补充完整！')
    return
  }

  submitting.value = true
  try {
    // 组装提交参数
    const detailsPayload: CreateUpdateMiscInboundOrderDetailDto[] = order.value.details.map((x) => ({
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

    // 1. 先保存草稿行的更新
    await updateMiscInbound(orderId.value, {
      accountAliasId: order.value.accountAliasId,
      accountAliasDescription: order.value.accountAliasDescription,
      costCenterId: order.value.costCenterId,
      costCenterCode: order.value.costCenterCode,
      costCenterName: order.value.costCenterName,
      remark: order.value.remark,
      details: detailsPayload,
    })

    // 2. 执行审核落账
    await approveAndExecuteMiscInbound(orderId.value)
    showSuccessToast('其他入库单已收货执行完成')
    router.replace({ name: 'MiscInboundList' })
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '执行收货提交失败')
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
        <span class="text-white font-bold tracking-wide">执行其他收货</span>
      </template>
    </van-nav-bar>

    <div v-if="order" class="flex-1 overflow-y-auto pb-24">
      <!-- 头部卡片 -->
      <section class="bg-white p-4 border-b border-gray-100">
        <div class="text-xs text-slate-500">其他入库单号</div>
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
        <div class="text-xs text-slate-500 font-bold px-1 uppercase tracking-wider">物料明细行</div>
        
        <article
          v-for="(detail, index) in order.details"
          :key="detail.id"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="text-base font-extrabold text-slate-800 font-mono">{{ detail.productCode }}</div>
              <div class="text-sm text-slate-500 mt-0.5">{{ detail.productName }}</div>
            </div>
            <van-tag :type="detail.locationCode ? 'success' : 'warning'" size="medium" class="font-bold">
              {{ detail.locationCode ? '已录入' : '待扫描' }}
            </van-tag>
          </div>

          <div class="border-t border-dashed border-gray-100 my-3"></div>

          <div class="grid grid-cols-2 gap-y-2 text-xs text-slate-500">
            <div>计划数量: <span class="font-bold text-slate-800">{{ detail.qty }} {{ detail.unit }}</span></div>
            <div>库位: <span class="font-mono font-bold" :class="detail.locationCode ? 'text-cyan-600' : 'text-amber-500'">{{ detail.locationCode || '未录入' }}</span></div>
            <div>批次: <span class="font-mono font-bold text-slate-800">{{ detail.batchNo || '未录入' }}</span></div>
            <div>载具: <span class="font-mono font-bold text-slate-800">{{ detail.containerCode || '未录入' }}</span></div>
          </div>

          <div class="mt-4 flex space-x-2">
            <van-button
              block
              round
              size="small"
              class="!bg-cyan-50 !text-cyan-700 !border-cyan-200 font-bold"
              @click="openReceiveDialog(index)"
            >
              <van-icon name="scan" class="mr-1" />
              扫描录入明细
            </van-button>
          </div>
        </article>
      </section>
    </div>

    <!-- 底部执行 -->
    <footer v-if="order" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 pb-safe z-30 shadow-lg">
      <van-button
        block
        round
        type="primary"
        size="large"
        class="!bg-cyan-600 active:!bg-cyan-700 !border-none font-bold text-lg !h-14"
        :loading="submitting"
        :disabled="submitting"
        @click="executeReceipt"
      >
        确认并收货完成
      </van-button>
    </footer>

    <!-- 扫描弹出框 -->
    <van-dialog
      v-model:show="receiveDialogVisible"
      title="录入明细详情"
      show-cancel-button
      confirm-button-text="确认"
      cancel-button-text="取消"
      :before-close="handleBeforeClose"
    >
      <div class="p-4 space-y-4">
        <van-field
          v-model="scanLocationText"
          label="目标库位"
          clearable
          placeholder="扫描或输入目标库位"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanContainerText"
          label="容器编码"
          clearable
          placeholder="扫描或输入容器编码"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanQty"
          label="收货数量"
          type="number"
          clearable
          placeholder="请输入收货数量"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanBatchNo"
          label="批次号"
          clearable
          placeholder="请输入批次号 (选填)"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanSN"
          label="序列号 (SN)"
          clearable
          placeholder="请输入序列号 (选填)"
          class="!bg-gray-100 !rounded-xl"
        />
        <van-field
          v-model="scanRemark"
          label="备注"
          clearable
          placeholder="请输入备注 (选填)"
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
