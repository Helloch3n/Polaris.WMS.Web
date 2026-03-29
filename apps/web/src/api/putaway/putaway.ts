import request from '../../utils/request'

/** ABP 甯哥敤鍒嗛〉结果 */
export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

/** 鍓嶇鍒嗛〉参数（按你的要求：skipCount / maxResultCount锛?*/
export interface PagedRequestDto {
  skipCount?: number
  maxResultCount?: number
}

/** 绾跨洏鐘舵€?*/
export const ReelStatus = {
  Empty: 'Empty',
  Occupied: 'Occupied',
  Damaged: 'Damaged',
  Maintenance: 'Maintenance',
} as const

export type ReelStatus = (typeof ReelStatus)[keyof typeof ReelStatus]

/** 涓婃灦浠诲姟鐘舵€?*/
export const PutawayTaskStatus = {
  Pending: 'Pending',
  InProgress: 'InProgress',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const

export type PutawayTaskStatus = (typeof PutawayTaskStatus)[keyof typeof PutawayTaskStatus]

export interface ReelDto {
  reelNo: string
  materialName?: string
  locationCode: string
  quantity: number
  status: ReelStatus
  isLocked: boolean
}

export interface AvailableReelItemDto {
  productCode: string
  productName: string
  batchNo: string
  quantity: number
  unit: string
}

export interface AvailableReelDto {
  reelNo: string
  locationCode: string
  reelStatus: number
  isLocked: boolean
  isMixed: boolean
  displayProductName: string
  displayQuantity: string
  items: AvailableReelItemDto[]
}

export interface PutawayTaskDto {
  id: string
  taskNo: string
  reelNo: string
  fromLocationCode: string
  toLocationCode?: string
  status: PutawayTaskStatus
  creationTime: string
  creatorId: string
}

export interface GetAvailableReelsInput extends PagedRequestDto {
  filter?: string
  warehouseId?: string
}

export interface CreatePutawayTaskInput {
  reelNo: string
  targetLocationCode?: string
}

export interface CompletePutawayTaskInput {
  targetLocationCode: string
}

export interface GetPutawayTaskListInput extends PagedRequestDto {
  status?: PutawayTaskStatus | string
}

const baseUrl = '/api/app/putaway'

function toAbpPaging(input?: PagedRequestDto) {
  return {
    skipCount: input?.skipCount,
    maxResultCount: input?.maxResultCount,
  }
}

/** GET /api/app/putaway/available-reels */
export async function getAvailableReels(params: GetAvailableReelsInput) {
  const res = await request.get<PagedResultDto<AvailableReelDto>>(`${baseUrl}/available-reels`, {
    params: {
      ...toAbpPaging(params),
      filter: params.filter,
      warehouseId: params.warehouseId,
    },
  })
  return res.data
}

/** POST /api/app/putaway */
export async function createPutawayTask(data: CreatePutawayTaskInput) {
  const res = await request.post<PutawayTaskDto>(baseUrl, data)
  return res.data
}

/** GET /api/app/putaway */
export async function getPutawayTaskList(params: GetPutawayTaskListInput = {}) {
  const res = await request.get<PagedResultDto<PutawayTaskDto>>(baseUrl, {
    params: {
      ...toAbpPaging(params),
      status: params.status,
    },
  })
  return res.data
}

/** POST /api/app/putaway/{id}/complete */
export async function completePutawayTask(id: string, data: CompletePutawayTaskInput) {
  const res = await request.post<void>(`${baseUrl}/${id}/complete`, data)
  return res.data
}

/** POST /api/app/putaway */
export function create(data: { reelNo: string }) {
  return createPutawayTask(data)
}

/** GET /api/app/putaway */
export function getList(params: GetPutawayTaskListInput = {}) {
  return getPutawayTaskList(params)
}

/** POST /api/app/putaway/{id}/complete */
export function complete(id: string, data: { targetLocationCode: string }) {
  return completePutawayTask(id, data)
}