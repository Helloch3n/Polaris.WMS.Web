<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NButton, NDataTable, NForm, NFormItem, NInput, NPagination, useMessage } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type RowItem = { id: string; module: string; action: string; userName: string; creationTime?: string }
const message = useMessage()
const loading = ref(false)
const rows = ref<RowItem[]>([])
const keyword = ref('')
const pagination = ref<PaginationProps>({ page: 1, pageSize: 10, itemCount: 0 })

const { showColumnConfig, columnSettings, loadColumnSettings, handleVisibleChange, createDraggableTitle } = useColumnConfig({
  storageKey: 'operation-log-column-settings-v1',
  preferredKeys: ['module', 'action', 'userName', 'creationTime'],
  resolveTitle: (key) => (key === 'module' ? '模块' : key === 'action' ? '动作' : key === 'userName' ? '操作人' : key === 'creationTime' ? '时间' : key),
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  module: { title: createDraggableTitle('module', '模块'), key: 'module', minWidth: 140, sorter: (a, b) => compareSortValue(a.module, b.module) },
  action: { title: createDraggableTitle('action', '动作'), key: 'action', minWidth: 180, sorter: (a, b) => compareSortValue(a.action, b.action) },
  userName: { title: createDraggableTitle('userName', '操作人'), key: 'userName', minWidth: 140, sorter: (a, b) => compareSortValue(a.userName, b.userName) },
  creationTime: { title: createDraggableTitle('creationTime', '时间'), key: 'creationTime', minWidth: 180, sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime) },
}

const columns = computed<DataTableColumns<RowItem>>(() => withResizable(columnSettings.value.filter((item) => item.visible).map((item) => columnMap[item.key]).filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item))))
function handleColumnConfigShowChange(value: boolean) { showColumnConfig.value = value }
function handleColumnVisibleChange(key: string, visible: boolean) { if (!handleVisibleChange(key, visible)) message.warning('至少保留一个展示字段') }
function handleQuery() { pagination.value.page = 1; loadData() }
function handleReset() { keyword.value = ''; pagination.value.page = 1; loadData() }
function handlePageChange(page: number) { pagination.value.page = page; loadData() }
function handlePageSizeChange(size: number) { pagination.value.pageSize = size; pagination.value.page = 1; loadData() }
async function loadData() { loading.value = true; try { rows.value = []; pagination.value.itemCount = 0 } finally { loading.value = false } }

onMounted(() => { loadColumnSettings(); loadData() })
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item><n-input :value="keyword" clearable placeholder="请输入模块/操作人" @update:value="(value) => (keyword = value)" @keyup.enter="handleQuery" /></n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item><n-button type="primary" :loading="loading" @click="handleQuery">查询</n-button></n-form-item>
        <n-form-item><n-button @click="handleReset">重置</n-button></n-form-item>
      </n-form>
    </template>
    <template #actions-left><div class="crud-action-main"><n-button @click="loadData">刷新</n-button></div></template>
    <template #actions-right><div class="crud-action-tools"><TableColumnManager :show="showColumnConfig" :settings="columnSettings" @update:show="handleColumnConfigShowChange" @visible-change="handleColumnVisibleChange" /></div></template>
    <template #data><n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="rows" :bordered="false" /></template>
    <template #pager-right><n-pagination :page="pagination.page" :page-size="pagination.pageSize" :item-count="pagination.itemCount" :page-sizes="[10, 20, 50, 100]" show-size-picker @update:page="(page) => { pagination.page = page; handlePageChange(page) }" @update:page-size="(size) => { pagination.pageSize = size; handlePageSizeChange(size) }" /></template>
  </BaseCrudPage>
</template>
