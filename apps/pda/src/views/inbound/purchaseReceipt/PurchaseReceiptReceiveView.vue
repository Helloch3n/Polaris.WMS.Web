<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { showFailToast, showSuccessToast } from 'vant'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { addPurchaseReceiptRecords, approveAndExecutePurchaseReceipt, getPurchaseReceiptDetail, startPurchaseReceipt } from '@/api/inbound/purchaseReceipt'
import { getLocationByCode } from '@/api/wms/location'
import { useAuthStore } from '@/stores/auth'
import { PurchaseReceiptStatus } from '@/types/purchaseReceipt'
import type {
  AddPurchaseReceiptRecordsDto,
  PurchaseReceiptDraftSession,
  PurchaseReceiptDto,
  PurchaseReceiptEntryLine,
  PurchaseReceiptLpnRecord,
  PurchaseRecordDto,
} from '@/types/purchaseReceipt'

const RECEIPT_CACHE_PREFIX = 'pda.purchase-receipt.active.'
const RECEIPT_DRAFT_PREFIX = 'pda.purchase-receipt.draft.'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const receipt = ref<PurchaseReceiptDto | null>(null)
const draftSession = ref<PurchaseReceiptDraftSession | null>(null)
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
const hasWorkContext = computed(() => hasReceipt.value || Boolean(draftSession.value))
const isCompleted = computed(() => receipt.value?.status === PurchaseReceiptStatus.Completed)
const canFinish = computed(() => receipt.value?.status === PurchaseReceiptStatus.Receiving)
const receiptStatusLabel = computed(() => {
  if (receipt.value?.status === PurchaseReceiptStatus.Draft) return '草稿'
  if (receipt.value?.status === PurchaseReceiptStatus.Receiving) return '收货中'
  if (receipt.value?.status === PurchaseReceiptStatus.Completed) return '已完成'
  return ''
})

const receiptNo = computed(() => receipt.value?.receiptNo || '--')
const sourceDocType = computed(() => receipt.value?.sourceDocType || draftSession.value?.sourceDoc.sourceDocType || '--')
const sourceDocNo = computed(() => receipt.value?.sourceDocNo || draftSession.value?.sourceDoc.sourceDocNo || '--')

const supplierText = computed(() => {
  if (receipt.value) {
    return receipt.value.supplierName?.trim() || receipt.value.supplierId || '--'
  }

  const source = draftSession.value?.sourceDoc
  if (!source) return '--'
  return source.supplierName?.trim() || source.supplierCode?.trim() || source.supplierId || '--'
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
const receiveLineRemainingQuantity = computed(() => {
  const line = receiveLine.value
  if (!line) {
    return 0
  }

  return Math.max(0, normalizeQuantity(line.expectedQuantity) - normalizeQuantity(line.totalReceivedQuantity))
})

function resolveReceiptId(): string {
  const rawId = route.params.receiptId
  return typeof rawId === 'string' ? rawId.trim() : ''
}

function resolveDraftSessionId(): string {
  const rawId = route.params.draftSessionId
  return typeof rawId === 'string' ? rawId.trim() : ''
}

function getCacheKey(receiptId: string): string {
  return `${RECEIPT_CACHE_PREFIX}${receiptId}`
}

function getDraftCacheKey(draftSessionId: string): string {
  return `${RECEIPT_DRAFT_PREFIX}${draftSessionId}`
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

    if (parsed.status === undefined || parsed.status === null) {
      parsed.status = PurchaseReceiptStatus.Receiving
    }

    return parsed as PurchaseReceiptDto
  } catch {
    return null
  }
}

async function establishWarehouseContext(receiptDto: PurchaseReceiptDto): Promise<boolean> {
  if (receiptDto.warehouseId?.trim()) {
    authStore.setCurrentWarehouseId(receiptDto.warehouseId)
    return true
  }

  const locationCode = receiptDto.details
    .flatMap(detail => detail.records ?? [])
    .map(record => record.locationCode?.trim())
    .find(Boolean)
  if (!locationCode) return false

  const location = await getLocationByCode(locationCode)
  if (!location) return false
  receiptDto.warehouseId = location.warehouseId
  receiptDto.warehouseCode = location.warehouseCode ?? ''
  receiptDto.warehouseName = location.warehouseName ?? ''
  authStore.setCurrentWarehouseId(location.warehouseId)
  return true
}

function parseDraftSession(raw: string): PurchaseReceiptDraftSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PurchaseReceiptDraftSession>
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.draftSessionId || !parsed.requestId || !parsed.receipt || !parsed.sourceDoc) return null
    if (!Array.isArray(parsed.receipt.details) || !Array.isArray(parsed.sourceDoc.details)) return null
    return parsed as PurchaseReceiptDraftSession
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
    const sourceDetailId = detail.sourceAsnLineId ?? detail.sourcePoLineId ?? detail.sourceDetailId ?? null
    const lineKey = sourceDetailId ?? detail.productId
    const normalizedRecords = (detail.records ?? [])
      .map((record, index) => normalizeRecord(lineKey, record, index))
      .filter((record) => normalizeQuantity(record.quantity) > 0)

    const line: PurchaseReceiptEntryLine = {
      purchaseReceiptDetailId: detail.id,
      sourceDetailId,
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

function toDraftEntryLines(draft: PurchaseReceiptDraftSession): PurchaseReceiptEntryLine[] {
  return draft.receipt.details.map((detail) => {
    const sourceDetailId = detail.sourceAsnLineId ?? detail.sourcePoLineId ?? detail.sourceDetailId ?? null
    const source = draft.sourceDoc.details.find(item => item.sourceDetailId === sourceDetailId)
    return {
      purchaseReceiptDetailId: null,
      sourceDetailId,
      productId: detail.productId,
      skuCode: source?.skuCode ?? detail.productCode,
      productCode: detail.productCode,
      productName: detail.productName,
      barcode: source?.barcode ?? null,
      uom: source?.uom ?? null,
      batchNo: detail.batchNo ?? null,
      expectedQuantity: normalizeQuantity(detail.expectedQuantity),
      alreadyReceivedQuantity: 0,
      totalReceivedQuantity: 0,
      lpnRecords: [],
    }
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
  if (isCompleted.value) {
    showFailToast('该采购收货单已完成，不能继续收货')
    return
  }

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
  let line = receiveLine.value
  if (!line) {
    showFailToast('未找到当前操作明细')
    return false
  }

  let receiptId = receipt.value?.id?.trim() || ''
  if (!draftSession.value && !receiptId) {
    showFailToast('未找到采购收货单 Id，请返回创建页重试')
    return false
  }

  let detailId = line.purchaseReceiptDetailId?.trim() || ''
  if (!draftSession.value && !detailId) {
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
  const requestedQuantity = normalizeQuantity(normalizedQuantity * pieceCount)

  const remainingQuantity = Math.max(
    0,
    normalizeQuantity(line.expectedQuantity) - normalizeQuantity(line.totalReceivedQuantity),
  )
  if (remainingQuantity > 0 && requestedQuantity > remainingQuantity) {
    showFailToast(`超出可收数量，当前最多还能收 ${formatQuantity(remainingQuantity)}`)
    return false
  }

  const singleRecordInput = {
    receivedQuantity: normalizedQuantity,
    containerCode,
    locationCode: location,
    batchNo,
    supplierBatchNo,
  }

  receiveSubmitting.value = true
  try {
    const resolvedLocation = await getLocationByCode(location)
    if (!resolvedLocation) {
      showFailToast('目标库位不存在')
      return false
    }
    if (receipt.value?.warehouseId && receipt.value.warehouseId !== resolvedLocation.warehouseId) {
      showFailToast('目标库位不属于当前收货单仓库')
      return false
    }
    if (draftSession.value) {
      draftSession.value.receipt.warehouseId = resolvedLocation.warehouseId
      sessionStorage.setItem(
        getDraftCacheKey(draftSession.value.draftSessionId),
        JSON.stringify(draftSession.value),
      )
    }
    authStore.setCurrentWarehouseId(resolvedLocation.warehouseId)

    const createdRecords: PurchaseRecordDto[] = []
    let createdRecordCount = 0
    let firstPendingIndex = 0

    if (draftSession.value) {
      const draft = draftSession.value
      const sourceDetailId = line.sourceDetailId?.trim() || ''
      if (!sourceDetailId) {
        showFailToast('当前明细缺少来源明细 Id，无法开始收货')
        return false
      }

      const startedReceipt = await startPurchaseReceipt({
        requestId: draft.requestId,
        receipt: draft.receipt,
        sourceAsnLineId: draft.sourceDoc.sourceDocType === 'ASN' ? sourceDetailId : null,
        sourcePoLineId: draft.sourceDoc.sourceDocType === 'PO' ? sourceDetailId : null,
        record: singleRecordInput,
      })

      receipt.value = startedReceipt
      entryLines.value = toEntryLines(startedReceipt)
      receiptId = startedReceipt.id
      line = entryLines.value.find(item => item.sourceDetailId === sourceDetailId)
      detailId = line?.purchaseReceiptDetailId?.trim() || ''
      if (!line || !detailId) {
        throw new Error('首次收货成功但未找到对应收货明细')
      }

      sessionStorage.setItem(getCacheKey(receiptId), JSON.stringify(startedReceipt))
      sessionStorage.removeItem(getDraftCacheKey(draft.draftSessionId))
      draftSession.value = null
      firstPendingIndex = 1
      createdRecordCount = 1

      await router.replace({
        name: 'PurchaseReceiptReceive',
        params: { receiptId },
      })
    }

    // 后端返回单条 DTO，这里按件数逐条提交，确保前端展示严格来自返回结果。
    for (let index = firstPendingIndex; index < pieceCount; index += 1) {
      const payload: AddPurchaseReceiptRecordsDto = {
        purchaseReceiptId: receiptId,
        detailId,
        records: [singleRecordInput],
      }

      const submitted = await addPurchaseReceiptRecords(payload)
      createdRecords.push(...submitted)
      createdRecordCount += submitted.length
    }

    for (const record of createdRecords) {
      line.lpnRecords.push(normalizeRecord(getLineKey(line), record, line.lpnRecords.length))
    }

    if (batchNo) {
      line.batchNo = batchNo
    }

    syncLineTotal(line)
    const persistedDetail = receipt.value?.details.find(item => item.id === detailId)
    if (persistedDetail && createdRecords.length > 0) {
      persistedDetail.records.push(...createdRecords)
      persistedDetail.receivedQuantity = normalizeQuantity(line.totalReceivedQuantity)
    }
    if (receipt.value) {
      if (createdRecordCount > 0) {
        receipt.value.status = PurchaseReceiptStatus.Receiving
      }
      sessionStorage.setItem(getCacheKey(receipt.value.id), JSON.stringify(receipt.value))
    }

    showSuccessToast(`已生成 ${createdRecordCount} 条收货记录`)
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

  if (line.lpnRecords.length > 0) {
    showFailToast('该明细已收货，批次不能修改')
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

  const draft = draftSession.value
  if (draft) {
    const draftDetail = draft.receipt.details.find(
      detail => detail.sourceAsnLineId === line.sourceDetailId
        || detail.sourcePoLineId === line.sourceDetailId,
    )
    if (draftDetail) {
      draftDetail.batchNo = line.batchNo
      sessionStorage.setItem(getDraftCacheKey(draft.draftSessionId), JSON.stringify(draft))
    }
  }

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
  const draftSessionId = draftSession.value?.draftSessionId || resolveDraftSessionId()
  if (draftSessionId) {
    sessionStorage.removeItem(getDraftCacheKey(draftSessionId))
  }
  router.replace({ name: 'PurchaseReceiptCreate' })
}

async function finishReceive() {
  if (isCompleted.value) {
    showFailToast('该采购收货单已完成')
    return
  }

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

async function loadWorkContext() {
  const draftSessionId = resolveDraftSessionId()
  if (draftSessionId) {
    const cachedDraft = sessionStorage.getItem(getDraftCacheKey(draftSessionId))
    const parsedDraft = cachedDraft ? parseDraftSession(cachedDraft) : null
    if (!parsedDraft || parsedDraft.draftSessionId !== draftSessionId) {
      loadErrorText.value = '收货临时会话已失效，请返回重新扫描。'
      showFailToast(loadErrorText.value)
      return
    }

    draftSession.value = parsedDraft
    receipt.value = null
    entryLines.value = toDraftEntryLines(parsedDraft)
    loadErrorText.value = ''
    return
  }

  const receiptId = resolveReceiptId()
  if (!receiptId) {
    loadErrorText.value = '缺少收货单参数，请返回重新创建。'
    showFailToast(loadErrorText.value)
    return
  }

  const cachedReceipt = sessionStorage.getItem(getCacheKey(receiptId))
  if (cachedReceipt) {
    const parsedReceipt = parseCachedReceipt(cachedReceipt)
    if (parsedReceipt) {
      if (await establishWarehouseContext(parsedReceipt)) {
        sessionStorage.setItem(getCacheKey(receiptId), JSON.stringify(parsedReceipt))
        receipt.value = parsedReceipt
        entryLines.value = toEntryLines(parsedReceipt)
        loadErrorText.value = ''
        return
      }
    }
  }

  try {
    const fetchedReceipt = await getPurchaseReceiptDetail(receiptId)
    await establishWarehouseContext(fetchedReceipt)
    sessionStorage.setItem(getCacheKey(receiptId), JSON.stringify(fetchedReceipt))
    receipt.value = fetchedReceipt
    entryLines.value = toEntryLines(fetchedReceipt)
    loadErrorText.value = ''
  } catch (error) {
    console.error('恢复采购收货单失败:', error)
    loadErrorText.value = '未找到收货单缓存，且无法从服务器恢复，请返回扫描 PO/ASN 重新创建。'
    showFailToast(loadErrorText.value)
  }
}

onMounted(() => {
  void loadWorkContext()
})

onBeforeRouteLeave(() => {
  const activeDraft = draftSession.value
  if (activeDraft) {
    sessionStorage.removeItem(getDraftCacheKey(activeDraft.draftSessionId))
  }
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <main v-if="hasWorkContext" class="flex-1 overflow-y-auto pb-32">
      <section class="bg-white p-4 border-b border-gray-100">
        <template v-if="hasReceipt">
          <div class="text-xs text-slate-500">采购收货单</div>
          <div class="mt-1 text-lg font-black text-slate-900 break-all">{{ receiptNo }}</div>
        </template>
        <div :class="hasReceipt ? 'mt-2' : ''" class="text-sm text-slate-600">
          来源: {{ sourceDocType }} / {{ sourceDocNo }}
        </div>
        <div class="mt-1 text-sm text-slate-600 break-words">
          供方: {{ supplierText }}
        </div>
        <div v-if="hasReceipt" class="mt-1 text-sm" :class="isCompleted ? 'text-green-600' : 'text-sky-600'">
          状态: {{ receiptStatusLabel }}
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
          :disabled="isCompleted"
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
            class="px-3 py-1.5 rounded break-all disabled:bg-gray-100 disabled:text-gray-400"
            :class="line.lpnRecords.length ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'"
            :disabled="isCompleted || line.lpnRecords.length > 0"
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
          :disabled="!canFinish || finishingReceive"
          :loading="finishingReceive"
          @click="finishReceive"
        >
          {{ isCompleted ? '已完成' : '完成收货' }}
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
        <div class="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-700">
          本行剩余可收: <span class="font-bold">{{ formatQuantity(receiveLineRemainingQuantity) }}</span>
          <span v-if="displayUom(receiveLine || { uom: '' })"> {{ displayUom(receiveLine || { uom: '' }) }}</span>
        </div>

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
          :readonly="Boolean(receiveLine?.lpnRecords.length)"
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
