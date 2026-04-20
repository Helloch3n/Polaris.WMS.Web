import request from '../../utils/request'

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export interface AuditedEntityDto {
  id: string
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

export interface PurchaseReceiptSearchDto extends PagedAndSortedResultRequestDto {
  receiptNo?: string
  sourceDocNo?: string
  sourceDocType?: string
}

export type PurchaseReceiptErpSyncStatus = number | string

export interface PurchaseRecordDto {
  id: string
  purchaseReceiptId: string
  purchaseReceiptDetailId: string
  sourceDetailId?: string | null
  productId: string
  productName: string
  productCode: string
  receivedQuantity: number
  containerId: string
  containerCode: string
  locationId: string
  locationCode: string
  batchNo?: string | null
  supplierBatchNo?: string | null
}

export interface PurchaseReceiptDetailDto {
  id: string
  purchaseReceiptId: string
  sourceDetailId?: string | null
  productId: string
  productName: string
  productCode: string
  expectedQuantity: number
  receivedQuantity: number
  batchNo?: string | null
  erpSyncStatus: PurchaseReceiptErpSyncStatus
  erpSyncErrorMessage?: string | null
  records: PurchaseRecordDto[]
}

export interface PurchaseReceiptDto extends AuditedEntityDto {
  receiptNo: string
  sourceDocType: string
  sourceDocNo: string
  supplierId?: string | null
  supplierName?: string | null
  remark?: string | null
  details: PurchaseReceiptDetailDto[]
}

const baseUrl = '/api/app/purchase-receipt'

export async function getList(params: PurchaseReceiptSearchDto) {
  const res = await request.get<PagedResultDto<PurchaseReceiptDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<PurchaseReceiptDto>(`${baseUrl}/${id}`)
  return res.data
}

export default {
  getList,
  get,
}