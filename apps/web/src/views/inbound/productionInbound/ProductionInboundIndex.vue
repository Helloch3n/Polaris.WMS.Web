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
import * as warehouseApi from '../../../api/masterData/warehouse'
import * as organizationUnitsApi from '../../../api/identity/organizationUnits'
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
const warehouseOptions = ref<SelectOption[]>([])
const departmentOptions = ref<SelectOption[]>([])

const query = reactive({
  filter: '',
  inboundType: null as productionInboundApi.ProductionInboundType | null,
  status: null as productionInboundApi.ProductionInboundStatus | null,
  sourceDepartmentId: null as string | null,
  targetWarehouseId: null as string | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const inboundTypeOptions: SelectOption[] = [
  { label: '成品入库', value: productionInboundApi.ProductionInboundType.FinishedProduct },
  { label: '半成品入库', value: productionInboundApi.ProductionInboundType.SemiFinishedProduct },
  { label: '工序品/在制品入库', value: productionInboundApi.ProductionInboundType.WorkInProgress },
]

const statusOptions: SelectOption[] = [
  { label: '草稿', value: productionInboundApi.ProductionInboundStatus.Draft },
  { label: '作业中', value: productionInboundApi.ProductionInboundStatus.InProgress },
  { label: '已完成', value: productionInboundApi.ProductionInboundStatus.Completed },
]

const listParams = computed<productionInboundApi.ProductionInboundSearchDto>(() => ({
  maxResultCount: pagination.pageSize ?? 10,
  skipCount: ((pagination.page ?? 1) - 1) * (pagination.pageSize ?? 10),
  filter: query.filter.trim() || undefined,
  inboundType: query.inboundType ?? undefined,
  status: query.status ?? undefined,
  sourceDepartmentId: query.sourceDepartmentId ?? undefined,
  targetWarehouseId: query.targetWarehouseId ?? undefined,
}))

function flattenDepartments(nodes: Array<{ id: string; displayName: string; code?: string; children?: any[] }>) {
  const result: Array<{ id: string; displayName: string; code?: string }> = []
  const walk = (items: Array<{ id: string; displayName: string; code?: string; children?: any[] }>) => {
    for (const item of items) {
      result.push({ id: item.id, displayName: item.displayName, code: item.code })
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children)
      }
    }
  }
  walk(nodes)
  return result
}

async function loadQueryOptions() {
  try {
    const [warehouseData, departmentTree] = await Promise.all([
      warehouseApi.getList({ maxResultCount: 1000, skipCount: 0 }),
      organizationUnitsApi.getTree(),
    ])

    warehouseOptions.value = (warehouseData.items ?? []).map((item) => ({
      label: item.code ? `${item.code}${item.name ? ` - ${item.name}` : ''}` : (item.name || '-'),
      value: item.id,
    }))

    departmentOptions.value = flattenDepartments(departmentTree.items ?? []).map((item) => ({
      label: item.code ? `${item.code}${item.displayName ? ` - ${item.displayName}` : ''}` : (item.displayName || '-'),
      value: item.id,
    }))
  } catch (e) {
    warehouseOptions.value = []
    departmentOptions.value = []
    message.error(e instanceof Error ? e.message : '加载查询条件失败')
  }
}

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
const canEditSelected = computed(() => {
  if (selectedCount.value !== 1) return false
  const selected = selectedRows.value[0]
  if (!selected) return false
  return normalizeStatusValue(selected.status) === productionInboundApi.ProductionInboundStatus.Draft
})
const canApproveSelected = computed(() => {
  if (selectedCount.value !== 1) return false
  const selected = selectedRows.value[0]
  if (!selected) return false
  return normalizeStatusValue(selected.status) === productionInboundApi.ProductionInboundStatus.Draft
})

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
  if (normalized === productionInboundApi.ProductionInboundType.FinishedProduct) return '成品入库'
  if (normalized === productionInboundApi.ProductionInboundType.SemiFinishedProduct) return '半成品入库'
  if (normalized === productionInboundApi.ProductionInboundType.WorkInProgress) return '工序品/在制品入库'
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
  if (value === productionInboundApi.ProductionInboundStatus.Draft) return '草稿'
  if (value === productionInboundApi.ProductionInboundStatus.InProgress) return '作业中'
  if (value === productionInboundApi.ProductionInboundStatus.Completed) return '已完成'
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
    if (key === 'orderNo') return '生产入库单号'
    if (key === 'sourceOrderNo') return '来源单号'
    if (key === 'inboundType') return '入库类型'
    if (key === 'sourceDepartmentCode') return '来源部门编码'
    if (key === 'sourceDepartmentName') return '来源部门名称'
    if (key === 'targetWarehouseCode') return '目标仓库编码'
    if (key === 'targetWarehouseName') return '目标仓库名称'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  orderNo: {
    title: createDraggableTitle('orderNo', '生产入库单号'),
    key: 'orderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.orderNo, b.orderNo),
    render: (row) => row.orderNo ?? '-',
  },
  sourceOrderNo: {
    title: createDraggableTitle('sourceOrderNo', '来源单号'),
    key: 'sourceOrderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.sourceOrderNo, b.sourceOrderNo),
    render: (row) => row.sourceOrderNo ?? '-',
  },
  inboundType: {
    title: createDraggableTitle('inboundType', '入库类型'),
    key: 'inboundType',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(normalizeInboundTypeValue(a.inboundType), normalizeInboundTypeValue(b.inboundType)),
    render: (row) => resolveInboundTypeLabel(row.inboundType),
  },
  sourceDepartmentCode: {
    title: createDraggableTitle('sourceDepartmentCode', '来源部门编码'),
    key: 'sourceDepartmentCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.sourceDepartmentCode, b.sourceDepartmentCode),
    render: (row) => row.sourceDepartmentCode ?? '-',
  },
  sourceDepartmentName: {
    title: createDraggableTitle('sourceDepartmentName', '来源部门名称'),
    key: 'sourceDepartmentName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.sourceDepartmentName, b.sourceDepartmentName),
    render: (row) => row.sourceDepartmentName ?? '-',
  },
  targetWarehouseCode: {
    title: createDraggableTitle('targetWarehouseCode', '目标仓库编码'),
    key: 'targetWarehouseCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.targetWarehouseCode, b.targetWarehouseCode),
    render: (row) => row.targetWarehouseCode ?? '-',
  },
  targetWarehouseName: {
    title: createDraggableTitle('targetWarehouseName', '目标仓库名称'),
    key: 'targetWarehouseName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.targetWarehouseName, b.targetWarehouseName),
    render: (row) => row.targetWarehouseName ?? '-',
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
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  router.push({ name: 'ProductionInboundCreate' })
}

function handleEdit() {
  if (selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行编辑')
    return
  }
  const selected = selectedRows.value[0]
  if (!selected?.id) {
    message.warning('当前数据缺少单据ID，无法编辑')
    return
  }
  if (normalizeStatusValue(selected.status) !== productionInboundApi.ProductionInboundStatus.Draft) {
    message.warning('仅草稿状态支持编辑')
    return
  }
  router.push({ name: 'ProductionInboundEdit', params: { orderId: selected.id } })
}

function handleView() {
  if (selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行查看')
    return
  }
  const selected = selectedRows.value[0]
  if (!selected?.id) {
    message.warning('当前数据缺少单据ID，无法查看')
    return
  }
  router.push({ name: 'ProductionInboundDetail', params: { orderId: selected.id } })
}

function openDetail(row: RowItem) {
  if (!row?.id) return
  router.push({ name: 'ProductionInboundDetail', params: { orderId: row.id } })
}

function handleApprove() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行审核')
    return
  }

  if (normalizeStatusValue(selected.status) !== productionInboundApi.ProductionInboundStatus.Draft) {
    message.warning('仅草稿状态支持审核执行')
    return
  }

  dialog.warning({
    title: '确认审核',
    content: `确认审核并执行生产入库单 ${selected.orderNo || ''} 吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await productionInboundApi.approveAndExecute(selected.id)
        message.success('审核执行成功')
        clearSelection()
        await loadData()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '审核执行失败')
      }
    },
  })
}

function handleQuery() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  query.filter = ''
  query.inboundType = null
  query.status = null
  query.sourceDepartmentId = null
  query.targetWarehouseId = null
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
  loadQueryOptions()
  loadData()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form production-inbound-search-form">
        <n-form-item>
          <n-input :value="query.filter" placeholder="请输入入库单号/来源单号" clearable @update:value="(value) => { query.filter = value }" />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.inboundType"
            :options="inboundTypeOptions"
            placeholder="请选择入库类型"
            clearable
            style="width: 180px"
            @update:value="(value) => { query.inboundType = value }"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.status"
            :options="statusOptions"
            placeholder="请选择状态"
            clearable
            style="width: 160px"
            @update:value="(value) => { query.status = value }"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.sourceDepartmentId"
            :options="departmentOptions"
            placeholder="请输入来源部门搜索"
            clearable
            style="width: 220px"
            filterable
            @update:value="(value) => { query.sourceDepartmentId = value }"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.targetWarehouseId"
            :options="warehouseOptions"
            placeholder="请输入目标仓库搜索"
            clearable
            style="width: 220px"
            filterable
            @update:value="(value) => { query.targetWarehouseId = value }"
          />
        </n-form-item>
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
        <n-button type="primary" :loading="loading" @click="handleCreate">新增</n-button>
        <n-button :disabled="!canEditSelected || loading" @click="handleEdit">编辑</n-button>
        <n-button :disabled="!canViewSelected || loading" @click="handleView">查看</n-button>
        <n-button type="warning" :disabled="!canApproveSelected || loading" @click="handleApprove">审核</n-button>
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
