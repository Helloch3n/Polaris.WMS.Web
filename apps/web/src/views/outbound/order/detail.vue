<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NDataTable, NDescriptions, NDescriptionsItem, NEmpty, NTabPane, NTabs, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as salesOrderApi from '../../../api/outbound/salesOrder'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import DetailWorkbench from '../../../components/DetailWorkbench.vue'
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { withResizable } from '../../../utils/table'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const order = ref<salesOrderApi.SalesOrderDto | null>(null)
const orderId = computed(() => String(route.params.id ?? ''))

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function getStatusLabel(status?: salesOrderApi.SalesOrderStatus) {
  if (status === salesOrderApi.SalesOrderStatus.Open) return '开立'
  if (status === salesOrderApi.SalesOrderStatus.PartiallyShipped) return '部分发货'
  if (status === salesOrderApi.SalesOrderStatus.Completed) return '完成'
  if (status === salesOrderApi.SalesOrderStatus.Cancelled) return '已取消'
  return '-'
}

function getStatusTagType(status?: salesOrderApi.SalesOrderStatus) {
  if (status === salesOrderApi.SalesOrderStatus.Open) return 'info'
  if (status === salesOrderApi.SalesOrderStatus.PartiallyShipped) return 'warning'
  if (status === salesOrderApi.SalesOrderStatus.Completed) return 'success'
  return 'default'
}

const detailColumns = computed<DataTableColumns<salesOrderApi.SalesOrderDetailDto>>(() => withResizable([
  { title: '行号', key: 'lineNo', width: 80, align: 'center' },
  { title: '物料编码', key: 'productCode', minWidth: 150, render: (row) => h(CopyableText, { value: row.productCode }) },
  { title: '物料名称', key: 'productName', minWidth: 180, render: (row) => row.productName || '-' },
  { title: '单位', key: 'unit', width: 100, align: 'center', render: (row) => row.unit || '-' },
  { title: '订单数量', key: 'qty', width: 120, align: 'right' },
  { title: '已分配数量', key: 'allocatedQty', width: 130, align: 'right' },
  { title: '发货中占用', key: 'plannedShipmentQty', width: 130, align: 'right' },
  { title: '已发货数量', key: 'shippedQty', width: 130, align: 'right' },
  { title: '可发数量', key: 'availableToShipQty', width: 120, align: 'right' },
  { title: '备注', key: 'remark', minWidth: 180, render: (row) => row.remark || '-' },
]))

async function loadDetail() {
  if (!orderId.value) {
    message.error('缺少销售订单 ID，无法加载详情')
    return
  }
  loading.value = true
  try {
    order.value = await salesOrderApi.get(orderId.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载销售订单详情失败')
  } finally {
    loading.value = false
  }
}

function backToList() {
  router.push({ name: 'SalesOrderList' })
}

onMounted(loadDetail)
</script>

<template>
  <BaseCrudPage :search-collapsible="false">
    <template #search>
      <DetailWorkbench :show-header="false" :loading="loading">
        <template #summary>
          <div class="detail-action-bar">
            <n-button @click="backToList">返回列表</n-button>
            <n-button :loading="loading" @click="loadDetail">刷新</n-button>
          </div>

          <n-descriptions class="sales-order-header-table" bordered label-placement="left" :column="3">
            <n-descriptions-item label="订单号">
              <CopyableText :value="order?.orderNo || '-'" strong />
            </n-descriptions-item>
            <n-descriptions-item label="客户">
              {{ order ? `${order.customerName} (${order.customerCode})` : '-' }}
            </n-descriptions-item>
            <n-descriptions-item label="订单状态">
              <WmsStatusTag :label="getStatusLabel(order?.status)" :type="getStatusTagType(order?.status)" />
            </n-descriptions-item>
            <n-descriptions-item label="订单日期">{{ formatDateTime(order?.orderDate) }}</n-descriptions-item>
            <n-descriptions-item label="计划发货时间">{{ formatDateTime(order?.expectedDeliveryTime) }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(order?.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="备注" :span="3">{{ order?.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
        </template>
      </DetailWorkbench>
    </template>

    <template #data>
      <n-tabs class="detail-tabs" type="line" animated>
        <n-tab-pane name="details" tab="订单明细">
          <n-data-table
            class="crud-table-flat"
            :loading="loading"
            :columns="detailColumns"
            :data="order?.details ?? []"
            :bordered="false"
            :row-key="(row) => row.id"
            :scroll-x="1260"
          >
            <template #empty><n-empty description="暂无订单明细" /></template>
          </n-data-table>
        </n-tab-pane>
        <n-tab-pane name="shipment" tab="发货记录">
          <n-empty description="暂无发货记录" />
        </n-tab-pane>
        <n-tab-pane name="allocation" tab="订单库存预留">
          <n-empty description="暂无订单库存预留记录" />
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

:deep(.sales-order-header-table .n-descriptions-table-header) {
  width: 136px;
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
