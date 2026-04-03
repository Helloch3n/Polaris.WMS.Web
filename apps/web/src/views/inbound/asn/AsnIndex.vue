<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NSelect,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'

import * as asnApi from '../../../api/inbound/asn'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { withResizable } from '../../../utils/table'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { compareSortValue } from '../../../utils/tableColumn'
import { t } from '../../../utils/i18n'

type RowItem = asnApi.AsnDto

const message = useMessage()
const loading = ref(false)
const rows = ref<RowItem[]>([])

const query = reactive({
  asnNo: '',
  supplierName: '',
  status: undefined as number | undefined,
  licensePlate: '',
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const statusOptions: SelectOption[] = []

const listParams = computed<asnApi.AsnSearchDto>(() => ({
  maxResultCount: pagination.pageSize as number,
  skipCount: ((pagination.page as number) - 1) * (pagination.pageSize as number),
  asnNo: query.asnNo || undefined,
  supplierName: query.supplierName || undefined,
  status: query.status ?? undefined,
  licensePlate: query.licensePlate || undefined,
}))

async function loadData() {
  loading.value = true
  try {
    const data = await asnApi.getList(listParams.value)
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
  query.asnNo = ''
  query.supplierName = ''
  query.status = undefined
  query.licensePlate = ''
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

const {
  columnSettings,
  loadColumnSettings,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'asn-column-settings-v1',
  preferredKeys: ['asnNo', 'supplierCode', 'supplierName', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'asnNo') return t('asn.columns.asnNo')
    if (key === 'supplierCode') return t('asn.columns.supplierCode')
    if (key === 'supplierName') return t('asn.columns.supplierName')
    if (key === 'status') return t('asn.columns.status')
    if (key === 'creationTime') return t('asn.columns.creationTime')
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  asnNo: { title: createDraggableTitle('asnNo', t('asn.columns.asnNo')), key: 'asnNo', minWidth: 180, sorter: (a, b) => compareSortValue(a.asnNo, b.asnNo), render: (row) => row.asnNo ?? '-' },
  supplierCode: { title: createDraggableTitle('supplierCode', t('asn.columns.supplierCode')), key: 'supplierCode', minWidth: 140, sorter: (a, b) => compareSortValue(a.supplierCode, b.supplierCode), render: (row) => row.supplierCode ?? '-' },
  supplierName: { title: createDraggableTitle('supplierName', t('asn.columns.supplierName')), key: 'supplierName', minWidth: 180, sorter: (a, b) => compareSortValue(a.supplierName, b.supplierName), render: (row) => row.supplierName ?? '-' },
  status: { title: createDraggableTitle('status', t('asn.columns.status')), key: 'status', width: 120, align: 'center', sorter: (a, b) => compareSortValue(a.status, b.status), render: (row) => String(row.status ?? '-') },
  creationTime: { title: createDraggableTitle('creationTime', t('asn.columns.creationTime')), key: 'creationTime', minWidth: 180, sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime), render: (row) => (row.creationTime ? new Date(row.creationTime).toLocaleString() : '-') },
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
      <n-form inline class="crud-search-form asn-search-form">
        <n-form-item>
          <n-input :value="query.asnNo" :placeholder="t('asn.search.asnNo')" clearable @update:value="(v) => { query.asnNo = v }" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.supplierName" :placeholder="t('asn.search.supplierName')" clearable @update:value="(v) => { query.supplierName = v }" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.licensePlate" :placeholder="t('asn.search.licensePlate')" clearable @update:value="(v) => { query.licensePlate = v }" />
        </n-form-item>
        <n-form-item>
          <n-select :value="query.status" :options="statusOptions" :placeholder="t('asn.search.status')" clearable style="width: 160px" @update:value="(v) => { query.status = v }" />
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
:deep(.asn-search-form.crud-search-form) {
  flex-wrap: wrap !important;
  overflow: visible !important;
  row-gap: 8px;
  column-gap: 8px;
}

:deep(.asn-search-form .n-form-item) {
  margin-bottom: 0;
  flex: 0 1 auto !important;
  min-width: 0 !important;
}
</style>
