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

export interface InventoryTransactionDto {
  id?: string
  creationTime?: string
  creatorId?: string
  creatorName?: string
  type?: string | number
  billNo?: string
  remark?: string
  reelNo?: string
  productName?: string
  fromLocationCode?: string | null
  toLocationCode?: string | null
  fromWarehouseCode?: string | null
  toWarehouseCode?: string | null
  quantity?: number
  quantityAfter?: number
  batchNo?: string
  sn?: string
  craftVersion?: string
  status?: number | string
}

export interface InventoryTransactionSearchDto extends PagedAndSortedResultRequestDto {
  billNo?: string
  reelNo?: string
  productId?: string
  startTime?: string
  endTime?: string
  type?: string | number
}

const baseUrl = '/api/app/inventory-transaction'

export async function getList(params: InventoryTransactionSearchDto) {
  const res = await request.get<PagedResultDto<InventoryTransactionDto>>(baseUrl, { params })
  return res.data
}

export async function getInventoryTransactions(
  params: InventoryTransactionSearchDto & PagedAndSortedResultRequestDto,
) {
  const res = await request.get<PagedResultDto<InventoryTransactionDto>>(baseUrl, {
    params,
  })
  return res.data
}