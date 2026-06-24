import request from '../../utils/request'

export const WaveOrderStatus = {
  Created: 10,
  Released: 20,
  Completed: 30,
  Cancelled: 40,
} as const

export type WaveOrderStatus = typeof WaveOrderStatus[keyof typeof WaveOrderStatus] | number

export interface WaveOrderLineDto {
  id: string
  waveOrderId: string
  salesShipmentId: string
  salesShipmentNo: string
  salesShipmentDetailId: string
  customerId: string
  customerCode: string
  customerName: string
  productId: string
  productCode: string
  productName: string
  qty: number
}

export interface WaveOrderDto {
  id: string
  waveNo: string
  status: WaveOrderStatus
  remark?: string | null
  creationTime: string
  lines: WaveOrderLineDto[]
}

export interface CreateWaveOrderInput {
  salesShipmentIds: string[]
  remark?: string | null
}

export interface WaveOrderSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  waveNo?: string
  status?: WaveOrderStatus | null
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/wave-order'

export async function getList(params: WaveOrderSearchDto) {
  const res = await request.get<PagedResultDto<WaveOrderDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<WaveOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateWaveOrderInput) {
  const res = await request.post<WaveOrderDto>(baseUrl, data)
  return res.data
}
