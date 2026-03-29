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
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import { withResizable } from '../../../utils/table'
import {
  getList,
  delete as deleteReel,
  ReelType,
  type GetReelListParams,
  type ReelDto,
} from '../../../api/masterData/reel'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { compareSortValue } from '../../../utils/tableColumn'
import ReelModal from './components/ReelModal.vue'

type ReelRow = ReelDto

type ReelDialogExpose = {
  open: (row?: ReelRow) => void
}

const loading = ref(false)
const rows = ref<ReelRow[]>([])
const message = useMessage()
const dialog = useDialog()
const dialogRef = ref<ReelDialogExpose | null>(null)

const permissionCodes = {
  create: 'MasterData.Reel.Create',
  update: 'MasterData.Reel.Update',
  delete: 'MasterData.Reel.Delete',
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

const COLUMN_STORAGE_KEY = 'reel-column-settings-v5'
const preferredColumnOrder = [
  'reelNo',
  'name',
  'size',
  'reelType',
  'currentWarehouseCode',
  'currentZoneCode',
  'currentLocationCode',
  'selfWeight',
  'status',
  'isLocked',
]
const columnTitleMap: Record<string, string> = {
  id: 'ID',
  reelNo: '盘号',
  reelCode: '盘号编码',
  name: '名称',
  code: '编码',
  size: '规格',
  reelType: '盘具类型',
  currentWarehouseCode: '当前仓库',
  currentWarehouseId: '当前仓库ID',
  currentZoneCode: '当前库区',
  currentZoneId: '当前库区ID',
  currentLocationCode: '当前位置',
  currentLocationId: '当前位置ID',
  selfWeight: '皮重',
  status: '状态',
  isLocked: '锁定',
  isDeleted: '是否删除',
  creationTime: '创建时间',
  creationDate: '创建日期',
  createdTime: '创建时间',
  createdDate: '创建日期',
  lastModificationTime: '最后修改时间',
  modifiedTime: '修改时间',
  updateTime: '更新时间',
  updatedTime: '更新时间',
  operateTime: '操作时间',
  operationTime: '操作时间',
  timestamp: '时间戳',
  creatorId: '创建人ID',
  lastModifierId: '修改人ID',
  tenantId: '租户ID',
}

const columnTokenTitleMap: Record<string, string> = {
  reel: '线盘',
  no: '编号',
  code: '编码',
  name: '名称',
  size: '规格',
  current: '当前',
  location: '位置',
  warehouse: '仓库',
  zone: '库区',
  product: '物料',
  supplier: '供应商',
  status: '状态',
  locked: '锁定',
  lock: '锁定',
  weight: '重量',
  qty: '数量',
  quantity: '数量',
  created: '创建时间',
  creation: '创建时间',
  modified: '修改时间',
  update: '更新时间',
  updated: '更新时间',
  operation: '操作',
  operate: '操作',
  last: '最后',
  modifier: '修改人',
  creator: '创建人',
  tenant: '租户',
  deleted: '删除',
  stamp: '戳记',
  date: '日期',
  time: '时间',
  id: 'ID',
}

function isIdLikeKey(key: string) {
  return /(^id$|id$|_id$)/i.test(key)
}

function splitColumnKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
}

function toChineseByToken(key: string) {
  const tokens = splitColumnKey(key)
  if (tokens.length === 0) return '字段'
  const translated = tokens.map((token) => columnTokenTitleMap[token.toLowerCase()] ?? token)
  const hasUntranslated = translated.some((item, index) => item === tokens[index])
  if (hasUntranslated) {
    const known = tokens
      .map((token) => columnTokenTitleMap[token.toLowerCase()])
      .filter((item): item is string => Boolean(item))
    if (known.length > 0) {
      return known.join('')
    }
    return '字段'
  }
  return translated.join('')
}

function resolveColumnTitle(key: string) {
  if (columnTitleMap[key]) {
    return columnTitleMap[key]
  }

  if (isIdLikeKey(key) && key.length > 2) {
    const base = key.replace(/id$/i, '')
    const baseTitle = columnTitleMap[base] ?? toChineseByToken(base)
    if (baseTitle && baseTitle !== base) {
      return `${baseTitle}ID`
    }
    return 'ID'
  }

  const translated = toChineseByToken(key)
  return translated || '字段'
}
const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  syncColumnSettingsByKeys,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: COLUMN_STORAGE_KEY,
  preferredKeys: preferredColumnOrder,
  resolveTitle: resolveColumnTitle,
  defaultVisible: (key) => !isIdLikeKey(key),
})

function collectDynamicColumnKeys(data: ReelRow[]) {
  const keySet = new Set<string>(preferredColumnOrder)
  for (const row of data) {
    const rowObj = row as unknown as Record<string, unknown>
    for (const key of Object.keys(rowObj)) {
      keySet.add(key)
    }
  }
  const known = preferredColumnOrder.filter((key) => keySet.has(key))
  const others = Array.from(keySet).filter((key) => !preferredColumnOrder.includes(key)).sort()
  return [...known, ...others]
}

function syncColumnSettingsByData(data: ReelRow[]) {
  syncColumnSettingsByKeys(collectDynamicColumnKeys(data))
}

const query = reactive({
  reelNo: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const listParams = computed<GetReelListParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  reelNo: query.reelNo || undefined,
}))

function getRowKey(row: ReelRow) {
  return row.id ?? row.reelNo
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

const canEditSelected = computed(() => canUpdate.value && selectedCount.value === 1)
const canDeleteSelected = computed(() => canDelete.value && selectedCount.value > 0)

async function loadData() {
  loading.value = true
  try {
    const data = await getList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
    syncColumnSettingsByData(rows.value)
    query.total = data.totalCount ?? 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}

function handleReset() {
  query.reelNo = ''
  handleSearch()
}

function handleCreate() {
  dialogRef.value?.open()
}

function handleEdit(row: ReelRow) {
  dialogRef.value?.open(row)
}

function handleToolbarEdit() {
  if (selectedRows.value.length !== 1) {
    message.warning('请选择一条数据进行编辑')
    return
  }
  const selected = selectedRows.value[0]
  if (!selected) {
    message.warning('请选择一条数据进行编辑')
    return
  }
  handleEdit(selected)
}

async function deleteByIds(ids: string[]) {
  loading.value = true
  try {
    await Promise.all(ids.map((id) => deleteReel(id)))
    checkedRowKeys.value = []
    message.success('删除成功')
    await loadData()
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
  const content = ids.length === 1 ? '确定要删除选中的线盘吗？' : `确定要删除选中的 ${ids.length} 条线盘吗？`
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

function resolveStatus(raw: unknown) {
  if (typeof raw === 'string') {
    if (raw === 'Empty') return '空闲'
    if (raw === 'Occupied') return '占用'
    if (raw === 'Damaged') return '损坏'
    return '空闲'
  }
  if (typeof raw === 'number') {
    if (raw === 0) return '空闲'
    if (raw === 1) return '占用'
    if (raw === 2) return '损坏'
  }
  return '空闲'
}

function getStatusTagType(status: string) {
  if (status === '空闲') return 'success'
  if (status === '占用') return 'warning'
  if (status === '损坏') return 'error'
  return 'default'
}

function resolveReelType(raw: unknown) {
  if (raw === ReelType.Turnover || raw === 'Turnover' || raw === '0' || raw === 0) return '周转盘'
  if (raw === ReelType.FinishedGoods || raw === 'FinishedGoods' || raw === '1' || raw === 1) return '成品盘'
  if (raw === ReelType.Virtual || raw === 'Virtual' || raw === '2' || raw === 2) return '虚拟盘'
  return '-'
}

function getReelTypeTagType(reelType: string) {
  if (reelType === '周转盘') return 'info'
  if (reelType === '成品盘') return 'success'
  if (reelType === '虚拟盘') return 'warning'
  return 'default'
}

function formatWeight(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '-'
  return n
}

function padDatePart(n: number) {
  return String(n).padStart(2, '0')
}

function isTimeLikeKey(key: string) {
  return /(time|date|timestamp|at)$/i.test(key)
}

function toDate(value: unknown) {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }
  return null
}

function formatDateTime(value: unknown) {
  const date = toDate(value)
  if (!date) return String(value)
  const year = date.getFullYear()
  const month = padDatePart(date.getMonth() + 1)
  const day = padDatePart(date.getDate())
  const hour = padDatePart(date.getHours())
  const minute = padDatePart(date.getMinutes())
  const second = padDatePart(date.getSeconds())
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function formatCellValue(value: unknown, key?: string) {
  if (value === null || value === undefined || value === '') return '-'
  if (key && isTimeLikeKey(key)) {
    return formatDateTime(value)
  }
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

function buildHeaderTitle(key: string) {
  return createDraggableTitle(key, resolveColumnTitle(key))
}

function buildColumnByKey(key: string): DataTableColumns<ReelRow>[number] {
  if (key === 'reelNo') {
    return {
      title: buildHeaderTitle('reelNo'),
      key: 'reelNo',
      minWidth: 140,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(a.reelNo, b.reelNo),
      render: (row) => row.reelNo ?? '-',
    }
  }
  if (key === 'name') {
    return {
      title: buildHeaderTitle('name'),
      key: 'name',
      minWidth: 180,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(a.name, b.name),
      render: (row) => row.name ?? '-',
    }
  }
  if (key === 'size') {
    return {
      title: buildHeaderTitle('size'),
      key: 'size',
      minWidth: 140,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(a.size, b.size),
      render: (row) => row.size ?? '-',
    }
  }
  if (key === 'reelType') {
    return {
      title: buildHeaderTitle('reelType'),
      key: 'reelType',
      width: 120,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(resolveReelType(a.reelType), resolveReelType(b.reelType)),
      render: (row) => {
        const reelType = resolveReelType(row.reelType)
        return h(
          NTag,
          { type: getReelTypeTagType(reelType), size: 'small' },
          { default: () => reelType },
        )
      },
    }
  }
  if (key === 'currentLocationCode') {
    return {
      title: buildHeaderTitle('currentLocationCode'),
      key: 'currentLocationCode',
      minWidth: 180,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(a.currentLocationCode, b.currentLocationCode),
      render: (row) => row.currentLocationCode ?? '-',
    }
  }
  if (key === 'currentZoneCode') {
    return {
      title: buildHeaderTitle('currentZoneCode'),
      key: 'currentZoneCode',
      minWidth: 160,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(a.currentZoneCode, b.currentZoneCode),
      render: (row) => row.currentZoneCode ?? '-',
    }
  }
  if (key === 'currentWarehouseCode') {
    return {
      title: buildHeaderTitle('currentWarehouseCode'),
      key: 'currentWarehouseCode',
      minWidth: 160,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(a.currentWarehouseCode, b.currentWarehouseCode),
      render: (row) => row.currentWarehouseCode ?? '-',
    }
  }
  if (key === 'selfWeight') {
    return {
      title: buildHeaderTitle('selfWeight'),
      key: 'selfWeight',
      width: 120,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(a.selfWeight, b.selfWeight),
      render: (row) => `${formatWeight(row.selfWeight)} kg`,
    }
  }
  if (key === 'status') {
    return {
      title: buildHeaderTitle('status'),
      key: 'status',
      width: 140,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(resolveStatus(a.status), resolveStatus(b.status)),
      render: (row) => {
        const status = resolveStatus(row.status)
        return h(
          NTag,
          { type: getStatusTagType(status), size: 'small' },
          { default: () => status },
        )
      },
    }
  }
  if (key === 'isLocked') {
    return {
      title: buildHeaderTitle('isLocked'),
      key: 'isLocked',
      width: 100,
      align: 'center',
      titleAlign: 'center',
      sorter: (a, b) => compareSortValue(a.isLocked, b.isLocked),
      render: (row) => {
        const locked = row.isLocked
        return h(
          NTag,
          { type: locked ? 'warning' : 'success', size: 'small' },
          { default: () => (locked ? '是' : '否') },
        )
      },
    }
  }

  return {
    title: buildHeaderTitle(key),
    key,
    minWidth: 160,
    align: 'center',
    titleAlign: 'center',
    sorter: (a, b) => compareSortValue(
      (a as unknown as Record<string, unknown>)[key],
      (b as unknown as Record<string, unknown>)[key],
    ),
    render: (row) => formatCellValue((row as unknown as Record<string, unknown>)[key], key),
  }
}

const columns = computed<DataTableColumns<ReelRow>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => buildColumnByKey(item.key)),
]))

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
          <n-input
            :value="query.reelNo"
            placeholder="请输入盘号"
            clearable
            style="max-width: 260px"
            @update:value="(value) => { query.reelNo = value }"
            @keyup.enter="handleSearch"
          />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="handleSearch">查询</n-button>
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
        :bordered="false"
        :row-key="getRowKey"
        :row-props="(row) => ({ onClick: (event) => toggleSingleRow(row, event) })"
        :checked-row-keys="checkedRowKeys"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      />
      <ReelModal ref="dialogRef" @success="loadData" />
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
        @update:page="(page) => { query.page = page; loadData() }"
        @update:page-size="(size) => { query.pageSize = size; query.page = 1; loadData() }"
      />
    </template>
  </BaseCrudPage>
</template>

<style scoped>
:deep(.crud-table-flat .n-data-table-th),
:deep(.crud-table-flat .n-data-table-td) {
  text-align: center;
}
</style>