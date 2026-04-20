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
  containerNo?: string
  containerCode?: string
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
  containerNo?: string
  containerCode?: string
  productId?: string
  startTime?: string
  endTime?: string
  type?: string | number
}

const baseUrl = '/api/app/inventory-transaction'

type InventoryTransactionWithLegacyFields = InventoryTransactionDto & {
  ContainerNo?: string
  ContainerCode?: string
  ReelNo?: string
}

function toContainerNo(item: InventoryTransactionWithLegacyFields): string {
  const value = item.containerNo ?? item.ContainerNo ?? item.containerCode ?? item.ContainerCode ?? item.reelNo ?? item.ReelNo
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function normalizeTransaction(item: InventoryTransactionDto): InventoryTransactionDto {
  const normalizedContainerNo = toContainerNo(item as InventoryTransactionWithLegacyFields)
  return {
    ...item,
    containerNo: normalizedContainerNo,
    containerCode: normalizedContainerNo,
    reelNo: normalizedContainerNo,
  }
}

function normalizeSearchParams(params: InventoryTransactionSearchDto): InventoryTransactionSearchDto {
  const normalizedParams: InventoryTransactionSearchDto = {
    maxResultCount: params.maxResultCount,
    skipCount: params.skipCount,
    sorting: params.sorting,
    billNo: params.billNo,
    productId: params.productId,
    startTime: params.startTime,
    endTime: params.endTime,
    type: params.type,
  }
  const containerKeyword = params.containerCode ?? params.containerNo
  if (containerKeyword) {
    normalizedParams.containerCode = containerKeyword
    normalizedParams.containerNo = containerKeyword
  }
  return normalizedParams
}

export async function getList(params: InventoryTransactionSearchDto) {
  const res = await request.get<PagedResultDto<InventoryTransactionDto>>(baseUrl, {
    params: normalizeSearchParams(params),
  })
  const data = res.data
  return {
    ...data,
    items: (data.items ?? []).map((item) => normalizeTransaction(item)),
  }
}

export async function getInventoryTransactions(
  params: InventoryTransactionSearchDto & PagedAndSortedResultRequestDto,
) {
  const res = await request.get<PagedResultDto<InventoryTransactionDto>>(baseUrl, {
    params: normalizeSearchParams(params),
  })
  const data = res.data
  return {
    ...data,
    items: (data.items ?? []).map((item) => normalizeTransaction(item)),
  }
}