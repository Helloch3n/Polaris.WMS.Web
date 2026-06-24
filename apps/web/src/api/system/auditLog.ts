import request from '../../utils/request'
import type { PagedAndSortedResultRequestDto, PagedResultDto } from '../purchaseOrder'

/**
 * 操作日志列表查询参数。
 */
export interface GetAuditLogsInput extends PagedAndSortedResultRequestDto {
  filter?: string
  module?: string
  userName?: string
  startTime?: string
  endTime?: string
  hasException?: boolean
  includeGetRequests?: boolean
}

/**
 * 操作日志数据模型。
 */
export interface AuditLogDto {
  id: string
  executionTime: string
  executionDuration: number
  clientIpAddress: string
  userName: string
  url: string
  httpMethod: string
  httpStatusCode?: number
  module: string
  action: string
  hasException: boolean
}

/**
 * 字段级修改明细。
 */
export interface EntityPropertyChangeDto {
  propertyName: string
  originalValue: string
  newValue: string
}

/**
 * 实体级修改明细。
 */
export interface EntityChangeDto {
  entityTypeFullName: string
  changeType: number // 0 = Created, 1 = Updated, 2 = Deleted
  entityId: string
  propertyChanges: EntityPropertyChangeDto[]
}

/**
 * 操作日志详情数据模型。
 */
export interface AuditLogDetailDto extends AuditLogDto {
  exceptions?: string
  browserInfo?: string
  entityChanges: EntityChangeDto[]
}

const baseUrl = '/api/app/audit-log'

/**
 * 获取操作日志分页列表。
 */
export async function getList(params: GetAuditLogsInput) {
  const res = await request.get<PagedResultDto<AuditLogDto>>(baseUrl, { params })
  return res.data
}

/**
 * 获取单个操作日志的详细记录（含变更明细）。
 */
export async function get(id: string) {
  const res = await request.get<AuditLogDetailDto>(`${baseUrl}/${id}`)
  return res.data
}

export default { getList, get }
