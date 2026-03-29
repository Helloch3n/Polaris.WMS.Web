<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NSelect,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DataTableSortState } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'
import { getList as getWarehouseList, type WarehouseDto } from '../../../api/masterData/warehouse'
import { getList as getZoneList, type ZoneDto } from '../../../api/masterData/zone'
import {
  LocationStatus,
  LocationType,
  deleteLocation,
  getList,
  type LocationDto,
  type LocationPagedQueryDto,
} from '../../../api/masterData/location'
import LocationDialog, { type LocationDialogExpose } from './components/LocationDialog.vue'
import LocationBatchDialog, { type LocationBatchDialogExpose } from './components/LocationBatchDialog.vue'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const list = ref<LocationDto[]>([])

const permissionCodes = {
  create: 'MasterData.Location.Create',
  update: 'MasterData.Location.Update',
  delete: 'MasterData.Location.Delete',
} as const

function hasPermission(code: string) {
  const raw = localStorage.getItem('auth_permissions')
  if (!raw) return true
  try {
    const permissions = JSON.parse(raw) as string[]
    if (!Array.isArray(permissions)) return true
    return permissions.includes(code)
  } catch {
    return true
  }
}

const canCreate = computed(() => hasPermission(permissionCodes.create))
const canUpdate = computed(() => hasPermission(permissionCodes.update))
const canDelete = computed(() => hasPermission(permissionCodes.delete))

const warehouses = ref<WarehouseDto[]>([])
const zones = ref<ZoneDto[]>([])
const selectedWarehouseId = ref<string | null>(null)
const selectedZoneId = ref<string | null>(null)

async function loadWarehouses() {
  const res = await getWarehouseList({ skipCount: 0, maxResultCount: 200 })
  warehouses.value = res.items ?? []
}

async function loadZones() {
  if (!selectedWarehouseId.value) {
    zones.value = []
    selectedZoneId.value = null
    return
  }

  const selectedWarehouse = warehouses.value.find((item) => item.id === selectedWarehouseId.value)
  if (!selectedWarehouse?.code) {
    zones.value = []
    selectedZoneId.value = null
    return
  }

  const res = await getZoneList({
    warehouseCode: selectedWarehouse.code,
    skipCount: 0,
    maxResultCount: 200,
  })
  zones.value = res.items ?? []
}

watch(selectedWarehouseId, async () => {
  selectedZoneId.value = null
  await loadZones()
})

const query = reactive({
  zoneCode: '',
  zoneName: '',
  warehouseCode: '',
  warehouseName: '',
  locationCode: '',
  page: 1,
  pageSize: 10,
  sorting: '',
  total: 0,
})

const listParams = computed<LocationPagedQueryDto>(() => ({
  skipCount: (query.page - 1) * query.pageSize,
  maxResultCount: query.pageSize,
  sorting: query.sorting || undefined,
  zoneId: selectedZoneId.value || undefined,
  zoneCode: query.zoneCode || undefined,
  zoneName: query.zoneName || undefined,
  warehouseCode: query.warehouseCode || undefined,
  warehouseName: query.warehouseName || undefined,
  locationCode: query.locationCode || undefined,
}))

const defaultColumnKeys = [
  'code',
  'aisle',
  'rack',
  'level',
  'bin',
  'maxWeight',
  'maxVolume',
  'maxReelCount',
  'type',
  'status',
  'allowMixedProducts',
  'allowMixedBatches',
  'creationTime',
  'lastModificationTime',
] as const

function toSorting(state: DataTableSortState | DataTableSortState[] | null): string {
  const current = Array.isArray(state) ? state[0] : state
  if (!current?.columnKey || !current.order) return ''
  return `${String(current.columnKey)} ${current.order === 'descend' ? 'DESC' : 'ASC'}`
}

function toNumber(value: unknown, defaultValue = 0): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : defaultValue
}

function normalizeLocation(item: unknown, index: number): LocationDto & { __rowKey: string } {
  const data = (item ?? {}) as Record<string, unknown>
  const id = String(data.id ?? data.Id ?? '')
  const code = String(data.code ?? data.Code ?? data.locationCode ?? data.LocationCode ?? '')

  return {
    ...(data as unknown as LocationDto),
    id,
    warehouseId: String(data.warehouseId ?? data.WarehouseId ?? ''),
    zoneId: String(data.zoneId ?? data.ZoneId ?? ''),
    code,
    aisle: String(data.aisle ?? data.Aisle ?? data.locationAisle ?? data.LocationAisle ?? ''),
    rack: String(data.rack ?? data.Rack ?? data.locationRack ?? data.LocationRack ?? ''),
    level: String(data.level ?? data.Level ?? data.locationLevel ?? data.LocationLevel ?? ''),
    bin: String(data.bin ?? data.Bin ?? data.locationBin ?? data.LocationBin ?? ''),
    maxWeight: toNumber(data.maxWeight ?? data.MaxWeight),
    maxVolume: toNumber(data.maxVolume ?? data.MaxVolume),
    maxReelCount: toNumber(data.maxReelCount ?? data.MaxReelCount, 1),
    type: toNumber(data.type ?? data.Type),
    status: toNumber(data.status ?? data.Status),
    allowMixedProducts: Boolean(data.allowMixedProducts ?? data.AllowMixedProducts),
    allowMixedBatches: Boolean(data.allowMixedBatches ?? data.AllowMixedBatches),
    creationTime: String(data.creationTime ?? data.CreationTime ?? ''),
    lastModificationTime: String(data.lastModificationTime ?? data.LastModificationTime ?? ''),
    __rowKey: id || code || `row-${index}`,
  }
}

function getRowKey(row: LocationDto) {
  const data = row as LocationDto & { __rowKey?: string }
  return data.id || data.code || data.__rowKey || ''
}

function getRowProps(row: LocationDto) {
  return {
    onClick: (event: MouseEvent) => toggleSingleRow(row, event),
  }
}

const {
  checkedRowKeys,
  selectedRows,
  selectedCount,
  handleCheckedRowKeysChange,
  syncCheckedRowKeys,
  toggleSingleRow,
  clearSelection,
} = useTableSelection(list, getRowKey)

async function fetchList() {
  loading.value = true
  try {
    const res = await getList(listParams.value)
    const raw = res as unknown as {
      items?: unknown[]
      Items?: unknown[]
      totalCount?: number
      TotalCount?: number
    }

    const rows = Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.Items)
        ? raw.Items
        : []

    list.value = rows.map((item, index) => normalizeLocation(item, index))
    query.total = raw.totalCount ?? raw.TotalCount ?? list.value.length
    syncCheckedRowKeys()
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.page = 1
  void fetchList()
}

function handleReset() {
  selectedWarehouseId.value = null
  selectedZoneId.value = null
  query.zoneCode = ''
  query.zoneName = ''
  query.warehouseCode = ''
  query.warehouseName = ''
  query.locationCode = ''
  query.sorting = ''
  query.page = 1
  void fetchList()
}

function handlePageChange(page: number) {
  query.page = page
  void fetchList()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  void fetchList()
}

function handleSortChange(state: DataTableSortState | DataTableSortState[] | null) {
  query.sorting = toSorting(state)
  query.page = 1
  void fetchList()
}

const dialogRef = ref<LocationDialogExpose | null>(null)
const batchDialogRef = ref<LocationBatchDialogExpose | null>(null)

function handleCreate() {
  dialogRef.value?.open({ mode: 'create' })
}

function handleEdit(row: LocationDto) {
  const rowData = row as LocationDto & { __rowKey?: string }
  if (!rowData.id) {
    message.warning('当前行缺少主键，无法编辑')
    return
  }
  dialogRef.value?.open({
    mode: 'edit',
    warehouseId: rowData.warehouseId || undefined,
    zoneId: rowData.zoneId || undefined,
    row: rowData,
  })
}

function handleBatchCreate() {
  if (!selectedWarehouseId.value || !selectedZoneId.value) {
    message.warning('请先选择仓库和库区')
    return
  }
  batchDialogRef.value?.open(selectedZoneId.value, selectedWarehouseId.value)
}

const canEditSelected = computed(() => canUpdate.value && selectedCount.value === 1)
const canDeleteSelected = computed(() => canDelete.value && selectedCount.value > 0)

function handleToolbarEdit() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行编辑')
    return
  }
  handleEdit(selected)
}

async function deleteByIds(ids: string[]) {
  loading.value = true
  try {
    await Promise.all(ids.map((id) => deleteLocation(id)))
    clearSelection()
    message.success('删除成功')
    await fetchList()
  } finally {
    loading.value = false
  }
}

function handleToolbarDelete() {
  const ids = selectedRows.value
    .map((item) => item.id)
    .filter((item): item is string => Boolean(item))
  if (ids.length === 0) {
    message.warning('请先选择要删除的数据')
    return
  }
  const content = ids.length === 1 ? '确定删除选中库位吗？' : `确定删除选中的 ${ids.length} 条库位吗？`
  dialog.warning({
    title: '提示',
    content,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      await deleteByIds(ids)
    },
  })
}

const typeMap: Record<number, string> = {
  [LocationType.Equipment]: '设备库位',
  [LocationType.Rack]: '地堆',
  [LocationType.Floor]: '货架',
}

function resolveStatusText(status: number) {
  if (status === LocationStatus.Idle) return '空闲'
  if (status === LocationStatus.Partial) return '部分占用'
  if (status === LocationStatus.Full) return '已满'
  if (status === LocationStatus.Locked) return '锁定'
  return String(status)
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatBool(value?: boolean) {
  return value ? '是' : '否'
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  syncColumnSettingsByKeys,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'location-index1-column-settings-v1',
  preferredKeys: [...defaultColumnKeys],
  resolveTitle: (key) => {
    if (key === 'code') return '库位编码'
    if (key === 'aisle') return '巷道'
    if (key === 'rack') return '货架'
    if (key === 'level') return '层'
    if (key === 'bin') return '位'
    if (key === 'maxWeight') return '最大承重'
    if (key === 'maxVolume') return '最大体积'
    if (key === 'maxReelCount') return '最大容器数'
    if (key === 'type') return '类型'
    if (key === 'status') return '状态'
    if (key === 'allowMixedProducts') return '允许混放物料'
    if (key === 'allowMixedBatches') return '允许混放批次'
    if (key === 'creationTime') return '创建时间'
    if (key === 'lastModificationTime') return '最后修改时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<LocationDto>[number]> = {
  code: { title: createDraggableTitle('code', '库位编码'), key: 'code', minWidth: 140, sorter: 'default' },
  aisle: { title: createDraggableTitle('aisle', '巷道'), key: 'aisle', width: 90, align: 'center', sorter: 'default' },
  rack: { title: createDraggableTitle('rack', '货架'), key: 'rack', width: 90, align: 'center', sorter: 'default' },
  level: { title: createDraggableTitle('level', '层'), key: 'level', width: 90, align: 'center', sorter: 'default' },
  bin: { title: createDraggableTitle('bin', '位'), key: 'bin', width: 90, align: 'center', sorter: 'default' },
  maxWeight: { title: createDraggableTitle('maxWeight', '最大承重'), key: 'maxWeight', width: 120, align: 'center', sorter: 'default' },
  maxVolume: { title: createDraggableTitle('maxVolume', '最大体积'), key: 'maxVolume', width: 120, align: 'center', sorter: 'default' },
  maxReelCount: { title: createDraggableTitle('maxReelCount', '最大容器数'), key: 'maxReelCount', width: 120, align: 'center', sorter: 'default' },
  type: {
    title: createDraggableTitle('type', '类型'),
    key: 'type',
    width: 130,
    align: 'center',
    sorter: 'default',
    render: (row) => h(NTag, { size: 'small' }, { default: () => typeMap[row.type] ?? String(row.type) }),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: 'default',
    render: (row) => h(NTag, { size: 'small' }, { default: () => resolveStatusText(row.status) }),
  },
  allowMixedProducts: {
    title: createDraggableTitle('allowMixedProducts', '允许混放物料'),
    key: 'allowMixedProducts',
    width: 130,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.allowMixedProducts, b.allowMixedProducts),
    render: (row) => formatBool(row.allowMixedProducts),
  },
  allowMixedBatches: {
    title: createDraggableTitle('allowMixedBatches', '允许混放批次'),
    key: 'allowMixedBatches',
    width: 130,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.allowMixedBatches, b.allowMixedBatches),
    render: (row) => formatBool(row.allowMixedBatches),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: 'default',
    render: (row) => formatDateTime(row.creationTime),
  },
  lastModificationTime: {
    title: createDraggableTitle('lastModificationTime', '最后修改时间'),
    key: 'lastModificationTime',
    minWidth: 180,
    sorter: 'default',
    render: (row) => formatDateTime(row.lastModificationTime),
  },
}

const columns = computed<DataTableColumns<LocationDto>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...(() => {
    const visibleColumns = columnSettings.value
      .filter((item) => item.visible)
      .map((item) => columnMap[item.key])
      .filter((item): item is DataTableColumns<LocationDto>[number] => Boolean(item))

    if (visibleColumns.length > 0) return visibleColumns

    return defaultColumnKeys
      .map((key) => columnMap[key])
      .filter((item): item is DataTableColumns<LocationDto>[number] => Boolean(item))
  })(),
]))

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

onMounted(async () => {
  loadColumnSettings()
  syncColumnSettingsByKeys([...defaultColumnKeys])

  try {
    await loadWarehouses()
  } catch (e: any) {
    message.warning(e?.message ?? '仓库筛选数据加载失败，已继续加载列表')
  }

  await fetchList()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-select
            :value="selectedWarehouseId"
            :options="warehouses.map((item) => ({ label: `${item.code} - ${item.name}`, value: item.id }))"
            placeholder="请选择仓库"
            clearable
            filterable
            style="width: 240px"
            @update:value="(value) => { selectedWarehouseId = value; handleQuery() }"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="selectedZoneId"
            :options="zones.map((item) => ({ label: `${item.code} - ${item.name}`, value: item.id }))"
            placeholder="请选择库区"
            clearable
            filterable
            style="width: 240px"
            @update:value="(value) => { selectedZoneId = value; handleQuery() }"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.locationCode"
            placeholder="请输入库位编码"
            clearable
            @update:value="(value) => (query.locationCode = value)"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.zoneCode"
            placeholder="请输入库区编码"
            clearable
            @update:value="(value) => (query.zoneCode = value)"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.zoneName"
            placeholder="请输入库区名称"
            clearable
            @update:value="(value) => (query.zoneName = value)"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.warehouseCode"
            placeholder="请输入仓库编码"
            clearable
            @update:value="(value) => (query.warehouseCode = value)"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.warehouseName"
            placeholder="请输入仓库名称"
            clearable
            @update:value="(value) => (query.warehouseName = value)"
            @keyup.enter="handleQuery"
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
        <n-button v-if="canCreate" type="primary" @click="handleCreate">新增</n-button>
        <n-button v-if="canUpdate" :disabled="!canEditSelected" @click="handleToolbarEdit">编辑</n-button>
        <n-button v-if="canDelete" type="error" :disabled="!canDeleteSelected" @click="handleToolbarDelete">删除</n-button>
        <n-button @click="handleBatchCreate">批量创建</n-button>
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
        :data="list"
        :bordered="false"
        :row-key="getRowKey"
        :row-props="getRowProps"
        :checked-row-keys="checkedRowKeys"
        @update:sorter="handleSortChange"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      />
      <LocationDialog ref="dialogRef" @success="fetchList" />
      <LocationBatchDialog ref="batchDialogRef" @success="fetchList" />
    </template>

    <template #pager-left>
      <div class="crud-selection-summary">
        <n-tag size="small" type="info">已选 {{ selectedCount }} 条</n-tag>
        <n-button text :disabled="selectedCount === 0" @click="clearSelection">清空选择</n-button>
      </div>
    </template>

    <template #pager-right>
      <n-pagination
        :page="query.page"
        :page-size="query.pageSize"
        :item-count="query.total"
        :page-sizes="[10, 20, 50, 100]"
        show-size-picker
        @update:page="(page) => { query.page = page; handlePageChange(page) }"
        @update:page-size="(size) => { query.pageSize = size; handlePageSizeChange(size) }"
      />
    </template>
  </BaseCrudPage>
</template>

<style scoped>
</style>
