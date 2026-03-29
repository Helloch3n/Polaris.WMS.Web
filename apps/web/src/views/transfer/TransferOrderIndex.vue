<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'

import * as transferApi from '../../api/transfer/transfer'
import BaseCrudPage from '../../components/BaseCrudPage.vue'
import TableColumnManager from '../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../composables/useColumnConfig'
import { useAuthStore } from '../../stores/auth'
import { useTableSelection } from '../../composables/useTableSelection'
import { withResizable } from '../../utils/table'
import { compareSortValue } from '../../utils/tableColumn'

type TransferRow = transferApi.TransferListDto

const loading = ref(false)
const rows = ref<TransferRow[]>([])
const message = useMessage()
const dialog = useDialog()
const router = useRouter()
const authStore = useAuthStore()

const currentWarehouseText = computed(() => authStore.currentWarehouseId.trim() || '未设置')
const currentDepartmentText = computed(() => authStore.currentDepartmentId.trim() || '未设置')

const query = reactive({
  orderNo: '',
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const listParams = computed<transferApi.TransferSearchDto>(() => ({
  maxResultCount: pagination.pageSize ?? 10,
  skipCount: ((pagination.page ?? 1) - 1) * (pagination.pageSize ?? 10),
  orderNo: query.orderNo.trim() || undefined,
}))

function getRowKey(row: TransferRow) {
  return row.id
}

const {
  checkedRowKeys,
  selectedRows,
  selectedCount,
  handleCheckedRowKeysChange,
  syncCheckedRowKeys,
  toggleSingleRow,
  clearSelection,
} = useTableSelection(rows, getRowKey)

const canViewSelected = computed(() => selectedCount.value === 1)
const canEditSelected = computed(() => {
  if (selectedCount.value !== 1) return false
  const selected = selectedRows.value[0]
  if (!selected) return false
  return normalizeStatusValue(selected.status) !== transferApi.TransferOrderStatus.Completed
})
const showDeleteButton = computed(() => !selectedRows.value.some((item) =>
  normalizeStatusValue(item.status) === transferApi.TransferOrderStatus.Completed,
))
const canDeleteSelected = computed(() => {
  if (selectedCount.value !== 1) return false
  const selected = selectedRows.value[0]
  if (!selected) return false
  return normalizeStatusValue(selected.status) !== transferApi.TransferOrderStatus.Completed
})

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizeStatusValue(status: transferApi.TransferOrderStatus) {
  if (typeof status === 'string') {
    if (status === 'Draft' || status === '0') return transferApi.TransferOrderStatus.Draft
    if (status === 'Approved' || status === '1') return transferApi.TransferOrderStatus.Approved
    if (status === 'InProgress' || status === '2') return transferApi.TransferOrderStatus.InProgress
    if (status === 'Completed' || status === '3') return transferApi.TransferOrderStatus.Completed
    if (status === 'Cancelled' || status === '4') return transferApi.TransferOrderStatus.Cancelled
  }
  if (typeof status === 'number') {
    return status
  }
  return null
}

function resolveStatusLabel(status: transferApi.TransferOrderStatus) {
  const value = normalizeStatusValue(status)
  if (value === transferApi.TransferOrderStatus.Draft) return '草稿'
  if (value === transferApi.TransferOrderStatus.Approved) return '已审核'
  if (value === transferApi.TransferOrderStatus.InProgress) return '作业中'
  if (value === transferApi.TransferOrderStatus.Completed) return '已完成'
  if (value === transferApi.TransferOrderStatus.Cancelled) return '已取消'
  return '-'
}

function getStatusTagType(status: transferApi.TransferOrderStatus) {
  const value = normalizeStatusValue(status)
  if (value === transferApi.TransferOrderStatus.Draft) return 'default'
  if (value === transferApi.TransferOrderStatus.Approved) return 'info'
  if (value === transferApi.TransferOrderStatus.InProgress) return 'warning'
  if (value === transferApi.TransferOrderStatus.Completed) return 'success'
  if (value === transferApi.TransferOrderStatus.Cancelled) return 'error'
  return 'default'
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'transfer-order-column-settings-v4',
  preferredKeys: ['orderNo', 'departmentCode', 'departmentName', 'warehouseCode', 'warehouseName', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'orderNo') return '调拨单号'
    if (key === 'departmentCode') return '部门编码'
    if (key === 'departmentName') return '部门名称'
    if (key === 'warehouseCode') return '仓库编码'
    if (key === 'warehouseName') return '仓库名称'
    if (key === 'status') return '调拨状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<TransferRow>[number]> = {
  orderNo: {
    title: createDraggableTitle('orderNo', '调拨单号'),
    key: 'orderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.orderNo, b.orderNo),
    render: (row) => row.orderNo ?? '-',
  },
  departmentCode: {
    title: createDraggableTitle('departmentCode', '部门编码'),
    key: 'departmentCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.departmentCode, b.departmentCode),
    render: (row) => row.departmentCode ?? '-',
  },
  departmentName: {
    title: createDraggableTitle('departmentName', '部门名称'),
    key: 'departmentName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.departmentName, b.departmentName),
    render: (row) => row.departmentName ?? '-',
  },
  warehouseCode: {
    title: createDraggableTitle('warehouseCode', '仓库编码'),
    key: 'warehouseCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.warehouseCode, b.warehouseCode),
    render: (row) => row.warehouseCode ?? '-',
  },
  warehouseName: {
    title: createDraggableTitle('warehouseName', '仓库名称'),
    key: 'warehouseName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.warehouseName, b.warehouseName),
    render: (row) => row.warehouseName ?? '-',
  },
  status: {
    title: createDraggableTitle('status', '调拨状态'),
    key: 'status',
    width: 140,
    align: 'center',
    sorter: (a, b) => compareSortValue(normalizeStatusValue(a.status), normalizeStatusValue(b.status)),
    render: (row) => {
      const label = resolveStatusLabel(row.status)
      return h(NTag, { size: 'small', type: getStatusTagType(row.status) }, { default: () => label })
    },
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<TransferRow>>(() => withResizable(
  [
    {
      type: 'selection',
      fixed: 'left',
      width: 44,
    },
    ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<TransferRow>[number] => Boolean(item)),
  ],
))

async function loadData() {
  loading.value = true
  try {
    const data = await transferApi.getList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
    pagination.itemCount = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleView() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行查看')
    return
  }
  router.push({ name: 'TransferOrderDetail', params: { id: selected.id } })
}

async function handleEdit() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行编辑')
    return
  }
  if (normalizeStatusValue(selected.status) === transferApi.TransferOrderStatus.Completed) {
    message.warning('已完成状态的调拨单不允许编辑')
    return
  }
  router.push({ name: 'TransferOrderEdit', params: { id: selected.id } })
}

function openDetail(row: TransferRow) {
  if (!row?.id) return
  router.push({ name: 'TransferOrderDetail', params: { id: row.id } })
}

async function handleCreate() {
  router.push({ name: 'TransferOrderCreate' })
}

function handleDelete() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行删除')
    return
  }
  if (normalizeStatusValue(selected.status) === transferApi.TransferOrderStatus.Completed) {
    message.warning('已完成状态的调拨单不允许删除')
    return
  }

  dialog.warning({
    title: '确认删除',
    content: `确认删除调拨单 ${selected.orderNo || ''} 吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await transferApi.remove(selected.id)
        message.success('删除成功')
        clearSelection()
        if ((rows.value.length ?? 0) <= 1 && (pagination.page ?? 1) > 1) {
          pagination.page = (pagination.page ?? 1) - 1
        }
        await loadData()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '删除失败')
      }
    },
  })
}

function handleQuery() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  query.orderNo = ''
  pagination.page = 1
  loadData()
}

function handlePageChange(page: number) {
  pagination.page = page
  loadData()
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

onMounted(() => {
  loadColumnSettings()
  loadData()
})
</script>

<template>
  <div>
    <BaseCrudPage>
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item>
            <n-input :value="query.orderNo" placeholder="请输入调拨单号" clearable @update:value="(value) => { query.orderNo = value }" />
          </n-form-item>
          <n-form-item class="crud-page-spacer" />
          <n-form-item>
            <n-button type="primary" :loading="loading" @click="handleQuery">查询</n-button>
          </n-form-item>
          <n-form-item>
            <n-button @click="handleReset">重置</n-button>
          </n-form-item>
        </n-form>
      </template>

      <template #actions-left>
        <div class="crud-action-main">
          <n-button v-permission="'WMS.InternalOps.TransferOrders.Create'" type="primary" :loading="loading" @click="handleCreate">新增</n-button>
          <n-button :disabled="!canViewSelected || loading" @click="handleView">查看</n-button>
          <n-button v-permission="'WMS.InternalOps.TransferOrders.Update'"  :disabled="!canEditSelected || loading" @click="handleEdit">编辑</n-button>
          <n-button v-permission="'WMS.InternalOps.TransferOrders.Delete'"  v-if="showDeleteButton" type="error" :disabled="!canDeleteSelected || loading" @click="handleDelete">删除</n-button>
        </div>
      </template>

      <template #actions-right>
        <div class="crud-action-tools transfer-toolbar-tools">
          <div class="transfer-context-info" aria-label="当前作业上下文">
            <div class="transfer-context-item" title="当前作业仓库">
              <span class="transfer-context-label">当前作业仓库</span>
              <span class="transfer-context-value">{{ currentWarehouseText }}</span>
            </div>
            <div class="transfer-context-item" title="当前作业部门">
              <span class="transfer-context-label">当前作业部门</span>
              <span class="transfer-context-value">{{ currentDepartmentText }}</span>
            </div>
          </div>
          <TableColumnManager
            :show="showColumnConfig"
            :settings="columnSettings"
            @update:show="handleColumnConfigShowChange"
            @visible-change="handleColumnVisibleChange"
          />
        </div>
      </template>

      <template #data>
        <n-data-table
          class="crud-table-flat"
          :loading="loading"
          :columns="columns"
          :data="rows"
          :bordered="false"
          :row-key="getRowKey"
          :row-props="(row) => ({ onClick: (event) => toggleSingleRow(row, event), onDblclick: () => openDetail(row) })"
          :checked-row-keys="checkedRowKeys"
          @update:checked-row-keys="handleCheckedRowKeysChange"
        />
      </template>

      <template #pager-left>
        <div class="crud-selection-summary">
          <n-tag size="small" type="info">已选 {{ selectedCount }} 条</n-tag>
          <n-button text :disabled="selectedCount === 0" @click="clearSelection">清空选择</n-button>
        </div>
      </template>

      <template #pager-right>
        <n-pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="[10, 20, 50, 100]"
          show-size-picker
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </template>
    </BaseCrudPage>

  </div>
</template>

<style scoped>
.transfer-toolbar-tools {
  justify-content: flex-end;
}

.transfer-context-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 2px;
}

.transfer-context-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--n-border-color);
  background-color: var(--n-color);
}

.transfer-context-label {
  font-size: 11px;
  color: var(--n-text-color-3);
  white-space: nowrap;
}

.transfer-context-value {
  color: var(--n-text-color-1);
  font-size: 12px;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1440px) {
  .transfer-context-info {
    display: none;
  }
}
</style>
