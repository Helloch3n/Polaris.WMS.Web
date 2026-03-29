import { http } from '../utils/http'

export type PickTaskDto = {
  id: string
  outboundOrderId?: string
  reelNo?: string
  fromLocationCode?: string
  toLocationCode?: string
  status: number | string
  creationTime?: string
  productCode?: string
  targetLength?: number
}

export type GetPickTaskListParams = {
  outboundOrderId?: string
  status?: string | number
  reelNo?: string
  skipCount?: number
  maxResultCount?: number
}

export async function getPickTaskList(params: GetPickTaskListParams) {
  const res = await http.get<{ totalCount: number; items: PickTaskDto[] }>('/api/app/pick-task', { params })
  return res.data
}

export async function confirmPickTask(id: string) {
  const res = await http.post<void>(`/api/app/outbound/complete-pick-task/${id}`)
  return res.data
}

export async function getPickTaskDetail(id: string) {
  const res = await http.get<PickTaskDto>(`/api/app/pick-task/${id}`)
  return res.data
}
