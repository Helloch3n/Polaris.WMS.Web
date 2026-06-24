import request from '../../utils/request'
import type {
  GetIdentityRolesParams,
  IdentityRoleCreateDto,
  IdentityRoleDto,
  IdentityRoleUpdateDto,
  PagedResultDto,
} from './types'

const baseUrl = '/api/identity/roles'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function pick(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key]
    }
  }
  return undefined
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function toBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return undefined
}

function toNumberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function normalizeRole(raw: unknown): IdentityRoleDto {
  const record = isRecord(raw) ? raw : {}

  return {
    id: toStringValue(pick(record, ['id', 'Id'])),
    name: toStringValue(pick(record, ['name', 'Name'])),
    isDefault: toBooleanValue(pick(record, ['isDefault', 'IsDefault'])),
    isPublic: toBooleanValue(pick(record, ['isPublic', 'IsPublic'])),
    isStatic: toBooleanValue(pick(record, ['isStatic', 'IsStatic'])),
    creationTime: toStringValue(pick(record, ['creationTime', 'CreationTime'])) || undefined,
  }
}

function normalizePagedRoles(raw: unknown): PagedResultDto<IdentityRoleDto> {
  const record = isRecord(raw) ? raw : {}
  const rawItems = pick(record, ['items', 'Items'])
  const items = Array.isArray(rawItems) ? rawItems.map((item) => normalizeRole(item)) : []

  return {
    totalCount: toNumberValue(pick(record, ['totalCount', 'TotalCount'])),
    items,
  }
}

export async function getList(params: GetIdentityRolesParams) {
  const res = await request.get<PagedResultDto<IdentityRoleDto>>(baseUrl, { params })
  return normalizePagedRoles(res.data)
}

export async function get(id: string) {
  const res = await request.get<IdentityRoleDto>(`${baseUrl}/${id}`)
  return normalizeRole(res.data)
}

export async function create(data: IdentityRoleCreateDto) {
  const res = await request.post<IdentityRoleDto>(baseUrl, data)
  return normalizeRole(res.data)
}

export async function update(id: string, data: IdentityRoleUpdateDto) {
  const res = await request.put<IdentityRoleDto>(`${baseUrl}/${id}`, data)
  return normalizeRole(res.data)
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
