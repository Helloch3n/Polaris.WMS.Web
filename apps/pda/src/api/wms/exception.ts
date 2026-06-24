import { http } from '@/utils/http'

export const ExceptionType = {
  Damage: 'Damage',
  ShortPick: 'ShortPick',
  LocationIssue: 'LocationIssue',
  Other: 'Other',
} as const

export type ExceptionType = keyof typeof ExceptionType | string

export interface CreateExceptionReportDto {
  exceptionType: ExceptionType
  orderNo?: string | null
  containerCode?: string | null
  locationCode?: string | null
  description: string
}

export async function createExceptionReport(data: CreateExceptionReportDto) {
  const res = await http.post<void>('/api/app/exception-report', data)
  return res.data
}