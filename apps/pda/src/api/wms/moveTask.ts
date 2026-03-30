import http from '@/utils/http'

export interface CompleteMoveTaskDto {
  actualLocationCode: string;
}

export function completeMoveTask(id: string, data: CompleteMoveTaskDto) {
  return http.post(`/api/app/move-task/${id}/complete`, data)
}

export function getMoveTaskDetails(id: string) {
  return http.get(`/api/app/move-task/${id}`)
}