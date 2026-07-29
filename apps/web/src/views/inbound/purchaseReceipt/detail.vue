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

import * as purchaseReceiptApi from '../../../api/inbound/purchaseReceipt'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import DetailWorkbench from '../../../components/DetailWorkbench.vue'
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { withResizable } from '../../../utils/table'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const detail = ref<purchaseReceiptApi.PurchaseReceiptDto | null>(null)
const selectedDetailId = ref('')

const detailId = computed(() => String(route.params.id ?? ''))

const headerLabelStyle = {
  width: '136px',
}

const headerContentStyle = {
  minWidth: '220px',
}

function normalizeQuantity(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  return parsed
}

function formatQuantity(value: unknown): string {
  const normalized = normalizeQuantity(value)
  return normalized.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function sumExpectedQuantity(details: purchaseReceiptApi.PurchaseReceiptDetailDto[] | undefined): number {
  return (details ?? []).reduce((sum, item) => sum + normalizeQuantity(item.expectedQuantity), 0)
}

function resolveSourceDocTypeLabel(type: string | null | undefined): string {
  const clean = (type ?? '').trim().toUpperCase()
  if (!clean) return '-'
  if (clean === 'ASN') return 'ASN'
  if (clean === 'PO') return 'PO'
  return clean
}

function getSourceDocTypeTagType(type: string | null | undefined) {
  const clean = (type ?? '').trim().toUpperCase()
  if (clean === 'ASN') return 'info'
  if (clean === 'PO') return 'warning'
  return 'default'
}

function resolveStatusLabel(status?: purchaseReceiptApi.PurchaseReceiptStatus): string {
  if (status === purchaseReceiptApi.PurchaseReceiptStatus.Draft) return '草稿'
  if (status === purchaseReceiptApi.PurchaseReceiptStatus.Receiving) return '收货中'
  if (status === purchaseReceiptApi.PurchaseReceiptStatus.Completed) return '已完成'
  return '-'
}

function getReceiptStatusTagType(status?: purchaseReceiptApi.PurchaseReceiptStatus) {
  if (status === purchaseReceiptApi.PurchaseReceiptStatus.Receiving) return 'info'
  if (status === purchaseReceiptApi.PurchaseReceiptStatus.Completed) return 'success'
  return 'default'
}

function resolveErpSyncStatusLabel(status: purchaseReceiptApi.PurchaseReceiptErpSyncStatus): string {
  if (typeof status === 'number') {
    if (status === 0) return '未同步'
    if (status === 1) return '同步成功'
    if (status === 2) return '同步失败'
    return String(status)
  }

  const clean = status.trim()
  const upper = clean.toUpperCase()
  if (upper === 'PENDING' || upper === 'UNSYNCED' || upper === 'NOTSYNCED') return '未同步'
  if (upper === 'SUCCESS' || upper === 'SUCCEEDED' || upper === 'SYNCED') return '同步成功'
  if (upper === 'FAILED' || upper === 'FAIL') return '同步失败'
  return clean || '-'
}

function getErpSyncStatusTagType(status: purchaseReceiptApi.PurchaseReceiptErpSyncStatus) {
  const text = resolveErpSyncStatusLabel(status)
  if (text === '未同步') return 'warning'
  if (text === '同步成功') return 'success'
  if (text === '同步失败') return 'error'
  return 'default'
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

type DetailRecordRow = purchaseReceiptApi.PurchaseRecordDto & {
  detailProductCode: string
  detailProductName: string
}

const detailRows = computed(() => detail.value?.details ?? [])

const selectedDetail = computed(() => (
  detailRows.value.find((item) => item.id === selectedDetailId.value) ?? null
))

const selectedRecordRows = computed(() => selectedDetail.value?.records ?? [])

const recordRows = computed<DetailRecordRow[]>(() => {
  const details = detail.value?.details ?? []
  return details.flatMap((item) => {
    const records = item.records ?? []
    return records.map((record) => ({
      ...record,
      detailProductCode: item.productCode,
      detailProductName: item.productName,
    }))
  })
})

const detailColumns = computed<DataTableColumns<purchaseReceiptApi.PurchaseReceiptDetailDto>>(() => withResizable([
  {
    title: '物料编码',
    key: 'productCode',
    minWidth: 140,
    render: (row) => h(CopyableText, { value: row.productCode }),
  },
  {
    title: '物料名称',
    key: 'productName',
    minWidth: 180,
    render: (row) => row.productName || '-',
  },
  {
    title: '计划数量',
    key: 'expectedQuantity',
    width: 110,
    align: 'right',
    render: (row) => formatQuantity(row.expectedQuantity),
  },
  {
    title: '实收数量',
    key: 'receivedQuantity',
    width: 110,
    align: 'right',
    render: (row) => formatQuantity(row.receivedQuantity),
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 130,
    render: (row) => h(CopyableText, { value: row.batchNo }),
  },
  {
    title: '需质检',
    key: 'isQualityCheckRequired',
    width: 90,
    align: 'center',
    render: (row) => h(WmsStatusTag, {
      label: row.isQualityCheckRequired ? '是' : '否',
      type: row.isQualityCheckRequired ? 'warning' : 'success',
    }),
  },
  {
    title: 'ERP同步状态',
    key: 'erpSyncStatus',
    width: 130,
    align: 'center',
    render: (row) => {
      const statusLabel = resolveErpSyncStatusLabel(row.erpSyncStatus)
      return h(WmsStatusTag, { label: statusLabel, type: getErpSyncStatusTagType(row.erpSyncStatus) })
    },
  },
  {
    title: '同步异常',
    key: 'erpSyncErrorMessage',
    minWidth: 180,
    render: (row) => row.erpSyncErrorMessage || '-',
  },
]))

const selectedRecordColumns = computed<DataTableColumns<purchaseReceiptApi.PurchaseRecordDto>>(() => withResizable([
  {
    title: '容器编码',
    key: 'containerCode',
    minWidth: 150,
    render: (row) => h(CopyableText, { value: row.containerCode }),
  },
  {
    title: '库位编码',
    key: 'locationCode',
    minWidth: 150,
    render: (row) => h(CopyableText, { value: row.locationCode }),
  },
  {
    title: '收货数量',
    key: 'receivedQuantity',
    width: 120,
    align: 'right',
    render: (row) => formatQuantity(row.receivedQuantity),
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 140,
    render: (row) => h(CopyableText, { value: row.batchNo }),
  },
  {
    title: '供应商批次号',
    key: 'supplierBatchNo',
    minWidth: 160,
    render: (row) => h(CopyableText, { value: row.supplierBatchNo }),
  },
]))

const recordColumns = computed<DataTableColumns<DetailRecordRow>>(() => withResizable([
  {
    title: '物料编码',
    key: 'detailProductCode',
    minWidth: 140,
    render: (row) => h(CopyableText, { value: row.detailProductCode }),
  },
  {
    title: '物料名称',
    key: 'detailProductName',
    minWidth: 180,
    render: (row) => row.detailProductName || '-',
  },
  {
    title: '容器编码',
    key: 'containerCode',
    minWidth: 130,
    render: (row) => h(CopyableText, { value: row.containerCode }),
  },
  {
    title: '库位编码',
    key: 'locationCode',
    minWidth: 130,
    render: (row) => h(CopyableText, { value: row.locationCode }),
  },
  {
    title: '收货数量',
    key: 'receivedQuantity',
    width: 110,
    align: 'right',
    render: (row) => formatQuantity(row.receivedQuantity),
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 120,
    render: (row) => h(CopyableText, { value: row.batchNo }),
  },
  {
    title: '供应商批次号',
    key: 'supplierBatchNo',
    minWidth: 140,
    render: (row) => h(CopyableText, { value: row.supplierBatchNo }),
  },
]))

function getDetailRowKey(row: purchaseReceiptApi.PurchaseReceiptDetailDto) {
  return row.id
}

function getRecordRowKey(row: { id: string }) {
  return row.id
}

function hasQuantityVariance(row: purchaseReceiptApi.PurchaseReceiptDetailDto) {
  return Math.abs(normalizeQuantity(row.expectedQuantity) - normalizeQuantity(row.receivedQuantity)) > 0.000001
}

function selectPreferredDetail(
  rows: purchaseReceiptApi.PurchaseReceiptDetailDto[],
  preferredId: string,
) {
  const preferred = rows.find((row) => row.id === preferredId)
  const erpFailed = rows.find((row) => resolveErpSyncStatusLabel(row.erpSyncStatus) === '同步失败')
  const quantityVariance = rows.find(hasQuantityVariance)
  selectedDetailId.value = (preferred ?? erpFailed ?? quantityVariance ?? rows[0])?.id ?? ''
}

function selectDetail(row: purchaseReceiptApi.PurchaseReceiptDetailDto) {
  selectedDetailId.value = row.id
}

function getDetailRowProps(row: purchaseReceiptApi.PurchaseReceiptDetailDto) {
  return {
    class: row.id === selectedDetailId.value ? 'is-selected-detail' : '',
    tabindex: 0,
    'aria-selected': row.id === selectedDetailId.value,
    onClick: () => selectDetail(row),
    onKeydown: (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      selectDetail(row)
    },
  }
}

async function loadDetail() {
  if (!detailId.value) {
    message.error('缺少收货单 Id，无法查看')
    return
  }

  loading.value = true
  try {
    const preferredId = selectedDetailId.value
    const data = await purchaseReceiptApi.get(detailId.value)
    detail.value = data
    selectPreferredDetail(data.details ?? [], preferredId)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载采购收货详情失败')
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.push({ name: 'PurchaseReceiptManagement' })
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <BaseCrudPage :search-collapsible="false">
    <template #search>
      <DetailWorkbench
        :show-header="false"
        :loading="loading"
      >
        <template #summary>
          <div class="detail-action-bar">
            <n-button @click="handleBack">返回列表</n-button>
            <n-button :loading="loading" @click="loadDetail">刷新</n-button>
          </div>

          <n-descriptions
            class="detail-header-descriptions"
            bordered
            label-placement="left"
            :column="3"
            :label-style="headerLabelStyle"
            :content-style="headerContentStyle"
          >
            <n-descriptions-item label="收货单号">
              <CopyableText :value="detail?.receiptNo" strong />
            </n-descriptions-item>
            <n-descriptions-item label="状态">
              <WmsStatusTag
                :label="resolveStatusLabel(detail?.status)"
                :type="getReceiptStatusTagType(detail?.status)"
              />
            </n-descriptions-item>
            <n-descriptions-item label="来源类型">
              <WmsStatusTag
                :label="resolveSourceDocTypeLabel(detail?.sourceDocType)"
                :type="getSourceDocTypeTagType(detail?.sourceDocType)"
              />
            </n-descriptions-item>
            <n-descriptions-item label="来源单据号">
              <CopyableText :value="detail?.sourceDocNo" />
            </n-descriptions-item>
            <n-descriptions-item label="来源采购单">
              <CopyableText :value="detail?.purchaseOrderNo" />
            </n-descriptions-item>
            <n-descriptions-item label="仓库">{{ detail?.warehouseName ? `${detail.warehouseCode} / ${detail.warehouseName}` : '-' }}</n-descriptions-item>
            <n-descriptions-item label="供应商">{{ detail?.supplierName || '-' }}</n-descriptions-item>
            <n-descriptions-item label="创建人">{{ detail?.creatorName || '-' }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(detail?.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="修改人">{{ detail?.lastModifierName || '-' }}</n-descriptions-item>
            <n-descriptions-item label="修改时间">{{ formatDateTime(detail?.lastModificationTime) }}</n-descriptions-item>
            <n-descriptions-item label="计划总量">{{ formatQuantity(sumExpectedQuantity(detail?.details)) }}</n-descriptions-item>
            <n-descriptions-item label="备注" :span="3">{{ detail?.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
        </template>
      </DetailWorkbench>
    </template>

    <template #data>
      <n-tabs class="detail-tabs" type="line" animated>
        <n-tab-pane name="details">
          <template #tab>
            <span class="tab-label">收货明细 <span class="tab-count">{{ detailRows.length }}</span></span>
          </template>
          <div v-if="detailRows.length" class="linked-workbench">
            <section class="linked-panel detail-list-panel">
              <div class="linked-panel-heading">
                <div class="linked-panel-title">收货单明细</div>
              </div>
              <n-data-table
                class="crud-table-flat linked-table"
                flex-height
                :loading="loading"
                :columns="detailColumns"
                :data="detailRows"
                :bordered="false"
                :row-key="getDetailRowKey"
                :row-props="getDetailRowProps"
                :scroll-x="1140"
              />
            </section>

            <section class="linked-panel record-list-panel">
              <div class="linked-panel-heading">
                <div class="linked-panel-title">收货记录</div>
              </div>
              <n-data-table
                class="crud-table-flat linked-table"
                flex-height
                :loading="loading"
                :columns="selectedRecordColumns"
                :data="selectedRecordRows"
                :bordered="false"
                :row-key="getRecordRowKey"
                :scroll-x="720"
              >
                <template #empty>
                  <n-empty description="当前物料暂无收货记录" />
                </template>
              </n-data-table>
            </section>
          </div>
          <div v-else class="linked-empty">
            <n-empty description="暂无收货明细" />
          </div>
        </n-tab-pane>

        <n-tab-pane name="records">
          <template #tab>
            <span class="tab-label">全部收货记录 <span class="tab-count">{{ recordRows.length }}</span></span>
          </template>
          <n-data-table
            class="crud-table-flat all-record-table"
            flex-height
            :loading="loading"
            :columns="recordColumns"
            :data="recordRows"
            :bordered="false"
            :row-key="getRecordRowKey"
            :scroll-x="1000"
          >
            <template #empty>
              <n-empty description="暂无收货记录" />
            </template>
          </n-data-table>
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

.linked-workbench {
  flex: 1 1 auto;
  min-height: 330px;
  display: grid;
  grid-template-rows: minmax(145px, 45fr) minmax(175px, 55fr);
  gap: 12px;
  overflow: hidden;
}

.linked-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--wms-border-subtle);
  border-radius: 6px;
  background: var(--wms-surface-panel);
}

.linked-panel-heading {
  min-height: 38px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--wms-border-subtle);
  background: var(--wms-surface-muted);
}

.linked-panel-title {
  color: var(--wms-text-primary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.linked-table,
.all-record-table {
  flex: 1 1 auto;
  min-height: 0;
}

.linked-table :deep(.n-data-table-tr) {
  cursor: pointer;
}

.linked-table :deep(.n-data-table-tr:focus-visible .n-data-table-td) {
  box-shadow: inset 0 0 0 1px var(--wms-brand);
}

.linked-table :deep(.n-data-table-tr.is-selected-detail .n-data-table-td) {
  background: var(--wms-surface-hover);
}

.linked-table :deep(.n-data-table-tr.is-selected-detail .n-data-table-td:first-child) {
  box-shadow: inset 3px 0 0 var(--wms-border-strong);
}

.record-list-panel .linked-table :deep(.n-data-table-tr) {
  cursor: default;
}

.linked-empty {
  flex: 1 1 auto;
  min-height: 240px;
  display: grid;
  place-items: center;
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

</style>
