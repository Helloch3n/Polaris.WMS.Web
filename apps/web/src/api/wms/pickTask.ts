import request from '../../utils/request'

export interface PickTaskDto {
  id: string
  outboundOrderId: string
  outboundOrderItemId?: string
  inventoryId?: string
  containerNo: string
  fromLocationCode: string
  toLocationCode: string
  status: number | string
  creationTime: string
  productCode: string
  targetLength: number
  inventorySn?: string
  batchNo?: string
  sn?: string
}

export interface GetPickTaskListParams {
  outboundOrderId?: string
  status?: string
  containerNo?: string
  skipCount?: number
  maxResultCount?: number
}

export async function getList(params: GetPickTaskListParams) {
  const res = await request.get<{ totalCount: number; items: PickTaskDto[] }>('/api/app/pick-task', { params })
  return res.data
}

export async function complete(id: string) {
  const res = await request.post<void>(`/api/app/outbound/complete-pick-task/${id}`)
  return res.data
}

export async function getTasksByOrderId(outboundOrderId: string) {
  const res = await request.get<PickTaskDto[]>(
    `/api/app/pick-task/by-outbound-order-id/${outboundOrderId}`,
  )
  return res.data
}