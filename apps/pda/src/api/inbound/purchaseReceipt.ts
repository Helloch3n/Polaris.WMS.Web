import { http } from '@/utils/http'
import type {
  AddPurchaseReceiptRecordsDto,
  CreatePurchaseReceiptDto,
  PurchaseRecordDto,
  PurchaseReceiptDto,
  PurchaseReceiptSourceDetail,
  PurchaseReceiptSourceDocument,
  PurchaseSourceDocType,
} from '@/types/purchaseReceipt'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function unwrapSingleDoc(payload: unknown): UnknownRecord | null {
  if (!isRecord(payload)) {
    return null
  }

  if (isRecord(payload.result)) {
    return payload.result
  }

  if (isRecord(payload.data)) {
    return payload.data
  }

  return payload
}

function unwrapPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload
  }

  if ('result' in payload) {
    return payload.result
  }

  if ('data' in payload) {
    return payload.data
  }

  return payload
}

function pickString(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = record[key]
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim()
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return String(raw)
    }
  }
  return undefined
}

function pickNumber(record: UnknownRecord, keys: string[]): number {
  for (const key of keys) {
    const raw = record[key]
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw
    }
    if (typeof raw === 'string' && raw.trim()) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }
  return 0
}

function toObjectArray(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is UnknownRecord => isRecord(item))
}

function extractDetails(doc: UnknownRecord): UnknownRecord[] {
  const detailKeys = [
    'details',
    'detailList',
    'detailDtos',
    'asnDetails',
    'asnDetailList',
    'purchaseOrderDetails',
    'purchaseOrderDetailList',
    'purchaseDetails',
    'lines',
    'lineItems',
    'items',
    'records',
  ]

  for (const key of detailKeys) {
    const details = doc[key]
    if (Array.isArray(details)) {
      return toObjectArray(details)
    }
  }

  return []
}

function normalizeDetail(detail: UnknownRecord): PurchaseReceiptSourceDetail | null {
  const productId = pickString(detail, ['productId', 'skuId', 'materialId', 'itemId', 'goodsId'])
  if (!productId) {
    return null
  }

  return {
    sourceDetailId: pickString(detail, ['id', 'detailId', 'asnDetailId', 'purchaseOrderDetailId']) ?? null,
    productId,
    skuCode: pickString(detail, ['skuCode', 'productCode', 'materialCode']) ?? null,
    productCode: pickString(detail, ['productCode', 'materialCode', 'itemCode']) ?? null,
    productName: pickString(detail, ['productName', 'skuName', 'materialName', 'itemName']) ?? null,
    barcode: pickString(detail, ['barcode', 'barCode', 'productBarcode', 'skuBarcode']) ?? null,
    uom: pickString(detail, ['uom', 'uoM', 'uomName', 'unit', 'unitCode', 'unitName']) ?? null,
    expectedQuantity: Math.max(
      0,
      pickNumber(detail, [
        'expectedQuantity',
        'expectedQty',
        'expectQuantity',
        'planQuantity',
        'plannedQty',
        'planQty',
        'quantity',
        'qty',
        'orderQuantity',
        'orderedQuantity',
        'quantityOrdered',
        'sourceQuantity',
        'sourceQty',
        'asnQuantity',
        'asnQty',
        'poQuantity',
        'poQty',
        'shouldReceiveQuantity',
        'shouldReceiveQty',
        'pendingQuantity',
      ]),
    ),
    alreadyReceivedQuantity: Math.max(
      0,
      pickNumber(detail, ['alreadyReceivedQuantity', 'receivedQuantity', 'receivedQty', 'actualReceivedQuantity']),
    ),
  }
}

function normalizeSourceDoc(doc: UnknownRecord, sourceDocType: PurchaseSourceDocType): PurchaseReceiptSourceDocument | null {
  const sourceDocNoKeys =
    sourceDocType === 'ASN'
      ? ['asnNo', 'sourceDocNo', 'docNo', 'orderNo', 'no']
      : ['purchaseOrderNo', 'poNo', 'sourceDocNo', 'docNo', 'orderNo', 'no']

  const sourceDocNo = pickString(doc, sourceDocNoKeys)
  if (!sourceDocNo) {
    return null
  }

  const details = extractDetails(doc)
    .map((item) => normalizeDetail(item))
    .filter((item): item is PurchaseReceiptSourceDetail => item !== null)

  return {
    sourceDocType,
    sourceDocNo,
    supplierId: pickString(doc, ['supplierId', 'vendorId']) ?? null,
    supplierCode: pickString(doc, ['supplierCode', 'vendorCode']) ?? null,
    supplierName: pickString(doc, ['supplierName', 'vendorName']) ?? null,
    remark: pickString(doc, ['remark', 'note', 'memo']) ?? null,
    details,
  }
}

function isSameDocNo(left: string, right: string): boolean {
  return left.trim().toUpperCase() === right.trim().toUpperCase()
}

function ensure2xxOrNull(status: number): boolean {
  return status >= 200 && status < 300
}

function isPurchaseReceiptDto(value: unknown): value is PurchaseReceiptDto {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string'
    && typeof value.receiptNo === 'string'
    && typeof value.sourceDocType === 'string'
    && typeof value.sourceDocNo === 'string'
    && Array.isArray(value.details)
  )
}

function isPurchaseRecordDto(value: unknown): value is PurchaseRecordDto {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string'
    && typeof value.purchaseReceiptId === 'string'
    && typeof value.purchaseReceiptDetailId === 'string'
    && typeof value.productId === 'string'
    && typeof value.receivedQuantity === 'number'
    && typeof value.containerCode === 'string'
    && typeof value.locationCode === 'string'
  )
}

function extractPurchaseRecords(payload: unknown): PurchaseRecordDto[] {
  const unwrapped = unwrapPayload(payload)

  if (Array.isArray(unwrapped)) {
    return unwrapped.filter((item): item is PurchaseRecordDto => isPurchaseRecordDto(item))
  }

  if (isPurchaseRecordDto(unwrapped)) {
    return [unwrapped]
  }

  if (isRecord(unwrapped)) {
    const listCandidate = Array.isArray(unwrapped.records)
      ? unwrapped.records
      : Array.isArray(unwrapped.items)
        ? unwrapped.items
        : null

    if (listCandidate) {
      return listCandidate.filter((item): item is PurchaseRecordDto => isPurchaseRecordDto(item))
    }
  }

  return []
}

async function queryAsnByNo(asnNo: string): Promise<PurchaseReceiptSourceDocument | null> {
  const res = await http.get<unknown>('/api/app/asn/by-asn-no', {
    params: { asnNo },
    // 识别流程可能会有回退查询，404 不应弹全局错误。
    validateStatus: () => true,
  })

  if (res.status === 404) {
    return null
  }

  if (!ensure2xxOrNull(res.status)) {
    throw new Error(`查询 ASN 失败(${res.status})`)
  }

  const doc = unwrapSingleDoc(res.data)
  if (!doc) {
    return null
  }

  const normalized = normalizeSourceDoc(doc, 'ASN')
  if (!normalized) {
    return null
  }

  if (!isSameDocNo(normalized.sourceDocNo, asnNo)) {
    return null
  }

  return normalized
}

async function queryPoByNo(poNo: string): Promise<PurchaseReceiptSourceDocument | null> {
  const res = await http.get<unknown>('/api/app/purchase-order/by-po-no', {
    params: { poNo },
    // 识别流程可能会有回退查询，404 不应弹全局错误。
    validateStatus: () => true,
  })

  if (res.status === 404) {
    return null
  }

  if (!ensure2xxOrNull(res.status)) {
    throw new Error(`查询采购订单失败(${res.status})`)
  }

  const doc = unwrapSingleDoc(res.data)
  if (!doc) {
    return null
  }

  const normalized = normalizeSourceDoc(doc, 'PO')
  if (!normalized) {
    return null
  }

  if (!isSameDocNo(normalized.sourceDocNo, poNo)) {
    return null
  }

  return normalized
}

export async function queryAsnSourceDoc(docNo: string): Promise<PurchaseReceiptSourceDocument | null> {
  const cleanDocNo = docNo.trim()
  if (!cleanDocNo) {
    return null
  }
  return queryAsnByNo(cleanDocNo)
}

export async function queryPoSourceDoc(docNo: string): Promise<PurchaseReceiptSourceDocument | null> {
  const cleanDocNo = docNo.trim()
  if (!cleanDocNo) {
    return null
  }
  return queryPoByNo(cleanDocNo)
}

export async function identifySourceDocByScan(docNo: string): Promise<PurchaseReceiptSourceDocument | null> {
  const cleanDocNo = docNo.trim()
  const upperDocNo = cleanDocNo.toUpperCase()

  if (upperDocNo.startsWith('ASN')) {
    return (await queryAsnSourceDoc(cleanDocNo)) ?? queryPoSourceDoc(cleanDocNo)
  }

  if (upperDocNo.startsWith('PO')) {
    return (await queryPoSourceDoc(cleanDocNo)) ?? queryAsnSourceDoc(cleanDocNo)
  }

  return (await queryAsnSourceDoc(cleanDocNo)) ?? queryPoSourceDoc(cleanDocNo)
}

export async function createPurchaseReceipt(payload: CreatePurchaseReceiptDto): Promise<PurchaseReceiptDto> {
  const res = await http.post<PurchaseReceiptDto>('/api/app/purchase-receipt', payload)
  const unwrapped = unwrapSingleDoc(res.data)
  if (!unwrapped || !isPurchaseReceiptDto(unwrapped)) {
    throw new Error('创建采购收货单返回数据为空')
  }

  return unwrapped
}

export async function addPurchaseReceiptRecords(payload: AddPurchaseReceiptRecordsDto): Promise<PurchaseRecordDto[]> {
  const res = await http.post<unknown>('/api/app/purchase-receipt/records', payload)
  const records = extractPurchaseRecords(res.data)

  if (records.length === 0) {
    throw new Error('新增收货记录返回数据为空')
  }

  return records
}

export async function approveAndExecutePurchaseReceipt(id: string): Promise<void> {
  await http.post<void>(`/api/app/purchase-receipt/${id}/approve-and-execute`)
}
