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
  NDatePicker,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'

import * as palletMergeApi from '../../../api/palletMerge/palletMerge'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type MergeRow = palletMergeApi.PalletMergeListDto

const loading = ref(false)
const rows = ref<MergeRow[]>([])
const message = useMessage()
const dialog = useDialog()
const router = useRouter()

const getRowKey = (row: MergeRow) => row.id

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
const canDeleteSelected = computed(() => {
  if (selectedCount.value !== 1) return false
  const selected = selectedRows.value[0]
  if (!selected) return false
  return normalizeStatusValue(selected.status) === palletMergeApi.PalletMergeOrderStatus.Draft
})
const showDeleteButton = computed(() => {
  if (selectedCount.value === 0) return true
  return !selectedRows.value.some((item) =>
    normalizeStatusValue(item.status) === palletMergeApi.PalletMergeOrderStatus.Completed,
  )
})

const query = reactive({
  orderNo: '',
  mergeType: null as number | null,
  status: null as number | null,
  dateRange: null as [number, number] | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const listParams = computed<palletMergeApi.PalletMergeSearchDto>(() => ({
  maxResultCount: pagination.pageSize ?? 10,
  skipCount: ((pagination.page ?? 1) - 1) * (pagination.pageSize ?? 10),
  orderNo: query.orderNo?.trim() || undefined,
  mergeType: query.mergeType !== null ? (query.mergeType as palletMergeApi.PalletMergeType) : undefined,
  status: query.status !== null ? (query.status as palletMergeApi.PalletMergeOrderStatus) : undefined,
  startTime: query.dateRange?.[0] ? new Date(query.dateRange[0]).toISOString() : undefined,
  endTime: query.dateRange?.[1] ? new Date(query.dateRange[1]).toISOString() : undefined,
}))

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizeStatusValue(status: palletMergeApi.PalletMergeOrderStatus) {
  if (typeof status === 'string') {
    if (status === 'Draft' || status === '0') return palletMergeApi.PalletMergeOrderStatus.Draft
    if (status === 'Completed' || status === '1') return palletMergeApi.PalletMergeOrderStatus.Completed
  }
  if (typeof status === 'number') {
    return status
  }
  return null
}

function resolveStatusLabel(status: palletMergeApi.PalletMergeOrderStatus) {
  const value = normalizeStatusValue(status)
  if (value === palletMergeApi.PalletMergeOrderStatus.Draft) return '草稿'
  if (value === palletMergeApi.PalletMergeOrderStatus.Completed) return '已完成'
  return '-'
}

function getStatusTagType(status: palletMergeApi.PalletMergeOrderStatus) {
  const value = normalizeStatusValue(status)
  if (value === palletMergeApi.PalletMergeOrderStatus.Draft) return 'default'
  if (value === palletMergeApi.PalletMergeOrderStatus.Completed) return 'success'
  return 'default'
}

function normalizeTypeValue(type: palletMergeApi.PalletMergeType) {
  if (typeof type === 'string') {
    if (type === 'Split' || type === '0') return palletMergeApi.PalletMergeType.Split
    if (type === 'Merge' || type === '1') return palletMergeApi.PalletMergeType.Merge
  }
  if (typeof type === 'number') {
    return type
  }
  return null
}

function resolveTypeLabel(type: palletMergeApi.PalletMergeType) {
  const value = normalizeTypeValue(type)
  if (value === palletMergeApi.PalletMergeType.Split) return '分拆'
  if (value === palletMergeApi.PalletMergeType.Merge) return '合盘'
  return '-'
}

function getTypeTagType(type: palletMergeApi.PalletMergeType) {
  const value = normalizeTypeValue(type)
  if (value === palletMergeApi.PalletMergeType.Split) return 'warning'
  if (value === palletMergeApi.PalletMergeType.Merge) return 'info'
  return 'default'
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'pallet-merge-column-settings-v3',
  preferredKeys: ['orderNo', 'mergeType', 'warehouseCode', 'warehouseName', 'accountAlias', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'orderNo') return '单据号'
    if (key === 'mergeType') return '业务类型'
    if (key === 'warehouseCode') return '仓库编码'
    if (key === 'warehouseName') return '仓库名称'
    if (key === 'accountAlias') return '账户别名'
    if (key === 'status') return '单据状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<MergeRow>[number]> = {
  orderNo: {
    title: createDraggableTitle('orderNo', '单据号'),
    key: 'orderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.orderNo, b.orderNo),
    render: (row) => row.orderNo ?? '-',
  },
  mergeType: {
    title: createDraggableTitle('mergeType', '业务类型'),
    key: 'mergeType',
    minWidth: 100,
    align: 'center',
    sorter: (a, b) => compareSortValue(normalizeTypeValue(a.mergeType), normalizeTypeValue(b.mergeType)),
    render: (row) => {
      const label = resolveTypeLabel(row.mergeType)
      return h(NTag, { size: 'small', type: getTypeTagType(row.mergeType), bordered: false }, { default: () => label })
    },
  },
  warehouseCode: {
    title: createDraggableTitle('warehouseCode', '仓库编码'),
    key: 'warehouseCode',
    minWidth: 140,
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
  accountAlias: {
    title: createDraggableTitle('accountAlias', '账户别名'),
    key: 'accountAlias',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.accountAlias, b.accountAlias),
    render: (row) => row.accountAlias ?? '-',
  },
  status: {
    title: createDraggableTitle('status', '单据状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(normalizeStatusValue(a.status), normalizeStatusValue(b.status)),
    render: (row) => {
      const label = resolveStatusLabel(row.status)
      return h(NTag, { size: 'small', type: getStatusTagType(row.status), bordered: false }, { default: () => label })
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

const columns = computed<DataTableColumns<MergeRow>>(() =>
  withResizable([
    {
      type: 'selection',
      fixed: 'left',
      width: 44,
    },
    ...columnSettings.value
      .filter((item) => item.visible)
      .map((item) => columnMap[item.key])
      .filter((item): item is DataTableColumns<MergeRow>[number] => Boolean(item))
  ])
)

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await palletMergeApi.getList(listParams.value)
    rows.value = res.items || []
    syncCheckedRowKeys()
    pagination.itemCount = res.totalCount || 0
  } catch (error: any) {
    message.error(error?.message || '加载列表失败')
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
  query.mergeType = null
  query.status = null
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

function handleCreate(type: 'split' | 'merge') {
  router.push({ name: 'PalletMergeCreate', query: { type } })
}

function openDetail(row: MergeRow) {
  if (!row?.id) return
  router.push({ name: 'PalletMergeDetail', params: { id: row.id } })
}

function handleViewSelected() {
  const selected = selectedRows.value[0]
  if (!selected) {
    message.warning('请选择一条数据进行查看')
    return
  }
  router.push({ name: 'PalletMergeDetail', params: { id: selected.id } })
}

function handleDeleteSelected() {
  const selected = selectedRows.value[0]
  if (!selected) {
    message.warning('请选择一条数据进行删除')
    return
  }
  if (normalizeStatusValue(selected.status) === palletMergeApi.PalletMergeOrderStatus.Completed) {
    message.warning('已完成状态的单据不允许删除')
    return
  }

  dialog.warning({
    title: '确认删除',
    content: `您确定要删除单据 ${selected.orderNo || ''} 吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await palletMergeApi.remove(selected.id)
        message.success('删除成功')
        clearSelection()
        if ((rows.value.length ?? 0) <= 1 && (pagination.page ?? 1) > 1) {
          pagination.page = (pagination.page ?? 1) - 1
        }
        await loadData()
      } catch (error: any) {
        message.error(error?.message || '删除失败')
      }
    },
  })
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
            v-model:value="query.orderNo"
            clearable
            placeholder="请输入单据号"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            v-model:value="query.mergeType"
            clearable
            placeholder="业务类型"
            style="width: 140px;"
            :options="[
              { label: '分拆', value: 0 },
              { label: '合盘', value: 1 }
            ]"
            @update:value="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            v-model:value="query.status"
            clearable
            placeholder="状态"
            style="width: 140px;"
            :options="[
              { label: '草稿', value: 0 },
              { label: '已完成', value: 1 }
            ]"
            @update:value="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-date-picker
            v-model:value="query.dateRange"
            type="daterange"
            clearable
            @update:value="handleQuery"
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
        <n-button v-permission="'WMS.InternalOps.PalletMerge'" type="primary" @click="handleCreate('split')">分拆申请</n-button>
        <n-button v-permission="'WMS.InternalOps.PalletMerge'" type="info" @click="handleCreate('merge')">合盘申请</n-button>
        <n-button :disabled="!canViewSelected || loading" @click="handleViewSelected">查看</n-button>
        <n-button v-permission="'WMS.InternalOps.PalletMerge'" v-if="showDeleteButton" type="error" :disabled="!canDeleteSelected || loading" @click="handleDeleteSelected">删除</n-button>
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
