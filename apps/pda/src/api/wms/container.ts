import { http } from '@/utils/http'

export interface ContainerDto {
  id: string
  containerCode: string
  name: string
  size?: number
  selfWeight?: number
  currentLocationId?: string
}

export interface ContainerSearchDto {
  skipCount?: number
  maxResultCount?: number
  containerCode?: string
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface InventoryBriefDto {
  inventoryId: string
  productId: string
  productCode: string
  productName: string
  batchNo: string
  quantity: number
  uom: string
}

export interface MovableContainerDto {
  containerId: string
  containerCode: string
  containerType: string
  currentLocationId: string
  currentLocationCode: string
  inventories: InventoryBriefDto[]
}

export interface RelocateContainerInput {
  containerCode: string
  targetLocationCode: string
}

export async function getContainerByCode(code: string): Promise<ContainerDto | null> {
  const res = await http.get<PagedResultDto<ContainerDto>>('/api/app/container', {
    params: {
      containerCode: code,
      maxResultCount: 1,
    },
  })
  return res.data.items && res.data.items.length > 0 ? res.data.items[0] : null
}

export async function getMovableContainerByCode(containerCode: string): Promise<MovableContainerDto> {
  const res = await http.get<MovableContainerDto>('/api/app/container/by-code', {
    params: {
      containerCode,
    },
  })
  return res.data
}

export async function relocateContainer(data: RelocateContainerInput): Promise<void> {
  await http.post<void>('/api/app/container/relocate', data)
}

export interface BindInventoryInput {
  containerCode: string
  locationCode?: string
  productId: string
  productCode: string
  productName: string
  qty: number
  batchNo?: string
  sn?: string
  unit?: string
  weight?: number
  craftVersion?: string
}

export interface UnbindInventoryInput {
  containerCode: string
  inventoryId: string
  qty: number
}

export async function bindInventory(data: BindInventoryInput): Promise<void> {
  await http.post<void>('/api/app/container/bind-inventory', data)
}

export async function unbindInventory(data: UnbindInventoryInput): Promise<void> {
  await http.post<void>('/api/app/container/unbind-inventory', data)
}
