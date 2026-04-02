<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NButton, NDataTable, NForm, NFormItem, NInput, NPagination, NSelect, useMessage } from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'

import * as poApi from '../../../api/purchaseOrder'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { withResizable } from '../../../utils/table'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { compareSortValue } from '../../../utils/tableColumn'
import { t } from '../../../utils/i18n'

type RowItem = poApi.PurchaseOrderDto

const message = useMessage()
const loading = ref(false)
const rows = ref<RowItem[]>([])

const query = reactive({
  poNo: '',
  supplierName: '',
  status: undefined as number | undefined,
})

const pagination = reactive<PaginationProps>({ page: 1, pageSize: 10, itemCount: 0 })

const statusOptions: SelectOption[] = []

const listParams = computed<poApi.PurchaseOrderSearchDto>(() => ({
  maxResultCount: pagination.pageSize as number,
  skipCount: ((pagination.page as number) - 1) * (pagination.pageSize as number),
  poNo: query.poNo || undefined,
  supplierName: query.supplierName || undefined,
  status: query.status ?? undefined,
}))

async function loadData() {
  loading.value = true
  try {
    const data = await poApi.getList(listParams.value)
    rows.value = data.items ?? []
    pagination.itemCount = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onQuery() {
  pagination.page = 1
  loadData()
}

function onReset() {
  query.poNo = ''
  query.supplierName = ''
  query.status = undefined
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

const { showColumnConfig, columnSettings, loadColumnSettings, handleVisibleChange, createDraggableTitle } = useColumnConfig({
  storageKey: 'purchase-order-column-settings-v1',
  preferredKeys: ['poNo', 'supplierCode', 'supplierName', 'orderDate', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'poNo') return t('purchaseOrder.columns.poNo')
    if (key === 'supplierCode') return t('purchaseOrder.columns.supplierCode')
    if (key === 'supplierName') return t('purchaseOrder.columns.supplierName')
    if (key === 'orderDate') return t('purchaseOrder.columns.orderDate')
    if (key === 'status') return t('purchaseOrder.columns.status')
    if (key === 'creationTime') return t('purchaseOrder.columns.creationTime')
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  poNo: { title: createDraggableTitle('poNo', t('purchaseOrder.columns.poNo')), key: 'poNo', minWidth: 180, sorter: (a, b) => compareSortValue(a.poNo, b.poNo), render: (row) => row.poNo ?? '-' },
  supplierCode: { title: createDraggableTitle('supplierCode', t('purchaseOrder.columns.supplierCode')), key: 'supplierCode', minWidth: 140, sorter: (a, b) => compareSortValue(a.supplierCode, b.supplierCode), render: (row) => row.supplierCode ?? '-' },
  supplierName: { title: createDraggableTitle('supplierName', t('purchaseOrder.columns.supplierName')), key: 'supplierName', minWidth: 180, sorter: (a, b) => compareSortValue(a.supplierName, b.supplierName), render: (row) => row.supplierName ?? '-' },
  orderDate: { title: createDraggableTitle('orderDate', t('purchaseOrder.columns.orderDate')), key: 'orderDate', minWidth: 160, sorter: (a, b) => compareSortValue(a.orderDate, b.orderDate), render: (row) => (row.orderDate ? new Date(row.orderDate).toLocaleDateString() : '-') },
  status: { title: createDraggableTitle('status', t('purchaseOrder.columns.status')), key: 'status', width: 120, align: 'center', sorter: (a, b) => compareSortValue(a.status, b.status), render: (row) => String(row.status ?? '-') },
  creationTime: { title: createDraggableTitle('creationTime', t('purchaseOrder.columns.creationTime')), key: 'creationTime', minWidth: 180, sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime), render: (row) => (row.creationTime ? new Date(row.creationTime).toLocaleString() : '-') },
}

const columns = computed<DataTableColumns<RowItem>>(() => withResizable(
  columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item)),
))

onMounted(() => {
  loadColumnSettings()
  loadData()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form purchase-order-search-form">
        <n-form-item>
          <n-input :value="query.poNo" :placeholder="t('purchaseOrder.search.poNo')" clearable @update:value="(v) => { query.poNo = v }" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.supplierName" :placeholder="t('purchaseOrder.search.supplierName')" clearable @update:value="(v) => { query.supplierName = v }" />
        </n-form-item>
        <n-form-item>
          <n-select :value="query.status" :options="statusOptions" :placeholder="t('purchaseOrder.search.status')" clearable style="width: 160px" @update:value="(v) => { query.status = v }" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="onQuery">{{ t('common.query') }}</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="onReset">{{ t('common.reset') }}</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #data>
      <div style="overflow-x: auto;">
        <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="rows" :bordered="false" />
      </div>
    </template>

    <template #pager-right>
      <n-pagination :page="pagination.page" :page-size="pagination.pageSize" :item-count="pagination.itemCount" :page-sizes="[10,20,50,100]" show-size-picker @update:page="handlePageChange" @update:page-size="handlePageSizeChange" />
    </template>
  </BaseCrudPage>
</template>

<style scoped>
:deep(.purchase-order-search-form.crud-search-form) {
  flex-wrap: wrap !important;
  overflow: visible !important;
  row-gap: 8px;
  column-gap: 8px;
}

:deep(.purchase-order-search-form .n-form-item) {
  margin-bottom: 0;
  flex: 0 1 auto !important;
  min-width: 0 !important;
}
</style>
