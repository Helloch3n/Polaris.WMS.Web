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
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'

import * as productionInboundApi from '../../../api/inbound/productionInbound'
import { t } from '../../../utils/i18n'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type RowItem = productionInboundApi.ProductionInboundDto

const message = useMessage()
const dialog = useDialog()
const router = useRouter()
const loading = ref(false)
const rows = ref<RowItem[]>([])
// 查询表单只需 orderNo / sourceOrderNo / status

const query = reactive({
  orderNo: '',
  sourceOrderNo: '',
  status: null as productionInboundApi.ProductionInboundStatus | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const statusOptions: SelectOption[] = [
  { label: t('productionInbound.status.draft'), value: productionInboundApi.ProductionInboundStatus.Draft },
  { label: t('productionInbound.status.inProgress'), value: productionInboundApi.ProductionInboundStatus.InProgress },
  { label: t('productionInbound.status.completed'), value: productionInboundApi.ProductionInboundStatus.Completed },
]

const listParams = computed<productionInboundApi.ProductionInboundSearchDto>(() => ({
  maxResultCount: pagination.pageSize ?? 10,
  skipCount: ((pagination.page ?? 1) - 1) * (pagination.pageSize ?? 10),
  orderNo: (query.orderNo || '').trim() || undefined,
  sourceOrderNo: (query.sourceOrderNo || '').trim() || undefined,
  status: query.status ?? undefined,
}))

// 不再加载额外查询选项，查询条件只包含 orderNo / sourceOrderNo / status

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

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizeInboundTypeValue(value: productionInboundApi.ProductionInboundType) {
  if (typeof value === 'string') {
    if (value === 'FinishedProduct' || value === '10') return productionInboundApi.ProductionInboundType.FinishedProduct
    if (value === 'SemiFinishedProduct' || value === '20') return productionInboundApi.ProductionInboundType.SemiFinishedProduct
    if (value === 'WorkInProgress' || value === '30') return productionInboundApi.ProductionInboundType.WorkInProgress
  }
  if (typeof value === 'number') {
    return value
  }
  return null
}

function resolveInboundTypeLabel(value: productionInboundApi.ProductionInboundType) {
  const normalized = normalizeInboundTypeValue(value)
  if (normalized === productionInboundApi.ProductionInboundType.FinishedProduct) return t('productionInbound.inboundType.finished')
  if (normalized === productionInboundApi.ProductionInboundType.SemiFinishedProduct) return t('productionInbound.inboundType.semiFinished')
  if (normalized === productionInboundApi.ProductionInboundType.WorkInProgress) return t('productionInbound.inboundType.workInProgress')
  return '-'
}

function normalizeStatusValue(status: productionInboundApi.ProductionInboundStatus) {
  if (typeof status === 'string') {
    if (status === 'Draft' || status === '0') return productionInboundApi.ProductionInboundStatus.Draft
    if (status === 'InProgress' || status === '1') return productionInboundApi.ProductionInboundStatus.InProgress
    if (status === 'Completed' || status === '2') return productionInboundApi.ProductionInboundStatus.Completed
  }
  if (typeof status === 'number') {
    return status
  }
  return null
}

function resolveStatusLabel(status: productionInboundApi.ProductionInboundStatus) {
  const value = normalizeStatusValue(status)
  if (value === productionInboundApi.ProductionInboundStatus.Draft) return t('productionInbound.status.draft')
  if (value === productionInboundApi.ProductionInboundStatus.InProgress) return t('productionInbound.status.inProgress')
  if (value === productionInboundApi.ProductionInboundStatus.Completed) return t('productionInbound.status.completed')
  return '-'
}

function getStatusTagType(status: productionInboundApi.ProductionInboundStatus) {
  const value = normalizeStatusValue(status)
  if (value === productionInboundApi.ProductionInboundStatus.Draft) return 'default'
  if (value === productionInboundApi.ProductionInboundStatus.InProgress) return 'warning'
  if (value === productionInboundApi.ProductionInboundStatus.Completed) return 'success'
  return 'default'
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'production-inbound-column-settings-v1',
  preferredKeys: [
    'orderNo',
    'sourceOrderNo',
    'inboundType',
    'sourceDepartmentCode',
    'sourceDepartmentName',
    'targetWarehouseCode',
    'targetWarehouseName',
    'status',
    'creationTime',
  ],
  resolveTitle: (key) => {
    if (key === 'orderNo') return t('productionInbound.columns.orderNo')
    if (key === 'sourceOrderNo') return t('productionInbound.columns.sourceOrderNo')
    if (key === 'inboundType') return t('productionInbound.columns.inboundType')
    if (key === 'sourceDepartmentCode') return t('productionInbound.columns.sourceDepartmentCode')
    if (key === 'sourceDepartmentName') return t('productionInbound.columns.sourceDepartmentName')
    if (key === 'targetWarehouseCode') return t('productionInbound.columns.targetWarehouseCode')
    if (key === 'targetWarehouseName') return t('productionInbound.columns.targetWarehouseName')
    if (key === 'status') return t('productionInbound.columns.status')
    if (key === 'creationTime') return t('productionInbound.columns.creationTime')
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  orderNo: {
    title: createDraggableTitle('orderNo', t('productionInbound.columns.orderNo')),
    key: 'orderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.orderNo, b.orderNo),
    render: (row) => row.orderNo ?? '-',
  },
  sourceOrderNo: {
    title: createDraggableTitle('sourceOrderNo', t('productionInbound.columns.sourceOrderNo')),
    key: 'sourceOrderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.sourceOrderNo, b.sourceOrderNo),
    render: (row) => row.sourceOrderNo ?? '-',
  },
  inboundType: {
    title: createDraggableTitle('inboundType', t('productionInbound.columns.inboundType')),
    key: 'inboundType',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(normalizeInboundTypeValue(a.inboundType), normalizeInboundTypeValue(b.inboundType)),
    render: (row) => resolveInboundTypeLabel(row.inboundType),
  },
  sourceDepartmentCode: {
    title: createDraggableTitle('sourceDepartmentCode', t('productionInbound.columns.sourceDepartmentCode')),
    key: 'sourceDepartmentCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.sourceDepartmentCode, b.sourceDepartmentCode),
    render: (row) => row.sourceDepartmentCode ?? '-',
  },
  sourceDepartmentName: {
    title: createDraggableTitle('sourceDepartmentName', t('productionInbound.columns.sourceDepartmentName')),
    key: 'sourceDepartmentName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.sourceDepartmentName, b.sourceDepartmentName),
    render: (row) => row.sourceDepartmentName ?? '-',
  },
  targetWarehouseCode: {
    title: createDraggableTitle('targetWarehouseCode', t('productionInbound.columns.targetWarehouseCode')),
    key: 'targetWarehouseCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.targetWarehouseCode, b.targetWarehouseCode),
    render: (row) => row.targetWarehouseCode ?? '-',
  },
  targetWarehouseName: {
    title: createDraggableTitle('targetWarehouseName', t('productionInbound.columns.targetWarehouseName')),
    key: 'targetWarehouseName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.targetWarehouseName, b.targetWarehouseName),
    render: (row) => row.targetWarehouseName ?? '-',
  },
  status: {
    title: createDraggableTitle('status', t('productionInbound.columns.status')),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(normalizeStatusValue(a.status), normalizeStatusValue(b.status)),
    render: (row) => {
      const label = resolveStatusLabel(row.status)
      return h(NTag, { size: 'small', type: getStatusTagType(row.status) }, { default: () => label })
    },
  },
  creationTime: {
    title: createDraggableTitle('creationTime', t('productionInbound.columns.creationTime')),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<RowItem>>(() => withResizable(
  [
    {
      type: 'selection',
      fixed: 'left',
      width: 44,
    },
    ...columnSettings.value
      .filter((item) => item.visible)
      .map((item) => columnMap[item.key])
      .filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item)),
  ],
))

async function loadData() {
  loading.value = true
  try {
    const data = await productionInboundApi.getList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
    pagination.itemCount = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}


function handleView() {
  if (selectedRows.value.length !== 1) {
    message.warning(t('common.selectOneToView'))
    return
  }
  const selected = selectedRows.value[0]
  if (!selected?.id) {
    message.warning(t('common.missingRecordId'))
    return
  }
  router.push({ name: 'ProductionInboundDetail', params: { orderId: selected.id } })
}

function openDetail(row: RowItem) {
  if (!row?.id) return
  router.push({ name: 'ProductionInboundDetail', params: { orderId: row.id } })
}

// 审核/编辑/新增操作在此页面被禁用（只读查询）

function handleQuery() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  query.orderNo = ''
  query.sourceOrderNo = ''
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
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form production-inbound-search-form">
        <n-form-item>
          <n-input :value="query.orderNo" :placeholder="t('productionInbound.search.orderNo')" clearable @update:value="(value) => { query.orderNo = value }" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.sourceOrderNo" :placeholder="t('productionInbound.search.sourceOrderNo')" clearable @update:value="(value) => { query.sourceOrderNo = value }" />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.status"
            :options="statusOptions"
            :placeholder="t('productionInbound.search.status')"
            clearable
            style="width: 160px"
            @update:value="(value) => { query.status = value }"
          />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="handleQuery">{{ t('common.query') }}</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="handleReset">{{ t('common.reset') }}</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button :disabled="!canViewSelected || loading" @click="handleView">{{ t('common.view') }}</n-button>
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
        :row-props="(row) => ({ onClick: (event) => toggleSingleRow(row, event), onDblclick: () => openDetail(row) })"
        :checked-row-keys="checkedRowKeys"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      />
    </template>

    <template #pager-left>
      <div class="crud-selection-summary">
        <n-tag size="small" type="info">{{ t('common.selected') }} {{ selectedCount }} {{ t('common.items') }}</n-tag>
        <n-button text :disabled="selectedCount === 0" @click="clearSelection">{{ t('common.clearSelection') }}</n-button>
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
</template>

<style scoped>
:deep(.production-inbound-search-form.crud-search-form) {
  flex-wrap: wrap;
  overflow: visible;
  row-gap: 8px;
}

:deep(.production-inbound-search-form .n-form-item) {
  margin-bottom: 0;
}
</style>
