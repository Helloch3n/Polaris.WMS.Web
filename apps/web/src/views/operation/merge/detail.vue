<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NDataTable,
useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as palletMergeApi from '../../../api/palletMerge/palletMerge'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'

const headerLabelStyle = {
  width: '120px',
}

const headerContentStyle = {
  minWidth: '220px',
}

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const orderId = route.params.id as string
const loading = ref(true)
const executing = ref(false)
const order = ref<palletMergeApi.PalletMergeDto | null>(null)

// 转换和展示状态
function normalizeStatusValue(status: palletMergeApi.PalletMergeOrderStatus) {
  if (typeof status === 'string') {
    if (status === 'Draft' || status === '0') return palletMergeApi.PalletMergeOrderStatus.Draft
    if (status === 'Completed' || status === '1') return palletMergeApi.PalletMergeOrderStatus.Completed
  }
  if (typeof status === 'number') {
    return status
  }
  return null
}

const isDraft = computed(() => {
  if (!order.value) return false
  return normalizeStatusValue(order.value.status) === palletMergeApi.PalletMergeOrderStatus.Draft
})

function resolveStatusLabel(status?: palletMergeApi.PalletMergeOrderStatus) {
  if (status === undefined) return '-'
  const value = normalizeStatusValue(status)
  if (value === palletMergeApi.PalletMergeOrderStatus.Draft) return '草稿'
  if (value === palletMergeApi.PalletMergeOrderStatus.Completed) return '已完成'
  return '-'
}

function getStatusTagType(status?: palletMergeApi.PalletMergeOrderStatus) {
  if (status === undefined) return 'default'
  const value = normalizeStatusValue(status)
  if (value === palletMergeApi.PalletMergeOrderStatus.Draft) return 'default'
  if (value === palletMergeApi.PalletMergeOrderStatus.Completed) return 'success'
  return 'default'
}

function resolveTypeLabel(type?: any) {
  if (type === undefined || type === null) return '-'
  if (type === 0 || type === '0' || type === 'Split') return '分拆'
  if (type === 1 || type === '1' || type === 'Merge') return '合盘'
  return '-'
}

function getTypeTagType(type?: any) {
  if (type === undefined || type === null) return 'default'
  if (type === 0 || type === '0' || type === 'Split') return 'warning'
  if (type === 1 || type === '1' || type === 'Merge') return 'info'
  return 'default'
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function loadData() {
  loading.value = true
  try {
    order.value = await palletMergeApi.get(orderId)
  } catch (err: any) {
    message.error(err?.message || '获取分拆合盘单详情失败')
  } finally {
    loading.value = false
  }
}

// 审核并执行
function handleApproveAndExecute() {
  dialog.warning({
    title: '确认审核并执行',
    content: '您确定要审核并执行此分拆合盘单吗？执行后将直接扣减源库存，并生成目标库存和出入库流水，此操作不可撤销！',
    positiveText: '确认执行',
    negativeText: '取消',
    onPositiveClick: async () => {
      executing.value = true
      try {
        await palletMergeApi.approveAndExecute(orderId)
        message.success('执行成功！')
        loadData()
      } catch (err: any) {
        message.error(err?.message || '执行分拆合盘失败')
      } finally {
        executing.value = false
      }
    },
  })
}

// 删除草稿单据
function handleDelete() {
  dialog.warning({
    title: '确认删除',
    content: '确认要删除此分拆合盘申请单吗？删除后锁定的载具将自动释放！',
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await palletMergeApi.remove(orderId)
        message.success('单据已删除')
        router.push({ name: 'PalletMergeManagement' })
      } catch (err: any) {
        message.error(err?.message || '删除单据失败')
      }
    },
  })
}

function handleBack() {
  router.push({ name: 'PalletMergeManagement' })
}

// 拆分明细为 Before 与 After
const beforeDetails = computed(() => {
  if (!order.value?.details) return []
  return order.value.details.filter(x => (x.direction as any) === 0 || (x.direction as any) === 'Before')
})

const afterDetails = computed(() => {
  if (!order.value?.details) return []
  return order.value.details.filter(x => (x.direction as any) === 1 || (x.direction as any) === 'After')
})

const detailColumns: DataTableColumns<palletMergeApi.PalletMergeDetailDto> = [
  { title: '盘号', key: 'containerCode' },
  { title: '库位', key: 'locationCode' },
  { title: '物料编码', key: 'productCode' },
  { title: '物料名称', key: 'productName', minWidth: 200 },
  { title: '数量', key: 'qty', render: (row: any) => `${row.qty} ${row.unit}` },
  { title: '批次号', key: 'batchNo' },
  { title: 'SN号', key: 'sn' },
  { title: '重量', key: 'weight', render: (row: any) => `${row.weight} kg` },
  { title: '工艺版本', key: 'craftVersion', render: (row: any) => row.craftVersion || '-' },
]

onMounted(() => {
  loadData()
})
</script>

<template>
  <BaseCrudPage :search-collapsible="false">
    <template #search>
      <div v-if="order" class="detail-header-wrap">
        <div class="header-action-bar">
          <n-button @click="handleBack">返回列表</n-button>
          <n-button :loading="loading" @click="loadData">刷新</n-button>
          <n-button
            v-if="isDraft"
            v-permission="'WMS.InternalOps.PalletMerge'"
            type="error"
            secondary
            @click="handleDelete"
          >
            删除
          </n-button>
          <n-button
            v-if="isDraft"
            v-permission="'WMS.InternalOps.PalletMerge'"
            type="primary"
            secondary
            :loading="executing"
            @click="handleApproveAndExecute"
          >
            审核
          </n-button>
        </div>

        <n-descriptions
          class="transfer-header-descriptions"
          bordered
          label-placement="left"
          :column="3"
          :label-style="headerLabelStyle"
          :content-style="headerContentStyle"
          style="margin-top: 10px;"
        >
          <n-descriptions-item label="单据号">
            {{ order.orderNo }}
          </n-descriptions-item>
          <n-descriptions-item label="单据状态">
            <WmsStatusTag size="small" :type="getStatusTagType(order.status)" bordered>
              {{ resolveStatusLabel(order.status) }}
            </WmsStatusTag>
          </n-descriptions-item>
          <n-descriptions-item label="业务类型">
            <WmsStatusTag size="small" :type="getTypeTagType(order.mergeType)">
              {{ resolveTypeLabel(order.mergeType) }}
            </WmsStatusTag>
          </n-descriptions-item>
          <n-descriptions-item label="所属仓库">
            {{ order.warehouseName }} ({{ order.warehouseCode }})
          </n-descriptions-item>
          <n-descriptions-item label="账户别名">
            {{ order.accountAlias }}
          </n-descriptions-item>
          <n-descriptions-item label="创建时间">
            {{ formatDateTime(order.creationTime) }}
          </n-descriptions-item>
        </n-descriptions>
      </div>
    </template>

    <template #data>
      <div v-if="order" style="display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 4px;">
        <!-- 调整前源明细 Card -->
        <n-card title="调整前源明细" class="form-card" size="medium">
          <n-data-table
            :columns="detailColumns"
            :data="beforeDetails"
            :bordered="false"
          />
        </n-card>

        <!-- 调整后目标明细 Card -->
        <n-card title="调整后目标明细" class="form-card" size="medium">
          <n-data-table
            :columns="detailColumns"
            :data="afterDetails"
            :bordered="false"
          />
        </n-card>
      </div>
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

/* 覆写 BaseCrudPage 的 flex 撑满高度，防止卡片内的表格高度塌陷 */
:deep(.slot-data .n-data-table) {
  flex: none !important;
  height: auto !important;
}
:deep(.slot-data .n-data-table .n-data-table-wrapper) {
  flex: none !important;
  height: auto !important;
  overflow: visible !important;
}
:deep(.slot-data .n-data-table .n-data-table-base-table) {
  height: auto !important;
}
</style>
