<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NDatePicker,
  NPagination,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'

import {
  getInventoryTransactions,
  type InventoryTransactionDto,
  type InventoryTransactionSearchDto,
} from '../../../api/inventory/transaction'
import { withResizable } from '../../../utils/table'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { compareSortValue } from '../../../utils/tableColumn'
import {
  resolveInventoryTransactionStatus,
  resolveInventoryTransactionType,
} from '../../../utils/statusTag'

type TransactionRow = InventoryTransactionDto & { id?: string }
type QueryParams = InventoryTransactionSearchDto & { dateRange?: [number, number] | null }

const message = useMessage()
const loading = ref(false)
const rows = ref<TransactionRow[]>([])

const query = reactive<QueryParams>({
  billNo: '',
  containerNo: '',
  type: undefined as string | number | undefined,
  dateRange: null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
})

const typeOptions: SelectOption[] = [
  { label: '入库', value: 0 },
  { label: '出库', value: 1 },
  { label: '移库', value: 2 },
  { label: '盘点', value: 3 },
  { label: '材料投入', value: 4 },
  { label: '材料退回', value: 5 },
  { label: '质检判定', value: 6 },
  { label: '采购退货', value: 7 },
]

function toIso(v?: number | null) {
  if (!v) return undefined
  return new Date(v).toISOString()
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const listParams = computed<InventoryTransactionSearchDto>(() => ({
  maxResultCount: pagination.pageSize as number,
  skipCount: ((pagination.page as number) - 1) * (pagination.pageSize as number),
  billNo: query.billNo || undefined,
  containerNo: query.containerNo || undefined,
  type: query.type ?? undefined,
  startTime: toIso(query.dateRange?.[0]),
  endTime: toIso(query.dateRange?.[1]),
}))

async function loadData() {
  loading.value = true
  try {
    const data = await getInventoryTransactions(listParams.value)
    rows.value = data.items ?? []
    pagination.itemCount = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function onQuery() {
  pagination.page = 1
  loadData()
}

function onReset() {
  query.billNo = ''
  query.containerNo = ''
  query.type = undefined
  query.dateRange = null
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

function updateType(value: string | number | null) {
  query.type = value ?? undefined
}

function updateDateRange(value: [number, number] | null) {
  query.dateRange = value
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  syncColumnSettingsByKeys,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'inventory-transaction-column-settings-v2',
  preferredKeys: [
    'creationTime', 'type', 'billNo', 'productName', 'containerNo',
    'fromWarehouseCode', 'toWarehouseCode', 'fromLocationCode', 'toLocationCode',
    'quantity', 'quantityAfter', 'batchNo', 'sn', 'craftVersion', 'status', 'remark',
  ],
  resolveTitle: (key) => {
    if (key === 'creationTime') return '时间'
    if (key === 'type') return '事务类型'
    if (key === 'billNo') return '单据号'
    if (key === 'productName') return '产品'
    if (key === 'containerNo') return '托盘'
    if (key === 'fromWarehouseCode') return '来源仓库'
    if (key === 'toWarehouseCode') return '目标仓库'
    if (key === 'fromLocationCode') return '来源库位'
    if (key === 'toLocationCode') return '目标库位'
    if (key === 'quantity') return '变动数量'
    if (key === 'quantityAfter') return '结存'
    if (key === 'batchNo') return '批次'
    if (key === 'sn') return 'SN'
    if (key === 'craftVersion') return '工艺版本'
    if (key === 'status') return '状态'
    if (key === 'remark') return '备注'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<TransactionRow>[number]> = {
  creationTime: {
    title: createDraggableTitle('creationTime', '时间'),
    key: 'creationTime',
    minWidth: 185,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
  type: {
    title: createDraggableTitle('type', '事务类型'),
    key: 'type',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(
      resolveInventoryTransactionType(a.type).label,
      resolveInventoryTransactionType(b.type).label,
    ),
    render: (row) => {
      const meta = resolveInventoryTransactionType(row.type)
      return h(WmsStatusTag, { label: meta.label, type: meta.tagType })
    },
  },
  billNo: { title: createDraggableTitle('billNo', '单据号'), key: 'billNo', minWidth: 160, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.billNo, b.billNo) },
  productName: { title: createDraggableTitle('productName', '产品'), key: 'productName', minWidth: 200, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.productName, b.productName) },
  containerNo: { title: createDraggableTitle('containerNo', '托盘'), key: 'containerNo', minWidth: 160, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.containerNo, b.containerNo) },
  fromWarehouseCode: { title: createDraggableTitle('fromWarehouseCode', '来源仓库'), key: 'fromWarehouseCode', minWidth: 140, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.fromWarehouseCode, b.fromWarehouseCode) },
  toWarehouseCode: { title: createDraggableTitle('toWarehouseCode', '目标仓库'), key: 'toWarehouseCode', minWidth: 140, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.toWarehouseCode, b.toWarehouseCode) },
  fromLocationCode: { title: createDraggableTitle('fromLocationCode', '来源库位'), key: 'fromLocationCode', minWidth: 140, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.fromLocationCode, b.fromLocationCode) },
  toLocationCode: { title: createDraggableTitle('toLocationCode', '目标库位'), key: 'toLocationCode', minWidth: 140, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.toLocationCode, b.toLocationCode) },
  quantity: {
    title: createDraggableTitle('quantity', '变动数量'),
    key: 'quantity',
    width: 140,
    align: 'right',
    sorter: (a, b) => compareSortValue(a.quantity, b.quantity),
    render: (row) => {
      const val = row.quantity
      if (typeof val !== 'number' || Number.isNaN(val)) return '-'
      // 出库类事务统一使用扣减颜色。
      const outTypes = ['Issue', 'Out', 'Return', 'PurchaseReturn', 1, 5, 7]
      const inTypes = ['Receipt', 'In', 0]
      let color: string | undefined
      if (row.type !== undefined && outTypes.includes(row.type as string | number)) {
        color = '#ef4444'
      } else if (row.type !== undefined && inTypes.includes(row.type as string | number)) {
        color = '#22c55e'
      }
      return h('span', { style: { color, fontWeight: '600' } }, `${val}`)
    },
  },
  quantityAfter: { title: createDraggableTitle('quantityAfter', '结存'), key: 'quantityAfter', width: 120, align: 'right', sorter: (a, b) => compareSortValue(a.quantityAfter, b.quantityAfter) },
  batchNo: { title: createDraggableTitle('batchNo', '批次'), key: 'batchNo', minWidth: 140, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.batchNo, b.batchNo) },
  sn: { title: createDraggableTitle('sn', 'SN'), key: 'sn', minWidth: 140, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.sn, b.sn) },
  craftVersion: { title: createDraggableTitle('craftVersion', '工艺版本'), key: 'craftVersion', minWidth: 120, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.craftVersion, b.craftVersion) },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 100,
    align: 'center',
    sorter: (a, b) => compareSortValue(
      resolveInventoryTransactionStatus(a.status).label,
      resolveInventoryTransactionStatus(b.status).label,
    ),
    render: (row) => {
      const meta = resolveInventoryTransactionStatus(row.status)
      return h(WmsStatusTag, { label: meta.label, type: meta.tagType })
    },
  },
  remark: { title: createDraggableTitle('remark', '备注'), key: 'remark', minWidth: 200, ellipsis: { tooltip: true }, sorter: (a, b) => compareSortValue(a.remark, b.remark) },
}

const columns = computed<DataTableColumns<TransactionRow>>(() => withResizable(
  columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<TransactionRow>[number] => Boolean(item)),
))

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
  syncColumnSettingsByKeys(Object.keys(columnMap))
  loadData()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form inventory-transaction-search-form">
        <n-form-item class="transaction-search-item">
          <n-input class="transaction-search-input" :value="query.billNo" placeholder="请输入单据号" clearable @update:value="(value) => { query.billNo = value }" />
        </n-form-item>
        <n-form-item class="transaction-search-item">
          <n-input class="transaction-search-input" :value="query.containerNo" placeholder="请输入托盘号" clearable @update:value="(value) => { query.containerNo = value }" />
        </n-form-item>
        <n-form-item class="transaction-search-item">
          <n-select
            class="transaction-type-select"
            :value="query.type"
            :options="typeOptions"
            placeholder="请选择事务类型"
            clearable
            @update:value="updateType"
          />
        </n-form-item>
        <n-form-item class="transaction-search-item">
          <n-date-picker class="transaction-date-picker" :value="query.dateRange" type="daterange" clearable @update:value="updateDateRange" />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button :loading="loading" @click="onQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="onReset">重置</n-button>
        </n-form-item>
      </n-form>
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
        class="crud-table-flat inventory-transaction-table"
        :loading="loading"
        :columns="columns"
        :data="rows"
        :scroll-x="2400"
        flex-height
        :bordered="false"
      />
    </template>

    <template #pager-left />
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
</template>

<style scoped>
:deep(.inventory-transaction-search-form.crud-search-form) {
  flex-wrap: wrap !important;
  overflow: visible !important;
  row-gap: 8px;
  column-gap: 8px;
}

:deep(.inventory-transaction-search-form .n-form-item) {
  margin-bottom: 0;
  flex: 0 0 auto !important;
  min-width: 0 !important;
}

:deep(.inventory-transaction-search-form .n-form-item.crud-page-spacer) {
  flex: 1 1 auto !important;
  min-width: 0 !important;
}

:deep(.inventory-transaction-search-form .transaction-search-input),
:deep(.inventory-transaction-search-form .transaction-type-select) {
  width: 180px !important;
}

:deep(.inventory-transaction-search-form .transaction-date-picker) {
  width: 300px !important;
}

:deep(.inventory-transaction-table) {
  width: 100%;
}

:deep(.inventory-transaction-table .n-data-table-base-table-body) {
  overflow-x: scroll !important;
}

:deep(.inventory-transaction-table .n-scrollbar-rail--horizontal) {
  opacity: 1 !important;
}

:deep(.slot-pager) {
  padding-top: 0;
}

:deep(.crud-pager) {
  min-height: 24px;
  padding-top: 0;
}

</style>
