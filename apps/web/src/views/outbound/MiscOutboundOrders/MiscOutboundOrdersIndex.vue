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

import * as miscOutboundOrderApi from '../../../api/outbound/MiscOutboundOrders/miscOutboundOrders'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type RowItem = miscOutboundOrderApi.MiscOutboundOrderDto

const message = useMessage()
const dialog = useDialog()
const router = useRouter()
const loading = ref(false)
const rows = ref<RowItem[]>([])

const query = reactive({
  orderNo: '',
  status: null as miscOutboundOrderApi.MiscOrderStatus | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const statusOptions: SelectOption[] = [
  { label: '草稿', value: miscOutboundOrderApi.MiscOrderStatus.Draft },
  { label: '已执行', value: miscOutboundOrderApi.MiscOrderStatus.Executed },
]

const listParams = computed<miscOutboundOrderApi.MiscOutboundOrderSearchDto>(() => ({
  maxResultCount: pagination.pageSize ?? 10,
  skipCount: ((pagination.page ?? 1) - 1) * (pagination.pageSize ?? 10),
  orderNo: query.orderNo.trim() || undefined,
  status: query.status ?? undefined,
}))

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

const canSelectOne = computed(() => selectedCount.value === 1)
const canDelete = computed(() => selectedCount.value > 0)

function normalizeStatusValue(value: miscOutboundOrderApi.MiscOrderStatus) {
  if (typeof value === 'string') {
    if (value === 'Draft' || value === '0') return miscOutboundOrderApi.MiscOrderStatus.Draft
    if (value === 'Executed' || value === '1') return miscOutboundOrderApi.MiscOrderStatus.Executed
  }

  if (typeof value === 'number') {
    return value
  }

  return null
}

function resolveStatusLabel(value: miscOutboundOrderApi.MiscOrderStatus) {
  const normalized = normalizeStatusValue(value)
  if (normalized === miscOutboundOrderApi.MiscOrderStatus.Draft) return '草稿'
  if (normalized === miscOutboundOrderApi.MiscOrderStatus.Executed) return '已执行'
  return '-'
}

function getStatusTagType(value: miscOutboundOrderApi.MiscOrderStatus) {
  const normalized = normalizeStatusValue(value)
  if (normalized === miscOutboundOrderApi.MiscOrderStatus.Draft) return 'warning'
  if (normalized === miscOutboundOrderApi.MiscOrderStatus.Executed) return 'success'
  return 'default'
}

function normalizeOperationTypeValue(value: miscOutboundOrderApi.MiscOperationType) {
  if (typeof value === 'string') {
    if (value === 'Inbound' || value === '1') return miscOutboundOrderApi.MiscOperationType.Inbound
    if (value === 'Outbound' || value === '2') return miscOutboundOrderApi.MiscOperationType.Outbound
  }

  if (typeof value === 'number') {
    return value
  }

  return null
}

function resolveOperationTypeLabel(value: miscOutboundOrderApi.MiscOperationType) {
  const normalized = normalizeOperationTypeValue(value)
  if (normalized === miscOutboundOrderApi.MiscOperationType.Inbound) return '入库'
  if (normalized === miscOutboundOrderApi.MiscOperationType.Outbound) return '出库'
  return '-'
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'misc-outbound-orders-column-settings-v1',
  preferredKeys: [
    'orderNo',
    'accountAliasDescription',
    'costCenterCode',
    'costCenterName',
    'type',
    'status',
    'creationTime',
  ],
  resolveTitle: (key) => {
    if (key === 'orderNo') return '单据号'
    if (key === 'accountAliasDescription') return '账户别名'
    if (key === 'costCenterCode') return '成本中心编码'
    if (key === 'costCenterName') return '成本中心名称'
    if (key === 'type') return '业务类型'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  orderNo: {
    title: createDraggableTitle('orderNo', '单据号'),
    key: 'orderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.orderNo, b.orderNo),
    render: (row) => row.orderNo || '-',
  },
  accountAliasDescription: {
    title: createDraggableTitle('accountAliasDescription', '账户别名'),
    key: 'accountAliasDescription',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.accountAliasDescription, b.accountAliasDescription),
    render: (row) => row.accountAliasDescription || '-',
  },
  costCenterCode: {
    title: createDraggableTitle('costCenterCode', '成本中心编码'),
    key: 'costCenterCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.costCenterCode, b.costCenterCode),
    render: (row) => row.costCenterCode || '-',
  },
  costCenterName: {
    title: createDraggableTitle('costCenterName', '成本中心名称'),
    key: 'costCenterName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.costCenterName, b.costCenterName),
    render: (row) => row.costCenterName || '-',
  },
  type: {
    title: createDraggableTitle('type', '业务类型'),
    key: 'type',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(normalizeOperationTypeValue(a.type), normalizeOperationTypeValue(b.type)),
    render: (row) => resolveOperationTypeLabel(row.type),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
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

async function loadData() {
  loading.value = true
  try {
    const data = await miscOutboundOrderApi.getList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
    pagination.itemCount = data.totalCount ?? 0
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载其他出库列表失败')
  } finally {
    loading.value = false
  }
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

function handleViewSelected() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行查看')
    return
  }

  if (!selected.id) {
    message.warning('缺少单据 Id，无法查看')
    return
  }

  router.push({ name: 'MiscOutboundOrdersDetail', params: { id: selected.id } })
}

function openDetail(row: RowItem) {
  if (!row?.id) {
    return
  }
  router.push({ name: 'MiscOutboundOrdersDetail', params: { id: row.id } })
}

function handleCreate() {
  router.push({ name: 'MiscOutboundOrdersCreate' })
}

function handleEditSelected() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行编辑')
    return
  }

  if (!selected.id) {
    message.warning('缺少单据 Id，无法编辑')
    return
  }

  router.push({ name: 'MiscOutboundOrdersEdit', params: { id: selected.id } })
}

function handleDeleteSelected() {
  if (selectedRows.value.length === 0) {
    message.warning('请至少选择一条数据进行删除')
    return
  }
  const targets = selectedRows.value
    .map((item) => ({
      id: String(item.id ?? '').trim(),
      orderNo: String(item.orderNo ?? '').trim(),
    }))
    .filter((item) => item.id)
  if (targets.length === 0) {
    message.warning('选中数据缺少单据 Id，无法删除')
    return
  }

  const preview = targets
    .slice(0, 3)
    .map((item) => item.orderNo || item.id)
    .join('，')
  const suffix = targets.length > 3 ? ' 等' : ''
  dialog.warning({
    title: '确认删除',
    content: `确认删除 ${targets.length} 条其他出库单吗？${preview}${suffix}`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      loading.value = true
      let successCount = 0
      const errorMessages: string[] = []
      try {
        for (const target of targets) {
          try {
            await miscOutboundOrderApi.remove(target.id)
            successCount += 1
          } catch (error) {
            const fallback = `${target.orderNo || target.id} 删除失败`
            errorMessages.push(error instanceof Error ? error.message : fallback)
          }
        }
        if (successCount > 0) {
          message.success(`成功删除 ${successCount} 条`)
        }
        if (errorMessages.length > 0) {
          message.error(errorMessages[0] || '删除失败')
        }
        clearSelection()
        if ((rows.value.length ?? 0) <= successCount && (pagination.page ?? 1) > 1) {
          pagination.page = (pagination.page ?? 1) - 1
        }
        await loadData()
      } finally {
        loading.value = false
      }
    },
  })
}

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
          <n-input
            :value="query.orderNo"
            clearable
            placeholder="请输入单据号"
            @update:value="(value) => (query.orderNo = value)"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.status"
            :options="statusOptions"
            clearable
            placeholder="请选择状态"
            style="width: 180px"
            @update:value="(value) => (query.status = value)"
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
        <n-button :disabled="!canSelectOne || loading" @click="handleViewSelected">查看</n-button>
        <n-button type="primary" @click="handleCreate">新增</n-button>
        <n-button :disabled="!canSelectOne || loading" @click="handleEditSelected">编辑</n-button>
        <n-button type="error" ghost :disabled="!canDelete || loading" @click="handleDeleteSelected">删除</n-button>
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
