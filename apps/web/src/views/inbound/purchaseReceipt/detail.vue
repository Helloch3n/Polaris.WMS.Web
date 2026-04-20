<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as purchaseReceiptApi from '../../../api/inbound/purchaseReceipt'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { withResizable } from '../../../utils/table'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const detail = ref<purchaseReceiptApi.PurchaseReceiptDto | null>(null)

const detailId = computed(() => String(route.params.id ?? ''))

const headerLabelStyle = {
  width: '120px',
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

function sumReceivedQuantity(details: purchaseReceiptApi.PurchaseReceiptDetailDto[] | undefined): number {
  return (details ?? []).reduce((sum, item) => sum + normalizeQuantity(item.receivedQuantity), 0)
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
    render: (row) => row.productCode || '-',
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
    render: (row) => row.batchNo || '-',
  },
  {
    title: 'ERP同步状态',
    key: 'erpSyncStatus',
    width: 130,
    align: 'center',
    render: (row) => {
      const statusLabel = resolveErpSyncStatusLabel(row.erpSyncStatus)
      return h(
        NTag,
        { size: 'small', type: getErpSyncStatusTagType(row.erpSyncStatus) },
        { default: () => statusLabel },
      )
    },
  },
  {
    title: '同步异常',
    key: 'erpSyncErrorMessage',
    minWidth: 180,
    render: (row) => row.erpSyncErrorMessage || '-',
  },
]))

const recordColumns = computed<DataTableColumns<DetailRecordRow>>(() => withResizable([
  {
    title: '物料编码',
    key: 'detailProductCode',
    minWidth: 140,
    render: (row) => row.detailProductCode || '-',
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
    render: (row) => row.containerCode || '-',
  },
  {
    title: '库位编码',
    key: 'locationCode',
    minWidth: 130,
    render: (row) => row.locationCode || '-',
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
    render: (row) => row.batchNo || '-',
  },
  {
    title: '供应商批次号',
    key: 'supplierBatchNo',
    minWidth: 140,
    render: (row) => row.supplierBatchNo || '-',
  },
]))

function getDetailRowKey(row: purchaseReceiptApi.PurchaseReceiptDetailDto) {
  return row.id
}

function getRecordRowKey(row: DetailRecordRow) {
  return row.id
}

async function loadDetail() {
  if (!detailId.value) {
    message.error('缺少收货单 Id，无法查看')
    return
  }

  loading.value = true
  try {
    detail.value = await purchaseReceiptApi.get(detailId.value)
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
      <div class="detail-header-wrap">
        <div class="header-action-bar">
          <n-button @click="handleBack">返回列表</n-button>
          <n-button type="primary" :loading="loading" @click="loadDetail">刷新</n-button>
        </div>

        <n-spin :show="loading">
          <n-descriptions
            class="detail-header-descriptions"
            bordered
            label-placement="left"
            :column="3"
            :label-style="headerLabelStyle"
            :content-style="headerContentStyle"
            style="margin-top: 10px;"
          >
            <n-descriptions-item label="收货单号">{{ detail?.receiptNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="来源类型">
              <n-tag size="small" :type="getSourceDocTypeTagType(detail?.sourceDocType)">
                {{ resolveSourceDocTypeLabel(detail?.sourceDocType) }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="来源单据号">{{ detail?.sourceDocNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="供应商">{{ detail?.supplierName || '-' }}</n-descriptions-item>
            <n-descriptions-item label="计划总量">{{ formatQuantity(sumExpectedQuantity(detail?.details)) }}</n-descriptions-item>
            <n-descriptions-item label="实收总量">{{ formatQuantity(sumReceivedQuantity(detail?.details)) }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(detail?.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="备注" :span="2">{{ detail?.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
        </n-spin>
      </div>
    </template>

    <template #data>
      <section class="detail-section">
        <div class="detail-section-title">收货明细</div>
        <n-data-table
          class="crud-table-flat"
          :loading="loading"
          :columns="detailColumns"
          :data="detailRows"
          :bordered="false"
          :row-key="getDetailRowKey"
        >
          <template #empty>
            <n-empty description="暂无收货明细" />
          </template>
        </n-data-table>
      </section>

      <section class="detail-section second-table">
        <div class="detail-section-title">收货记录</div>
        <n-data-table
          class="crud-table-flat"
          :loading="loading"
          :columns="recordColumns"
          :data="recordRows"
          :bordered="false"
          :row-key="getRecordRowKey"
        >
          <template #empty>
            <n-empty description="暂无收货记录" />
          </template>
        </n-data-table>
      </section>
    </template>
  </BaseCrudPage>
</template>

<style scoped>
.detail-header-wrap {
  width: 100%;
}

.header-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-header-descriptions :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.detail-header-descriptions :deep(.n-descriptions-table-header) {
  width: 120px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.second-table {
  margin-top: 12px;
}

.detail-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--n-text-color-1);
}
</style>
