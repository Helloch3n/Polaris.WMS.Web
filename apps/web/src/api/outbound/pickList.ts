import request from '../../utils/request'

export const PickListStatus = {
  Created: 10,
  TaskCreated: 20,
  Picking: 30,
  Picked: 40,
  Cancelled: 50,
} as const

export type PickListStatus = typeof PickListStatus[keyof typeof PickListStatus] | number

export interface PickListLineDto {
  id: string
  pickListId: string
  salesAllocationOrderId: string
  salesAllocationOrderNo: string
  salesAllocationDetailId: string
  salesAllocationReservationId: string
  productId: string
  productCode: string
  productName: string
  qty: number
  containerId: string
  containerCode: string
  sourceLocationId: string
  sourceLocationCode: string
  targetLocationId: string
  targetLocationCode: string
  moveTaskId?: string | null
  moveTaskNo?: string | null
  actualLocationId?: string | null
  batchNo: string
  sn: string
  isPicked: boolean
}

export interface PickListDto {
  id: string
  pickNo: string
  waveOrderId: string
  targetLocationId: string
  targetLocationCode: string
  status: PickListStatus
  outboundReviewOrderId?: string | null
  outboundReviewOrderNo?: string | null
  remark?: string | null
  creationTime: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
  lines: PickListLineDto[]
}

export interface CreatePickListInput {
  waveOrderId: string
  targetLocationCode: string
  remark?: string | null
}

export interface PickListSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  pickNo?: string
  status?: PickListStatus | null
  waveOrderId?: string
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/pick-list'

export async function getList(params: PickListSearchDto) {
  const res = await request.get<PagedResultDto<PickListDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<PickListDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreatePickListInput) {
  const res = await request.post<PickListDto>(baseUrl, data)
  return res.data
}

export async function release(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/release`)
  return res.data
}

export default {
  getList,
  get,
  create,
  release,
}
