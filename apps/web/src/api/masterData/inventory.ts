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
  ProcessContainer: 2,
} as const

export type InventoryType = (typeof InventoryType)[keyof typeof InventoryType]

export interface Inventory {
  id: string
  containerId: string
  reelId?: string
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
  containerNo: string
  containerCode?: string
  reelNo?: string
  locationCode: string
  productName: string
  warehouseName?: string
  warehouseCode?: string
  zoneCode?: string
  zoneName?: string
}

export interface ProductionReceiveInput {
  containerId: string
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
  containerNo?: string
  containerCode?: string
  productId?: string
  relatedOrderNo?: string
  warehouseCode?: string
  zoneCode?: string
}

const baseUrl = '/api/app/inventory'

type InventoryWithLegacyFields = Inventory & {
  ContainerNo?: string
  ContainerCode?: string
  reelNo?: string
  ReelNo?: string
}

function toContainerNo(item: InventoryWithLegacyFields): string {
  const value = item.containerNo ?? item.ContainerNo ?? item.containerCode ?? item.ContainerCode ?? item.reelNo ?? item.ReelNo
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

export async function getList(params: GetInventoryListParams) {
  const normalizedParams: GetInventoryListParams = {
    maxResultCount: params.maxResultCount,
    skipCount: params.skipCount,
    sorting: params.sorting,
    productId: params.productId,
    relatedOrderNo: params.relatedOrderNo,
    warehouseCode: params.warehouseCode,
    zoneCode: params.zoneCode,
  }
  const containerKeyword = params.containerCode ?? params.containerNo
  if (containerKeyword) {
    normalizedParams.containerCode = containerKeyword
    normalizedParams.containerNo = containerKeyword
  }

  const res = await request.get<PagedResultDto<Inventory>>(baseUrl, { params: normalizedParams })
  const data = res.data
  return {
    ...data,
    items: (data.items ?? []).map((item) => {
      const normalizedContainerNo = toContainerNo(item as InventoryWithLegacyFields)
      return {
        ...item,
        containerNo: normalizedContainerNo,
        containerCode: normalizedContainerNo,
        reelNo: normalizedContainerNo,
      }
    }),
  }
}

/**
 * 调用后 InventoryManager 鐨?ProductionReceiveAsync
 * ABP 默跔?api/app/inventory/production-receive
 */
export async function productionReceive(data: ProductionReceiveInput) {
  const res = await request.post<void>(`${baseUrl}/production-receive`, data)
  return res.data
}