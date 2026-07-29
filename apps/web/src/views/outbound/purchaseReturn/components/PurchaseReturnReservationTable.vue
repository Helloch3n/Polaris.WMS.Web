<script setup lang="ts">
import WmsStatusTag from '../../../../components/WmsStatusTag.vue'
import { computed, h } from 'vue'
import { NDataTable, NEmpty } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import type { PurchaseReturnReservation } from '../../../../api/outbound/purchaseReturn'
import { PurchaseReturnInventoryStatus, PurchaseReturnReservationStatus } from '../../../../api/outbound/purchaseReturn'

const props = defineProps<{
  reservations: PurchaseReturnReservation[]
  unit?: string
}>()

function inventoryStatusMeta(status?: number | null) {
  if (status === PurchaseReturnInventoryStatus.Good) return { label: '良品', type: 'success' as const }
  if (status === PurchaseReturnInventoryStatus.Hold) return { label: '待检', type: 'warning' as const }
  if (status === PurchaseReturnInventoryStatus.Quarantine) return { label: '隔离', type: 'error' as const }
  return { label: '-', type: 'default' as const }
}

function reservationStatusMeta(status?: number) {
  if (status === PurchaseReturnReservationStatus.Consumed) return { label: '已出库', type: 'success' as const }
  if (status === PurchaseReturnReservationStatus.Released) return { label: '已释放', type: 'default' as const }
  return { label: '已分配', type: 'warning' as const }
}

const columns = computed<DataTableColumns<PurchaseReturnReservation>>(() => [
  { title: '盘号', key: 'containerCode', minWidth: 150, render: row => row.containerCode || '-' },
  { title: '库位', key: 'locationCode', minWidth: 130, render: row => row.locationCode || '-' },
  {
    title: '库存状态', key: 'inventoryStatus', width: 100,
    render: row => {
      const meta = inventoryStatusMeta(row.inventoryStatus)
      return h(WmsStatusTag, { size: 'small', type: meta.type, bordered: false }, { default: () => meta.label })
    },
  },
  { title: '退货数量', key: 'reservedQuantity', width: 120, align: 'right' },
  { title: '单位', key: 'unit', width: 80, render: () => props.unit || '-' },
  {
    title: '分配状态', key: 'status', width: 100,
    render: row => {
      const meta = reservationStatusMeta(row.status)
      return h(WmsStatusTag, { size: 'small', type: meta.type, bordered: false }, { default: () => meta.label })
    },
  },
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
      :row-key="row => row.id || row.inventoryId"
      :scroll-x="720"
    />
    <n-empty v-else size="small" description="暂无库存分配" />
  </div>
</template>

<style scoped>
.reservation-panel {
  width: 100%;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.reservation-table {
  display: block !important;
  flex: none !important;
  width: 100%;
  min-height: auto !important;
  background: transparent;
  box-shadow: none !important;
}

.reservation-table :deep(.n-data-table-wrapper) {
  min-height: auto !important;
  overflow: visible !important;
  border-top: 1px solid var(--wms-border-subtle);
  box-shadow: none !important;
}

.reservation-table :deep(.n-data-table-base-table),
.reservation-table :deep(.n-data-table-th),
.reservation-table :deep(.n-data-table-td) {
  background: transparent;
  box-shadow: none !important;
}

.reservation-table :deep(.n-data-table-th),
.reservation-table :deep(.n-data-table-td) {
  padding-right: 12px;
  padding-left: 12px;
}
</style>
