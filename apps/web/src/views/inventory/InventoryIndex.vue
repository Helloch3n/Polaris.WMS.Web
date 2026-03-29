<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as inventoryApi from '../../api/masterData/inventory'
import BaseCrudPage from '../../components/BaseCrudPage.vue'
import TableColumnManager from '../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../composables/useColumnConfig'
import { compareSortValue } from '../../utils/tableColumn'
import { withResizable } from '../../utils/table'

type InventoryRow = inventoryApi.Inventory

type InventoryQueryParams = inventoryApi.GetInventoryListParams & {
  reelNo?: string
  productId?: string
  relatedOrderNo?: string
  warehouseCode?: string
  zoneCode?: string
}

const loading = ref(false)
const rows = ref<InventoryRow[]>([])
const message = useMessage()

const query = reactive({
  reelNo: '',
  productId: '',
  relatedOrderNo: '',
  warehouseCode: '',
  zoneCode: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const listParams = computed<InventoryQueryParams>(() => {
  return {
    maxResultCount: query.pageSize,
    skipCount: (query.page - 1) * query.pageSize,
    reelNo: query.reelNo || undefined,
    productId: query.productId || undefined,
    relatedOrderNo: query.relatedOrderNo || undefined,
    warehouseCode: query.warehouseCode || undefined,
    zoneCode: query.zoneCode || undefined,
  }
})

function normalizeLayerIndex(row: InventoryRow): number {
  const anyRow = row as InventoryRow & { layer?: unknown; layer_index?: unknown }
  const raw = anyRow.layerIndex ?? anyRow.layer ?? anyRow.layer_index
  const n = typeof raw === 'number' ? raw : Number(raw ?? 0)
  return Number.isFinite(n) ? n : 0
}

function normalizeSn(row: InventoryRow): string {
  const raw = row.sn ?? row.SN
  return typeof raw === 'string' ? raw : ''
}

async function loadData() {
  loading.value = true
  try {
    const data = await inventoryApi.getList(listParams.value)
    const items = data.items ?? []
    rows.value = items.map((row) => ({
      ...row,
      layerIndex: normalizeLayerIndex(row),
      sn: normalizeSn(row),
    }))
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
  query.reelNo = ''
  query.productId = ''
  query.relatedOrderNo = ''
  query.warehouseCode = ''
  query.zoneCode = ''
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

function resolveStatus(raw: unknown) {
  if (typeof raw === 'string') {
    if (raw === 'Good' || raw === '0') return '良品'
    if (raw === 'Frozen' || raw === '1') return '冻结'
    if (raw === 'Quarantine' || raw === '2') return '待检'
    if (raw === 'Scrap' || raw === '3') return '报废'
    return '-'
  }
  if (typeof raw === 'number') {
    if (raw === inventoryApi.InventoryStatus.Good) return '良品'
    if (raw === inventoryApi.InventoryStatus.Frozen) return '冻结'
    if (raw === inventoryApi.InventoryStatus.Quarantine) return '待检'
    if (raw === inventoryApi.InventoryStatus.Scrap) return '报废'
  }
  return '-'
}

function getStatusTagType(status: string) {
  if (status === '良品') return 'success'
  if (status === '冻结') return 'warning'
  if (status === '待检') return 'info'
  if (status === '报废') return 'error'
  return 'default'
}

function resolveType(raw: unknown) {
  if (typeof raw === 'string') {
    if (raw === 'SemiFinished' || raw === '0') return '半成品'
    if (raw === 'Finished' || raw === '1') return '成品'
    if (raw === 'ProcessReel' || raw === '2') return '工序盘'
    return '-'
  }
  if (typeof raw === 'number') {
    if (raw === inventoryApi.InventoryType.SemiFinished) return '半成品'
    if (raw === inventoryApi.InventoryType.Finished) return '成品'
    if (raw === inventoryApi.InventoryType.ProcessReel) return '工序盘'
  }
  return '-'
}

function getTypeTagType(type: string) {
  if (type === '半成品') return 'warning'
  if (type === '成品') return 'success'
  if (type === '工序盘') return 'info'
  return 'default'
}

function resolveLayer(row: InventoryRow) {
  const v = row.layerIndex
  return typeof v === 'number' ? v : Number(v ?? 0)
}

const maxLayerByReel = computed(() => {
  const map = new Map<string, number>()
  for (const row of rows.value) {
    const reelNo = row.reelNo
    if (!reelNo) continue
    const layer = resolveLayer(row)
    const current = map.get(reelNo)
    if (current === undefined || layer > current) {
      map.set(reelNo, layer)
    }
  }
  return map
})

function isMaxLayer(row: InventoryRow) {
  const reelNo = row.reelNo
  if (!reelNo) return false
  const maxLayer = maxLayerByReel.value.get(reelNo)
  return typeof maxLayer === 'number' && resolveLayer(row) === maxLayer
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'inventory-column-settings-v3',
  preferredKeys: [
    'reelNo',
    'warehouseCode',
    'warehouseName',
    'zoneCode',
    'zoneName',
    'locationCode',
    'type',
    'status',
    'productCode',
    'productName',
    'quantity',
    'unit',
    'availableQuantity',
    'lockedQuantity',
    'weight',
    'batchNo',
    'relatedOrderNo',
    'relatedOrderLineNo',
    'sn',
    'craftVersion',
    'fifoDate',
    'layer',
  ],
  resolveTitle: (key) => {
    if (key === 'reelNo') return '盘号'
    if (key === 'warehouseCode') return '仓库编码'
    if (key === 'warehouseName') return '仓库名称'
    if (key === 'zoneCode') return '库区编码'
    if (key === 'zoneName') return '库区名称'
    if (key === 'locationCode') return '库位'
    if (key === 'type') return '库存类型'
    if (key === 'status') return '状态'
    if (key === 'productCode') return '产品编码'
    if (key === 'productName') return '物料名称'
    if (key === 'quantity') return '库存数量'
    if (key === 'unit') return '单位'
    if (key === 'availableQuantity') return '可用数量'
    if (key === 'lockedQuantity') return '锁定数量'
    if (key === 'weight') return '净重'
    if (key === 'batchNo') return '批次'
    if (key === 'relatedOrderNo') return '所属单据'
    if (key === 'relatedOrderLineNo') return '所属单据明细行'
    if (key === 'sn') return 'SN'
    if (key === 'craftVersion') return '工艺版本'
    if (key === 'fifoDate') return 'FIFO日期'
    if (key === 'layer') return '缠绕层级'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<InventoryRow>[number]> = {
  reelNo: { title: createDraggableTitle('reelNo', '盘号'), key: 'reelNo', minWidth: 160, sorter: (a, b) => compareSortValue(a.reelNo, b.reelNo), render: (row) => h('strong', row.reelNo ?? '-') },
  warehouseCode: { title: createDraggableTitle('warehouseCode', '仓库编码'), key: 'warehouseCode', minWidth: 140, sorter: (a, b) => compareSortValue(a.warehouseCode, b.warehouseCode), render: (row) => row.warehouseCode ?? '-' },
  warehouseName: { title: createDraggableTitle('warehouseName', '仓库名称'), key: 'warehouseName', minWidth: 160, sorter: (a, b) => compareSortValue(a.warehouseName, b.warehouseName), render: (row) => row.warehouseName ?? '-' },
  zoneCode: { title: createDraggableTitle('zoneCode', '库区编码'), key: 'zoneCode', minWidth: 140, sorter: (a, b) => compareSortValue(a.zoneCode, b.zoneCode), render: (row) => row.zoneCode ?? '-' },
  zoneName: { title: createDraggableTitle('zoneName', '库区名称'), key: 'zoneName', minWidth: 160, sorter: (a, b) => compareSortValue(a.zoneName, b.zoneName), render: (row) => row.zoneName ?? '-' },
  locationCode: { title: createDraggableTitle('locationCode', '库位'), key: 'locationCode', minWidth: 160, sorter: (a, b) => compareSortValue(a.locationCode, b.locationCode), render: (row) => row.locationCode ?? '-' },
  type: {
    title: createDraggableTitle('type', '库存类型'),
    key: 'type',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveType(a.type), resolveType(b.type)),
    render: (row) => {
      const type = resolveType(row.type)
      return h(NTag, { type: getTypeTagType(type), size: 'small' }, { default: () => type })
    },
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 140,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveStatus(a.status), resolveStatus(b.status)),
    render: (row) => {
      const status = resolveStatus(row.status)
      return h(NTag, { type: getStatusTagType(status), size: 'small' }, { default: () => status })
    },
  },
  productCode: { title: createDraggableTitle('productCode', '产品编码'), key: 'productCode', minWidth: 160, sorter: (a, b) => compareSortValue(a.productCode, b.productCode), render: (row) => row.productCode ?? '-' },
  productName: { title: createDraggableTitle('productName', '物料名称'), key: 'productName', minWidth: 200, sorter: (a, b) => compareSortValue(a.productName, b.productName), render: (row) => row.productName ?? '-' },
  quantity: { title: createDraggableTitle('quantity', '库存数量'), key: 'quantity', width: 140, sorter: (a, b) => compareSortValue(a.quantity, b.quantity), render: (row) => row.quantity ?? 0 },
  unit: { title: createDraggableTitle('unit', '单位'), key: 'unit', width: 100, sorter: (a, b) => compareSortValue(a.unit, b.unit), render: (row) => row.unit ?? '-' },
  availableQuantity: { title: createDraggableTitle('availableQuantity', '可用数量'), key: 'availableQuantity', width: 140, sorter: (a, b) => compareSortValue(a.availableQuantity, b.availableQuantity), render: (row) => row.availableQuantity ?? 0 },
  lockedQuantity: { title: createDraggableTitle('lockedQuantity', '锁定数量'), key: 'lockedQuantity', width: 140, sorter: (a, b) => compareSortValue(a.lockedQuantity, b.lockedQuantity), render: (row) => row.lockedQuantity ?? 0 },
  weight: { title: createDraggableTitle('weight', '净重'), key: 'weight', width: 140, sorter: (a, b) => compareSortValue(a.weight, b.weight), render: (row) => `${row.weight ?? 0}` },
  batchNo: { title: createDraggableTitle('batchNo', '批次'), key: 'batchNo', minWidth: 160, sorter: (a, b) => compareSortValue(a.batchNo, b.batchNo), render: (row) => row.batchNo ?? '-' },
  relatedOrderNo: { title: createDraggableTitle('relatedOrderNo', '所属单据'), key: 'relatedOrderNo', minWidth: 180, sorter: (a, b) => compareSortValue(a.relatedOrderNo, b.relatedOrderNo), render: (row) => row.relatedOrderNo ?? '-' },
  relatedOrderLineNo: { title: createDraggableTitle('relatedOrderLineNo', '所属单据明细行'), key: 'relatedOrderLineNo', minWidth: 180, sorter: (a, b) => compareSortValue(a.relatedOrderLineNo, b.relatedOrderLineNo), render: (row) => row.relatedOrderLineNo ?? '-' },
  sn: { title: createDraggableTitle('sn', 'SN'), key: 'sn', minWidth: 160, sorter: (a, b) => compareSortValue(a.sn, b.sn), render: (row) => row.sn ?? '-' },
  craftVersion: { title: createDraggableTitle('craftVersion', '工艺版本'), key: 'craftVersion', minWidth: 140, sorter: (a, b) => compareSortValue(a.craftVersion, b.craftVersion), render: (row) => row.craftVersion ?? '-' },
  fifoDate: { title: createDraggableTitle('fifoDate', 'FIFO日期'), key: 'fifoDate', minWidth: 180, sorter: (a, b) => compareSortValue(a.fifoDate, b.fifoDate), render: (row) => formatDateTime(row.fifoDate) },
  layer: {
    title: createDraggableTitle('layer', '缠绕层级'),
    key: 'layer',
    minWidth: 140,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveLayer(a), resolveLayer(b)),
    render: (row) => {
      const layer = resolveLayer(row)
      if (!Number.isFinite(layer)) return '-'
      if (isMaxLayer(row)) {
        return h(NTag, { type: 'error', size: 'small' }, { default: () => `第 ${layer} 段` })
      }
      return h('span', `第 ${layer} 段`)
    },
  },
}

const columns = computed<DataTableColumns<InventoryRow>>(() => withResizable(
  columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<InventoryRow>[number] => Boolean(item)),
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
  loadData()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input :value="query.reelNo" placeholder="请输入盘号" clearable @update:value="(value) => { query.reelNo = value }" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.productId" placeholder="请输入物料Id" clearable @update:value="(value) => { query.productId = value }" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.relatedOrderNo" placeholder="请输入所属单据" clearable @update:value="(value) => { query.relatedOrderNo = value }" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.warehouseCode" placeholder="请输入仓库编码" clearable @update:value="(value) => { query.warehouseCode = value }" />
        </n-form-item>
        <n-form-item>
          <n-input :value="query.zoneCode" placeholder="请输入库区编码" clearable @update:value="(value) => { query.zoneCode = value }" />
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
      <div style="overflow-x: auto;">
        <n-data-table
          class="crud-table-flat"
          :loading="loading"
          :columns="columns"
          :data="rows"
          :bordered="false"
        />
      </div>
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
</style>