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
  Good: 0,
  Frozen: 1,
  Quarantine: 2,
  Scrap: 3,
} as const

export type InventoryStatus = (typeof InventoryStatus)[keyof typeof InventoryStatus]

export const InventoryType = {
  SemiFinished: 0,
  Finished: 1,
  ProcessReel: 2,
} as const

export type InventoryType = (typeof InventoryType)[keyof typeof InventoryType]

export interface Inventory {
  id: string
  reelId: string
  /** 服务端新增：序号 */
  sequence?: number
  productId: string
  type: InventoryType | keyof typeof InventoryType | string | number
  productCode?: string
  quantity: number
  availableQuantity: number
  lockedQuantity: number
  unit: string
  weight: number
  batchNo: string
  relatedOrderNo?: string
  relatedOrderLineNo?: string
  sn?: string
  SN?: string
  status: InventoryStatus | keyof typeof InventoryStatus | string | number
  craftVersion?: string | null
  fifoDate: string
  layerIndex: number
  reelNo: string
  locationCode: string
  productName: string
  warehouseName?: string
  warehouseCode?: string
  zoneCode?: string
  zoneName?: string
}

export interface ProductionReceiveInput {
  reelId: string
  productId: string
  quantity: number
  weight?: number
  batchNo?: string
  sourceWo?: string
  locationId?: string
}

export interface GetInventoryListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string  
  reelNo?: string
  productId?: string
  relatedOrderNo?: string
  warehouseCode?: string
  zoneCode?: string
}

const baseUrl = '/api/app/inventory'

export async function getList(params: GetInventoryListParams) {
  const res = await request.get<PagedResultDto<Inventory>>(baseUrl, { params })
  return res.data
}

/**
 * 调用后 InventoryManager 鐨?ProductionReceiveAsync
 * ABP 默跔?api/app/inventory/production-receive
 */
export async function productionReceive(data: ProductionReceiveInput) {
  const res = await request.post<void>(`${baseUrl}/production-receive`, data)
  return res.data
}