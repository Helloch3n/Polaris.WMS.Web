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
  NSelect,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'

import { withResizable } from '../../../utils/table'
import * as receiptApi from '../../../api/inbound/receipt'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { compareSortValue } from '../../../utils/tableColumn'
import CreateReceiptModal from './components/CreateReceiptModal.vue'

type ReceiptRow = receiptApi.Receipt & {
  id?: string
  billNo?: string
  sourceBillNo?: string
  type?: string | number
  status?: string | number
  creationTime?: string
  createdTime?: string
}

type ReceiptQueryParams = receiptApi.GetReceiptListParams & {
  sourceBillNo?: string
}

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const rows = ref<ReceiptRow[]>([])
const createVisible = ref(false)

const query = reactive({
  billNo: '',
  sourceBillNo: '',
  status: null as string | number | null,
  page: 1,
  pageSize: 10,
  total: 0,
})

const statusOptions: SelectOption[] = [
  { label: '草稿', value: 0 },
  { label: '收货中', value: 1 },
  { label: '已完成', value: 2 },
]

const listParams = computed<ReceiptQueryParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  billNo: query.billNo || undefined,
  sourceBillNo: query.sourceBillNo || undefined,
  status: query.status ?? undefined,
}))

async function loadData() {
  loading.value = true
  try {
    const data = await receiptApi.getList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
    query.total = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function onQuery() {
  query.page = 1
  loadData()
}

function onReset() {
  query.billNo = ''
  query.sourceBillNo = ''
  query.status = null
  query.page = 1
  loadData()
}

function handlePageChange(page: number) {
  query.page = page
  loadData()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  loadData()
}

function resolveStatus(raw: unknown) {
  if (typeof raw === 'string') {
    if (raw === 'Draft') return '草稿'
    if (raw === 'Receiving') return '收货中'
    if (raw === 'Completed') return '已完成'
    return raw
  }
  if (typeof raw === 'number') {
    if (raw === 0) return '草稿'
    if (raw === 1) return '收货中'
    if (raw === 2) return '已完成'
  }
  return '草稿'
}

function getStatusTagType(status: string) {
  if (status === '草稿') return 'info'
  if (status === '收货中') return 'warning'
  if (status === '已完成') return 'success'
  return 'default'
}

function resolveType(raw: unknown) {
  if (raw === 0 || raw === 'Production') return '生产入库'
  if (raw === 1 || raw === 'Purchase') return '采购入库'
  if (raw === 2 || raw === 'Other') return '其他'
  return '-'
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function onView(row: ReceiptRow) {
  if (!row.id) {
    message.error('缺少 id，无法查看')
    return
  }
  router.push({ name: 'ReceiptDetail', params: { id: row.id } })
}

function getRowKey(row: ReceiptRow) {
  return row.id ?? row.billNo ?? ''
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

function handleViewSelected() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行查看')
    return
  }
  onView(selected)
}

function onCreate() {
  createVisible.value = true
}

function handleCreateSuccess() {
  createVisible.value = false
  clearSelection()
  loadData()
}

function handleCreateVisibleChange(value: boolean) {
  createVisible.value = value
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'receipt-list-column-settings-v1',
  preferredKeys: ['billNo', 'type', 'status', 'sourceBillNo', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'billNo') return '单据号'
    if (key === 'type') return '类型'
    if (key === 'status') return '状态'
    if (key === 'sourceBillNo') return '来源单号'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<ReceiptRow>[number]> = {
  billNo: {
    title: createDraggableTitle('billNo', '单据号'),
    key: 'billNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.billNo, b.billNo),
  },
  type: {
    title: createDraggableTitle('type', '类型'),
    key: 'type',
    width: 140,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveType(a.type), resolveType(b.type)),
    render: (row) => h(NTag, { size: 'small' }, { default: () => resolveType(row.type) }),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 140,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveStatus(a.status), resolveStatus(b.status)),
    render: (row) => {
      const status = resolveStatus(row.status)
      return h(NTag, { type: getStatusTagType(status), size: 'small' }, { default: () => status })
    },
  },
  sourceBillNo: {
    title: createDraggableTitle('sourceBillNo', '来源单号'),
    key: 'sourceBillNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.sourceBillNo, b.sourceBillNo),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime ?? a.createdTime, b.creationTime ?? b.createdTime),
    render: (row) => formatDateTime(row.creationTime ?? row.createdTime),
  },
}

const columns = computed<DataTableColumns<ReceiptRow>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<ReceiptRow>[number] => Boolean(item)),
]))

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

onMounted(() => {
  loadColumnSettings()
  loadData()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input :value="query.billNo" placeholder="请输入单据号" clearable @update:value="(value) => (query.billNo = value)" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.sourceBillNo" placeholder="请输入来源单号" clearable @update:value="(value) => (query.sourceBillNo = value)" />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.status"
            :options="statusOptions"
            placeholder="请选择状态"
            clearable
            style="width: 160px"
            @update:value="(value) => (query.status = value)"
          />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="onReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button type="primary" @click="onCreate">新增</n-button>
        <n-button :disabled="!canViewSelected || loading" @click="handleViewSelected">查看</n-button>
      </div>
    </template>

    <template #actions-right>
      <div class="crud-action-tools">
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
        :checked-row-keys="checkedRowKeys"
        :row-props="(row) => ({ onClick: (event) => toggleSingleRow(row, event), onDblclick: () => onView(row) })"
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
        :page="query.page"
        :page-size="query.pageSize"
        :item-count="query.total"
        :page-sizes="[10, 20, 50, 100]"
        show-size-picker
        @update:page="(page) => { query.page = page; handlePageChange(page) }"
        @update:page-size="(size) => { query.pageSize = size; handlePageSizeChange(size) }"
      />
    </template>

    <CreateReceiptModal :show="createVisible" @update:show="handleCreateVisibleChange" @success="handleCreateSuccess" />
  </BaseCrudPage>
</template>

<style scoped>
</style>