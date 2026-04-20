import request from '../../utils/request'

/** ABP 甯哥敤鍒嗛〉结果 */
export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

/** ABP 常用列表查 */
export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export const ContainerType = {
  Turnover: 0,
  FinishedGoods: 1,
  Virtual: 2,
} as const

export type ContainerType = (typeof ContainerType)[keyof typeof ContainerType]

export const ContainerStatus = {
  Empty: 0,
  Occupied: 1,
  Damaged: 2,
  Maintenance: 3,
} as const

export type ContainerStatus = (typeof ContainerStatus)[keyof typeof ContainerStatus] | string

export interface ContainerDto {
  id?: string
  containerCode: string
  name: string
  size?: string
  containerType: ContainerType | keyof typeof ContainerType | string | number
  selfWeight: number
  currentLocationId?: string
  currentLocationCode?: string
  currentZoneId?: string
  currentZoneCode?: string
  currentWarehouseId?: string
  currentWarehouseCode?: string
  status: ContainerStatus
  isLocked: boolean
}

export interface CreateUpdateContainerDto {
  containerCode: string
  name: string
  size?: string
  containerType: ContainerType | number
  selfWeight: number
  currentLocationId?: string
}

export interface UpdateContainerLocationDto {
  locationId: string
}

export interface InventoryBriefDto {
  inventoryId: string
  productId: string
  productCode: string
  productName: string
  craftVersion?: string
  batchNo: string
  quantity: number
  uom: string
}

export interface MovableContainerDto {
  containerId: string
  containerNo: string
  containerType: string
  currentLocationId: string
  currentLocationCode: string
  inventories: InventoryBriefDto[]
}

export interface GetContainerListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
  containerCode?: string
  filter?: string
}

const baseUrl = '/api/app/container'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function toOptionalString(value: unknown): string | undefined {
  const text = toStringValue(value).trim()
  return text || undefined
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toBooleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const clean = value.trim().toLowerCase()
    return clean === 'true' || clean === '1'
  }
  return false
}

function pick(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key]
    }
  }
  return undefined
}

function normalizeContainer(raw: unknown): ContainerDto {
  const record = isRecord(raw) ? raw : {}

  return {
    id: toOptionalString(pick(record, ['id', 'Id'])),
    containerCode:
      toStringValue(pick(record, ['containerCode', 'ContainerCode', 'containerNo', 'ContainerNo'])) || '-',
    name: toStringValue(pick(record, ['name', 'Name'])),
    size: toOptionalString(pick(record, ['size', 'Size'])),
    containerType:
      (pick(record, ['containerType', 'ContainerType']) as ContainerType | keyof typeof ContainerType | string | number)
      ?? 0,
    selfWeight: toNumberValue(pick(record, ['selfWeight', 'SelfWeight']), 0),
    currentLocationId: toOptionalString(pick(record, ['currentLocationId', 'CurrentLocationId'])),
    currentLocationCode: toOptionalString(pick(record, ['currentLocationCode', 'CurrentLocationCode'])),
    currentZoneId: toOptionalString(pick(record, ['currentZoneId', 'CurrentZoneId'])),
    currentZoneCode: toOptionalString(pick(record, ['currentZoneCode', 'CurrentZoneCode'])),
    currentWarehouseId: toOptionalString(pick(record, ['currentWarehouseId', 'CurrentWarehouseId'])),
    currentWarehouseCode: toOptionalString(pick(record, ['currentWarehouseCode', 'CurrentWarehouseCode'])),
    status: (pick(record, ['status', 'Status']) as ContainerStatus) ?? ContainerStatus.Empty,
    isLocked: toBooleanValue(pick(record, ['isLocked', 'IsLocked'])),
  }
}

export async function getList(params: GetContainerListParams) {
  const res = await request.get<PagedResultDto<ContainerDto>>(baseUrl, { params })
  const data = res.data
  return {
    ...data,
    items: (data.items ?? []).map((item) => normalizeContainer(item)),
  }
}

export async function get(id: string) {
  const res = await request.get<ContainerDto>(`${baseUrl}/${id}`)
  return normalizeContainer(res.data)
}

export async function create(data: CreateUpdateContainerDto) {
  const res = await request.post<ContainerDto>(baseUrl, data)
  return normalizeContainer(res.data)
}

export async function update(id: string, data: CreateUpdateContainerDto) {
  const res = await request.put<ContainerDto>(`${baseUrl}/${id}`, data)
  return normalizeContainer(res.data)
}

async function deleteContainer(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
export { deleteContainer as delete }

export async function updateLocation(id: string, data: UpdateContainerLocationDto) {
  const res = await request.put<void>(`${baseUrl}/${id}/update-location`, data)
  return res.data
}

export async function getMovableContainers(sourceWarehouseId: string) {
  const res = await request.get<MovableContainerDto[]>(`${baseUrl}/movable-containers/${sourceWarehouseId}`)
  return res.data
}