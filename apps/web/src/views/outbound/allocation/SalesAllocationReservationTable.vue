<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h } from 'vue'
import { NButton, NDataTable, NEmpty, NInputNumber } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import type { SalesAllocationReservationDto } from '../../../api/outbound/salesAllocationOrder'

export type EditableSalesAllocationReservation = SalesAllocationReservationDto & {
  availableQuantity: number
  relationshipAvailableQuantity: number
  unit: string
}

const props = defineProps<{
  reservations: EditableSalesAllocationReservation[]
  editable: boolean
  unit?: string
}>()

const emit = defineEmits<{
  quantityChange: [reservation: EditableSalesAllocationReservation, quantity: number]
  remove: [reservation: EditableSalesAllocationReservation]
}>()

function maximum(row: EditableSalesAllocationReservation) {
  return row.isDedicated
    ? Math.min(row.availableQuantity, row.relationshipAvailableQuantity)
    : row.availableQuantity
}

function formatQty(value: number) {
  return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}

const columns = computed<DataTableColumns<EditableSalesAllocationReservation>>(() => [
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
  { title: '库位', key: 'sourceLocationCode', minWidth: 130 },
  { title: '批次', key: 'batchNo', minWidth: 120, render: row => row.batchNo || '-' },
  { title: 'SN', key: 'sn', minWidth: 140, render: row => row.sn || '-' },
  { title: 'FIFO日期', key: 'fifoDate', width: 170, render: row => formatDate(row.fifoDate) },
  { title: '实际可用', key: 'availableQuantity', width: 110, align: 'right', render: row => formatQty(row.availableQuantity) },
  {
    title: '归属可用',
    key: 'relationshipAvailableQuantity',
    width: 110,
    align: 'right',
    render: row => row.isDedicated ? formatQty(row.relationshipAvailableQuantity) : '-',
  },
  {
    title: '分配数量',
    key: 'qty',
    width: 150,
    render: row => props.editable
      ? h(NInputNumber, {
          value: row.qty,
          min: 0.0001,
          max: maximum(row),
          precision: 4,
          'onUpdate:value': value => emit('quantityChange', row, Number(value || 0)),
        })
      : formatQty(row.qty),
  },
  { title: '单位', key: 'unit', width: 80, render: row => row.unit || props.unit || '-' },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: () => h(WmsStatusTag, { size: 'small', type: 'warning', bordered: false }, { default: () => '已分配' }),
  },
  ...(props.editable ? [{
    title: '操作',
    key: 'actions',
    width: 80,
    fixed: 'right' as const,
    render: (row: EditableSalesAllocationReservation) => h(NButton, {
      size: 'small',
      type: 'error',
      text: true,
      onClick: () => emit('remove', row),
    }, { default: () => '删除' }),
  }] : []),
])
</script>

<template>
  <div class="reservation-panel">
    <n-data-table
      v-if="reservations.length"
      class="reservation-table wms-embedded-table"
      size="small"
      :columns="columns"
      :data="reservations"
      :bordered="false"
      :row-key="row => `${row.inventoryId}-${row.inventoryAllocationId || ''}`"
      :scroll-x="1450"
    />
    <n-empty v-else size="small" description="暂无库存分配" />
  </div>
</template>

<style scoped>
.reservation-panel { width: 100%; background: transparent; }
.reservation-table { width: 100%; min-height: auto !important; background: transparent; }
.reservation-table :deep(.n-data-table-wrapper) {
  min-height: auto !important;
  overflow: visible !important;
  border-top: 1px solid var(--wms-border-subtle);
}
.reservation-table :deep(.n-data-table-base-table),
.reservation-table :deep(.n-data-table-th),
.reservation-table :deep(.n-data-table-td) { background: transparent; }
</style>
