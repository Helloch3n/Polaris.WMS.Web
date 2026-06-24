<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
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
import type { DataTableColumns } from 'naive-ui'

import * as allocationApi from '../../../api/inventory/allocation'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { compareSortValue } from '../../../utils/tableColumn'
import { withResizable } from '../../../utils/table'

type AllocationRow = allocationApi.InventoryAllocationDto

type AllocationQueryParams = allocationApi.InventoryAllocationSearchDto

const loading = ref(false)
const rows = ref<AllocationRow[]>([])
const message = useMessage()

const query = reactive({
  allocationOrderNo: '',
  allocationType: null as number | null,
  allocationTag: '',
  containerCode: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const allocationTypeOptions = [
  { label: '工单', value: 0 },
  { label: '销售订单', value: 1 },
]

const listParams = computed<AllocationQueryParams>(() => {
  return {
    maxResultCount: query.pageSize,
    skipCount: (query.page - 1) * query.pageSize,
    allocationOrderNo: query.allocationOrderNo || undefined,
    allocationType: query.allocationType !== null ? query.allocationType : undefined,
    allocationTag: query.allocationTag || undefined,
    containerCode: query.containerCode || undefined,
  }
})

async function loadData() {
  loading.value = true
  try {
    const data = await allocationApi.getList(listParams.value)
    rows.value = data.items ?? []
    query.total = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function onQuery() {
  query.page = 1
  loadData()
}

function onReset() {
  query.allocationOrderNo = ''
  query.allocationType = null
  query.allocationTag = ''
  query.containerCode = ''
  onQuery()
}

function handlePageChange(page: number) {
  query.page = page
  loadData()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  loadData()
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function resolveAllocationType(raw: unknown) {
  if (typeof raw === 'string') {
    if (raw === 'WorkOrder' || raw === '0') return '工单'
    if (raw === 'SalesOrder' || raw === '1') return '销售订单'
    return raw
  }
  if (typeof raw === 'number') {
    if (raw === 0) return '工单'
    if (raw === 1) return '销售订单'
  }
  return '-'
}

function getAllocationTypeTagType(type: string) {
  if (type === '工单') return 'info'
  if (type === '销售订单') return 'success'
  return 'default'
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  syncColumnSettingsByKeys,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'inventory-allocation-column-settings-v1',
  preferredKeys: [
    'sequence',
    'allocationOrderNo',
    'allocationLineNo',
    'allocationType',
    'containerCode',
    'productCode',
    'productName',
    'sn',
    'batchNo',
    'allocationTag',
    'allocatedQty',
    'creationTime',
  ],
  resolveTitle: (key) => {
    if (key === 'sequence') return '序号'
    if (key === 'allocationOrderNo') return '分配单据号'
    if (key === 'allocationLineNo') return '分配行号'
    if (key === 'allocationType') return '分配类型'
    if (key === 'containerCode') return '盘号'
    if (key === 'productCode') return '物料编码'
    if (key === 'productName') return '物料名称'
    if (key === 'sn') return 'SN'
    if (key === 'batchNo') return '批次号'
    if (key === 'allocationTag') return '分配标识'
    if (key === 'allocatedQty') return '分配数量'
    if (key === 'creationTime') return '分配时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<AllocationRow>[number]> = {
  sequence: {
    title: createDraggableTitle('sequence', '序号'),
    key: 'sequence',
    width: 80,
    align: 'center',
    render: (_, index) => String((query.page - 1) * query.pageSize + index + 1),
  },
  allocationOrderNo: {
    title: createDraggableTitle('allocationOrderNo', '分配单据号'),
    key: 'allocationOrderNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.allocationOrderNo, b.allocationOrderNo),
    render: (row) => h('strong', row.allocationOrderNo || '-'),
  },
  allocationLineNo: {
    title: createDraggableTitle('allocationLineNo', '分配行号'),
    key: 'allocationLineNo',
    minWidth: 120,
    sorter: (a, b) => compareSortValue(a.allocationLineNo, b.allocationLineNo),
    render: (row) => row.allocationLineNo ?? '-',
  },
  allocationType: {
    title: createDraggableTitle('allocationType', '分配类型'),
    key: 'allocationType',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveAllocationType(a.allocationType), resolveAllocationType(b.allocationType)),
    render: (row) => {
      const typeStr = resolveAllocationType(row.allocationType)
      return h(NTag, { type: getAllocationTypeTagType(typeStr), size: 'small' }, { default: () => typeStr })
    },
  },
  containerCode: {
    title: createDraggableTitle('containerCode', '盘号'),
    key: 'containerCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.containerCode, b.containerCode),
    render: (row) => row.containerCode ?? '-',
  },
  productCode: {
    title: createDraggableTitle('productCode', '物料编码'),
    key: 'productCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.productCode, b.productCode),
    render: (row) => row.productCode ?? '-',
  },
  productName: {
    title: createDraggableTitle('productName', '物料名称'),
    key: 'productName',
    minWidth: 200,
    sorter: (a, b) => compareSortValue(a.productName, b.productName),
    render: (row) => row.productName ?? '-',
  },
  sn: {
    title: createDraggableTitle('sn', 'SN'),
    key: 'sn',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.sn, b.sn),
    render: (row) => row.sn ?? '-',
  },
  batchNo: {
    title: createDraggableTitle('batchNo', '批次号'),
    key: 'batchNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.batchNo, b.batchNo),
    render: (row) => row.batchNo ?? '-',
  },
  allocationTag: {
    title: createDraggableTitle('allocationTag', '分配标识'),
    key: 'allocationTag',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.allocationTag, b.allocationTag),
    render: (row) => row.allocationTag ?? '-',
  },
  allocatedQty: {
    title: createDraggableTitle('allocatedQty', '分配数量'),
    key: 'allocatedQty',
    width: 140,
    sorter: (a, b) => compareSortValue(a.allocatedQty, b.allocatedQty),
    render: (row) => row.allocatedQty ?? 0,
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '分配时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<AllocationRow>>(() => withResizable(
  columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<AllocationRow>[number] => Boolean(item)),
))

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
  syncColumnSettingsByKeys(Object.keys(columnMap))
  loadData()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input :value="query.allocationOrderNo" placeholder="请输入分配单据号" clearable @update:value="(value) => { query.allocationOrderNo = value }" />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.allocationType"
            placeholder="请选择分配类型"
            clearable
            style="width: 160px"
            :options="allocationTypeOptions"
            @update:value="(value) => { query.allocationType = value }"
          />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.allocationTag" placeholder="请输入分配标识" clearable @update:value="(value) => { query.allocationTag = value }" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.containerCode" placeholder="请输入盘号" clearable @update:value="(value) => { query.containerCode = value }" />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="onReset">重置</n-button>
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
      <n-data-table
        class="crud-table-flat allocation-table"
        :loading="loading"
        :columns="columns"
        :data="rows"
        :scroll-x="2200"
        flex-height
        :bordered="false"
      />
    </template>

    <template #pager-right>
      <n-pagination
        :page="query.page"
        :page-size="query.pageSize"
        :item-count="query.total"
        :page-sizes="[10,20,50,100]"
        show-size-picker
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </template>
  </BaseCrudPage>
</template>

<style scoped>
:deep(.allocation-table) {
  width: 100%;
}

:deep(.allocation-table .n-data-table-base-table-body) {
  overflow-x: scroll !important;
}

:deep(.allocation-table .n-scrollbar-rail--horizontal) {
  opacity: 1 !important;
}

:deep(.slot-pager) {
  padding-top: 0;
}

:deep(.crud-pager) {
  min-height: 24px;
  padding-top: 0;
}
</style>
