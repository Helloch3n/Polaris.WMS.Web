import request from '../../utils/request'

export const PurchaseReturnStatus = { Draft: 0, PendingApproval: 1, PendingOutbound: 2, Completed: 3, Cancelled: 4 } as const
export type PurchaseReturnStatus = (typeof PurchaseReturnStatus)[keyof typeof PurchaseReturnStatus]
export const PurchaseReturnReservationStatus = { Active: 0, Consumed: 1, Released: 2 } as const

export interface PurchaseReturnReservation {
  id?: string
  inventoryId: string
  containerId?: string | null
  containerCode?: string | null
  locationId?: string | null
  locationCode?: string | null
  inventoryStatus?: number | null
  reservedQuantity: number
  status?: number
}
export interface PurchaseReturnDetail {
  id?: string; purchaseReceiptDetailId: string; purchaseOrderDetailId?: string | null; lineNo?: number
  productId: string; productCode: string; productName: string; unit: string; batchNo?: string | null
  receivedQuantity: number; returnQuantity: number
  reason?: string | null; reservations: PurchaseReturnReservation[]
}
export interface PurchaseReturnOrder {
  id: string; returnNo: string; purchaseReceiptId: string; purchaseReceiptNo: string; receiptSourceDocType: string; receiptSourceDocNo: string
  warehouseId: string; warehouseCode: string; warehouseName: string
  purchaseOrderId: string; purchaseOrderNo: string
  supplierId?: string | null; supplierCode: string; supplierName: string; plannedReturnDate?: string | null; remark?: string | null
  status: PurchaseReturnStatus; approvalTime?: string | null; completionTime?: string | null
  creationTime?: string; creatorName?: string | null; lastModificationTime?: string | null; lastModifierName?: string | null
  details: PurchaseReturnDetail[]
}
export interface SavePurchaseReturnOrder { purchaseReceiptId: string; plannedReturnDate?: string | null; remark?: string | null; details: Array<Pick<PurchaseReturnDetail, 'purchaseReceiptDetailId' | 'returnQuantity' | 'reason'> & { reservations: Array<Pick<PurchaseReturnReservation, 'inventoryId' | 'reservedQuantity'>> }> }
export interface PurchaseReturnSearch { returnNo?: string; purchaseReceiptNo?: string; supplierName?: string; status?: PurchaseReturnStatus; skipCount?: number; maxResultCount?: number; sorting?: string }

export interface ReturnableReceiptDetail {
  purchaseReceiptDetailId: string; purchaseOrderDetailId?: string | null; productId: string; productCode: string; productName: string; unit: string; batchNo?: string | null
  receivedQuantity: number; completedReturnQuantity: number; reservedReturnQuantity: number; returnableQuantity: number
}
export interface ReturnableReceipt {
  id: string; receiptNo: string; receiptSourceDocType: string; receiptSourceDocNo: string
  warehouseId: string; warehouseCode: string; warehouseName: string
  purchaseOrderId: string; purchaseOrderNo: string; supplierId?: string | null; supplierName: string
  details: ReturnableReceiptDetail[]
}
export const PurchaseReturnInventoryStatus = { Good: 0, Hold: 2, Quarantine: 3 } as const
export interface AvailableInventory { inventoryId: string; containerId: string; containerCode: string; locationId: string; locationCode: string; availableQuantity: number; unit: string; inventoryStatus: number }

const baseUrl = '/api/app/purchase-return-order'
export async function getList(params: PurchaseReturnSearch) { return (await request.get<{ totalCount: number; items: PurchaseReturnOrder[] }>(baseUrl, { params })).data }
export async function get(id: string) { return (await request.get<PurchaseReturnOrder>(`${baseUrl}/${id}`)).data }
export async function create(data: SavePurchaseReturnOrder) { return (await request.post<PurchaseReturnOrder>(baseUrl, data)).data }
export async function update(id: string, data: SavePurchaseReturnOrder) { return (await request.put<PurchaseReturnOrder>(`${baseUrl}/${id}`, data)).data }
export async function remove(id: string) { await request.delete(`${baseUrl}/${id}`) }
export async function submit(id: string) { await request.post(`${baseUrl}/${id}/submit`) }
export async function approve(id: string) { await request.post(`${baseUrl}/${id}/approve`) }
export async function reject(id: string) { await request.post(`${baseUrl}/${id}/reject`) }
export async function cancel(id: string) { await request.post(`${baseUrl}/${id}/cancel`) }
export async function execute(id: string) { await request.post(`${baseUrl}/${id}/execute`) }
export async function getReturnableReceipt(purchaseReceiptId: string, excludeOrderId?: string) { return (await request.get<ReturnableReceipt>(`${baseUrl}/returnable-purchase-receipt`, { params: { purchaseReceiptId, excludeOrderId } })).data }
export async function getAvailableInventory(productId: string, batchNo: string | null | undefined, purchaseReceiptId: string, purchaseReturnDetailId?: string) { return (await request.get<AvailableInventory[]>(`${baseUrl}/available-inventory`, { params: { productId, batchNo, purchaseReceiptId, purchaseReturnDetailId } })).data }
