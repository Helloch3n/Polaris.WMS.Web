<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { showFailToast, showSuccessToast } from 'vant'
import { useRoute, useRouter } from 'vue-router'
import { addPurchaseReceiptRecords, approveAndExecutePurchaseReceipt } from '@/api/inbound/purchaseReceipt'
import type {
  AddPurchaseReceiptRecordsDto,
  PurchaseReceiptDto,
  PurchaseReceiptEntryLine,
  PurchaseReceiptLpnRecord,
  PurchaseRecordDto,
} from '@/types/purchaseReceipt'

const RECEIPT_CACHE_PREFIX = 'pda.purchase-receipt.active.'

const route = useRoute()
const router = useRouter()

const receipt = ref<PurchaseReceiptDto | null>(null)
const entryLines = ref<PurchaseReceiptEntryLine[]>([])
const loadErrorText = ref('')

const receiveDialogVisible = ref(false)
const receiveLineId = ref('')
const receiveLocationText = ref('')
const receiveContainerText = ref('')
const receiveUnitQtyText = ref('')
const receivePieceCountText = ref('1')
const receiveBatchNoText = ref('')
const receiveSupplierBatchNoText = ref('')
const receiveSubmitting = ref(false)
const finishingReceive = ref(false)

const batchEditorVisible = ref(false)
const batchEditLineId = ref('')
const editingBatchText = ref('')

const lpnDrawerVisible = ref(false)
const lpnDrawerLineId = ref('')

const hasReceipt = computed(() => Boolean(receipt.value))

const receiptNo = computed(() => receipt.value?.receiptNo || '--')
const sourceDocType = computed(() => receipt.value?.sourceDocType || '--')
const sourceDocNo = computed(() => receipt.value?.sourceDocNo || '--')

const supplierText = computed(() => {
  if (!receipt.value) {
    return '--'
  }

  return receipt.value.supplierName?.trim() || receipt.value.supplierId || '--'
})

const totalReceivedNow = computed(() =>
  entryLines.value.reduce((sum, line) => sum + normalizeQuantity(line.totalReceivedQuantity), 0),
)

const totalExpected = computed(() =>
  entryLines.value.reduce((sum, line) => sum + normalizeQuantity(line.expectedQuantity), 0),
)

const receivedLineCount = computed(() =>
  entryLines.value.filter((line) => normalizeQuantity(line.totalReceivedQuantity) > 0).length,
)

const receiveLine = computed(() => findLineById(receiveLineId.value))
const lpnDrawerLine = computed(() => findLineById(lpnDrawerLineId.value))
const currentLpnRecords = computed(() => lpnDrawerLine.value?.lpnRecords ?? [])
const drawerUom = computed(() => lpnDrawerLine.value?.uom?.trim() || '')

function resolveReceiptId(): string {
  const rawId = route.params.receiptId
  return typeof rawId === 'string' ? rawId.trim() : ''
}

function getCacheKey(receiptId: string): string {
  return `${RECEIPT_CACHE_PREFIX}${receiptId}`
}

function parseCachedReceipt(raw: string): PurchaseReceiptDto | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PurchaseReceiptDto>
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    if (typeof parsed.id !== 'string' || !Array.isArray(parsed.details)) {
      return null
    }

    return parsed as PurchaseReceiptDto
  } catch {
    return null
  }
}

function normalizeQuantity(value: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Number(parsed.toFixed(3))
}

function formatQuantity(value: number): string {
  return normalizeQuantity(value).toString()
}

function getLineKey(line: PurchaseReceiptEntryLine): string {
  return line.purchaseReceiptDetailId?.trim() || line.sourceDetailId || line.productId
}

function findLineById(lineId: string): PurchaseReceiptEntryLine | undefined {
  return entryLines.value.find((line) => getLineKey(line) === lineId)
}

function toDisplaySku(line: PurchaseReceiptEntryLine): string {
  return line.skuCode ?? line.productCode ?? line.productId
}

function displaySpec(line: PurchaseReceiptEntryLine): string {
  return line.productCode || line.skuCode || '--'
}

function displayUom(line: Pick<PurchaseReceiptEntryLine, 'uom'>): string {
  return line.uom?.trim() || ''
}

function progressClass(line: PurchaseReceiptEntryLine): string {
  const total = normalizeQuantity(line.totalReceivedQuantity)
  const expected = normalizeQuantity(line.expectedQuantity)

  if (total === 0) {
    return 'text-gray-400'
  }

  if (total < expected) {
    return 'text-orange-500'
  }

  if (total === expected) {
    return 'text-green-500'
  }

  return 'text-red-500 font-black'
}

function syncLineTotal(line: PurchaseReceiptEntryLine) {
  const total = line.lpnRecords.reduce((sum, record) => sum + normalizeQuantity(record.quantity), 0)
  line.totalReceivedQuantity = normalizeQuantity(total)
}

function normalizeRecord(
  lineKey: string,
  record: PurchaseRecordDto,
  index: number,
): PurchaseReceiptLpnRecord {
  const id = record.id?.trim() || record.containerCode?.trim() || `${lineKey}-REC-${index + 1}`

  return {
    id,
    locationId: record.locationCode?.trim() || record.locationId?.trim() || '',
    locationCode: record.locationCode?.trim() || null,
    containerNo: record.containerCode?.trim() || null,
    containerCode: record.containerCode?.trim() || null,
    quantity: normalizeQuantity(record.receivedQuantity),
    batchNo: record.batchNo?.trim() || null,
    supplierBatchNo: record.supplierBatchNo?.trim() || null,
  }
}

function toEntryLines(receiptDto: PurchaseReceiptDto): PurchaseReceiptEntryLine[] {
  return receiptDto.details.map((detail) => {
    const lineKey = detail.sourceDetailId ?? detail.productId
    const normalizedRecords = (detail.records ?? [])
      .map((record, index) => normalizeRecord(lineKey, record, index))
      .filter((record) => normalizeQuantity(record.quantity) > 0)

    const line: PurchaseReceiptEntryLine = {
      purchaseReceiptDetailId: detail.id,
      sourceDetailId: detail.sourceDetailId ?? null,
      productId: detail.productId,
      skuCode: detail.productCode ?? null,
      productCode: detail.productCode ?? null,
      productName: detail.productName ?? null,
      barcode: null,
      uom: null,
      batchNo: detail.batchNo ?? null,
      expectedQuantity: normalizeQuantity(detail.expectedQuantity),
      alreadyReceivedQuantity: normalizeQuantity(detail.receivedQuantity),
      totalReceivedQuantity: 0,
      lpnRecords: normalizedRecords,
    }

    syncLineTotal(line)

    if (line.totalReceivedQuantity === 0 && line.alreadyReceivedQuantity > 0) {
      line.totalReceivedQuantity = line.alreadyReceivedQuantity
    }

    return line
  })
}

function resetReceiveDraft() {
  receiveLineId.value = ''
  receiveLocationText.value = ''
  receiveContainerText.value = ''
  receiveUnitQtyText.value = ''
  receivePieceCountText.value = '1'
  receiveBatchNoText.value = ''
  receiveSupplierBatchNoText.value = ''
}

function openReceiveDialog(lineId: string) {
  const line = findLineById(lineId)
  if (!line) {
    return
  }

  const lastRecord = line.lpnRecords[line.lpnRecords.length - 1]
  receiveLineId.value = lineId
  receiveLocationText.value = lastRecord?.locationCode || lastRecord?.locationId || ''
  receiveContainerText.value = lastRecord?.containerCode || lastRecord?.containerNo || ''
  receiveUnitQtyText.value = ''
  receivePieceCountText.value = '1'
  receiveBatchNoText.value = line.batchNo ?? lastRecord?.batchNo ?? ''
  receiveSupplierBatchNoText.value = lastRecord?.supplierBatchNo ?? ''
  receiveDialogVisible.value = true
}

async function confirmReceiveDialog(): Promise<boolean> {
  const line = receiveLine.value
  if (!line) {
    showFailToast('未找到当前操作明细')
    return false
  }

  const receiptId = receipt.value?.id?.trim() || ''
  if (!receiptId) {
    showFailToast('未找到采购收货单 Id，请返回创建页重试')
    return false
  }

  const detailId = line.purchaseReceiptDetailId?.trim() || ''
  if (!detailId) {
    showFailToast('未找到采购收货明细 Id，无法提交收货记录')
    return false
  }

  const location = receiveLocationText.value.trim()
  if (!location) {
    showFailToast('请填写目标库位')
    return false
  }

  const containerCode = receiveContainerText.value.trim()
  if (!containerCode) {
    showFailToast('请填写容器编码')
    return false
  }

  const unitQuantity = Number(receiveUnitQtyText.value)
  if (!Number.isFinite(unitQuantity) || unitQuantity <= 0) {
    showFailToast('请输入大于 0 的单件数量/重量')
    return false
  }

  const pieceCount = Number(receivePieceCountText.value)
  if (!Number.isInteger(pieceCount) || pieceCount <= 0) {
    showFailToast('收货件数必须是正整数')
    return false
  }

  const normalizedQuantity = normalizeQuantity(unitQuantity)
  const batchNo = receiveBatchNoText.value.trim() || null
  const supplierBatchNo = receiveSupplierBatchNoText.value.trim() || null

  const singleRecordInput = {
    receivedQuantity: normalizedQuantity,
    containerCode,
    locationCode: location,
    batchNo,
    supplierBatchNo,
  }

  receiveSubmitting.value = true
  try {
    const createdRecords: PurchaseRecordDto[] = []

    // 后端返回单条 DTO，这里按件数逐条提交，确保前端展示严格来自返回结果。
    for (let index = 0; index < pieceCount; index += 1) {
      const payload: AddPurchaseReceiptRecordsDto = {
        purchaseReceiptId: receiptId,
        detailId,
        records: [singleRecordInput],
      }

      const submitted = await addPurchaseReceiptRecords(payload)
      createdRecords.push(...submitted)
    }

    for (const record of createdRecords) {
      line.lpnRecords.push(normalizeRecord(getLineKey(line), record, line.lpnRecords.length))
    }

    if (batchNo) {
      line.batchNo = batchNo
    }

    syncLineTotal(line)
    showSuccessToast(`已生成 ${createdRecords.length} 条收货记录`)
    resetReceiveDraft()
    return true
  } catch (error) {
    console.error('提交收货记录失败:', error)
    showFailToast('提交收货记录失败，请稍后重试')
    return false
  } finally {
    receiveSubmitting.value = false
  }
}

async function handleReceiveDialogBeforeClose(action: string): Promise<boolean> {
  if (action === 'confirm') {
    return await confirmReceiveDialog()
  }

  if (receiveSubmitting.value) {
    return false
  }

  resetReceiveDraft()
  return true
}

function openBatchEditor(lineId: string) {
  const line = findLineById(lineId)
  if (!line) {
    return
  }

  batchEditLineId.value = lineId
  editingBatchText.value = line.batchNo ?? ''
  batchEditorVisible.value = true
}

function confirmBatchEditor() {
  const line = findLineById(batchEditLineId.value)
  if (!line) {
    batchEditorVisible.value = false
    return
  }

  line.batchNo = editingBatchText.value.trim() || null
  batchEditorVisible.value = false
}

function openLpnDrawer(lineId: string) {
  const line = findLineById(lineId)
  if (!line) {
    return
  }

  lpnDrawerLineId.value = lineId
  lpnDrawerVisible.value = true
}

function closeLpnDrawer() {
  lpnDrawerVisible.value = false
  lpnDrawerLineId.value = ''
}

function backToCreate() {
  router.replace({ name: 'PurchaseReceiptCreate' })
}

async function finishReceive() {
  const receiptId = receipt.value?.id?.trim() || resolveReceiptId()
  if (!receiptId) {
    showFailToast('未找到采购收货单 Id，请返回创建页重试')
    return
  }

  finishingReceive.value = true
  try {
    await approveAndExecutePurchaseReceipt(receiptId)
    showSuccessToast('本次收货录入已完成')
    router.replace('/home')
  } catch (error) {
    console.error('完成收货失败:', error)
    showFailToast('完成收货失败，请稍后重试')
  } finally {
    finishingReceive.value = false
  }
}

function loadReceiptFromCache() {
  const receiptId = resolveReceiptId()
  if (!receiptId) {
    loadErrorText.value = '缺少收货单参数，请返回重新创建。'
    showFailToast(loadErrorText.value)
    return
  }

  const cachedReceipt = sessionStorage.getItem(getCacheKey(receiptId))
  if (!cachedReceipt) {
    loadErrorText.value = '未找到收货单缓存，请返回扫描 PO/ASN 重新创建。'
    showFailToast(loadErrorText.value)
    return
  }

  const parsedReceipt = parseCachedReceipt(cachedReceipt)
  if (!parsedReceipt) {
    loadErrorText.value = '收货单缓存数据损坏，请返回重新创建。'
    showFailToast(loadErrorText.value)
    return
  }

  receipt.value = parsedReceipt
  entryLines.value = toEntryLines(parsedReceipt)
}

onMounted(() => {
  loadReceiptFromCache()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <main v-if="hasReceipt" class="flex-1 overflow-y-auto pb-32">
      <section class="bg-white p-4 border-b border-gray-100">
        <div class="text-xs text-slate-500">采购收货单</div>
        <div class="mt-1 text-lg font-black text-slate-900 break-all">{{ receiptNo }}</div>
        <div class="mt-2 text-sm text-slate-600">
          来源: {{ sourceDocType }} / {{ sourceDocNo }}
        </div>
        <div class="mt-1 text-sm text-slate-600 break-words">
          供方: {{ supplierText }}
        </div>
      </section>

      <section class="bg-gray-50 p-4 text-sm text-gray-700 border-y border-gray-200">
        <div class="text-xs text-slate-500">
          已收行数 {{ receivedLineCount }} / {{ entryLines.length }}，累计实收 {{ formatQuantity(totalReceivedNow) }} / 计划 {{ formatQuantity(totalExpected) }}
        </div>
      </section>

      <van-empty
        v-if="entryLines.length === 0"
        description="当前收货单没有可操作明细"
        class="mt-12"
      />

      <article
        v-for="line in entryLines"
        :key="line.sourceDetailId ?? line.productId"
        class="bg-white m-3 p-4 rounded-lg shadow-sm"
      >
        <div class="text-base text-gray-800 font-semibold break-all">
          {{ toDisplaySku(line) }}
          <span class="ml-2">{{ line.productName || '--' }}</span>
        </div>
        <div class="text-sm text-gray-600 mt-1 break-all">
          规格: {{ displaySpec(line) }}
        </div>

        <div class="border-b border-gray-100 my-4"></div>

        <button
          type="button"
          class="w-full py-6 rounded bg-gray-50 text-center active:bg-gray-200 transition-colors"
          @click="openReceiveDialog(getLineKey(line))"
        >
          <div class="text-4xl font-black leading-none" :class="progressClass(line)">
            {{ formatQuantity(line.totalReceivedQuantity) }} / {{ formatQuantity(line.expectedQuantity) }}
            <span v-if="displayUom(line)"> {{ displayUom(line) }}</span>
          </div>
        </button>

        <div class="border-b border-gray-100 my-4"></div>

        <div class="flex justify-between items-center text-sm gap-2">
          <button
            type="button"
            class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded break-all"
            @click="openBatchEditor(getLineKey(line))"
          >
            批次: {{ line.batchNo || '点击录入' }}
          </button>

          <button
            type="button"
            class="text-xs text-sky-500 px-1 py-1 active:text-slate-500"
            @click="openLpnDrawer(getLineKey(line))"
          >
            查看物理明细({{ line.lpnRecords.length }}件) >
          </button>
        </div>
      </article>
    </main>

    <main v-else class="flex-1 overflow-y-auto">
      <van-empty
        image="error"
        :description="loadErrorText || '收货单未找到'"
        class="mt-20"
      >
        <template #bottom>
          <van-button type="primary" @click="backToCreate">返回创建页</van-button>
        </template>
      </van-empty>
    </main>

    <footer class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 pb-safe z-30">
      <div class="flex gap-2">
        <van-button
          size="large"
          plain
          class="!flex-1"
          @click="backToCreate"
        >
          新建收货
        </van-button>
        <van-button
          size="large"
          type="primary"
          class="!flex-[2]"
          :disabled="!hasReceipt || finishingReceive"
          :loading="finishingReceive"
          @click="finishReceive"
        >
          完成收货
        </van-button>
      </div>
    </footer>

    <van-dialog
      v-model:show="receiveDialogVisible"
      title="录入收货明细"
      show-cancel-button
      confirm-button-text="确认并生成"
      cancel-button-text="取消"
      :confirm-button-loading="receiveSubmitting"
      :before-close="handleReceiveDialogBeforeClose"
    >
      <div class="p-4 space-y-3">
        <van-field
          v-model="receiveLocationText"
          label="目标库位"
          clearable
          placeholder="请输入目标库位"
          input-align="right"
          class="!bg-gray-50 !rounded-lg dialog-input"
        />
        <van-field
          v-model="receiveContainerText"
          label="容器编码"
          clearable
          placeholder="请输入容器编码"
          input-align="right"
          class="!bg-gray-50 !rounded-lg dialog-input"
        />
        <van-field
          v-model="receiveBatchNoText"
          label="批次号"
          clearable
          placeholder="请输入批次号（选填）"
          input-align="right"
          class="!bg-gray-50 !rounded-lg dialog-input"
        />
        <van-field
          v-model="receiveSupplierBatchNoText"
          label="供应商批次号"
          clearable
          placeholder="请输入供应商批次号（选填）"
          input-align="right"
          class="!bg-gray-50 !rounded-lg dialog-input"
        />

        <div class="border-t border-dashed border-gray-200"></div>

        <div class="flex items-center gap-2">
          <van-field
            v-model="receiveUnitQtyText"
            label="单件数量/重量"
            type="number"
            clearable
            placeholder="请输入单件数量"
            input-align="right"
            class="flex-1 !bg-gray-50 !rounded-lg dialog-input"
          />
          <div class="text-sm text-slate-600 shrink-0">{{ displayUom(receiveLine || { uom: '' }) }}</div>
        </div>

        <van-field
          v-model="receivePieceCountText"
          label="收货件数"
          type="digit"
          clearable
          placeholder="默认 1"
          input-align="right"
          class="!bg-gray-50 !rounded-lg dialog-input"
        />
      </div>
    </van-dialog>

    <van-popup
      v-model:show="lpnDrawerVisible"
      position="bottom"
      round
      destroy-on-close
      :close-on-click-overlay="true"
      :style="{ height: '70%' }"
      @click-overlay="closeLpnDrawer"
    >
      <div class="h-full flex flex-col bg-white">
        <div class="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div class="text-base font-semibold text-slate-800">已收货物理明细 (共{{ currentLpnRecords.length }}件)</div>
          <button type="button" class="p-1" @click="closeLpnDrawer">
            <van-icon name="cross" size="20" color="#64748b" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <van-empty v-if="currentLpnRecords.length === 0" description="当前 SKU 暂无物理明细" />

          <article
            v-for="(record, index) in currentLpnRecords"
            :key="record.id"
            class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3"
          >
            <div class="text-sm font-semibold text-slate-700">序号 {{ index + 1 }}</div>
            <div class="mt-1 text-xs text-slate-500 break-all">记录 Id: {{ record.id }}</div>
            <div class="mt-1 text-sm text-slate-700 break-all">
              容器编码: {{ record.containerCode || record.containerNo || '--' }}
            </div>
            <div class="mt-1 text-sm text-slate-700 break-all">
              库位编码: {{ record.locationCode || record.locationId || '--' }}
            </div>
            <div class="mt-1 text-sm text-slate-700 break-all">
              实收数量: <span class="font-semibold text-slate-900">{{ formatQuantity(record.quantity) }}</span>
              <span v-if="drawerUom"> {{ drawerUom }}</span>
            </div>
            <div class="mt-1 text-sm text-slate-700 break-all">
              批次号: {{ record.batchNo || '--' }}
            </div>
            <div class="mt-1 text-sm text-slate-700 break-all">
              供应商批次号: {{ record.supplierBatchNo || '--' }}
            </div>
          </article>
        </div>
      </div>
    </van-popup>

    <van-dialog
      v-model:show="batchEditorVisible"
      title="录入批次"
      show-cancel-button
      confirm-button-text="保存"
      cancel-button-text="取消"
      @confirm="confirmBatchEditor"
    >
      <div class="p-4">
        <van-field
          v-model="editingBatchText"
          clearable
          placeholder="请输入批次号"
          class="!bg-gray-50 !rounded-lg dialog-input"
        />
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
:deep(.dialog-input .van-field__control) {
  font-size: 1.05rem;
  font-weight: 600;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
</style>
