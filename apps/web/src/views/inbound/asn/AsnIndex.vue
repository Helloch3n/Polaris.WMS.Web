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
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'

import * as asnApi from '../../../api/inbound/asn'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { withResizable } from '../../../utils/table'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { compareSortValue } from '../../../utils/tableColumn'
import { t } from '../../../utils/i18n'

type RowItem = asnApi.AsnDto

const message = useMessage()
const router = useRouter()
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

const statusOptions: SelectOption[] = [
  { label: '待收货', value: asnApi.AsnStatus.Pending },
  { label: '收货中', value: asnApi.AsnStatus.Receiving },
  { label: '已完成', value: asnApi.AsnStatus.Completed },
]

const listParams = computed<asnApi.AsnSearchDto>(() => ({
  maxResultCount: pagination.pageSize as number,
  skipCount: ((pagination.page as number) - 1) * (pagination.pageSize as number),
  asnNo: query.asnNo || undefined,
  supplierName: query.supplierName || undefined,
  status: query.status ?? undefined,
  licensePlate: query.licensePlate || undefined,
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

const canViewSelected = computed(() => selectedCount.value === 1)

function resolveAsnStatusLabel(raw: asnApi.AsnStatus | undefined): string {
  const status = raw == null ? '' : String(raw)
  if (status === String(asnApi.AsnStatus.Pending) || status === 'Pending') return '待收货'
  if (status === String(asnApi.AsnStatus.Receiving) || status === 'Receiving') return '收货中'
  if (status === String(asnApi.AsnStatus.Completed) || status === 'Completed') return '已完成'
  return raw == null ? '-' : String(raw)
}

function getAsnStatusTagType(raw: asnApi.AsnStatus | undefined) {
  const label = resolveAsnStatusLabel(raw)
  if (label === '待收货') return 'warning'
  if (label === '收货中') return 'info'
  if (label === '已完成') return 'success'
  return 'default'
}

async function openDetail(row: RowItem) {
  const id = String(row.id ?? '').trim()
  if (!id) {
    message.warning('缺少 ASN Id，无法查看')
    return
  }

  try {
    await asnApi.get(id)
    await router.push({ name: 'AsnDetail', params: { id } })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '查询 ASN 详情失败')
  }
}

async function handleViewSelected() {
  const row = selectedRows.value[0]
  if (!row || selectedRows.value.length !== 1) {
    message.warning('请选择一条 ASN 数据')
    return
  }
  await openDetail(row)
}

async function loadData() {
  loading.value = true
  try {
    const data = await asnApi.getList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
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
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
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
  status: {
    title: createDraggableTitle('status', t('asn.columns.status')),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveAsnStatusLabel(a.status), resolveAsnStatusLabel(b.status)),
    render: (row) =>
      h(
        NTag,
        { size: 'small', type: getAsnStatusTagType(row.status) },
        { default: () => resolveAsnStatusLabel(row.status) },
      ),
  },
  creationTime: { title: createDraggableTitle('creationTime', t('asn.columns.creationTime')), key: 'creationTime', minWidth: 180, sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime), render: (row) => (row.creationTime ? new Date(row.creationTime).toLocaleString() : '-') },
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
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="onQuery">{{ t('common.query') }}</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="onReset">{{ t('common.reset') }}</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button :disabled="!canViewSelected || loading" @click="handleViewSelected">查看</n-button>
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
      <div style="overflow-x: auto;">
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
      </div>
    </template>

    <template #pager-left>
      <div class="crud-selection-summary">
        <n-tag size="small" type="info">已选 {{ selectedCount }} 条</n-tag>
        <n-button text :disabled="selectedCount === 0" @click="clearSelection">清空选择</n-button>
      </div>
    </template>

    <template #pager-right>
      <n-pagination :page="pagination.page" :page-size="pagination.pageSize" :item-count="pagination.itemCount" :page-sizes="[10,20,50,100]" show-size-picker @update:page="handlePageChange" @update:page-size="handlePageSizeChange" />
    </template>
  </BaseCrudPage>
</template>
