<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { NButton, NDataTable, NForm, NFormItem, NInput, NPagination, useMessage } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'

import BaseCrudPage from '../../components/BaseCrudPage.vue'
import TableColumnManager from '../../components/TableColumnManager.vue'
import WmsStatusTag from '../../components/WmsStatusTag.vue'
import { useColumnConfig } from '../../composables/useColumnConfig'
import { useTableSelection } from '../../composables/useTableSelection'
import { withResizable } from '../../utils/table'
import { compareSortValue } from '../../utils/tableColumn'

type RowItem = {
  id: string
  code: string
  name: string
  status: 'enabled' | 'disabled'
  creationTime?: string
}

const message = useMessage()
const loading = ref(false)
const rows = ref<RowItem[]>([])
const keyword = ref('')
const pagination = ref<PaginationProps>({ page: 1, pageSize: 10, itemCount: 0 })

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

const selectedRow = computed(() => selectedCount.value === 1 ? selectedRows.value[0] : undefined)

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'template-crud-column-settings-v1',
  preferredKeys: ['code', 'name', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'code') return '编码'
    if (key === 'name') return '名称'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  code: {
    title: createDraggableTitle('code', '编码'),
    key: 'code',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.code, b.code),
  },
  name: {
    title: createDraggableTitle('name', '名称'),
    key: 'name',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.name, b.name),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 100,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.status, b.status),
    render: (row) => h(WmsStatusTag, {
      label: row.status === 'enabled' ? '启用' : '停用',
      type: row.status === 'enabled' ? 'success' : 'default',
    }),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 200,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
  },
}

const columns = computed<DataTableColumns<RowItem>>(() =>
  withResizable([
    {
      type: 'selection',
      fixed: 'left',
      width: 44,
    },
    ...columnSettings.value
      .filter((item) => item.visible)
      .map((item) => columnMap[item.key])
      .filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item)),
  ]),
)

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

function handleQuery() {
  pagination.value.page = 1
  loadData()
}

function handleReset() {
  keyword.value = ''
  pagination.value.page = 1
  loadData()
}

function handlePageChange(page: number) {
  pagination.value.page = page
  loadData()
}

function handlePageSizeChange(size: number) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadData()
}

function handleKeywordChange(value: string) {
  keyword.value = value
}

async function loadData() {
  loading.value = true
  try {
    rows.value = []
    syncCheckedRowKeys()
    pagination.value.itemCount = 0
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  message.info('请替换为页面实际新增动作')
}

function handleView(row: RowItem) {
  message.info(`查看：${row.code}`)
}

function handleEdit(row: RowItem) {
  message.info(`编辑：${row.code}`)
}

function handleDelete(row: RowItem) {
  message.info(`删除：${row.code}`)
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
          <n-input :value="keyword" clearable placeholder="请输入关键字" @update:value="handleKeywordChange" @keyup.enter="handleQuery" />
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
        <n-button :disabled="!selectedRow" @click="selectedRow && handleView(selectedRow)">查看</n-button>
        <n-button :disabled="!selectedRow" @click="selectedRow && handleEdit(selectedRow)">编辑</n-button>
        <!-- 业务按钮放在编辑与删除之间，并始终保留禁用态占位。 -->
        <n-button type="error" :disabled="!selectedRow" @click="selectedRow && handleDelete(selectedRow)">删除</n-button>
        <n-button :loading="loading" @click="loadData">刷新</n-button>
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
        :row-key="getRowKey"
        :checked-row-keys="checkedRowKeys"
        :bordered="false"
        :row-props="(row) => ({
          onClick: (event) => toggleSingleRow(row, event),
          onDblclick: () => handleView(row),
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
