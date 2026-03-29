<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { NButton, NDataTable, NForm, NFormItem, NInput, NPagination, useMessage } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'

import BaseCrudPage from '../../components/BaseCrudPage.vue'
import TableColumnManager from '../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../composables/useColumnConfig'
import { withResizable } from '../../utils/table'
import { compareSortValue } from '../../utils/tableColumn'

type RowItem = {
  id: string
  code: string
  name: string
  creationTime?: string
}

const message = useMessage()
const loading = ref(false)
const rows = ref<RowItem[]>([])
const keyword = ref('')
const pagination = ref<PaginationProps>({ page: 1, pageSize: 10, itemCount: 0 })

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'template-crud-column-settings-v1',
  preferredKeys: ['code', 'name', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'code') return '编码'
    if (key === 'name') return '名称'
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
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 200,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
  },
}

const columns = computed<DataTableColumns<RowItem>>(() =>
  withResizable([
    ...columnSettings.value
      .filter((item) => item.visible)
      .map((item) => columnMap[item.key])
      .filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item)),
    {
      title: '操作',
      key: 'actions',
      width: 140,
      align: 'center',
      render: () =>
        h(
          NButton,
          { size: 'small', type: 'primary', onClick: () => message.info('请替换为页面实际动作') },
          { default: () => '操作' },
        ),
    },
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
    pagination.value.itemCount = 0
  } finally {
    loading.value = false
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
          <n-input :value="keyword" clearable placeholder="请输入关键字" @update:value="handleKeywordChange" @keyup.enter="handleQuery" />
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
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="rows" :bordered="false" />
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
