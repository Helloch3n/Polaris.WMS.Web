<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
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
useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'

import * as stocktakeApi from '../../../api/inventory/stocktake'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type StocktakeRow = stocktakeApi.StocktakeOrderDto

const loading = ref(false)
const rows = ref<StocktakeRow[]>([])
const message = useMessage()
const dialog = useDialog()
const router = useRouter()

const query = reactive({
  orderNo: '',
  status: null as number | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const listParams = computed<stocktakeApi.StocktakeSearchDto>(() => ({
  maxResultCount: pagination.pageSize ?? 10,
  skipCount: ((pagination.page ?? 1) - 1) * (pagination.pageSize ?? 10),
  orderNo: query.orderNo?.trim() || undefined,
  status: query.status !== null ? (query.status as stocktakeApi.StocktakeOrderStatus) : undefined,
}))

function getRowKey(row: StocktakeRow) {
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

const selectedStocktake = computed(() => selectedCount.value === 1 ? selectedRows.value[0] : undefined)
const canStartSelected = computed(
  () => selectedStocktake.value?.status === stocktakeApi.StocktakeOrderStatus.Draft,
)
const canCancelSelected = computed(() => {
  const status = selectedStocktake.value?.status
  return status === stocktakeApi.StocktakeOrderStatus.Draft
    || status === stocktakeApi.StocktakeOrderStatus.Locked
})

const statusOptions = [
  { label: '草稿', value: stocktakeApi.StocktakeOrderStatus.Draft },
  { label: '待执行(已锁定)', value: stocktakeApi.StocktakeOrderStatus.Locked },
  { label: '盘点中', value: stocktakeApi.StocktakeOrderStatus.InProgress },
  { label: '待审核', value: stocktakeApi.StocktakeOrderStatus.InApproval },
  { label: '已完成', value: stocktakeApi.StocktakeOrderStatus.Completed },
  { label: '已取消', value: stocktakeApi.StocktakeOrderStatus.Cancelled },
]

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function resolveStatusLabel(status: stocktakeApi.StocktakeOrderStatus) {
  if (status === stocktakeApi.StocktakeOrderStatus.Draft) return '草稿'
  if (status === stocktakeApi.StocktakeOrderStatus.Locked) return '待执行(已锁定)'
  if (status === stocktakeApi.StocktakeOrderStatus.InProgress) return '盘点中'
  if (status === stocktakeApi.StocktakeOrderStatus.InApproval) return '待审核'
  if (status === stocktakeApi.StocktakeOrderStatus.Completed) return '已完成'
  if (status === stocktakeApi.StocktakeOrderStatus.Cancelled) return '已取消'
  return '-'
}

function getStatusTagType(status: stocktakeApi.StocktakeOrderStatus) {
  if (status === stocktakeApi.StocktakeOrderStatus.Draft) return 'default'
  if (status === stocktakeApi.StocktakeOrderStatus.Locked) return 'warning'
  if (status === stocktakeApi.StocktakeOrderStatus.InProgress) return 'info'
  if (status === stocktakeApi.StocktakeOrderStatus.InApproval) return 'primary'
  if (status === stocktakeApi.StocktakeOrderStatus.Completed) return 'success'
  if (status === stocktakeApi.StocktakeOrderStatus.Cancelled) return 'error'
  return 'default'
}

function resolveModeLabel(mode: stocktakeApi.StocktakeMode) {
  if (mode === stocktakeApi.StocktakeMode.Dynamic) return '动碰盘点'
  if (mode === stocktakeApi.StocktakeMode.Cycle) return '循环盘点'
  if (mode === stocktakeApi.StocktakeMode.AreaStatic) return '库位静态盘点'
  if (mode === stocktakeApi.StocktakeMode.DetailSelection) return '明细抽盘'
  return '-'
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'stocktake-order-column-settings-v1',
  preferredKeys: ['orderNo', 'warehouseName', 'mode', 'status', 'frozenTime', 'description', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'orderNo') return '盘点单号'
    if (key === 'warehouseName') return '仓库名称'
    if (key === 'mode') return '盘点模式'
    if (key === 'status') return '盘点状态'
    if (key === 'frozenTime') return '快照冻结时间'
    if (key === 'description') return '备注说明'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<StocktakeRow>[number]> = {
  orderNo: {
    title: createDraggableTitle('orderNo', '盘点单号'),
    key: 'orderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.orderNo, b.orderNo),
    render: (row) => row.orderNo,
  },
  warehouseName: {
    title: createDraggableTitle('warehouseName', '仓库'),
    key: 'warehouseName',
    minWidth: 150,
    render: (row) => `${row.warehouseName} (${row.warehouseCode})`,
  },
  mode: {
    title: createDraggableTitle('mode', '盘点模式'),
    key: 'mode',
    minWidth: 130,
    render: (row) => resolveModeLabel(row.mode),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    minWidth: 120,
    render: (row) =>
      h(
        WmsStatusTag,
        {
          type: getStatusTagType(row.status),
          round: true,
          size: 'small',
        },
        { default: () => resolveStatusLabel(row.status) },
      ),
  },
  frozenTime: {
    title: createDraggableTitle('frozenTime', '快照冻结时间'),
    key: 'frozenTime',
    minWidth: 170,
    render: (row) => formatDateTime(row.frozenTime),
  },
  description: {
    title: createDraggableTitle('description', '备注'),
    key: 'description',
    minWidth: 180,
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 170,
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<StocktakeRow>>(() => withResizable(
  [
    {
      type: 'selection',
      fixed: 'left',
      width: 44,
    },
    ...columnSettings.value
      .filter((item) => item.visible)
      .map((item) => columnMap[item.key])
      .filter((item): item is DataTableColumns<StocktakeRow>[number] => Boolean(item)),
  ],
))

async function loadData() {
  loading.value = true
  try {
    const data = await stocktakeApi.getList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
    pagination.itemCount = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openDetail(row: StocktakeRow) {
  router.push({ name: 'StocktakeDetail', params: { id: row.id } })
}

function handleCreate() {
  router.push({ name: 'StocktakeCreate' })
}

function handleStart(row: StocktakeRow) {
  dialog.warning({
    title: '确认执行',
    content: `确认要开始盘点单 ${row.orderNo} 吗？系统将会冻结盘点范围内的账面库存，并锁定涉及的库位与盘具！`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await stocktakeApi.startStocktake(row.id)
        message.success('已锁定并开始盘点')
        await loadData()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '执行失败')
      }
    },
  })
}

function handleCancel(row: StocktakeRow) {
  dialog.warning({
    title: '确认取消',
    content: `确认取消盘点单 ${row.orderNo} 吗？如果已锁定库位与盘具，系统会自动解除锁定。`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await stocktakeApi.cancel(row.id)
        message.success('已取消盘点单')
        await loadData()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '取消失败')
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
  query.status = null
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

onMounted(() => {
  loadColumnSettings()
  loadData()
})
</script>

<template>
  <BaseCrudPage :selected-count="selectedCount" @clear-selection="clearSelection">
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input
            v-model:value="query.orderNo"
            clearable
            placeholder="盘点单号"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            v-model:value="query.status"
            clearable
            placeholder="单据状态"
            :options="statusOptions"
            style="width: 180px"
            @update:value="handleQuery"
          />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button :loading="loading" @click="handleQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="handleReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>
    <template #actions-left>
      <div class="crud-action-main">
        <n-button type="primary" @click="handleCreate">新增</n-button>
        <n-button :disabled="!selectedStocktake" @click="selectedStocktake && openDetail(selectedStocktake)">查看</n-button>
        <n-button
          type="warning"
          :disabled="!canStartSelected"
          @click="selectedStocktake && handleStart(selectedStocktake)"
        >
          锁定并执行
        </n-button>
        <n-button
          type="error"
          :disabled="!canCancelSelected"
          @click="selectedStocktake && handleCancel(selectedStocktake)"
        >
          取消
        </n-button>
        <n-button :loading="loading" @click="loadData">刷新</n-button>
      </div>
    </template>
    <template #actions-right>
      <div class="crud-action-tools">
        <TableColumnManager
          :show="showColumnConfig"
          :settings="columnSettings"
          @update:show="(val) => (showColumnConfig = val)"
          @visible-change="handleVisibleChange"
        />
      </div>
    </template>
    <template #data>
      <n-data-table
        class="crud-table-flat"
        :loading="loading"
        :columns="columns"
        :data="rows"
        :row-key="getRowKey"
        :checked-row-keys="checkedRowKeys"
        :bordered="false"
        :row-props="(row) => ({
          onClick: (event) => toggleSingleRow(row, event),
          onDblclick: () => openDetail(row),
        })"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      />
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
</template>

<style scoped>
.crud-action-main {
  display: flex;
  gap: 8px;
}
</style>
