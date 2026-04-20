<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

import * as miscInboundOrderApi from '../../../api/inbound/MiscInboundOrders/miscInboundOrders'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { withResizable } from '../../../utils/table'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const detail = ref<miscInboundOrderApi.MiscInboundOrderDto | null>(null)

const detailId = computed(() => String(route.params.id ?? ''))

const headerLabelStyle = {
  width: '120px',
}

const headerContentStyle = {
  minWidth: '220px',
}

function normalizeStatusValue(value: miscInboundOrderApi.MiscOrderStatus) {
  if (typeof value === 'string') {
    if (value === 'Draft' || value === '0') return miscInboundOrderApi.MiscOrderStatus.Draft
    if (value === 'Executed' || value === '1') return miscInboundOrderApi.MiscOrderStatus.Executed
  }

  if (typeof value === 'number') return value
  return null
}

function resolveStatusLabel(value: miscInboundOrderApi.MiscOrderStatus) {
  const normalized = normalizeStatusValue(value)
  if (normalized === miscInboundOrderApi.MiscOrderStatus.Draft) return '草稿'
  if (normalized === miscInboundOrderApi.MiscOrderStatus.Executed) return '已执行'
  return '-'
}

function getStatusTagType(value: miscInboundOrderApi.MiscOrderStatus) {
  const normalized = normalizeStatusValue(value)
  if (normalized === miscInboundOrderApi.MiscOrderStatus.Draft) return 'warning'
  if (normalized === miscInboundOrderApi.MiscOrderStatus.Executed) return 'success'
  return 'default'
}

function normalizeOperationTypeValue(value: miscInboundOrderApi.MiscOperationType) {
  if (typeof value === 'string') {
    if (value === 'Inbound' || value === '1') return miscInboundOrderApi.MiscOperationType.Inbound
    if (value === 'Outbound' || value === '2') return miscInboundOrderApi.MiscOperationType.Outbound
  }

  if (typeof value === 'number') return value
  return null
}

function resolveOperationTypeLabel(value: miscInboundOrderApi.MiscOperationType) {
  const normalized = normalizeOperationTypeValue(value)
  if (normalized === miscInboundOrderApi.MiscOperationType.Inbound) return '入库'
  if (normalized === miscInboundOrderApi.MiscOperationType.Outbound) return '出库'
  return '-'
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatQuantity(value: number) {
  return Number(value ?? 0).toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

const detailColumns = computed<DataTableColumns<miscInboundOrderApi.MiscInboundOrderDetailDto>>(() => withResizable([
  {
    title: '仓库编码',
    key: 'warehouseCode',
    minWidth: 120,
    render: (row) => row.warehouseCode || '-',
  },
  {
    title: '仓库名称',
    key: 'warehouseName',
    minWidth: 160,
    render: (row) => row.warehouseName || '-',
  },
  {
    title: '库位编码',
    key: 'locationCode',
    minWidth: 120,
    render: (row) => row.locationCode || '-',
  },
  {
    title: '容器编码',
    key: 'containerCode',
    minWidth: 120,
    render: (row) => row.containerCode || '-',
  },
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
    title: 'SN',
    key: 'sn',
    minWidth: 140,
    render: (row) => row.sn || '-',
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 140,
    render: (row) => row.batchNo || '-',
  },
  {
    title: '工艺版本',
    key: 'craftVersion',
    minWidth: 120,
    render: (row) => row.craftVersion || '-',
  },
  {
    title: '数量',
    key: 'qty',
    width: 120,
    align: 'right',
    render: (row) => formatQuantity(row.qty),
  },
  {
    title: '单位',
    key: 'unit',
    width: 100,
    render: (row) => row.unit || '-',
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 140,
    render: (row) => row.remark || '-',
  },
]))

function getRowKey(row: miscInboundOrderApi.MiscInboundOrderDetailDto) {
  return row.id
}

async function loadDetail() {
  if (!detailId.value) {
    message.error('缺少单据 Id，无法查看')
    return
  }

  loading.value = true
  try {
    detail.value = await miscInboundOrderApi.get(detailId.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载其他入库详情失败')
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.push({ name: 'MiscInboundOrdersManagement' })
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
            <n-descriptions-item label="单据号">{{ detail?.orderNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="账户别名">{{ detail?.accountAliasDescription || '-' }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(detail?.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="成本中心编码">{{ detail?.costCenterCode || '-' }}</n-descriptions-item>
            <n-descriptions-item label="成本中心名称">{{ detail?.costCenterName || '-' }}</n-descriptions-item>
            <n-descriptions-item label="业务类型">{{ detail ? resolveOperationTypeLabel(detail.type) : '-' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag size="small" :type="detail ? getStatusTagType(detail.status) : 'default'">
                {{ detail ? resolveStatusLabel(detail.status) : '-' }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="备注" :span="2">{{ detail?.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
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
</style>
