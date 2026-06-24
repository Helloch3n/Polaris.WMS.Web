import { http } from '@/utils/http'

export interface LocationDto {
  id: string
  code: string
  warehouseId: string
  warehouseCode?: string
  warehouseName?: string
  zoneId: string
}

export interface LocationSearchDto {
  skipCount?: number
  maxResultCount?: number
  locationCode?: string
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export async function getLocationByCode(code: string): Promise<LocationDto | null> {
  const res = await http.get<PagedResultDto<LocationDto>>('/api/app/location', {
    params: {
      locationCode: code,
      maxResultCount: 1,
    },
  })
  return res.data.items && res.data.items.length > 0 ? res.data.items[0] : null
}
