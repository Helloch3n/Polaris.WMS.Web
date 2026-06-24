import request from '../../utils/request'

export const MoveTaskType = {
  Putaway: 10,
  MoveToQc: 20,
  InternalMove: 30,
  PickDown: 40,
} as const

export type MoveTaskType = (typeof MoveTaskType)[keyof typeof MoveTaskType] | number | string

export const MoveTaskStatus = {
  Pending: 10,
  InProgress: 20,
  Completed: 30,
  Cancelled: 40,
} as const

export type MoveTaskStatus = (typeof MoveTaskStatus)[keyof typeof MoveTaskStatus] | number | string

export interface MoveTaskDto {
  id: string
  taskNo: string
  containerId?: string
  containerCode: string
  taskType: MoveTaskType
  status: MoveTaskStatus
  sourceLocationId: string
  sourceLocationCode: string
  targetLocationId: string
  targetLocationCode: string
  creationTime: string
}

export interface MoveTaskSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  taskNo?: string
  containerCode?: string
  status?: MoveTaskStatus
  taskType?: MoveTaskType
}

export interface PagedResultDto<T> {
  totalCount?: number
  items?: T[]
}

const baseUrl = '/api/app/move-task'

export async function getList(params: MoveTaskSearchDto) {
  const res = await request.get<PagedResultDto<MoveTaskDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<MoveTaskDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function complete(data: { taskId: string; scannedLocationCode: string }) {
  const res = await request.post<void>(`${baseUrl}/complete`, data)
  return res.data
}

export default {
  getList,
  get,
  complete,
}