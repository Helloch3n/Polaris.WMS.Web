import request from '../../utils/request'

export interface OutboundOrderItemDto {
  id: string
  productCode: string
  targetLength: number
  quantity: number
  allocatedQuantity: number
}

export interface OutboundOrderDto { 
  id: string
  orderNo: string
  sourceOrderNo?: string
  customerName: string
  status: number
  creationTime: string
  items: OutboundOrderItemDto[]
}

export interface CreateOutboundOrderItemInput {
  productCode: string
  targetLength: number
  quantity: number
}

export interface CreateOutboundOrderInput {
  sourceOrderNo: string
  customerName: string
  items: CreateOutboundOrderItemInput[]
}

const baseUrl = '/api/app/outbound'

export async function create(data: CreateOutboundOrderInput) {
  const res = await request.post<OutboundOrderDto>(baseUrl, data)
  return res.data
}

export async function allocate(id: string) {
  const res = await request.post<OutboundOrderDto>(`${baseUrl}/generate-pick-task/${id}`)
  return res.data
}

export async function getList(params: Record<string, unknown>) {
  const res = await request.get<{ totalCount: number; items: OutboundOrderDto[] }>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<OutboundOrderDto>(`${baseUrl}/${id}`)
  return res.data
}