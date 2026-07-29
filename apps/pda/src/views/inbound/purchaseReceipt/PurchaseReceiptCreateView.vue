<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { FieldInstance } from 'vant'
import { showFailToast, showSuccessToast } from 'vant'
import { useRouter } from 'vue-router'
import {
  identifySourceDocByScan,
} from '@/api/inbound/purchaseReceipt'
import type {
  CreatePurchaseReceiptDetailDto,
  CreatePurchaseReceiptDto,
  PurchaseReceiptDraftSession,
  PurchaseReceiptSourceDetail,
  PurchaseReceiptSourceDocument,
} from '@/types/purchaseReceipt'

const RECEIPT_DRAFT_PREFIX = 'pda.purchase-receipt.draft.'

const router = useRouter()
const sourceDocInputRef = ref<FieldInstance>()

const sourceDocScanText = ref('')
const remark = ref('')

const sourceDoc = ref<PurchaseReceiptSourceDocument | null>(null)
const sourceDocLoading = ref(false)
const creating = ref(false)

const sourceDetails = computed(() => sourceDoc.value?.details ?? [])

const supplierText = computed(() => {
  if (!sourceDoc.value) {
    return '--'
  }

  const segments = [sourceDoc.value.supplierCode, sourceDoc.value.supplierName].filter(Boolean)
  if (segments.length > 0) {
    return segments.join(' / ')
  }

  return sourceDoc.value.supplierId ?? '--'
})

const totalExpectedQuantity = computed(() =>
  sourceDetails.value.reduce((sum, detail) => sum + normalizeQuantity(detail.expectedQuantity), 0),
)

const validDetailCount = computed(() =>
  sourceDetails.value.filter((detail) => normalizeQuantity(detail.expectedQuantity) > 0).length,
)

const canStartReceive = computed(() => {
  return !creating.value && Boolean(sourceDoc.value) && sourceDetails.value.length > 0
})

function focusSourceDocInput() {
  nextTick(() => {
    sourceDocInputRef.value?.focus()
  })
}

function normalizeQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Number(value.toFixed(3))
}

function formatQuantity(value: number): string {
  return normalizeQuantity(value).toString()
}

function toDisplaySku(detail: PurchaseReceiptSourceDetail): string {
  return detail.skuCode ?? detail.productCode ?? detail.productId
}

function displaySpec(detail: PurchaseReceiptSourceDetail): string {
  return detail.productCode || detail.skuCode || '--'
}

function displayUom(detail: PurchaseReceiptSourceDetail): string {
  return detail.uom?.trim() || ''
}

function buildCreateDetails(doc: PurchaseReceiptSourceDocument): CreatePurchaseReceiptDetailDto[] {
  return doc.details.reduce<CreatePurchaseReceiptDetailDto[]>((details, detail) => {
    const expectedQuantity = normalizeQuantity(detail.expectedQuantity)
    if (expectedQuantity <= 0) {
      return details
    }

    const createDetail: CreatePurchaseReceiptDetailDto = {
      productId: detail.productId,
      productName: detail.productName?.trim() || detail.skuCode?.trim() || detail.productCode?.trim() || detail.productId,
      productCode: detail.productCode?.trim() || detail.skuCode?.trim() || detail.productId,
      expectedQuantity,
      batchNo: detail.batchNo?.trim() || null,
    }

    // 根据来源单据类型设置对应的来源明细字段
    if (doc.sourceDocType === 'ASN') {
      createDetail.sourceAsnLineId = detail.sourceDetailId ?? null
    } else if (doc.sourceDocType === 'PO') {
      createDetail.sourcePoLineId = detail.sourceDetailId ?? null
    } 

    details.push(createDetail)

    return details
  }, [])
}

function createClientId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function resetSourceDoc() {
  sourceDocScanText.value = ''
  remark.value = ''
  sourceDoc.value = null
  focusSourceDocInput()
}

async function handleSourceDocScan() {
  const docNo = sourceDocScanText.value.trim()
  if (!docNo) {
    showFailToast('请先扫描或输入 ASN/PO 单号')
    return
  }

  sourceDocLoading.value = true
  try {
    const resolved = await identifySourceDocByScan(docNo)
    if (!resolved) {
      showFailToast('未识别到 ASN 或 PO，请确认单号')
      sourceDoc.value = null
      return
    }

    sourceDoc.value = resolved
    showSuccessToast(`已识别 ${resolved.sourceDocType} 单据`)
  } catch (error) {
    console.error('识别来源单据失败:', error)
    showFailToast('单据识别失败，请稍后重试')
  } finally {
    sourceDocLoading.value = false
  }
}

async function startReceive() {
  if (!sourceDoc.value) {
    showFailToast('请先识别来源单据')
    return
  }

  const details = buildCreateDetails(sourceDoc.value)
  if (details.length === 0) {
    showFailToast('来源单据明细的计划数量均为 0，无法创建采购收货单')
    return
  }

  const payload: CreatePurchaseReceiptDto = {
    sourceDocType: sourceDoc.value.sourceDocType,
    sourceDocNo: sourceDoc.value.sourceDocNo,
    supplierId: sourceDoc.value.supplierId ?? null,
    supplierName: sourceDoc.value.supplierName ?? null,
    remark: remark.value.trim() || null,
    details,
  }

  creating.value = true
  try {
    const draftSessionId = createClientId()
    const draft: PurchaseReceiptDraftSession = {
      draftSessionId,
      requestId: createClientId(),
      receipt: payload,
      sourceDoc: sourceDoc.value,
    }
    sessionStorage.setItem(`${RECEIPT_DRAFT_PREFIX}${draftSessionId}`, JSON.stringify(draft))
    showSuccessToast('已进入收货')

    await router.push({
      name: 'PurchaseReceiptReceiveDraft',
      params: { draftSessionId },
    })
  } catch (error) {
    console.error('创建收货临时会话失败:', error)
    showFailToast('无法进入收货，请稍后重试')
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  focusSourceDocInput()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <main class="flex-1 overflow-y-auto pb-32">
      <section class="bg-white p-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <van-field
            ref="sourceDocInputRef"
            v-model="sourceDocScanText"
            clearable
            placeholder="扫码或输入 ASN/PO 单号"
            class="flex-1 !bg-gray-100 !rounded-lg"
            @keyup.enter="handleSourceDocScan"
          >
            <template #left-icon>
              <van-icon name="scan" color="#64748b" />
            </template>
          </van-field>
          <van-button type="primary" :loading="sourceDocLoading" @click="handleSourceDocScan">识别</van-button>
        </div>
      </section>

      <section v-if="sourceDoc" class="bg-gray-50 p-4 text-sm text-gray-700 border-y border-gray-200">
        <div class="font-semibold">
          来源类型:
          <span class="ml-1 text-gray-900">{{ sourceDoc.sourceDocType }}</span>
        </div>
        <div class="mt-2 font-semibold">
          单据号:
          <span class="ml-1 font-mono text-gray-900 break-all">{{ sourceDoc.sourceDocNo }}</span>
        </div>
        <div class="mt-2 leading-5">
          供方:
          <span class="ml-1 text-gray-900 whitespace-normal break-words">{{ supplierText }}</span>
        </div>
        <div class="mt-2 text-xs text-slate-500">
          明细 {{ sourceDetails.length }} 行，其中可收货 {{ validDetailCount }} 行，计划收货 {{ formatQuantity(totalExpectedQuantity) }}
        </div>
      </section>

      <van-empty
        v-if="sourceDoc && sourceDetails.length === 0"
        description="当前单据没有可收货明细"
        class="mt-12"
      />

      <article
        v-for="detail in sourceDetails"
        :key="detail.sourceDetailId ?? detail.productId"
        class="bg-white m-3 p-4 rounded-lg shadow-sm"
      >
        <div class="text-base text-gray-800 font-semibold break-all">
          {{ toDisplaySku(detail) }}
          <span class="ml-2">{{ detail.productName || '--' }}</span>
        </div>

        <div class="text-sm text-gray-600 mt-1 break-all">
          规格: {{ displaySpec(detail) }}
        </div>

        <div class="mt-2 flex items-center justify-between text-sm text-slate-600 gap-2">
          <div>
            计划收货:
            <span class="ml-1 font-semibold text-slate-900">{{ formatQuantity(detail.expectedQuantity) }}</span>
            <span v-if="displayUom(detail)"> {{ displayUom(detail) }}</span>
          </div>
          <div>
            已收:
            <span class="ml-1 text-slate-800">{{ formatQuantity(detail.alreadyReceivedQuantity) }}</span>
          </div>
        </div>

        <div class="mt-2 text-xs text-slate-500 break-all">
          批次: {{ detail.batchNo || '--' }}
        </div>
      </article>

      <section v-if="sourceDoc" class="bg-white m-3 p-4 rounded-lg shadow-sm">
        <van-field
          v-model="remark"
          clearable
          placeholder="备注（可选）"
          class="!bg-gray-50 !rounded-lg"
        />
      </section>
    </main>

    <footer class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 pb-safe z-30">
      <div v-if="sourceDoc" class="text-xs text-slate-500 mb-2">
        首条收货记录确认后将自动生成采购收货单
      </div>
      <div class="flex gap-2">
        <van-button
          size="large"
          plain
          class="!flex-1"
          @click="resetSourceDoc"
        >
          重置
        </van-button>
        <van-button
          size="large"
          type="primary"
          class="!flex-[2]"
          :disabled="!canStartReceive"
          :loading="creating"
          @click="startReceive"
        >
          开始收货
        </van-button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
</style>
