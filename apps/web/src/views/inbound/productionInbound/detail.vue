<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NProgress,
  NSpin,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as productionInboundApi from '../../../api/inbound/productionInbound'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { withResizable } from '../../../utils/table'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const detail = ref<productionInboundApi.ProductionInboundDto | null>(null)

const headerLabelStyle = {
  width: '120px',
}

const headerContentStyle = {
  minWidth: '220px',
}

const detailId = computed(() => String(route.params.orderId ?? ''))

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizeInboundTypeValue(value: productionInboundApi.ProductionInboundType) {
  if (typeof value === 'string') {
    if (value === 'FinishedProduct' || value === '10') return productionInboundApi.ProductionInboundType.FinishedProduct
    if (value === 'SemiFinishedProduct' || value === '20') return productionInboundApi.ProductionInboundType.SemiFinishedProduct
    if (value === 'WorkInProgress' || value === '30') return productionInboundApi.ProductionInboundType.WorkInProgress
  }
  if (typeof value === 'number') return value
  return null
}

function resolveInboundTypeLabel(value: productionInboundApi.ProductionInboundType) {
  const normalized = normalizeInboundTypeValue(value)
  if (normalized === productionInboundApi.ProductionInboundType.FinishedProduct) return '成品入库'
  if (normalized === productionInboundApi.ProductionInboundType.SemiFinishedProduct) return '半成品入库'
  if (normalized === productionInboundApi.ProductionInboundType.WorkInProgress) return '工序品/在制品入库'
  return '-'
}

function normalizeStatusValue(status: productionInboundApi.ProductionInboundStatus) {
  if (typeof status === 'string') {
    if (status === 'Draft' || status === '0') return productionInboundApi.ProductionInboundStatus.Draft
    if (status === 'InProgress' || status === '1') return productionInboundApi.ProductionInboundStatus.InProgress
    if (status === 'Completed' || status === '2') return productionInboundApi.ProductionInboundStatus.Completed
  }
  if (typeof status === 'number') return status
  return null
}

function resolveStatusLabel(status: productionInboundApi.ProductionInboundStatus) {
  const value = normalizeStatusValue(status)
  if (value === productionInboundApi.ProductionInboundStatus.Draft) return '草稿'
  if (value === productionInboundApi.ProductionInboundStatus.InProgress) return '作业中'
  if (value === productionInboundApi.ProductionInboundStatus.Completed) return '已完成'
  return '-'
}

function getStatusTagType(status: productionInboundApi.ProductionInboundStatus) {
  const value = normalizeStatusValue(status)
  if (value === productionInboundApi.ProductionInboundStatus.Draft) return 'default'
  if (value === productionInboundApi.ProductionInboundStatus.InProgress) return 'warning'
  if (value === productionInboundApi.ProductionInboundStatus.Completed) return 'success'
  return 'default'
}

function normalizeDetailStatusValue(status: productionInboundApi.ProductionInboundDetailStatus) {
  if (typeof status === 'string') {
    if (status === 'Pending' || status === '0') return productionInboundApi.ProductionInboundDetailStatus.Pending
    if (status === 'InProgress' || status === '1') return productionInboundApi.ProductionInboundDetailStatus.InProgress
    if (status === 'Completed' || status === '2') return productionInboundApi.ProductionInboundDetailStatus.Completed
  }
  if (typeof status === 'number') return status
  return null
}

const completedCount = computed(() => (detail.value?.details ?? []).filter((item) => normalizeDetailStatusValue(item.status) === productionInboundApi.ProductionInboundDetailStatus.Completed).length)
const detailTotalCount = computed(() => detail.value?.details?.length ?? 0)
const progressPercentage = computed(() => {
  if (detailTotalCount.value <= 0) return 0
  return Math.round((completedCount.value / detailTotalCount.value) * 100)
})

const detailColumns = computed<DataTableColumns<productionInboundApi.ProductionInboundDetailDto>>(() => withResizable([
  {
    title: '物料编码',
    key: 'productCode',
    minWidth: 160,
    render: (row) => row.productCode ?? '-',
  },
  {
    title: '物料名称',
    key: 'productName',
    minWidth: 180,
    render: (row) => row.productName ?? '-',
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 140,
    render: (row) => row.batchNo || '-',
  },
  {
    title: '盘号',
    key: 'containerCode',
    minWidth: 140,
    render: (row) => row.containerCode || '-',
  },
  {
    title: '数量',
    key: 'qty',
    width: 120,
    render: (row) => row.qty ?? '-',
  },
  {
    title: '单位',
    key: 'unit',
    width: 100,
    render: (row) => row.unit || '-',
  },
  {
    title: '实际库位编码',
    key: 'actualLocationCode',
    minWidth: 160,
    render: (row) => row.actualLocationCode || '-',
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => String(row.status ?? '-'),
  },
]))

function getRowKey(row: productionInboundApi.ProductionInboundDetailDto) {
  return row.id
}

async function loadDetail() {
  if (!detailId.value) {
    message.error('缺少单据ID，无法查看')
    return
  }

  loading.value = true
  try {
    detail.value = await productionInboundApi.getByOrderId(detailId.value)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载详情失败')
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.push({ name: 'ProductionInboundManagement' })
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
            class="transfer-header-descriptions"
            bordered
            label-placement="left"
            :column="3"
            :label-style="headerLabelStyle"
            :content-style="headerContentStyle"
            style="margin-top: 10px;"
          >
            <n-descriptions-item label="入库单号">{{ detail?.orderNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="来源单号">{{ detail?.sourceOrderNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(detail?.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="入库类型">{{ detail ? resolveInboundTypeLabel(detail.inboundType) : '-' }}</n-descriptions-item>
            <n-descriptions-item label="来源部门">{{ detail?.sourceDepartmentName || detail?.sourceDepartmentCode || '-' }}</n-descriptions-item>
            <n-descriptions-item label="目标仓库">{{ detail?.targetWarehouseName || detail?.targetWarehouseCode || '-' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag size="small" :type="detail ? getStatusTagType(detail.status) : 'default'">
                {{ detail ? resolveStatusLabel(detail.status) : '-' }}
              </n-tag>
            </n-descriptions-item>
          </n-descriptions>

          <div class="detail-progress-wrap">
            <n-text class="detail-progress-label">总体进度</n-text>
            <n-progress
              class="detail-progress-bar"
              type="line"
              :percentage="progressPercentage"
              :height="14"
              :show-indicator="false"
              :border-radius="8"
              :fill-border-radius="8"
              status="success"
            />
            <n-text depth="3" class="detail-progress-meta">
              {{ progressPercentage }}%（已完成: {{ completedCount }}/{{ detailTotalCount }} 条）
            </n-text>
          </div>
        </n-spin>
      </div>
    </template>

    <template #data>
      <n-data-table
        class="crud-table-flat"
        :loading="loading"
        :columns="detailColumns"
        :data="detail?.details ?? []"
        :bordered="false"
        :row-key="getRowKey"
      >
        <template #empty>
          <n-empty description="暂无入库明细" />
        </template>
      </n-data-table>
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

.transfer-header-descriptions :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.transfer-header-descriptions :deep(.n-descriptions-table-header) {
  width: 120px;
}

.detail-progress-wrap {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.detail-progress-label {
  font-weight: 600;
  white-space: nowrap;
}

.detail-progress-bar {
  min-width: 200px;
}

.detail-progress-meta {
  white-space: nowrap;
}
</style>
