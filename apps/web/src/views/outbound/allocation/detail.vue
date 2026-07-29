<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import {
  NButton, NCheckbox, NDataTable, NDescriptions, NDescriptionsItem, NEmpty, NInput,
  NModal, NSpace, NTag, useDialog, useMessage,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import * as api from '../../../api/outbound/salesAllocationOrder'
import { usePermission } from '../../../composables/usePermission'
import { withResizable } from '../../../utils/table'
import SalesAllocationReservationTable from './SalesAllocationReservationTable.vue'
import type { EditableSalesAllocationReservation } from './SalesAllocationReservationTable.vue'

type EditableDetail = Omit<api.SalesAllocationDetailDto, 'reservations'> & {
  reservations: EditableSalesAllocationReservation[]
}
type EditableOrder = Omit<api.SalesAllocationOrderDto, 'details'> & { details: EditableDetail[] }
type InventoryRow = api.AvailableInventoryDto & { selected: boolean; alreadyAdded: boolean }

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const { hasPermission } = usePermission()
const id = computed(() => String(route.params.id ?? ''))
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const order = ref<EditableOrder | null>(null)
const dirty = ref(false)
const modalVisible = ref(false)
const inventoryLoading = ref(false)
const currentDetail = ref<EditableDetail | null>(null)
const inventoryRows = ref<InventoryRow[]>([])
const checkedDetailKeys = ref<DataTableRowKey[]>([])
const expandedDetailKeys = ref<DataTableRowKey[]>([])
const scanCode = ref('')

const selectedDetail = computed(() => {
  const key = checkedDetailKeys.value[0]
  return order.value?.details.find(x => x.id === key) ?? null
})
const canUpdatePermission = computed(() => hasPermission('WMS.OutboundOps.SalesAllocationOrders.Update'))
const canDeletePermission = computed(() => hasPermission('WMS.OutboundOps.SalesAllocationOrders.Delete'))
const canConfirmPermission = computed(() => hasPermission('WMS.OutboundOps.SalesAllocationOrders.Confirm'))
const canCreateWave = computed(() => hasPermission('WMS.OutboundOps.Waves.Create'))
const editable = computed(() => canUpdatePermission.value && [10, 20, 30].includes(Number(order.value?.status)))
const deletable = computed(() => canDeletePermission.value && [10, 20, 30].includes(Number(order.value?.status)))
const canConfirm = computed(() => canConfirmPermission.value && !dirty.value && order.value?.status === 30)
const canRevoke = computed(() => canConfirmPermission.value && order.value?.status === 40)
const selectedInventoryCount = computed(() => inventoryRows.value.filter(x => x.selected && !x.alreadyAdded).length)
const statusLabels: Record<number, string> = {
  10: '待配货', 20: '部分配货', 30: '已配齐', 40: '已确认',
  50: '执行中', 60: '已完成', 90: '已取消',
}

function qty(value: number) {
  return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}
function date(value?: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}
function reservationKey(value: { inventoryId: string; inventoryAllocationId?: string | null }) {
  return `${value.inventoryId}|${value.inventoryAllocationId ?? ''}`
}
function reservationTotal(detail: EditableDetail) {
  return detail.reservations.reduce((sum, item) => sum + Number(item.qty || 0), 0)
}
function difference(detail: EditableDetail) {
  return Number((detail.plannedQty - reservationTotal(detail)).toFixed(4))
}
function inventoryMaximum(row: api.AvailableInventoryDto) {
  return row.isDedicated
    ? Math.min(row.availableQuantity, row.relationshipAvailableQuantity)
    : row.availableQuantity
}
function allocationMeta(detail: EditableDetail) {
  const gap = difference(detail)
  return {
    label: gap > 0 ? '待分配' : gap < 0 ? '已超额' : '已配齐',
    type: gap > 0 ? 'warning' as const : gap < 0 ? 'error' as const : 'success' as const,
  }
}

const detailColumns = computed<DataTableColumns<EditableDetail>>(() => [
  {
    type: 'expand',
    fixed: 'left',
    width: 44,
    expandable: row => row.reservations.length > 0,
    renderExpand: row => h(SalesAllocationReservationTable, {
      reservations: row.reservations,
      editable: editable.value,
      unit: row.unit,
      onQuantityChange: (reservation, value) => updateReservationQuantity(reservation, value),
      onRemove: reservation => removeReservation(row, reservation),
    }),
  },
  { type: 'selection', multiple: false, fixed: 'left', width: 44 },
  ...withResizable<EditableDetail>([
    { title: '计划行', key: 'lineNo', width: 80, align: 'center' },
    { title: '订单行', key: 'salesOrderLineNo', width: 80, align: 'center' },
    { title: '物料编码', key: 'productCode', minWidth: 160, render: row => h(CopyableText, { value: row.productCode }) },
    { title: '物料名称', key: 'productName', minWidth: 180 },
    { title: '计划数量', key: 'plannedQty', width: 110, align: 'right', render: row => qty(row.plannedQty) },
    {
      title: '库存分配',
      key: 'allocation',
      width: 110,
      render: row => {
        const meta = allocationMeta(row)
        return h('div', { class: 'allocation-cell' }, [
          h(WmsStatusTag, { type: meta.type }, { default: () => meta.label }),
        ])
      },
    },
    {
      title: '缺口',
      key: 'differenceQty',
      width: 100,
      align: 'right',
      render: row => h('span', { class: difference(row) > 0 ? 'qty-gap' : '' }, qty(difference(row))),
    },
    { title: '单位', key: 'unit', width: 80 },
  ]),
])

const inventoryColumns = computed<DataTableColumns<InventoryRow>>(() => withResizable([
  {
    title: '选择',
    key: 'selected',
    width: 64,
    align: 'center',
    render: row => h(NCheckbox, {
      checked: row.alreadyAdded || row.selected,
      disabled: row.alreadyAdded,
      'onUpdate:checked': value => { row.selected = value },
    }),
  },
  {
    title: '类型',
    key: 'isDedicated',
    width: 100,
    render: row => h(WmsStatusTag, {
      size: 'small',
      type: row.isDedicated ? 'success' : 'default',
      bordered: false,
    }, { default: () => row.isDedicated ? '专属库存' : '普通库存' }),
  },
  { title: '盘号', key: 'containerCode', minWidth: 150 },
  { title: '库位', key: 'locationCode', minWidth: 130 },
  { title: '批次', key: 'batchNo', minWidth: 120, render: row => row.batchNo || '-' },
  { title: 'SN', key: 'sn', minWidth: 140, render: row => row.sn || '-' },
  { title: 'FIFO日期', key: 'fifoDate', width: 170, render: row => date(row.fifoDate) },
  { title: '实际可用', key: 'availableQuantity', width: 110, align: 'right', render: row => qty(row.availableQuantity) },
  {
    title: '归属可用',
    key: 'relationshipAvailableQuantity',
    width: 110,
    align: 'right',
    render: row => row.isDedicated ? qty(row.relationshipAvailableQuantity) : '-',
  },
  {
    title: '状态',
    key: 'alreadyAdded',
    width: 90,
    render: row => row.alreadyAdded
      ? h(WmsStatusTag, { size: 'small', type: 'info', bordered: false }, { default: () => '已添加' })
      : '-',
  },
]))

async function enrichDetail(detail: api.SalesAllocationDetailDto): Promise<EditableDetail> {
  let candidates: api.AvailableInventoryDto[] = []
  try {
    candidates = await api.getAvailableInventory(id.value, detail.id)
  } catch {
    // 主单仍可展示；分配时会重新加载并显示具体错误。
  }
  return {
    ...detail,
    reservations: detail.reservations.map(reservation => {
      const candidate = candidates.find(x => reservationKey(x) === reservationKey(reservation))
      return {
        ...reservation,
        availableQuantity: candidate?.availableQuantity ?? reservation.qty,
        relationshipAvailableQuantity: candidate?.relationshipAvailableQuantity ?? (reservation.isDedicated ? reservation.qty : 0),
        unit: candidate?.unit || detail.unit,
      }
    }),
  }
}

async function setOrder(value: api.SalesAllocationOrderDto) {
  order.value = {
    ...value,
    details: await Promise.all(value.details.map(enrichDetail)),
  }
  dirty.value = false
  checkedDetailKeys.value = []
  expandedDetailKeys.value = []
}

function confirmDiscard(action: string) {
  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: '放弃未保存修改',
      content: `当前存在未保存的库存分配，确定${action}吗？`,
      positiveText: '放弃并继续',
      negativeText: '继续编辑',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })
}

async function load(force = false) {
  if (dirty.value && !force && !(await confirmDiscard('放弃并刷新'))) return
  loading.value = true
  try {
    await setOrder(await api.get(id.value))
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载销售配货失败')
  } finally {
    loading.value = false
  }
}

async function openInventory(detail?: EditableDetail | null) {
  const target = detail ?? selectedDetail.value
  if (!target) return void message.warning('请选择一条发货计划明细')
  currentDetail.value = target
  modalVisible.value = true
  scanCode.value = ''
  inventoryLoading.value = true
  try {
    const rows = await api.getAvailableInventory(id.value, target.id)
    const existing = new Set(target.reservations.map(reservationKey))
    inventoryRows.value = rows.map(row => ({
      ...row,
      selected: false,
      alreadyAdded: existing.has(reservationKey(row)),
    }))
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载可用库存失败')
  } finally {
    inventoryLoading.value = false
  }
}

async function scan() {
  if (!scanCode.value.trim() || !currentDetail.value) return
  try {
    const matches = await api.getAvailableInventory(id.value, currentDetail.value.id, scanCode.value.trim())
    if (!matches.length) return void message.warning('未找到当前配货明细可用的库存')
    const match = matches[0]!
    const row = inventoryRows.value.find(x => reservationKey(x) === reservationKey(match))
    if (!row) return void message.warning('该库存当前不可用于本明细')
    if (row.alreadyAdded) return void message.info(`${row.containerCode} 已添加`)
    row.selected = true
    message.success(`已选择 ${row.containerCode}`)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '扫码解析失败')
  }
}

function confirmInventorySelection() {
  const detail = currentDetail.value
  if (!detail) return
  const selected = inventoryRows.value
    .filter(x => x.selected && !x.alreadyAdded)
    .sort((a, b) => Number(b.isDedicated) - Number(a.isDedicated)
      || new Date(a.fifoDate).getTime() - new Date(b.fifoDate).getTime())
  if (!selected.length) return void message.warning('请选择需要添加的库存')

  let remaining = Math.max(0, difference(detail))
  let added = 0
  for (const row of selected) {
    if (remaining <= 0) break
    const suggested = Math.min(inventoryMaximum(row), remaining)
    if (suggested <= 0) continue
    detail.reservations.push({
      id: '',
      salesAllocationOrderId: order.value!.id,
      salesAllocationDetailId: detail.id,
      inventoryId: row.inventoryId,
      inventoryAllocationId: row.inventoryAllocationId,
      isDedicated: row.isDedicated,
      qty: suggested,
      containerId: row.containerId,
      containerCode: row.containerCode,
      sourceLocationId: row.locationId,
      sourceLocationCode: row.locationCode,
      batchNo: row.batchNo,
      sn: row.sn,
      fifoDate: row.fifoDate,
      status: 10,
      availableQuantity: row.availableQuantity,
      relationshipAvailableQuantity: row.relationshipAvailableQuantity,
      unit: row.unit || detail.unit,
    })
    remaining = Number((remaining - suggested).toFixed(4))
    added++
  }
  if (!added) return void message.warning('当前明细已配齐，请先在展开区域调整或删除库存')
  dirty.value = true
  if (!expandedDetailKeys.value.includes(detail.id)) {
    expandedDetailKeys.value = [...expandedDetailKeys.value, detail.id]
  }
  modalVisible.value = false
}

function updateReservationQuantity(
  reservation: EditableSalesAllocationReservation,
  value: number,
) {
  reservation.qty = value
  dirty.value = true
}

function removeReservation(detail: EditableDetail, reservation: EditableSalesAllocationReservation) {
  detail.reservations = detail.reservations.filter(x => x !== reservation)
  if (!detail.reservations.length) {
    expandedDetailKeys.value = expandedDetailKeys.value.filter(x => x !== detail.id)
  }
  dirty.value = true
}

function validateDraft() {
  if (!order.value) return false
  for (const detail of order.value.details) {
    for (const reservation of detail.reservations) {
      const maximum = reservation.isDedicated
        ? Math.min(reservation.availableQuantity, reservation.relationshipAvailableQuantity)
        : reservation.availableQuantity
      if (reservation.qty <= 0 || reservation.qty > maximum) {
        message.warning(`${detail.productCode} 的库存分配数量无效`)
        return false
      }
    }
    if (reservationTotal(detail) > detail.plannedQty) {
      message.warning(`${detail.productCode} 的库存分配数量超过计划数量`)
      return false
    }
  }
  return true
}

async function saveAll() {
  if (!order.value || !validateDraft()) return
  saving.value = true
  try {
    const result = await api.updateAllocations(order.value.id, {
      details: order.value.details.map(detail => ({
        detailId: detail.id,
        allocations: detail.reservations.map(x => ({
          inventoryId: x.inventoryId,
          inventoryAllocationId: x.inventoryAllocationId,
          qty: x.qty,
        })),
      })),
    })
    await setOrder(result)
    message.success('配货库存已保存，库存锁定已同步更新')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存配货库存失败')
    await load(true)
  } finally {
    saving.value = false
  }
}

async function confirmOrder() {
  if (!order.value) return
  if (dirty.value) return void message.warning('请先保存库存分配，再确认配货单')
  try {
    await setOrder(await api.confirm(order.value.id))
    message.success('销售配货已确认')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '确认失败')
  }
}

async function revoke() {
  if (!order.value) return
  try {
    await setOrder(await api.revokeConfirmation(order.value.id))
    message.success('已撤销确认')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '撤销确认失败')
  }
}

function deleteOrder() {
  if (!order.value) return
  dialog.warning({
    title: '删除销售配货',
    content: `确认删除 ${order.value.allocationNo}？已锁定的库存将同时释放。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      deleting.value = true
      try {
        await api.remove(order.value!.id)
        dirty.value = false
        message.success('销售配货已删除，库存锁定已释放')
        await router.replace({ name: 'SalesAllocationOrderList' })
      } catch (e) {
        message.error(e instanceof Error ? e.message : '删除失败')
      } finally {
        deleting.value = false
      }
    },
  })
}

async function backToList() {
  if (dirty.value && !(await confirmDiscard('放弃并返回列表'))) return
  dirty.value = false
  router.push({ name: 'SalesAllocationOrderList' })
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}
onBeforeRouteLeave(() => !dirty.value || confirmDiscard('放弃并离开当前页面'))
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  load()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))
</script>

<template>
  <BaseCrudPage>
    <template #actions-left>
      <div class="crud-action-main">
        <n-button @click="backToList">返回列表</n-button>
        <n-button :loading="loading" @click="load()">刷新</n-button>
        <n-button v-if="editable" type="primary" :loading="saving" :disabled="!dirty" @click="saveAll">保存</n-button>
        <n-button v-if="canConfirmPermission && order?.status === 30" type="success" :disabled="!canConfirm" @click="confirmOrder">确认</n-button>
        <n-button v-if="canRevoke" @click="revoke">撤销确认</n-button>
        <n-button v-if="deletable" type="error" secondary :loading="deleting" @click="deleteOrder">删除</n-button>
        <n-button
          v-if="canCreateWave && order?.status === 40"
          type="primary"
          @click="router.push({ name: 'WaveManagement', query: { allocationOrderId: order.id } })"
        >
          创建波次
        </n-button>
      </div>
    </template>
    <template #data>
      <div class="form-workbench">
        <n-descriptions bordered label-placement="left" :column="3" size="small" class="wms-header-table">
          <n-descriptions-item label="配货单号"><CopyableText :value="order?.allocationNo || '-'" strong /></n-descriptions-item>
          <n-descriptions-item label="状态"><WmsStatusTag>{{ statusLabels[Number(order?.status)] || '-' }}</WmsStatusTag></n-descriptions-item>
          <n-descriptions-item label="发货计划">{{ order?.salesDeliveryPlanNo || '-' }}</n-descriptions-item>
          <n-descriptions-item label="销售订单">{{ order?.salesOrderNo || '-' }}</n-descriptions-item>
          <n-descriptions-item label="客户">{{ order ? `${order.customerName} / ${order.customerCode}` : '-' }}</n-descriptions-item>
          <n-descriptions-item label="仓库">{{ order ? `${order.warehouseName} / ${order.warehouseCode}` : '-' }}</n-descriptions-item>
          <n-descriptions-item label="备注" :span="3">{{ order?.remark || '-' }}</n-descriptions-item>
        </n-descriptions>

        <div class="detail-toolbar">
          <strong>发货计划明细</strong>
          <n-button
            v-if="canUpdatePermission"
            type="primary"
            secondary
            :disabled="!editable || checkedDetailKeys.length !== 1"
            @click="openInventory()"
          >
            分配库存
          </n-button>
          <n-tag :bordered="false">{{ order?.details.length || 0 }} 条</n-tag>
          <n-tag v-if="dirty" type="warning" :bordered="false">有未保存修改</n-tag>
        </div>
        <n-data-table
          class="crud-table-flat detail-table"
          flex-height
          :loading="loading"
          :columns="detailColumns"
          :data="order?.details || []"
          :bordered="false"
          :row-key="row => row.id"
          :checked-row-keys="checkedDetailKeys"
          :expanded-row-keys="expandedDetailKeys"
          :scroll-x="1220"
          @update:checked-row-keys="keys => checkedDetailKeys = keys"
          @update:expanded-row-keys="keys => expandedDetailKeys = keys"
        >
          <template #empty><n-empty description="暂无配货明细" /></template>
        </n-data-table>
      </div>
    </template>
  </BaseCrudPage>

  <n-modal
    v-model:show="modalVisible"
    preset="card"
    style="width: min(1180px, 95vw)"
    :title="`选择库存 · ${currentDetail?.productName || ''}`"
  >
    <div class="inventory-toolbar">
      <n-input v-model:value="scanCode" placeholder="扫描或输入盘号、SN、库存二维码" clearable @keyup.enter="scan" />
      <n-button @click="scan">选择库存</n-button>
      <span>
        计划 {{ qty(currentDetail?.plannedQty || 0) }}，
        当前已配 {{ qty(currentDetail ? reservationTotal(currentDetail) : 0) }}，
        本次选择 {{ selectedInventoryCount }} 笔
      </span>
    </div>
    <n-data-table
      :loading="inventoryLoading"
      :columns="inventoryColumns"
      :data="inventoryRows"
      :bordered="false"
      :row-key="row => `${row.inventoryId}-${row.inventoryAllocationId || ''}`"
      max-height="520"
    />
    <template #footer>
      <n-space justify="end">
        <n-button @click="modalVisible = false">取消</n-button>
        <n-button @click="confirmInventorySelection">确认选择</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
.form-workbench { display: flex; min-height: 0; height: 100%; flex-direction: column; gap: 12px; }
.detail-toolbar { display: flex; align-items: center; gap: 10px; min-height: 34px; }
.detail-table { min-height: 280px; }
.allocation-cell { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.inventory-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.qty-gap { color: var(--wms-status-warning, #f0a020); font-weight: 600; }
</style>
