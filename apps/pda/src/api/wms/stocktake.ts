import { http } from '@/utils/http'

export enum StocktakeOrderStatus {
  Draft = 10,
  Locked = 20,
  InProgress = 30,
  InApproval = 40,
  Completed = 50,
  Cancelled = 60,
}

export enum StocktakeMode {
  Dynamic = 10,
  Cycle = 20,
  AreaStatic = 30,
  DetailSelection = 40,
}

export enum CountStatus {
  NotCounted = 0,
  Matched = 10,
  Discrepancy = 20,
}

export interface StocktakeOrderDetailDto {
  id: string
  stocktakeOrderId: string
  sourceLocationId: string
  sourceLocationCode: string
  containerId?: string
  containerCode: string
  productId: string
  productCode: string
  productName: string
  batchNo: string
  sn: string
  snapshotQty: number
  snapshotWeight: number
  realQty?: number
  realWeight?: number
  countStatus: CountStatus
  countTime?: string
  counterId?: string
  counterName?: string
  discrepancyReason?: string
  isSystemCreated: boolean
}

export interface StocktakeOrderDto {
  id: string
  creationTime: string
  creatorId?: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  orderNo: string
  status: StocktakeOrderStatus
  mode: StocktakeMode
  frozenTime?: string
  description: string
  details: StocktakeOrderDetailDto[]
}

export interface StocktakeSearchDto {
  skipCount?: number
  maxResultCount?: number
  orderNo?: string
  status?: StocktakeOrderStatus
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface PdaSubmitCountDto {
  stocktakeOrderId: string
  locationCode: string
  containerCode?: string
  sn?: string
  productCode?: string
  realQty: number
  realWeight?: number
}

const baseUrl = '/api/app/stocktake'

export async function getList(params: StocktakeSearchDto) {
  const res = await http.get<PagedResultDto<StocktakeOrderDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await http.get<StocktakeOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function pdaSubmitCount(data: PdaSubmitCountDto) {
  const res = await http.post<StocktakeOrderDetailDto>(`${baseUrl}/pda-submit-count`, data)
  return res.data
}
