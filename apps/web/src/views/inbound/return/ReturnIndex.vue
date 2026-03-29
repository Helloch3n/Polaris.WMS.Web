<script setup lang="ts">
/* eslint-disable vue/no-v-model-argument */
import { computed, onMounted, ref } from 'vue'
import { NButton, NDataTable, NForm, NFormItem, NInput, NPagination, useMessage } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type RowItem = { id: string; code: string; name: string; status?: string; creationTime?: string }
const message = useMessage()
const loading = ref(false)
const rows = ref<RowItem[]>([])
const keyword = ref('')
const pagination = ref<PaginationProps>({ page: 1, pageSize: 10, itemCount: 0 })

const { showColumnConfig, columnSettings, loadColumnSettings, handleVisibleChange, createDraggableTitle } = useColumnConfig({
  storageKey: 'return-management-column-settings-v1',
  preferredKeys: ['code', 'name', 'status', 'creationTime'],
  resolveTitle: (key) => (key === 'code' ? '退货单号' : key === 'name' ? '供应商/客户' : key === 'status' ? '状态' : key === 'creationTime' ? '创建时间' : key),
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  code: { title: createDraggableTitle('code', '退货单号'), key: 'code', minWidth: 160, sorter: (a, b) => compareSortValue(a.code, b.code) },
  name: { title: createDraggableTitle('name', '供应商/客户'), key: 'name', minWidth: 180, sorter: (a, b) => compareSortValue(a.name, b.name) },
  status: { title: createDraggableTitle('status', '状态'), key: 'status', minWidth: 120, sorter: (a, b) => compareSortValue(a.status, b.status) },
  creationTime: { title: createDraggableTitle('creationTime', '创建时间'), key: 'creationTime', minWidth: 180, sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime) },
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
        <n-form-item><n-input :value="keyword" clearable placeholder="请输入退货单号/供应商" @update:value="(value) => (keyword = value)" @keyup.enter="handleQuery" /></n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item><n-button type="primary" :loading="loading" @click="handleQuery">查询</n-button></n-form-item>
        <n-form-item><n-button @click="handleReset">重置</n-button></n-form-item>
      </n-form>
    </template>
    <template #actions-left><div class="crud-action-main"><n-button type="primary" @click="message.info('待接入新增退货')">新增</n-button></div></template>
    <template #actions-right><div class="crud-action-tools"><TableColumnManager :show="showColumnConfig" :settings="columnSettings" @update:show="handleColumnConfigShowChange" @visible-change="handleColumnVisibleChange" /></div></template>
    <template #data><n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="rows" :bordered="false" /></template>
    <template #pager-right><n-pagination :page="pagination.page" :page-size="pagination.pageSize" :item-count="pagination.itemCount" :page-sizes="[10, 20, 50, 100]" show-size-picker @update:page="(page) => { pagination.page = page; handlePageChange(page) }" @update:page-size="(size) => { pagination.pageSize = size; handlePageSizeChange(size) }" /></template>
  </BaseCrudPage>
</template>
