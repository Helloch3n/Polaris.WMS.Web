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
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'

import * as purchaseReceiptApi from '../../../api/inbound/purchaseReceipt'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type RowItem = purchaseReceiptApi.PurchaseReceiptDto

const message = useMessage()
const router = useRouter()
const loading = ref(false)
const rows = ref<RowItem[]>([])

const query = reactive({
  receiptNo: '',
  sourceDocNo: '',
  sourceDocType: null as string | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const sourceDocTypeOptions: SelectOption[] = [
  { label: 'ASN', value: 'ASN' },
  { label: 'PO', value: 'PO' },
]

const listParams = computed<purchaseReceiptApi.PurchaseReceiptSearchDto>(() => ({
  maxResultCount: pagination.pageSize ?? 10,
  skipCount: ((pagination.page ?? 1) - 1) * (pagination.pageSize ?? 10),
  receiptNo: query.receiptNo.trim() || undefined,
  sourceDocNo: query.sourceDocNo.trim() || undefined,
  sourceDocType: query.sourceDocType || undefined,
}))

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'purchase-receipt-column-settings-v2',
  preferredKeys: ['receiptNo', 'sourceDocType', 'sourceDocNo', 'supplierName', 'detailCount', 'totalExpectedQuantity', 'totalReceivedQuantity', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'receiptNo') return '收货单号'
    if (key === 'sourceDocType') return '来源类型'
    if (key === 'sourceDocNo') return '来源单据号'
    if (key === 'supplierName') return '供应商'
    if (key === 'detailCount') return '明细行数'
    if (key === 'totalExpectedQuantity') return '计划总量'
    if (key === 'totalReceivedQuantity') return '实收总量'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

function getRowKey(row: RowItem) {
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

function normalizeQuantity(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  return parsed
}

function formatQuantity(value: unknown): string {
  const normalized = normalizeQuantity(value)
  return normalized.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function sumExpectedQuantity(details: purchaseReceiptApi.PurchaseReceiptDetailDto[] | undefined): number {
  return (details ?? []).reduce((sum, item) => sum + normalizeQuantity(item.expectedQuantity), 0)
}

function sumReceivedQuantity(details: purchaseReceiptApi.PurchaseReceiptDetailDto[] | undefined): number {
  return (details ?? []).reduce((sum, item) => sum + normalizeQuantity(item.receivedQuantity), 0)
}

function resolveSourceDocTypeLabel(type: string | null | undefined): string {
  const clean = (type ?? '').trim().toUpperCase()
  if (!clean) return '-'
  if (clean === 'ASN') return 'ASN'
  if (clean === 'PO') return 'PO'
  return clean
}

function getSourceDocTypeTagType(type: string | null | undefined) {
  const clean = (type ?? '').trim().toUpperCase()
  if (clean === 'ASN') return 'info'
  if (clean === 'PO') return 'warning'
  return 'default'
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  receiptNo: {
    title: createDraggableTitle('receiptNo', '收货单号'),
    key: 'receiptNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.receiptNo, b.receiptNo),
    render: (row) => row.receiptNo || '-',
  },
  sourceDocType: {
    title: createDraggableTitle('sourceDocType', '来源类型'),
    key: 'sourceDocType',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveSourceDocTypeLabel(a.sourceDocType), resolveSourceDocTypeLabel(b.sourceDocType)),
    render: (row) => h(
      NTag,
      { size: 'small', type: getSourceDocTypeTagType(row.sourceDocType) },
      { default: () => resolveSourceDocTypeLabel(row.sourceDocType) },
    ),
  },
  sourceDocNo: {
    title: createDraggableTitle('sourceDocNo', '来源单据号'),
    key: 'sourceDocNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.sourceDocNo, b.sourceDocNo),
    render: (row) => row.sourceDocNo || '-',
  },
  supplierName: {
    title: createDraggableTitle('supplierName', '供应商'),
    key: 'supplierName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.supplierName, b.supplierName),
    render: (row) => row.supplierName || '-',
  },
  detailCount: {
    title: createDraggableTitle('detailCount', '明细行数'),
    key: 'detailCount',
    width: 120,
    align: 'right',
    sorter: (a, b) => compareSortValue(a.details?.length ?? 0, b.details?.length ?? 0),
    render: (row) => String(row.details?.length ?? 0),
  },
  totalExpectedQuantity: {
    title: createDraggableTitle('totalExpectedQuantity', '计划总量'),
    key: 'totalExpectedQuantity',
    width: 140,
    align: 'right',
    sorter: (a, b) => compareSortValue(sumExpectedQuantity(a.details), sumExpectedQuantity(b.details)),
    render: (row) => formatQuantity(sumExpectedQuantity(row.details)),
  },
  totalReceivedQuantity: {
    title: createDraggableTitle('totalReceivedQuantity', '实收总量'),
    key: 'totalReceivedQuantity',
    width: 140,
    align: 'right',
    sorter: (a, b) => compareSortValue(sumReceivedQuantity(a.details), sumReceivedQuantity(b.details)),
    render: (row) => formatQuantity(sumReceivedQuantity(row.details)),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<RowItem>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item)),
]))

function handleColumnConfigShowChange(value: boolean) { showColumnConfig.value = value }
function handleColumnVisibleChange(key: string, visible: boolean) { if (!handleVisibleChange(key, visible)) message.warning('至少保留一个展示字段') }
function handleQuery() { pagination.page = 1; loadData() }
function handleReset() { query.receiptNo = ''; query.sourceDocNo = ''; query.sourceDocType = null; pagination.page = 1; loadData() }
function handlePageChange(page: number) { pagination.page = page; loadData() }
function handlePageSizeChange(size: number) { pagination.pageSize = size; pagination.page = 1; loadData() }

function handleViewSelected() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行查看')
    return
  }

  if (!selected.id) {
    message.warning('缺少收货单 Id，无法查看')
    return
  }

  router.push({ name: 'PurchaseReceiptDetail', params: { id: selected.id } })
}

function openDetail(row: RowItem) {
  if (!row?.id) {
    return
  }
  router.push({ name: 'PurchaseReceiptDetail', params: { id: row.id } })
}

async function loadData() {
  loading.value = true
  try {
    const data = await purchaseReceiptApi.getList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
    pagination.itemCount = data.totalCount ?? 0
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载采购收货列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadColumnSettings(); loadData() })
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input :value="query.receiptNo" clearable placeholder="请输入收货单号" @update:value="(value) => (query.receiptNo = value)" @keyup.enter="handleQuery" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.sourceDocNo" clearable placeholder="请输入来源单据号" @update:value="(value) => (query.sourceDocNo = value)" @keyup.enter="handleQuery" />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.sourceDocType"
            :options="sourceDocTypeOptions"
            clearable
            placeholder="请选择来源单据类型"
            style="width: 180px"
            @update:value="(value) => (query.sourceDocType = value)"
          />
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
        <n-button :disabled="!canViewSelected || loading" @click="handleViewSelected">查看</n-button>
      </div>
    </template>

    <template #actions-right>
      <div class="crud-action-tools">
        <TableColumnManager :show="showColumnConfig" :settings="columnSettings" @update:show="handleColumnConfigShowChange" @visible-change="handleColumnVisibleChange" />
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
        :row-props="(row) => ({ onClick: (event) => toggleSingleRow(row, event), onDblclick: () => openDetail(row) })"
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
        @update:page="(page) => { pagination.page = page; handlePageChange(page) }"
        @update:page-size="(size) => { pagination.pageSize = size; handlePageSizeChange(size) }"
      />
    </template>
  </BaseCrudPage>
</template>
