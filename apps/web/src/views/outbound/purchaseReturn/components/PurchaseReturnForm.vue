<script setup lang="ts">
import WmsStatusTag from '../../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCheckbox, NDataTable, NDatePicker, NDescriptions, NDescriptionsItem, NEmpty, NInput, NInputNumber, NModal, NSelect, NSpin, NTag, useMessage } from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import * as receiptApi from '../../../../api/inbound/purchaseReceipt'
import * as api from '../../../../api/outbound/purchaseReturn'
import BaseCrudPage from '../../../../components/BaseCrudPage.vue'
import CopyableText from '../../../../components/CopyableText.vue'
import { useAuthStore } from '../../../../stores/auth'
import PurchaseReturnReservationTable from './PurchaseReturnReservationTable.vue'

const props = defineProps<{ mode: 'create' | 'edit'; orderId?: string }>()
const router = useRouter(); const auth = useAuthStore(); const message = useMessage()
const loading = ref(false); const saving = ref(false); const receiptLoading = ref(false)
const receipts = ref<receiptApi.PurchaseReceiptDto[]>([])
const receipt = ref<api.ReturnableReceipt | null>(null); const details = ref<api.PurchaseReturnDetail[]>([])
const checkedDetailKeys = ref<string[]>([])
const expandedDetailKeys = ref<string[]>([])
const sourceVisible = ref(false); const inventoryVisible = ref(false); const targetLine = ref<api.PurchaseReturnDetail | null>(null)
const inventoryLoading = ref(false); const inventoryRows = ref<api.AvailableInventory[]>([])
const allocationDraft = ref<api.PurchaseReturnReservation[]>([])
const model = reactive<{ purchaseReceiptId: string | null; plannedReturnDate: string | null; remark: string }>({ purchaseReceiptId: null, plannedReturnDate: null, remark: '' })
const receiptOptions = computed<SelectOption[]>(() => receipts.value.map(x => ({ label: `${x.receiptNo} / ${x.supplierName || '-'}`, value: x.id })))
const canSave = computed(() => props.mode === 'create' ? auth.hasPermission('WMS.OutboundOps.PurchaseReturns.Create') : auth.hasPermission('WMS.OutboundOps.PurchaseReturns.Update'))
const sourceRows = computed(() => receipt.value?.details.filter(x => x.returnableQuantity > 0 || details.value.some(d => d.purchaseReceiptDetailId === x.purchaseReceiptDetailId)) ?? [])
const allocationTotal = computed(() => allocationDraft.value.reduce((sum, x) => sum + Number(x.reservedQuantity || 0), 0))
const allocationRemaining = computed(() => Number(((targetLine.value?.returnQuantity ?? 0) - allocationTotal.value).toFixed(4)))
const selectedDetails = computed(() => {
  const selectedKeys = new Set(checkedDetailKeys.value)
  return details.value.filter(row => selectedKeys.has(row.purchaseReceiptDetailId))
})

function reservationTotal(row: api.PurchaseReturnDetail) { return row.reservations.reduce((sum, x) => sum + Number(x.reservedQuantity || 0), 0) }
function remaining(row: api.PurchaseReturnDetail) { return Number((row.returnQuantity - reservationTotal(row)).toFixed(4)) }
function createDetail(source: api.ReturnableReceiptDetail): api.PurchaseReturnDetail {
  return { purchaseReceiptDetailId: source.purchaseReceiptDetailId, purchaseOrderDetailId: source.purchaseOrderDetailId, productId: source.productId,
    productCode: source.productCode, productName: source.productName, unit: source.unit || '-', batchNo: source.batchNo,
    receivedQuantity: source.receivedQuantity, returnQuantity: source.returnableQuantity, reason: '', reservations: [] }
}
const detailColumns: DataTableColumns<api.PurchaseReturnDetail> = [
  {
    type: 'expand', fixed: 'left', width: 44,
    expandable: row => row.reservations.length > 0,
    renderExpand: row => h(PurchaseReturnReservationTable, { reservations: row.reservations, unit: row.unit }),
  },
  { type: 'selection', fixed: 'left', width: 44 },
  { title: '物料编码', key: 'productCode', minWidth: 130, render: r => h(CopyableText, { value: r.productCode }) },
  { title: '物料名称', key: 'productName', minWidth: 160 }, { title: '批次', key: 'batchNo', width: 110, render: r => r.batchNo || '-' },
  { title: '实收数量', key: 'receivedQuantity', width: 100, align: 'right' },
  { title: '可退数量', key: 'returnable', width: 100, align: 'right', render: r => sourceRows.value.find(x => x.purchaseReceiptDetailId === r.purchaseReceiptDetailId)?.returnableQuantity ?? r.receivedQuantity },
  { title: '退货数量', key: 'returnQuantity', width: 135, render: r => h(NInputNumber, { value: r.returnQuantity, min: 0.0001, precision: 4, 'onUpdate:value': v => r.returnQuantity = Number(v || 0) }) },
  { title: '库存分配', key: 'allocation', width: 220, render: row => {
    const allocated = reservationTotal(row)
    const pending = remaining(row)
    const label = pending > 0 ? '待分配' : pending < 0 ? '已超额' : '已分配'
    const type = pending > 0 ? 'warning' : pending < 0 ? 'error' : 'success'
    return h('div', { class: 'allocation-cell' }, [
      h('span', { class: 'allocation-count' }, `${row.reservations.length} 笔`),
      h('span', { class: 'allocation-quantity' }, `${allocated} / ${row.returnQuantity}`),
      h(WmsStatusTag, { type }, { default: () => label }),
    ])
  } },
]
const sourceColumns: DataTableColumns<api.ReturnableReceiptDetail> = [
  { title: '物料编码', key: 'productCode', minWidth: 130 }, { title: '物料名称', key: 'productName', minWidth: 160 },
  { title: '批次', key: 'batchNo', width: 110, render: r => r.batchNo || '-' }, { title: '实收', key: 'receivedQuantity', width: 90, align: 'right' },
  { title: '已完成', key: 'completedReturnQuantity', width: 90, align: 'right' }, { title: '已分配', key: 'reservedReturnQuantity', width: 90, align: 'right' },
  { title: '当前可退', key: 'returnableQuantity', width: 100, align: 'right' },
  { title: '操作', key: 'action', width: 76, fixed: 'right', render: r => h(NButton, { size: 'small', disabled: details.value.some(x => x.purchaseReceiptDetailId === r.purchaseReceiptDetailId), onClick: () => addSource(r) }, { default: () => details.value.some(x => x.purchaseReceiptDetailId === r.purchaseReceiptDetailId) ? '已添加' : '添加' }) },
]
const inventoryColumns: DataTableColumns<api.AvailableInventory> = [
  { title: '选择', key: 'selected', width: 58, align: 'center', render: r => h(NCheckbox, {
    checked: Boolean(findAllocation(r.inventoryId)),
    'onUpdate:checked': checked => toggleInventory(r, checked),
  }) },
  { title: '盘号', key: 'containerCode', minWidth: 160 },
  { title: '库位', key: 'locationCode', width: 130 },
  { title: '状态', key: 'inventoryStatus', width: 90, render: r => {
    const status = Number(r.inventoryStatus)
    const label = status === api.PurchaseReturnInventoryStatus.Good ? '良品' : status === api.PurchaseReturnInventoryStatus.Hold ? '待检' : '隔离'
    const type = status === api.PurchaseReturnInventoryStatus.Good ? 'success' : status === api.PurchaseReturnInventoryStatus.Hold ? 'warning' : 'error'
    return h(WmsStatusTag, { size: 'small', type, bordered: false }, { default: () => label })
  } },
  { title: '可用量', key: 'availableQuantity', width: 110, align: 'right' },
  { title: '退货数量', key: 'returnQuantity', width: 160, render: r => {
    const allocation = findAllocation(r.inventoryId)
    return h(NInputNumber, {
      value: allocation?.reservedQuantity ?? null,
      min: 0.0001,
      max: r.availableQuantity,
      precision: 4,
      disabled: !allocation,
      placeholder: '勾选后填写',
      'onUpdate:value': value => updateAllocationQuantity(r.inventoryId, Number(value || 0)),
    })
  } },
  { title: '单位', key: 'unit', width: 80 },
]

function selectReceipt(id: string | null) {
  model.purchaseReceiptId = id
  details.value = []
  checkedDetailKeys.value = []
  expandedDetailKeys.value = []
  const selected = receipts.value.find(x => x.id === id)
  receipt.value = selected ? {
    id: selected.id,
    receiptNo: selected.receiptNo,
    receiptSourceDocType: selected.sourceDocType,
    receiptSourceDocNo: selected.sourceDocNo,
    warehouseId: selected.warehouseId,
    warehouseCode: selected.warehouseCode,
    warehouseName: selected.warehouseName,
    purchaseOrderId: selected.purchaseOrderId,
    purchaseOrderNo: selected.purchaseOrderNo,
    supplierId: selected.supplierId,
    supplierName: selected.supplierName || '',
    details: [],
  } : null
}
async function openSourcePicker() {
  if (!model.purchaseReceiptId) return
  sourceVisible.value = true
  receiptLoading.value = true
  try {
    receipt.value = await api.getReturnableReceipt(
      model.purchaseReceiptId,
      props.mode === 'edit' ? props.orderId : undefined,
    )
  } finally {
    receiptLoading.value = false
  }
}
function addSource(source: api.ReturnableReceiptDetail) {
  details.value.push(createDetail(source))
  checkedDetailKeys.value = [source.purchaseReceiptDetailId]
  sourceVisible.value = false
}
function updateCheckedDetailKeys(keys: Array<string | number>) {
  checkedDetailKeys.value = keys.map(String)
}
function updateExpandedDetailKeys(keys: Array<string | number>) {
  expandedDetailKeys.value = keys.map(String)
}
function allocateSelectedInventory() {
  if (selectedDetails.value.length !== 1) {
    message.warning('请选择一条退货明细进行库存分配')
    return
  }
  const selectedDetail = selectedDetails.value[0]
  if (selectedDetail) openInventory(selectedDetail)
}
function removeSelectedDetails() {
  if (!checkedDetailKeys.value.length) {
    message.warning('请至少选择一条退货明细')
    return
  }
  const selectedKeys = new Set(checkedDetailKeys.value)
  details.value = details.value.filter(row => !selectedKeys.has(row.purchaseReceiptDetailId))
  expandedDetailKeys.value = expandedDetailKeys.value.filter(key => !selectedKeys.has(key))
  checkedDetailKeys.value = []
  message.success('已移除选中明细')
}
async function openInventory(row: api.PurchaseReturnDetail) {
  if (!model.purchaseReceiptId) {
    message.warning('请先选择采购收货单')
    return
  }
  targetLine.value = row
  inventoryVisible.value = true
  inventoryLoading.value = true
  allocationDraft.value = row.reservations.map(x => ({ ...x }))
  try {
    inventoryRows.value = await api.getAvailableInventory(row.productId, row.batchNo, model.purchaseReceiptId, row.id)
  } finally {
    inventoryLoading.value = false
  }
}
function findAllocation(inventoryId: string) {
  return allocationDraft.value.find(x => x.inventoryId === inventoryId)
}
function toggleInventory(row: api.AvailableInventory, checked: boolean) {
  const current = findAllocation(row.inventoryId)
  if (!checked) {
    allocationDraft.value = allocationDraft.value.filter(x => x.inventoryId !== row.inventoryId)
    return
  }
  if (current) return
  const remainingQuantity = Math.max(0, allocationRemaining.value)
  if (remainingQuantity <= 0) {
    message.warning('退货数量已分配完成，请先调整已选库存')
    return
  }
  const quantity = Math.min(Number(row.availableQuantity), remainingQuantity)
  if (quantity <= 0) {
    message.warning('该库存当前没有可分配数量')
    return
  }
  allocationDraft.value.push({
    inventoryId: row.inventoryId,
    containerId: row.containerId,
    containerCode: row.containerCode,
    locationId: row.locationId,
    locationCode: row.locationCode,
    inventoryStatus: row.inventoryStatus,
    reservedQuantity: quantity,
    status: api.PurchaseReturnReservationStatus.Active,
  })
}
function updateAllocationQuantity(inventoryId: string, quantity: number) {
  const allocation = findAllocation(inventoryId)
  if (allocation) allocation.reservedQuantity = quantity
}
function addInventory() {
  if (!targetLine.value) return
  const invalid = allocationDraft.value.some(x => {
    const inventory = inventoryRows.value.find(row => row.inventoryId === x.inventoryId)
    return !inventory || x.reservedQuantity <= 0 || x.reservedQuantity > inventory.availableQuantity
  })
  if (invalid || Number(allocationTotal.value.toFixed(4)) !== Number(targetLine.value.returnQuantity.toFixed(4))) {
    message.warning('每笔退货数量必须有效，且分配合计必须等于明细退货数量')
    return
  }
  targetLine.value.reservations = allocationDraft.value.map(x => ({ ...x }))
  if (!expandedDetailKeys.value.includes(targetLine.value.purchaseReceiptDetailId)) {
    expandedDetailKeys.value = [...expandedDetailKeys.value, targetLine.value.purchaseReceiptDetailId]
  }
  inventoryVisible.value = false
}
function validate() { if (!model.purchaseReceiptId || !details.value.length) { message.warning('请选择采购收货单并添加退货明细'); return false } for (const row of details.value) { const max = sourceRows.value.find(x => x.purchaseReceiptDetailId === row.purchaseReceiptDetailId)?.returnableQuantity ?? 0; if (row.returnQuantity <= 0 || row.returnQuantity > max || remaining(row) !== 0) { message.warning(`${row.productCode} 的退货数量或库存分配不正确`); return false } } return true }
async function save() { if (!validate()) return; saving.value = true; try { const payload: api.SavePurchaseReturnOrder = { purchaseReceiptId: model.purchaseReceiptId!, plannedReturnDate: model.plannedReturnDate, remark: model.remark, details: details.value.map(x => ({ purchaseReceiptDetailId: x.purchaseReceiptDetailId, returnQuantity: x.returnQuantity, reason: x.reason, reservations: x.reservations.map(r => ({ inventoryId: r.inventoryId, reservedQuantity: r.reservedQuantity })) })) }; const result = props.mode === 'create' ? await api.create(payload) : await api.update(props.orderId!, payload); message.success('草稿已保存，库存已锁定'); router.replace(`/outboundManagement/purchase-return/${result.id}`) } finally { saving.value = false } }
async function initialize() {
  if (!auth.currentWarehouseId) {
    message.warning('请先选择具体仓库后再新增或编辑采购退货单')
    router.replace('/outboundManagement/purchase-return')
    return
  }
  loading.value = true; checkedDetailKeys.value = []; expandedDetailKeys.value = []
  try {
    const receiptData = await receiptApi.getList({ maxResultCount: 200, sorting: 'CreationTime desc' })
    receipts.value = receiptData.items
    if (props.mode === 'edit' && props.orderId) {
      const order = await api.get(props.orderId)
      if (order.warehouseId !== auth.currentWarehouseId) {
        message.error('当前仓库与采购退货单仓库不一致')
        router.replace('/outboundManagement/purchase-return')
        return
      }
      model.purchaseReceiptId = order.purchaseReceiptId; model.plannedReturnDate = order.plannedReturnDate || null; model.remark = order.remark || ''
      receipt.value = await api.getReturnableReceipt(order.purchaseReceiptId, order.id); details.value = order.details
    }
  } finally { loading.value = false }
}
onMounted(initialize)
</script>

<template>
  <BaseCrudPage><template #actions-left><div class="crud-action-main"><n-button @click="router.push('/outboundManagement/purchase-return')">返回列表</n-button><n-button @click="initialize">刷新</n-button><n-button v-if="canSave" type="primary" :loading="saving" @click="save">保存草稿</n-button></div></template><template #data><n-spin :show="loading" class="form-workbench"><n-descriptions bordered :column="2" label-placement="left" size="small" class="wms-header-table"><n-descriptions-item label="退货单号"><strong>{{ mode === 'create' ? '保存后生成' : '-' }}</strong></n-descriptions-item><n-descriptions-item label="采购收货单"><n-select filterable size="small" :value="model.purchaseReceiptId" :options="receiptOptions" placeholder="选择采购收货单" :disabled="mode === 'edit'" @update:value="selectReceipt" /></n-descriptions-item><n-descriptions-item label="仓库">{{ receipt?.warehouseName ? `${receipt.warehouseCode} / ${receipt.warehouseName}` : '-' }}</n-descriptions-item><n-descriptions-item label="供应商">{{ receipt?.supplierName || '-' }}</n-descriptions-item><n-descriptions-item label="收货来源">{{ receipt ? `${receipt.receiptSourceDocType} / ${receipt.receiptSourceDocNo}` : '-' }}</n-descriptions-item><n-descriptions-item label="来源采购单">{{ receipt?.purchaseOrderNo || '-' }}</n-descriptions-item><n-descriptions-item label="计划退货日期"><n-date-picker size="small" :value="model.plannedReturnDate ? Date.parse(model.plannedReturnDate) : null" type="date" clearable @update:value="v => model.plannedReturnDate = v ? new Date(v).toISOString() : null" /></n-descriptions-item><n-descriptions-item label="备注"><n-input v-model:value="model.remark" size="small" placeholder="选填" /></n-descriptions-item></n-descriptions><div class="detail-toolbar"><strong>退货明细</strong><n-button type="primary" secondary :disabled="!receipt" @click="openSourcePicker">添加收货明细</n-button><n-button type="primary" secondary :disabled="selectedDetails.length !== 1" @click="allocateSelectedInventory">分配库存</n-button><n-button type="error" secondary :disabled="checkedDetailKeys.length === 0" @click="removeSelectedDetails">移除</n-button><n-tag :bordered="false">{{ details.length }} 条</n-tag></div><n-data-table class="detail-table" flex-height :columns="detailColumns" :data="details" :row-key="row => row.purchaseReceiptDetailId" :checked-row-keys="checkedDetailKeys" :expanded-row-keys="expandedDetailKeys" :scroll-x="1460" @update:checked-row-keys="updateCheckedDetailKeys" @update:expanded-row-keys="updateExpandedDetailKeys" /></n-spin></template></BaseCrudPage>
  <n-modal v-model:show="sourceVisible" preset="card" title="选择可退收货明细" style="width: min(1040px, 92vw)"><n-spin :show="receiptLoading"><n-data-table v-if="sourceRows.length" :columns="sourceColumns" :data="sourceRows" :row-key="row => row.purchaseReceiptDetailId" :scroll-x="920" /><n-empty v-else-if="!receiptLoading" description="该收货单尚未完成实际收货，或当前已没有可退数量" class="source-empty" /></n-spin></n-modal>
  <n-modal v-model:show="inventoryVisible" preset="card" title="分配退货库存" style="width: min(1120px, 94vw)"><div class="allocation-summary"><div><strong>{{ targetLine?.productCode || '-' }}</strong><span>{{ targetLine?.productName || '-' }}</span><span>批次 {{ targetLine?.batchNo || '-' }}</span></div><div class="allocation-metrics"><span>目标 <strong>{{ targetLine?.returnQuantity || 0 }}</strong></span><span>已分配 <strong>{{ Number(allocationTotal.toFixed(4)) }}</strong></span><span :class="{ 'is-error': allocationRemaining < 0 }">待分配 <strong>{{ allocationRemaining }}</strong></span></div></div><n-data-table v-if="inventoryLoading || inventoryRows.length" :columns="inventoryColumns" :data="inventoryRows" :row-key="row => row.inventoryId" :loading="inventoryLoading" :scroll-x="760" /><n-empty v-else description="当前物料、批次和仓库下没有可用库存" class="inventory-empty" /><div class="picker-footer"><n-button @click="inventoryVisible = false">取消</n-button><n-button type="primary" @click="addInventory">确认分配</n-button></div></n-modal>
</template>

<style scoped>
.form-workbench { width:100%; height:100%; min-height:0; overflow:auto; }
.form-workbench :deep(.n-spin-content) { min-height:100%; display:flex; flex-direction:column; }
.detail-table { flex:1 0 180px; min-height:180px; }
.detail-toolbar,.picker-footer { display:flex; align-items:center; gap:8px; }
.detail-toolbar { flex:0 0 auto; min-height:40px; padding:4px 2px; }
.allocation-cell { display:flex; align-items:center; gap:8px; white-space:nowrap; }
.allocation-count { color:var(--wms-text-secondary); }
.allocation-quantity { min-width:64px; color:var(--wms-text-primary); font-variant-numeric:tabular-nums; text-align:right; }
.picker-footer { justify-content:flex-end; margin-top:12px; }
.allocation-summary { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px 16px; margin:8px 0 12px; color:var(--wms-text-secondary); }
.allocation-summary>div,.allocation-metrics { display:flex; align-items:center; flex-wrap:wrap; gap:8px 16px; }
.allocation-summary strong { color:var(--wms-text-primary); }
.allocation-metrics .is-error,.allocation-metrics .is-error strong { color:var(--wms-status-error); }
.source-empty,.inventory-empty { padding:42px 12px; }
:deep(.wms-header-table .n-descriptions-table-header) { width:120px; white-space:nowrap; }
:deep(.wms-header-table .n-descriptions-table-header),
:deep(.wms-header-table .n-descriptions-table-content) { padding-top:8px; padding-bottom:8px; }
:deep(.wms-header-table .n-input),:deep(.wms-header-table .n-select),:deep(.wms-header-table .n-date-picker) { width:100%; }
</style>
