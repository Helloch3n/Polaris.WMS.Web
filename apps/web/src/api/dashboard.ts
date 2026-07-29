import request from '../utils/request'

export interface DashboardFlowDto {
  label: string
  done: number
  total: number
}

export interface DashboardOperationsSummaryDto {
  pendingPutawayCount: number
  pendingMoveCount: number
  pendingPickCount: number
  pendingReviewCount: number
  inboundFlows: DashboardFlowDto[]
  internalFlows: DashboardFlowDto[]
  outboundFlows: DashboardFlowDto[]
}

export async function getOperationsSummary() {
  const response = await request.get<DashboardOperationsSummaryDto>('/api/app/dashboard/operations-summary')
  return response.data
}
