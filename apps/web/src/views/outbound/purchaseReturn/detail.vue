<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NTabPane,
  NTabs,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as api from '../../../api/outbound/purchaseReturn'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import DetailWorkbench from '../../../components/DetailWorkbench.vue'
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { useAuthStore } from '../../../stores/auth'
import { withResizable } from '../../../utils/table'
import PurchaseReturnReservationTable from './components/PurchaseReturnReservationTable.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const message = useMessage()

const loading = ref(false)
const order = ref<api.PurchaseReturnOrder | null>(null)
const expandedDetailKeys = ref<string[]>([])

const id = computed(() => String(route.params.id))
const detailRows = computed(() => order.value?.details ?? [])

const headerLabelStyle = {
  width: '136px',
}

const headerContentStyle = {
  minWidth: '220px',
}

const statusMap: Record<number, string> = {
  0: '草稿',
  1: '待审核',
  2: '待出库',
  3: '已完成',
  4: '已取消',
}

function statusType(value: number) {
  if (value === 3) return 'success'
  if (value === 1 || value === 2) return 'warning'
  if (value === 4) return 'error'
  return 'default'
}

function sourceType(value?: string | null) {
  const normalized = value?.trim().toUpperCase()
  if (normalized === 'ASN') return 'info'
  if (normalized === 'PO') return 'warning'
  return 'default'
}

function can(suffix: string) {
  return auth.hasPermission(`WMS.OutboundOps.PurchaseReturns.${suffix}`)
}

function reservationTotal(row: api.PurchaseReturnDetail) {
  return (row.reservations ?? []).reduce(
    (sum, item) => sum + Number(item.reservedQuantity || 0),
    0,
  )
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const detailColumns = computed<DataTableColumns<api.PurchaseReturnDetail>>(() => [
  {
    type: 'expand',
    fixed: 'left',
    width: 44,
    expandable: row => (row.reservations?.length ?? 0) > 0,
    renderExpand: row => h(PurchaseReturnReservationTable, {
      reservations: row.reservations ?? [],
      unit: row.unit,
    }),
  },
  ...withResizable<api.PurchaseReturnDetail>([{
    title: '物料编码',
    key: 'productCode',
    minWidth: 130,
    render: row => h(CopyableText, { value: row.productCode }),
  },
  { title: '物料名称', key: 'productName', minWidth: 160 },
  { title: '批次', key: 'batchNo', width: 110, render: row => row.batchNo || '-' },
  { title: '实收数量', key: 'receivedQuantity', width: 100, align: 'right' },
  { title: '退货数量', key: 'returnQuantity', width: 100, align: 'right' },
  { title: '单位', key: 'unit', width: 70 },
  { title: '原因', key: 'reason', minWidth: 150, render: row => row.reason || '-' },
  {
    title: '库存分配',
    key: 'allocation',
    width: 210,
    render: (row) => {
      const allocated = reservationTotal(row)
      const returnQuantity = Number(row.returnQuantity)
      const status = allocated === returnQuantity
        ? { label: '已分配', type: 'success' as const }
        : allocated > returnQuantity
          ? { label: '已超额', type: 'error' as const }
          : { label: '待分配', type: 'warning' as const }

      return h('div', { class: 'allocation-cell' }, [
        h(WmsStatusTag, { label: status.label, type: status.type }),
      ])
    },
  }]),
])

function updateExpandedDetailKeys(keys: Array<string | number>) {
  expandedDetailKeys.value = keys.map(String)
}

async function load() {
  loading.value = true
  expandedDetailKeys.value = []
  try {
    order.value = await api.get(id.value)
  }
  finally {
    loading.value = false
  }
}

async function run(action: () => Promise<void>, text: string) {
  await action()
  message.success(text)
  await load()
}

function handleBack() {
  router.push('/outboundManagement/purchase-return')
}

onMounted(load)
</script>

<template>
  <BaseCrudPage :search-collapsible="false">
    <template #search>
      <DetailWorkbench :show-header="false" :loading="loading">
        <template #summary>
          <div class="detail-action-bar">
            <n-button @click="handleBack">返回列表</n-button>
            <n-button :loading="loading" @click="load">刷新</n-button>
            <n-button
              v-if="order?.status === 0 && can('Update')"
              type="warning"
              secondary
              @click="router.push(`/outboundManagement/purchase-return/${id}/edit`)"
            >
              编辑
            </n-button>
            <n-button
              v-if="order?.status === 0 && can('Submit')"
              type="primary"
              @click="run(() => api.submit(id), '已提交审核')"
            >
              提交审核
            </n-button>
            <n-button
              v-if="order?.status === 1 && can('Approve')"
              type="primary"
              @click="run(() => api.approve(id), '审核通过，等待出库')"
            >
              审核通过
            </n-button>
            <n-button
              v-if="order?.status === 1 && can('Approve')"
              type="error"
              secondary
              @click="run(() => api.reject(id), '已退回草稿，库存分配继续保留')"
            >
              驳回
            </n-button>
            <n-button
              v-if="order?.status === 2 && can('Execute')"
              type="primary"
              @click="run(() => api.execute(id), '退货出库完成')"
            >
              执行退货出库
            </n-button>
            <n-button
              v-if="order && [0, 1, 2].includes(Number(order.status)) && can('Cancel')"
              @click="run(() => api.cancel(id), '已取消并释放库存')"
            >
              取消单据
            </n-button>
          </div>

          <n-descriptions
            class="detail-header-descriptions"
            bordered
            label-placement="left"
            :column="3"
            :label-style="headerLabelStyle"
            :content-style="headerContentStyle"
          >
            <n-descriptions-item label="退货单号">
              <CopyableText :value="order?.returnNo" strong />
            </n-descriptions-item>
            <n-descriptions-item label="状态">
              <WmsStatusTag
                :label="statusMap[Number(order?.status)] || '-'"
                :type="statusType(Number(order?.status))"
              />
            </n-descriptions-item>
            <n-descriptions-item label="采购收货单">
              <CopyableText :value="order?.purchaseReceiptNo" />
            </n-descriptions-item>
            <n-descriptions-item label="收货来源类型">
              <WmsStatusTag
                :label="order?.receiptSourceDocType || '-'"
                :type="sourceType(order?.receiptSourceDocType)"
              />
            </n-descriptions-item>
            <n-descriptions-item label="来源单据号">
              <CopyableText :value="order?.receiptSourceDocNo" />
            </n-descriptions-item>
            <n-descriptions-item label="来源采购单">
              <CopyableText :value="order?.purchaseOrderNo" />
            </n-descriptions-item>
            <n-descriptions-item label="仓库">{{ order?.warehouseName ? `${order.warehouseCode} / ${order.warehouseName}` : '-' }}</n-descriptions-item>
            <n-descriptions-item label="供应商">{{ order?.supplierName || '-' }}</n-descriptions-item>
            <n-descriptions-item label="计划退货日期">
              {{ order?.plannedReturnDate?.slice(0, 10) || '-' }}
            </n-descriptions-item>
            <n-descriptions-item label="创建人">{{ order?.creatorName || '-' }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">
              {{ formatDateTime(order?.creationTime) }}
            </n-descriptions-item>
            <n-descriptions-item label="修改人">{{ order?.lastModifierName || '-' }}</n-descriptions-item>
            <n-descriptions-item label="修改时间">
              {{ formatDateTime(order?.lastModificationTime) }}
            </n-descriptions-item>
            <n-descriptions-item label="备注" :span="3">{{ order?.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
        </template>
      </DetailWorkbench>
    </template>

    <template #data>
      <n-tabs class="detail-tabs" type="line" animated>
        <n-tab-pane name="details">
          <template #tab>
            <span class="tab-label">退货明细 <span class="tab-count">{{ detailRows.length }}</span></span>
          </template>
          <n-data-table
            class="crud-table-flat"
            :loading="loading"
            :columns="detailColumns"
            :data="detailRows"
            :bordered="false"
            :row-key="row => row.id || row.purchaseReceiptDetailId"
            :expanded-row-keys="expandedDetailKeys"
            :scroll-x="1380"
            @update:expanded-row-keys="updateExpandedDetailKeys"
          >
            <template #empty>
              <n-empty description="暂无退货明细" />
            </template>
          </n-data-table>
        </n-tab-pane>
        <n-tab-pane name="logs">
          <template #tab>
            <span class="tab-label">操作日志 <span class="tab-count">0</span></span>
          </template>
          <n-empty description="操作日志由审计模块统一展示" />
        </n-tab-pane>
      </n-tabs>
    </template>
  </BaseCrudPage>
</template>

<style scoped>
.detail-action-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.detail-header-descriptions :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.detail-header-descriptions :deep(.n-descriptions-table-header) {
  width: 136px;
  color: var(--wms-text-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
}

.detail-header-descriptions :deep(.n-descriptions-table-content) {
  color: var(--wms-text-primary);
  font-size: 13px;
  line-height: 20px;
}

.detail-tabs {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.detail-tabs :deep(.n-tabs-pane-wrapper),
.detail-tabs :deep(.n-tab-pane) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-count {
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: var(--wms-surface-muted);
  color: var(--wms-text-muted);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

.allocation-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}

</style>
