<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDataTable, NForm, NFormItem, NInput, NPagination, NSelect, useDialog, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import * as api from '../../../api/outbound/purchaseReturn'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import { useAuthStore } from '../../../stores/auth'
import { withResizable } from '../../../utils/table'

const router = useRouter()
const auth = useAuthStore()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const rows = ref<api.PurchaseReturnOrder[]>([])
const checkedKeys = ref<string[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const query = reactive<{ returnNo?: string; supplierName?: string; purchaseReceiptNo?: string; status?: api.PurchaseReturnStatus }>({})
const selected = computed(() => rows.value.find(x => x.id === checkedKeys.value[0]))
const has = (policy: string) => auth.hasPermission(policy)

const statusOptions = [
  { label: '草稿', value: 0 }, { label: '待审核', value: 1 }, { label: '待出库', value: 2 },
  { label: '已完成', value: 3 }, { label: '已取消', value: 4 },
]
const statusLabel = (value: number) => statusOptions.find(x => x.value === value)?.label ?? '-'
const statusType = (value: number) => value === 3 ? 'success' : value === 1 || value === 2 ? 'warning' : value === 4 ? 'error' : 'default'
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'

const columns: DataTableColumns<api.PurchaseReturnOrder> = withResizable([
  { type: 'selection', width: 42 },
  { title: '退货单号', key: 'returnNo', minWidth: 180, render: row => h(CopyableText, { value: row.returnNo }) },
  { title: '状态', key: 'status', width: 100, render: row => h(WmsStatusTag, { size: 'small', bordered: false, type: statusType(Number(row.status)) }, { default: () => statusLabel(Number(row.status)) }) },
  { title: '仓库', key: 'warehouseName', minWidth: 170, render: row => row.warehouseName ? `${row.warehouseCode} / ${row.warehouseName}` : '-' },
  { title: '供应商', key: 'supplierName', minWidth: 180 },
  { title: '采购收货单', key: 'purchaseReceiptNo', minWidth: 170, render: row => row.purchaseReceiptNo || '-' },
  { title: '来源采购单', key: 'purchaseOrderNo', minWidth: 170, render: row => row.purchaseOrderNo || '-' },
  { title: '计划退货日期', key: 'plannedReturnDate', width: 145, render: row => row.plannedReturnDate?.slice(0, 10) || '-' },
  { title: '创建人', key: 'creatorName', minWidth: 120, render: row => row.creatorName || '-' },
  { title: '创建时间', key: 'creationTime', width: 180, render: row => formatDate(row.creationTime) },
  { title: '修改人', key: 'lastModifierName', minWidth: 120, render: row => row.lastModifierName || '-' },
  { title: '修改时间', key: 'lastModificationTime', width: 180, render: row => formatDate(row.lastModificationTime) },
])

async function load() {
  loading.value = true
  try {
    const data = await api.getList({ ...query, skipCount: (page.value - 1) * pageSize.value, maxResultCount: pageSize.value, sorting: 'CreationTime desc' })
    rows.value = data.items
    total.value = data.totalCount
    checkedKeys.value = []
  } finally { loading.value = false }
}
function reset() { Object.assign(query, { returnNo: undefined, supplierName: undefined, purchaseReceiptNo: undefined, status: undefined }); page.value = 1; load() }
function openDetail(row = selected.value) { if (row) router.push(`/outboundManagement/purchase-return/${row.id}`) }
function requireWarehouse() {
  if (auth.currentWarehouseId) return true
  message.warning('请先选择具体仓库')
  return false
}
function openCreate() {
  if (requireWarehouse()) router.push('/outboundManagement/purchase-return/create')
}
function openEdit() {
  if (selected.value && requireWarehouse()) router.push(`/outboundManagement/purchase-return/${selected.value.id}/edit`)
}
async function run(action: () => Promise<void>, success: string) { await action(); message.success(success); await load() }
function confirmDelete() {
  if (!selected.value) return
  dialog.warning({ title: '删除采购退货单', content: `确认删除 ${selected.value.returnNo}？`, positiveText: '删除', negativeText: '取消', onPositiveClick: () => run(() => api.remove(selected.value!.id), '删除成功') })
}

onMounted(load)
</script>

<template>
  <BaseCrudPage :selected-count="checkedKeys.length" @clear-selection="checkedKeys = []">
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item><n-input v-model:value="query.returnNo" clearable placeholder="采购退货单号" @keyup.enter="load" /></n-form-item>
        <n-form-item><n-input v-model:value="query.supplierName" clearable placeholder="供应商名称" @keyup.enter="load" /></n-form-item>
        <n-form-item><n-input v-model:value="query.purchaseReceiptNo" clearable placeholder="采购收货单号" @keyup.enter="load" /></n-form-item>
        <n-form-item><n-select v-model:value="query.status" clearable placeholder="单据状态" :options="statusOptions" style="width: 130px" /></n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item><n-button :loading="loading" @click="page = 1; load()">查询</n-button></n-form-item>
        <n-form-item><n-button @click="reset">重置</n-button></n-form-item>
      </n-form>
    </template>
    <template #actions-left>
      <div class="crud-action-main">
        <n-button v-if="has('WMS.OutboundOps.PurchaseReturns.Create')" type="primary" @click="openCreate">新增</n-button>
        <n-button :disabled="checkedKeys.length !== 1" @click="openDetail()">查看</n-button>
        <n-button v-if="has('WMS.OutboundOps.PurchaseReturns.Update')" :disabled="checkedKeys.length !== 1 || selected?.status !== 0" @click="openEdit">编辑</n-button>
        <n-button v-if="has('WMS.OutboundOps.PurchaseReturns.Submit')" :disabled="checkedKeys.length !== 1 || selected?.status !== 0" @click="run(() => api.submit(selected!.id), '提交成功')">提交审核</n-button>
        <n-button v-if="has('WMS.OutboundOps.PurchaseReturns.Delete')" :disabled="checkedKeys.length !== 1 || selected?.status !== 0" type="error" secondary @click="confirmDelete">删除</n-button>
      </div>
    </template>
    <template #data><n-data-table class="crud-table-flat" flex-height :loading="loading" :columns="columns" :data="rows" :row-key="row => row.id" v-model:checked-row-keys="checkedKeys" :row-props="row => ({ onDblclick: () => openDetail(row) })" /></template>
    <template #pager-right><n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="total" :page-sizes="[10, 20, 50, 100]" show-size-picker @update:page="load" @update:page-size="page = 1; load()" /></template>
  </BaseCrudPage>
</template>
