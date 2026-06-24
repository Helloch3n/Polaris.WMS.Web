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

export interface InventoryAllocationDto {
  id: string
  creationTime: string
  creatorId?: string
  inventoryId: string
  allocationType: number | string
  allocationOrderNo: string
  allocationLineNo?: number | null
  allocationTag?: string | null
  allocatedQty: number
  containerCode?: string
  sn?: string
  batchNo?: string
  productCode?: string
  productName?: string
}

export interface InventoryAllocationSearchDto extends PagedAndSortedResultRequestDto {
  allocationOrderNo?: string
  allocationType?: number | string
  allocationTag?: string
  containerCode?: string
}

const baseUrl = '/api/app/inventory-allocation'

export async function getList(params: InventoryAllocationSearchDto) {
  const res = await request.get<PagedResultDto<InventoryAllocationDto>>(baseUrl, {
    params,
  })
  return res.data
}
