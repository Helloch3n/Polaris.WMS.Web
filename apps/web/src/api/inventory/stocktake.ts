import request from '../../utils/request'
import type { PagedResultDto, PagedAndSortedResultRequestDto } from '../inventory/allocation'

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
  lastModificationTime?: string
  lastModifierId?: string
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

export interface CreateStocktakeOrderDto {
  warehouseId: string
  mode: StocktakeMode
  description?: string
  locationIds?: string[]
}

export interface StocktakeSearchDto extends PagedAndSortedResultRequestDto {
  orderNo?: string
  status?: StocktakeOrderStatus
  warehouseId?: string
}

export interface StocktakeApprovalReasonDto {
  detailId: string
  discrepancyReason?: string
}

export interface ApproveStocktakeDto {
  discrepancyReasons?: StocktakeApprovalReasonDto[]
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
  const res = await request.get<PagedResultDto<StocktakeOrderDto>>(baseUrl, {
    params,
  })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<StocktakeOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateStocktakeOrderDto) {
  const res = await request.post<StocktakeOrderDto>(baseUrl, data)
  return res.data
}

export async function startStocktake(id: string) {
  const res = await request.post<StocktakeOrderDto>(`${baseUrl}/${id}/start-stocktake`)
  return res.data
}

export async function pdaSubmitCount(data: PdaSubmitCountDto) {
  const res = await request.post<StocktakeOrderDetailDto>(`${baseUrl}/pda-submit-count`, data)
  return res.data
}

export async function submitForApproval(id: string) {
  const res = await request.post<StocktakeOrderDto>(`${baseUrl}/${id}/submit-for-approval`)
  return res.data
}

export async function approveAndPost(id: string, data: ApproveStocktakeDto) {
  const res = await request.post<StocktakeOrderDto>(`${baseUrl}/${id}/approve-and-post`, data)
  return res.data
}

export async function rejectStocktake(id: string) {
  const res = await request.post<StocktakeOrderDto>(`${baseUrl}/${id}/reject-stocktake`)
  return res.data
}

export async function cancel(id: string) {
  const res = await request.post<StocktakeOrderDto>(`${baseUrl}/${id}/cancel`)
  return res.data
}
