<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDataTable, NForm, NFormItem, NInput, NPagination, NSelect, useDialog, useMessage } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import * as api from '../../../api/outbound/salesAllocationOrder'
import { usePermission } from '../../../composables/usePermission'
import { withResizable } from '../../../utils/table'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const { hasPermission } = usePermission()
const loading = ref(false)
const rows = ref<api.SalesAllocationOrderDto[]>([])
const selectedKeys = ref<DataTableRowKey[]>([])
const selected = computed(() => rows.value.find(x => x.id === selectedKeys.value[0]))
const canCreate = computed(() => hasPermission('WMS.OutboundOps.SalesAllocationOrders.Create'))
const canUpdate = computed(() => hasPermission('WMS.OutboundOps.SalesAllocationOrders.Update'))
const canDelete = computed(() => hasPermission('WMS.OutboundOps.SalesAllocationOrders.Delete'))
const canConfirmPermission = computed(() => hasPermission('WMS.OutboundOps.SalesAllocationOrders.Confirm'))
const selectedEditable = computed(() => Boolean(selected.value && [10, 20, 30].includes(Number(selected.value.status))))
const selectedConfirmable = computed(() => selected.value?.status === api.SalesAllocationOrderStatus.Allocated)
const selectedRevocable = computed(() => selected.value?.status === api.SalesAllocationOrderStatus.Confirmed)
const search = reactive({ allocationNo: '', salesDeliveryPlanNo: '', salesOrderNo: '', customerKeyword: '', status: null as number | null })
const pagination = reactive({ page: 1, pageSize: 20, itemCount: 0 })

const statusOptions = [
  { label: '待配货', value: 10 }, { label: '部分配货', value: 20 }, { label: '已配齐', value: 30 },
  { label: '已确认', value: 40 }, { label: '执行中', value: 50 }, { label: '已完成', value: 60 }, { label: '已取消', value: 90 },
]
function statusLabel(value: number) { return statusOptions.find(x => x.value === value)?.label ?? String(value) }
function statusType(value: number) {
  if (value === 60) return 'success'
  if (value === 90) return 'error'
  if (value === 40 || value === 50) return 'primary'
  if (value === 20 || value === 30) return 'info'
  return 'warning'
}
function formatQty(value: number) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 4 }) }
const columns = computed<DataTableColumns<api.SalesAllocationOrderDto>>(() => withResizable([
  { type: 'selection', multiple: false, width: 42 },
  { title: '配货单号', key: 'allocationNo', minWidth: 180, render: row => h(CopyableText, { value: row.allocationNo }) },
  { title: '状态', key: 'status', width: 100, align: 'center', render: row => h(WmsStatusTag, { size: 'small', type: statusType(row.status) }, { default: () => statusLabel(row.status) }) },
  { title: '发货计划', key: 'salesDeliveryPlanNo', minWidth: 170 },
  { title: '销售订单', key: 'salesOrderNo', minWidth: 160 },
  { title: '客户', key: 'customerName', minWidth: 180, render: row => `${row.customerName} / ${row.customerCode}` },
  { title: '仓库', key: 'warehouseName', minWidth: 180, render: row => `${row.warehouseName} / ${row.warehouseCode}` },
  { title: '计划数量', key: 'plannedQty', width: 110, align: 'right', render: row => formatQty(row.plannedQty) },
  { title: '已配数量', key: 'allocatedQty', width: 110, align: 'right', render: row => formatQty(row.allocatedQty) },
]))
async function load() {
  loading.value = true
  try {
    const result = await api.getList({ skipCount: (pagination.page - 1) * pagination.pageSize, maxResultCount: pagination.pageSize, ...search })
    rows.value = result.items
    pagination.itemCount = result.totalCount
    selectedKeys.value = selectedKeys.value.filter(key => rows.value.some(row => row.id === key))
  } catch (e) { message.error(e instanceof Error ? e.message : '加载销售配货失败') } finally { loading.value = false }
}
function reset() { Object.assign(search, { allocationNo: '', salesDeliveryPlanNo: '', salesOrderNo: '', customerKeyword: '', status: null }); pagination.page = 1; load() }
function open(row?: api.SalesAllocationOrderDto) { const target = row ?? selected.value; if (target) router.push({ name: 'SalesAllocationOrderDetail', params: { id: target.id } }) }
async function confirmSelected() {
  if (!selected.value) return
  try {
    await api.confirm(selected.value.id)
    message.success('销售配货已确认')
    await load()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '确认失败')
  }
}
async function revokeSelected() {
  if (!selected.value) return
  try {
    await api.revokeConfirmation(selected.value.id)
    message.success('已撤销确认')
    await load()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '撤销确认失败')
  }
}
function deleteSelected() {
  if (!selected.value) return
  dialog.warning({
    title: '删除销售配货',
    content: `确认删除 ${selected.value.allocationNo}？已锁定的库存将同时释放。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.remove(selected.value!.id)
        selectedKeys.value = []
        message.success('销售配货已删除，库存锁定已释放')
        await load()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '删除失败')
      }
    },
  })
}
onMounted(load)
</script>

<template>
  <BaseCrudPage :selected-count="selectedKeys.length" @clear-selection="selectedKeys = []">
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item><n-input v-model:value="search.allocationNo" placeholder="配货单号" clearable @keyup.enter="load" /></n-form-item>
        <n-form-item><n-input v-model:value="search.salesDeliveryPlanNo" placeholder="发货计划单号" clearable @keyup.enter="load" /></n-form-item>
        <n-form-item><n-input v-model:value="search.salesOrderNo" placeholder="销售订单号" clearable @keyup.enter="load" /></n-form-item>
        <n-form-item><n-input v-model:value="search.customerKeyword" placeholder="客户编码/名称" clearable @keyup.enter="load" /></n-form-item>
        <n-form-item><n-select v-model:value="search.status" :options="statusOptions" placeholder="配货状态" clearable /></n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item><n-button :loading="loading" @click="pagination.page = 1; load()">查询</n-button></n-form-item>
        <n-form-item><n-button @click="reset">重置</n-button></n-form-item>
      </n-form>
    </template>
    <template #actions-left>
      <div class="crud-action-main">
        <n-button v-if="canCreate" type="primary" @click="router.push({ name: 'SalesDeliveryPlanList' })">从发货计划配货</n-button>
        <n-button :disabled="!selected" @click="open()">查看</n-button>
        <n-button v-if="canUpdate" :disabled="!selectedEditable" @click="open()">继续配货</n-button>
        <n-button v-if="canConfirmPermission" type="success" :disabled="!selectedConfirmable" @click="confirmSelected">确认</n-button>
        <n-button v-if="canConfirmPermission" :disabled="!selectedRevocable" @click="revokeSelected">撤销确认</n-button>
        <n-button v-if="canDelete" type="error" secondary :disabled="!selectedEditable" @click="deleteSelected">删除</n-button>
        <n-button :loading="loading" @click="load">刷新</n-button>
      </div>
    </template>
    <template #data>
      <n-data-table class="crud-table-flat" :columns="columns" :data="rows" :loading="loading" :bordered="false"
        :row-key="row => row.id" :checked-row-keys="selectedKeys" :row-props="row => ({ onDblclick: () => open(row) })"
        @update:checked-row-keys="keys => selectedKeys = keys" />
    </template>
    <template #pager-right>
      <n-pagination v-model:page="pagination.page" v-model:page-size="pagination.pageSize" :item-count="pagination.itemCount"
        show-size-picker :page-sizes="[10,20,50]" @update:page="load" @update:page-size="pagination.page = 1; load()" />
    </template>
  </BaseCrudPage>
</template>
