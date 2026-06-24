import { http } from '@/utils/http'

export interface InventoryDto {
  id: string
  containerId?: string
  containerCode?: string
  containerNo?: string
  productId?: string
  productCode?: string
  productName?: string
  quantity?: number
  availableQuantity?: number
  lockedQuantity?: number
  unit?: string
  batchNo?: string
  sn?: string
  locationCode?: string
  warehouseCode?: string
  warehouseName?: string
  zoneCode?: string
  zoneName?: string
}

export interface InventorySearchDto {
  skipCount?: number
  maxResultCount?: number
  containerCode?: string
  containerNo?: string
  productCode?: string
  locationCode?: string
  batchNo?: string
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

type RawInventoryDto = InventoryDto & {
  qty?: number
  availableQty?: number
  allocatedQty?: number
}

function normalizeQuantity(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function normalizeInventory(item: RawInventoryDto): InventoryDto {
  return {
    ...item,
    containerNo: item.containerNo || item.containerCode,
    containerCode: item.containerCode || item.containerNo,
    quantity: normalizeQuantity(item.quantity ?? item.qty),
    availableQuantity: normalizeQuantity(item.availableQuantity ?? item.availableQty),
    lockedQuantity: normalizeQuantity(item.lockedQuantity ?? item.allocatedQty),
  }
}

export async function getInventoryList(params: InventorySearchDto) {
  const res = await http.get<PagedResultDto<RawInventoryDto>>('/api/app/inventory', { params })
  return {
    totalCount: res.data.totalCount ?? 0,
    items: (res.data.items ?? []).map(normalizeInventory),
  }
}