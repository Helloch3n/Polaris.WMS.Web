import request from '../../utils/request'

/** ABP 甯哥敤鍒嗛〉结果 */
export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

/** ABP 常用列表查 */
export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export const InventoryStatus = {
  Good: 'Good',
  Frozen: 'Frozen',
  Quarantine: 'Quarantine',
  Scrap: 'Scrap',
} as const

export type InventoryStatus = (typeof InventoryStatus)[keyof typeof InventoryStatus]

export interface ReceiptDetail {
  id?: string
  receiptId?: string
  reelNo?: string
  productId?: string
  productName?: string
  planQuantity?: number
  planWeight?: number
  actualQuantity?: number
  actualWeight?: number
  locationId?: string
  locationCode?: string
  isReceived?: boolean
  remark?: string
  toWarehouseId?: string
  sn?: string
  craftVersion?: string
  layerIndex?: number
  status?: InventoryStatus
  weight?: number
  batchNo?: string
}

export interface Receipt {
  id?: string
  billNo?: string
  sourceBillNo?: string
  supplierId?: string
  supplierName?: string
  status?: number | string
  createdTime?: string
  remark?: string
  details?: ReceiptDetail[]
}

export interface GetReceiptListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
  filter?: string
  billNo?: string
  status?: number | string
}

export interface CreateReceiptDto {
  billNo?: string
  supplierId?: string
  remark?: string
  type?: number
  sourceBillNo?: string
  warehouseId?: string | null
  details?: Array<{
    reelId?: string
    reelNo?: string
    productId?: string
    productName?: string
    unit?: string
    planQuantity?: number
    planWeight?: number
    remark?: string
    sn?: string
    craftVersion?: string
    layerIndex?: number
    toWarehouseId?: string
    batchNo?: string
    sourceWo?: string
  }>
}

/** 单执 */
export interface ExecuteReceiptInput {
  receiptId: string
  detailId: string
  actualQuantity: number
  locationId: string
  sn?: string
  batchNo?: string
  craftVersion: string
  status?: 'Good' | 'Quarantine' | 'Scrap'
  weight?: number
}

/** 整盘执 */
export interface ExecuteByReelInput {
  receiptId: string
  reelId: string
  locationId: string
  craftVersion: string
}

export interface UpdateReceiptDetailDto {
  id: string
  sn?: string
  batchNo?: string
  craftVersion?: string
  layerIndex?: number
  status?: InventoryStatus
  toWarehouseId?: string
  planQuantity?: number
  planWeight?: number
}

const baseUrl = '/api/app/receipt'

export async function getList(params: GetReceiptListParams) {
  const res = await request.get<PagedResultDto<Receipt>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<Receipt>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateReceiptDto) {
  const res = await request.post<Receipt>(baseUrl, data)
  return res.data
}

export async function execute(input: ExecuteReceiptInput) {
  const res = await request.post<void>(`${baseUrl}/execute`, input)
  return res.data
}

export async function executeByReel(input: ExecuteByReelInput) {
  const res = await request.post<void>(`${baseUrl}/execute-by-reel`, input)
  return res.data
}

export async function updateDetail(receiptId: string, detailId: string, data: UpdateReceiptDetailDto) {
  const res = await request.put<void>(`${baseUrl}/${receiptId}/detail/${detailId}`, data)
  return res.data
}