export type PurchaseSourceDocType = 'ASN' | 'PO'

// 创建采购收货单主表 DTO
export interface CreatePurchaseReceiptDto {
  sourceDocType: string
  sourceDocNo: string
  supplierId?: string | null
  supplierName?: string | null
  remark?: string | null
  details: CreatePurchaseReceiptDetailDto[]
}

// 创建采购收货单明细 DTO
export interface CreatePurchaseReceiptDetailDto {
  // When creating from ASN/PO, backend expects the specific source line id
  sourceAsnLineId?: string | null
  sourcePoLineId?: string | null
  // legacy/compat
  sourceDetailId?: string | null
  productId: string
  productName: string
  productCode: string
  expectedQuantity: number
  batchNo?: string | null
}

// 新增采购收货记录 DTO
export interface AddPurchaseReceiptRecordDto {
  receivedQuantity: number
  containerCode: string
  locationCode: string
  batchNo?: string | null
  supplierBatchNo?: string | null
}

// 新增采购收货记录主 DTO
export interface AddPurchaseReceiptRecordsDto {
  purchaseReceiptId: string
  detailId: string
  records: AddPurchaseReceiptRecordDto[]
}

// 采购收货记录 DTO
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

// 采购收货单明细 DTO
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
  erpSyncStatus: number | string
  erpSyncErrorMessage?: string | null
  records: PurchaseRecordDto[]
}

// 采购收货单 DTO
export interface PurchaseReceiptDto {
  id: string
  receiptNo: string
  sourceDocType: string
  sourceDocNo: string
  supplierId?: string | null
  supplierName?: string | null
  remark?: string | null
  details: PurchaseReceiptDetailDto[]
}

export interface PurchaseReceiptLpnRecord {
  id: string
  locationId: string
  locationCode?: string | null
  containerNo?: string | null
  containerCode?: string | null
  quantity: number
  batchNo?: string | null
  supplierBatchNo?: string | null
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface SourceDocQueryParams {
  skipCount?: number
  maxResultCount?: number
  filter?: string
  keyword?: string
  docNo?: string
  orderNo?: string
  sourceDocNo?: string
  asnNo?: string
  poNo?: string
  purchaseOrderNo?: string
}

// 归一化后的来源单据明细
export interface PurchaseReceiptSourceDetail {
  sourceDetailId?: string | null
  productId: string
  skuCode?: string | null
  productCode?: string | null
  productName?: string | null
  barcode?: string | null
  uom?: string | null
  batchNo?: string | null
  expectedQuantity: number
  alreadyReceivedQuantity: number
  lpnRecords?: PurchaseReceiptLpnRecord[]
}

// 归一化后的来源单据头
export interface PurchaseReceiptSourceDocument {
  sourceDocType: PurchaseSourceDocType
  sourceDocNo: string
  supplierId?: string | null
  supplierCode?: string | null
  supplierName?: string | null
  remark?: string | null
  details: PurchaseReceiptSourceDetail[]
}

// 页面录入态明细
export interface PurchaseReceiptEntryLine extends PurchaseReceiptSourceDetail {
  purchaseReceiptDetailId?: string | null
  totalReceivedQuantity: number
  lpnRecords: PurchaseReceiptLpnRecord[]
}
