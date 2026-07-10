<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NEmpty,
  NTabPane,
  NTabs,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as productionInboundApi from '../../../api/inbound/productionInbound'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import DetailWorkbench from '../../../components/DetailWorkbench.vue'
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { withResizable } from '../../../utils/table'
import { usePermission } from '../../../composables/usePermission'
import { formatQuantity } from '../../../utils/format'
import ProductionInboundHeaderTable from './components/ProductionInboundHeaderTable.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const detail = ref<productionInboundApi.ProductionInboundDto | null>(null)

const detailId = computed(() => String(route.params.orderId ?? ''))

function normalizeStatusValue(status: productionInboundApi.ProductionInboundStatus) {
  if (typeof status === 'string') {
    if (status === 'Draft' || status === '0') return productionInboundApi.ProductionInboundStatus.Draft
    if (status === 'InProgress' || status === '1') return productionInboundApi.ProductionInboundStatus.InProgress
    if (status === 'Completed' || status === '2') return productionInboundApi.ProductionInboundStatus.Completed
  }
  if (typeof status === 'number') return status
  return null
}

function normalizeDetailStatusValue(status: productionInboundApi.ProductionInboundDetailStatus) {
  if (typeof status === 'string') {
    if (status === 'Pending' || status === '0') return productionInboundApi.ProductionInboundDetailStatus.Pending
    if (status === 'Completed' || status === '1') return productionInboundApi.ProductionInboundDetailStatus.Completed
  }
  if (typeof status === 'number') return status
  return null
}

function resolveDetailStatusLabel(status: productionInboundApi.ProductionInboundDetailStatus) {
  const value = normalizeDetailStatusValue(status)
  if (value === productionInboundApi.ProductionInboundDetailStatus.Pending) return '待入库'
  if (value === productionInboundApi.ProductionInboundDetailStatus.Completed) return '已完成'
  return '-'
}

function getDetailStatusTagType(status: productionInboundApi.ProductionInboundDetailStatus) {
  const value = normalizeDetailStatusValue(status)
  if (value === productionInboundApi.ProductionInboundDetailStatus.Pending) return 'warning'
  if (value === productionInboundApi.ProductionInboundDetailStatus.Completed) return 'success'
  return 'default'
}

const detailColumns = computed<DataTableColumns<productionInboundApi.ProductionInboundDetailDto>>(() => withResizable([
  {
    title: '物料编码',
    key: 'productCode',
    minWidth: 160,
    render: (row) => h(CopyableText, { value: row.productCode }),
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
    render: (row) => h(CopyableText, { value: row.batchNo }),
  },
  {
    title: '盘号',
    key: 'containerCode',
    minWidth: 140,
    render: (row) => h(CopyableText, { value: row.containerCode || '-' }),
  },
  {
    title: '数量',
    key: 'qty',
    width: 120,
    render: (row) => row.qty !== undefined && row.qty !== null ? formatQuantity(row.qty) : '-',
  },
  {
    title: '单位',
    key: 'unit',
    width: 100,
    render: (row) => row.unit || '-',
  },
  {
    title: '是否需要检验',
    key: 'needInspection',
    width: 140,
    render: (row) => h(WmsStatusTag, { label: row.needInspection ? '是' : '否', type: row.needInspection ? 'warning' : 'success' }),
  },
  {
    title: '实际库位编码',
    key: 'actualLocationCode',
    minWidth: 160,
    render: (row) => h(CopyableText, { value: row.actualLocationCode }),
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => h(WmsStatusTag, { label: resolveDetailStatusLabel(row.status), type: getDetailStatusTagType(row.status) }),
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

const { hasPermission } = usePermission()

const canUpdate = computed(() => hasPermission('WMS.InboundOps.ProductionInbounds.Update'))
const canApprove = computed(() => hasPermission('WMS.InboundOps.ProductionInbounds.Approve'))

const isDraftStatus = computed(() => {
  if (!detail.value) return false
  const status = normalizeStatusValue(detail.value.status)
  return status === productionInboundApi.ProductionInboundStatus.Draft
})

function handleEdit() {
  if (!detailId.value) return
  router.push({ name: 'ProductionInboundEdit', params: { orderId: detailId.value } })
}

const approving = ref(false)
async function handleApproveAndExecute() {
  if (!detailId.value) return
  approving.value = true
  try {
    await productionInboundApi.approveAndExecute(detailId.value)
    message.success('审核并执行成功')
    await loadDetail()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '审核并执行失败')
  } finally {
    approving.value = false
  }
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
            <n-button type="primary" :loading="loading" @click="loadDetail">刷新</n-button>
            <n-button v-if="canUpdate && isDraftStatus" type="warning" secondary @click="handleEdit">编辑</n-button>
            <n-button v-if="canApprove && isDraftStatus" type="success" :loading="approving" @click="handleApproveAndExecute">审核并执行</n-button>
          </div>

          <ProductionInboundHeaderTable :model="detail" mode="readonly" />
        </template>
      </DetailWorkbench>
    </template>

    <template #data>
      <n-tabs class="detail-tabs" type="line" animated>
        <n-tab-pane name="details" tab="明细">
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
        </n-tab-pane>
        <n-tab-pane name="records" tab="执行记录">
          <n-empty description="暂无执行记录" />
        </n-tab-pane>
        <n-tab-pane name="inventory" tab="库存影响">
          <n-empty description="暂无库存影响记录" />
        </n-tab-pane>
        <n-tab-pane name="audit" tab="审批/操作日志">
          <n-empty description="暂无审批或操作日志" />
        </n-tab-pane>
        <n-tab-pane name="exceptions" tab="异常记录">
          <n-empty description="暂无异常记录" />
        </n-tab-pane>
      </n-tabs>
    </template>
  </BaseCrudPage>
</template>

<style scoped>
.detail-action-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
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
</style>
