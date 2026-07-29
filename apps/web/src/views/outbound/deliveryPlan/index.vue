<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDataTable, NDatePicker, NForm, NFormItem, NInput, NModal, NPagination, NSelect, NSpace, useMessage } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'

import * as planApi from '../../../api/outbound/salesDeliveryPlan'
import * as allocationApi from '../../../api/outbound/salesAllocationOrder'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import { usePermission } from '../../../composables/usePermission'
import { withResizable } from '../../../utils/table'

const router = useRouter()
const message = useMessage()
const { hasPermission } = usePermission()
const canCreateAllocation = computed(() => hasPermission('WMS.OutboundOps.SalesAllocationOrders.Create'))
const loading = ref(false)
const rows = ref<planApi.SalesDeliveryPlanDto[]>([])
const selectedKeys = ref<DataTableRowKey[]>([])
const selectedPlan = computed(() => rows.value.find((row) => row.id === selectedKeys.value[0]) ?? null)
const allocationModalVisible = ref(false)
const allocationCreating = ref(false)
const allocationPlan = ref<planApi.SalesDeliveryPlanDto | null>(null)
const allocationWarehouseId = ref<string | null>(null)
const allocationWarehouseOptions = computed(() => {
  const map = new Map<string, string>()
  for (const detail of allocationPlan.value?.details ?? []) map.set(detail.warehouseId, `${detail.warehouseName} / ${detail.warehouseCode}`)
  return [...map.entries()].map(([value, label]) => ({ value, label }))
})

const search = reactive({
  planNo: '',
  salesOrderNo: '',
  customerKeyword: '',
  warehouseCode: '',
  status: null as planApi.SalesDeliveryPlanStatus | null,
  plannedDeliveryRange: null as [number, number] | null,
})
const pagination = reactive({ page: 1, pageSize: 20, itemCount: 0 })

const statusOptions = [
  { label: '待配货', value: planApi.SalesDeliveryPlanStatus.PendingAllocation },
  { label: '部分配货', value: planApi.SalesDeliveryPlanStatus.PartiallyAllocated },
  { label: '已配货', value: planApi.SalesDeliveryPlanStatus.Allocated },
  { label: '执行中', value: planApi.SalesDeliveryPlanStatus.Executing },
  { label: '已完成', value: planApi.SalesDeliveryPlanStatus.Completed },
  { label: '已取消', value: planApi.SalesDeliveryPlanStatus.Cancelled },
]

function statusMeta(status: planApi.SalesDeliveryPlanStatus) {
  if (status === planApi.SalesDeliveryPlanStatus.PendingAllocation) return { label: '待配货', type: 'warning' as const }
  if (status === planApi.SalesDeliveryPlanStatus.PartiallyAllocated) return { label: '部分配货', type: 'info' as const }
  if (status === planApi.SalesDeliveryPlanStatus.Allocated) return { label: '已配货', type: 'success' as const }
  if (status === planApi.SalesDeliveryPlanStatus.Executing) return { label: '执行中', type: 'primary' as const }
  if (status === planApi.SalesDeliveryPlanStatus.Completed) return { label: '已完成', type: 'success' as const }
  if (status === planApi.SalesDeliveryPlanStatus.Cancelled) return { label: '已取消', type: 'error' as const }
  return { label: '-', type: 'default' as const }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function formatMoney(value?: number | null) {
  if (value == null) return '-'
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const columns = computed<DataTableColumns<planApi.SalesDeliveryPlanDto>>(() => withResizable([
  { type: 'selection', multiple: false, width: 42 },
  { title: '发货计划单号', key: 'planNo', minWidth: 180, render: (row) => h(CopyableText, { value: row.planNo }) },
  { title: '状态', key: 'status', width: 100, align: 'center', render: (row) => { const meta = statusMeta(row.status); return h(WmsStatusTag, { size: 'small', type: meta.type }, { default: () => meta.label }) } },
  { title: '销售订单', key: 'salesOrderNo', minWidth: 150, render: (row) => h(CopyableText, { value: row.salesOrderNo }) },
  { title: '客户', key: 'customerName', minWidth: 190, render: (row) => `${row.customerName} / ${row.customerCode}` },
  { title: '发货仓库', key: 'warehouseNames', minWidth: 180, render: (row) => row.warehouseNames || '-' },
  { title: '计划日期', key: 'planDate', width: 170, render: (row) => formatDateTime(row.planDate) },
  { title: '最早发货日期', key: 'earliestPlannedDeliveryDate', width: 170, render: (row) => formatDateTime(row.earliestPlannedDeliveryDate) },
  { title: '销售总金额', key: 'totalSalesAmount', width: 140, align: 'right', render: (row) => formatMoney(row.totalSalesAmount) },
  { title: 'ERP状态', key: 'sourceStatusCode', width: 120, render: (row) => row.sourceStatusCode || '-' },
  { title: '最后同步时间', key: 'lastSyncedAt', width: 180, render: (row) => formatDateTime(row.lastSyncedAt) },
]))

async function loadPlans() {
  loading.value = true
  try {
    const result = await planApi.getList({
      skipCount: (pagination.page - 1) * pagination.pageSize,
      maxResultCount: pagination.pageSize,
      planNo: search.planNo || undefined,
      salesOrderNo: search.salesOrderNo || undefined,
      customerKeyword: search.customerKeyword || undefined,
      warehouseCode: search.warehouseCode || undefined,
      status: search.status,
      plannedDeliveryDateFrom: search.plannedDeliveryRange ? new Date(search.plannedDeliveryRange[0]).toISOString() : undefined,
      plannedDeliveryDateTo: search.plannedDeliveryRange ? new Date(search.plannedDeliveryRange[1] + 86_399_999).toISOString() : undefined,
    })
    rows.value = result.items
    pagination.itemCount = result.totalCount
    selectedKeys.value = selectedKeys.value.filter((key) => rows.value.some((row) => row.id === key))
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载销售发运计划失败')
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  search.planNo = ''
  search.salesOrderNo = ''
  search.customerKeyword = ''
  search.warehouseCode = ''
  search.status = null
  search.plannedDeliveryRange = null
  pagination.page = 1
  loadPlans()
}

function openDetail(row?: planApi.SalesDeliveryPlanDto | null) {
  const target = row ?? selectedPlan.value
  if (target) router.push({ name: 'SalesDeliveryPlanDetail', params: { id: target.id } })
}

async function openAllocation() {
  if (!selectedPlan.value) return
  try {
    allocationPlan.value = await planApi.get(selectedPlan.value.id)
    allocationWarehouseId.value = allocationWarehouseOptions.value[0]?.value ?? null
    allocationModalVisible.value = true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载发货计划仓库失败')
  }
}

async function createAllocation() {
  if (!allocationPlan.value || !allocationWarehouseId.value) return
  allocationCreating.value = true
  try {
    const result = await allocationApi.createFromPlan({
      salesDeliveryPlanId: allocationPlan.value.id,
      warehouseId: allocationWarehouseId.value,
    })
    allocationModalVisible.value = false
    await router.push({ name: 'SalesAllocationOrderDetail', params: { id: result.id } })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建销售配货失败')
  } finally {
    allocationCreating.value = false
  }
}

function changePageSize(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadPlans()
}

onMounted(loadPlans)
</script>

<template>
  <BaseCrudPage :selected-count="selectedKeys.length" @clear-selection="selectedKeys = []">
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item><n-input v-model:value="search.planNo" placeholder="发货计划单号" clearable @keyup.enter="loadPlans" /></n-form-item>
        <n-form-item><n-input v-model:value="search.salesOrderNo" placeholder="销售订单号" clearable @keyup.enter="loadPlans" /></n-form-item>
        <n-form-item><n-input v-model:value="search.customerKeyword" placeholder="客户编码/名称" clearable @keyup.enter="loadPlans" /></n-form-item>
        <n-form-item><n-input v-model:value="search.warehouseCode" placeholder="仓库编码" clearable @keyup.enter="loadPlans" /></n-form-item>
        <n-form-item><n-select v-model:value="search.status" :options="statusOptions" placeholder="计划状态" clearable /></n-form-item>
        <n-form-item><n-date-picker v-model:value="search.plannedDeliveryRange" type="daterange" clearable start-placeholder="发货日期起" end-placeholder="发货日期止" /></n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item><n-button :loading="loading" @click="pagination.page = 1; loadPlans()">查询</n-button></n-form-item>
        <n-form-item><n-button @click="resetSearch">重置</n-button></n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button :disabled="!selectedPlan" @click="openDetail()">查看</n-button>
        <n-button v-if="canCreateAllocation" type="primary" :disabled="!selectedPlan || selectedPlan.status === planApi.SalesDeliveryPlanStatus.Cancelled" @click="openAllocation">配货</n-button>
        <n-button :loading="loading" @click="loadPlans">刷新</n-button>
      </div>
    </template>

    <template #data>
      <n-data-table
        class="crud-table-flat"
        :columns="columns"
        :data="rows"
        :bordered="false"
        :loading="loading"
        :row-key="(row) => row.id"
        :checked-row-keys="selectedKeys"
        :row-props="(row) => ({ onDblclick: () => openDetail(row) })"
        @update:checked-row-keys="(keys) => selectedKeys = keys"
      />
    </template>

    <template #pager-right>
      <n-pagination
        v-model:page="pagination.page"
        :page-size="pagination.pageSize"
        :item-count="pagination.itemCount"
        show-size-picker
        :page-sizes="[10, 20, 50]"
        @update:page="loadPlans"
        @update:page-size="changePageSize"
      />
    </template>
  </BaseCrudPage>
  <n-modal v-model:show="allocationModalVisible" preset="card" title="创建销售配货" style="width: 520px">
    <n-form label-width="100">
      <n-form-item label="发货计划">{{ allocationPlan?.planNo }}</n-form-item>
      <n-form-item label="配货仓库">
        <n-select v-model:value="allocationWarehouseId" :options="allocationWarehouseOptions" placeholder="请选择仓库" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="allocationModalVisible = false">取消</n-button>
        <n-button type="primary" :disabled="!allocationWarehouseId" :loading="allocationCreating" @click="createAllocation">创建并进入配货</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
