<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { DataTableSortState } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { getList as getWarehouseList, type WarehouseDto } from '../../../api/masterData/warehouse'
import {
  ZoneType,
  getList as getZoneList,
  create,
  update,
  remove,
  type ZonePagedQueryDto,
  type ZoneDto,
  type CreateUpdateZoneDto,
} from '../../../api/masterData/zone'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const list = ref<ZoneDto[]>([])

const permissionCodes = {
  create: 'MasterData.Zone.Create',
  update: 'MasterData.Zone.Update',
  delete: 'MasterData.Zone.Delete',
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
const selectedWarehouseId = ref<string | null>(null)

async function loadWarehouses() {
  const res = await getWarehouseList()
  warehouses.value = res.items ?? []
  const first = warehouses.value[0]
  if (first && !selectedWarehouseId.value) {
    selectedWarehouseId.value = first.id
  }
}

const zoneTypeMap: Record<number, string> = {
  [ZoneType.Dock]: '收货暂存区 (地面暂存)',
  [ZoneType.Storage]: '正式存储区 (钢平台/货场)',
  [ZoneType.LineSide]: '生产线边库 (车间暂存)',
  [ZoneType.QC]: '质检/隔离区',
  [ZoneType.Outbound]: '发货暂存区',
}

const query = reactive({
  zoneCode: '',
  zoneName: '',
  warehouseCode: '',
  warehouseName: '',
  page: 1,
  pageSize: 10,
  sorting: '',
  total: 0,
})

const listParams = computed<ZonePagedQueryDto>(() => ({
  skipCount: (query.page - 1) * query.pageSize,
  maxResultCount: query.pageSize,
  sorting: query.sorting || undefined,
  zoneCode: query.zoneCode || undefined,
  zoneName: query.zoneName || undefined,
  warehouseCode: query.warehouseCode || undefined,
  warehouseName: query.warehouseName || undefined,
}))

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const form = ref<Omit<CreateUpdateZoneDto, 'warehouseId'>>({ code: '', name: '', zoneType: ZoneType.Storage })

const rules: FormRules = {
  code: [{ required: true, message: '请输入库区编码', trigger: ['input', 'blur'] }],
  name: [{ required: true, message: '请输入库区名称', trigger: ['input', 'blur'] }],
  zoneType: [{ required: true, type: 'number', message: '请选择类型', trigger: ['change'] }],
}

const zoneTypeOptions = [
  { label: '收货暂存区 (地面暂存)', value: ZoneType.Dock },
  { label: '正式存储区 (钢平台/货场)', value: ZoneType.Storage },
  { label: '生产线边库 (车间暂存)', value: ZoneType.LineSide },
  { label: '质检/隔离区', value: ZoneType.QC },
  { label: '发货暂存区', value: ZoneType.Outbound },
]

function getRowKey(row: ZoneDto) {
  return row.id ?? row.code
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
    const res = await getZoneList(listParams.value)
    list.value = res.items ?? []
    syncCheckedRowKeys()
    query.total = res.totalCount ?? 0
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.page = 1
  fetchList()
}

function handleReset() {
  query.zoneCode = ''
  query.zoneName = ''
  query.warehouseCode = ''
  query.warehouseName = ''
  query.sorting = ''
  query.page = 1
  fetchList()
}

function handlePageChange(page: number) {
  query.page = page
  fetchList()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  fetchList()
}

function handleSortChange(s: DataTableSortState | DataTableSortState[] | null) {
  query.sorting = toSorting(s)
  query.page = 1
  fetchList()
}

function toSorting(s: DataTableSortState | DataTableSortState[] | null): string {
  const state = Array.isArray(s) ? s[0] : s
  if (!state?.columnKey || !state.order) return ''
  return `${String(state.columnKey)} ${state.order === 'descend' ? 'DESC' : 'ASC'}`
}

async function handleCreate() {
  if (!selectedWarehouseId.value) {
    message.warning('请先选择一个仓库')
    return
  }
  dialogMode.value = 'create'
  editId.value = null
  form.value = { code: '', name: '', zoneType: ZoneType.Storage }
  dialogVisible.value = true
}

function handleEdit(row: ZoneDto) {
  dialogMode.value = 'edit'
  editId.value = row.id!
  form.value = { code: row.code, name: row.name, zoneType: row.zoneType }
  dialogVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  const payload: CreateUpdateZoneDto = {
    ...form.value,
    warehouseId: selectedWarehouseId.value!,
  }
  if (dialogMode.value === 'edit' && editId.value) {
    await update(editId.value, payload)
    message.success('更新成功')
  } else {
    await create(payload)
    message.success('创建成功')
  }
  dialogVisible.value = false
  await fetchList()
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
    await Promise.all(ids.map((id) => remove(id)))
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
  const content = ids.length === 1 ? '确定删除选中库区吗？' : `确定删除选中的 ${ids.length} 条库区吗？`
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

function getWarehouseName() {
  const wh = warehouses.value.find((w) => w.id === selectedWarehouseId.value)
  return wh ? `${wh.code} - ${wh.name}` : ''
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'zone-column-settings-v1',
  preferredKeys: ['code', 'name', 'zoneType'],
  resolveTitle: (key) => {
    if (key === 'code') return '库区编码'
    if (key === 'name') return '库区名称'
    if (key === 'zoneType') return '类型'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<ZoneDto>[number]> = {
  code: { title: createDraggableTitle('code', '库区编码'), key: 'code', minWidth: 140, sorter: 'default' },
  name: { title: createDraggableTitle('name', '库区名称'), key: 'name', minWidth: 160, sorter: 'default' },
  zoneType: {
    title: createDraggableTitle('zoneType', '类型'),
    key: 'zoneType',
    width: 120,
    align: 'center',
    sorter: 'default',
    render: (row) => h(NTag, { size: 'small' }, { default: () => zoneTypeMap[row.zoneType] ?? '-' }),
  },
}

const columns = computed<DataTableColumns<ZoneDto>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<ZoneDto>[number] => Boolean(item)),
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
  await loadWarehouses()
  await fetchList()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input
            :value="query.zoneCode"
            placeholder="请输入库区编码"
            clearable
            @update:value="(value) => { query.zoneCode = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.zoneName"
            placeholder="请输入库区名称"
            clearable
            @update:value="(value) => { query.zoneName = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.warehouseCode"
            placeholder="请输入仓库编码"
            clearable
            @update:value="(value) => { query.warehouseCode = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.warehouseName"
            placeholder="请输入仓库名称"
            clearable
            @update:value="(value) => { query.warehouseName = value }"
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
        :row-props="(row) => ({ onClick: (event) => toggleSingleRow(row, event) })"
        :checked-row-keys="checkedRowKeys"
        @update:sorter="handleSortChange"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      />

      <n-modal :show="dialogVisible" @update:show="(value) => { dialogVisible = value }">
        <n-card
          :title="dialogMode === 'create' ? '新建库区' : '编辑库区'"
          style="width: 560px"
          closable
          @close="dialogVisible = false"
        >
          <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="80">
            <n-form-item label="所属仓库">
              <n-input :value="getWarehouseName()" readonly />
            </n-form-item>
            <n-form-item label="编码" path="code">
              <n-input :value="form.code" placeholder="如: WH01-存储区01" @update:value="(value) => { form.code = value }" />
            </n-form-item>
            <n-form-item label="名称" path="name">
              <n-input :value="form.name" placeholder="如: A区" @update:value="(value) => { form.name = value }" />
            </n-form-item>
            <n-form-item label="类型" path="zoneType">
              <n-select :value="form.zoneType" :options="zoneTypeOptions" placeholder="请选择类型" @update:value="(value) => { form.zoneType = value }" />
            </n-form-item>
          </n-form>
          <template #action>
            <n-space justify="end">
              <n-button @click="dialogVisible = false">取消</n-button>
              <n-button type="primary" @click="handleSubmit">确定</n-button>
            </n-space>
          </template>
        </n-card>
      </n-modal>
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
