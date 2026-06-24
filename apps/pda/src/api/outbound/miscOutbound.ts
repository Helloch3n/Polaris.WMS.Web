import { http } from '@/utils/http'
import { MiscOperationType, MiscOrderStatus } from '../inbound/miscInbound'

export interface MiscOutboundOrderDetailDto {
  id: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  locationId: string
  locationCode: string
  containerId: string
  containerCode: string
  productId: string
  productCode: string
  productName: string
  sn: string
  batchNo: string
  craftVersion?: string | null
  unit: string
  qty: number
  remark?: string | null
}

export interface MiscOutboundOrderDto {
  id: string
  orderNo: string
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  type: MiscOperationType
  status: MiscOrderStatus
  remark?: string | null
  creationTime: string
  details: MiscOutboundOrderDetailDto[]
}

export interface MiscOutboundOrderSearchDto {
  skipCount?: number
  maxResultCount?: number
  orderNo?: string
  status?: MiscOrderStatus
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface CreateUpdateMiscOutboundOrderDetailDto {
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  locationId: string
  locationCode: string
  containerId: string
  containerCode: string
  productId: string
  productCode: string
  productName: string
  sn: string
  batchNo: string
  craftVersion?: string | null
  unit: string
  qty: number
  remark?: string | null
}

export interface UpdateMiscOutboundOrderDto {
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  remark?: string | null
  details: CreateUpdateMiscOutboundOrderDetailDto[]
}

const baseUrl = '/api/app/misc-outbound-order'

export async function getMiscOutboundList(params: MiscOutboundOrderSearchDto) {
  const res = await http.get<PagedResultDto<MiscOutboundOrderDto>>(baseUrl, { params })
  return res.data
}

export async function getMiscOutboundDetail(id: string) {
  const res = await http.get<MiscOutboundOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function updateMiscOutbound(id: string, data: UpdateMiscOutboundOrderDto) {
  const res = await http.put<MiscOutboundOrderDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function approveAndExecuteMiscOutbound(id: string) {
  const res = await http.post<void>(`${baseUrl}/${id}/approve-and-execute`)
  return res.data
}
