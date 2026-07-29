<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { DataTableSortState } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, SelectOption } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { usePermission } from '../../../composables/usePermission'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { getList as getZoneList } from '../../../api/masterData/zone'
import { getProductList, getProduct } from '../../../api/masterData/product'
import { MoveTaskType } from '../../../api/taskRouting/moveTask'
import {
  getList as getStrategyList,
  create as createStrategy,
  update as updateStrategy,
  remove as removeStrategy,
  type RoutingStrategyDto,
  type CreateRoutingStrategyDto,
  type UpdateRoutingStrategyDto,
  type RoutingStrategySearchDto,
} from '../../../api/taskRouting/routingStrategy'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const list = ref<RoutingStrategyDto[]>([])

const { hasPermission } = usePermission()

const canCreate = computed(() => hasPermission('WMS.InternalOps.RoutingStrategies.Create'))
const canUpdate = computed(() => hasPermission('WMS.InternalOps.RoutingStrategies.Update'))
const canDelete = computed(() => hasPermission('WMS.InternalOps.RoutingStrategies.Delete'))

const taskTypeMap: Record<number, string> = {
  [MoveTaskType.Putaway]: '入库上架',
  [MoveTaskType.MoveToQc]: '移库送检',
  [MoveTaskType.InternalMove]: '库内理货',
  [MoveTaskType.PickDown]: '拣货下架',
}

const taskTypeOptions = [
  { label: '入库上架', value: MoveTaskType.Putaway },
  { label: '移库送检', value: MoveTaskType.MoveToQc },
  { label: '库内理货', value: MoveTaskType.InternalMove },
  { label: '拣货下架', value: MoveTaskType.PickDown },
]

const activeOptions = [
  { label: '全部', value: null },
  { label: '启用', value: true },
  { label: '禁用', value: false },
] as any

const zoneOptions = ref<SelectOption[]>([])
const zoneMap = ref<Record<string, string>>({})

const productOptions = ref<SelectOption[]>([])
const productMap = ref<Record<string, string>>({})
const productLoading = ref(false)

const query = reactive({
  filter: '',
  taskType: null as number | null,
  isActive: null as any,
  page: 1,
  pageSize: 10,
  sorting: '',
  total: 0,
})

const listParams = computed<RoutingStrategySearchDto>(() => ({
  skipCount: (query.page - 1) * query.pageSize,
  maxResultCount: query.pageSize,
  sorting: query.sorting || undefined,
  taskType: query.taskType !== null ? query.taskType : undefined,
  isActive: query.isActive !== null ? query.isActive : undefined,
}))

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)

const form = ref<CreateRoutingStrategyDto>({
  ruleName: '',
  priority: 10,
  taskType: MoveTaskType.MoveToQc,
  isActive: true,
  sourceZoneId: undefined,
  productCategoryId: undefined,
  productId: undefined,
  targetZoneId: '',
})

const rules: FormRules = {
  ruleName: [{ required: true, message: '请输入规则名称', trigger: ['input', 'blur'] }],
  priority: [{ required: true, type: 'number', message: '请输入规则优先级', trigger: ['input', 'blur'] }],
  taskType: [{ required: true, type: 'number', message: '请选择移动任务类型', trigger: ['change'] }],
  targetZoneId: [{ required: true, message: '请选择目标库区', trigger: ['change'] }],
}

function getRowKey(row: RoutingStrategyDto) {
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
} = useTableSelection(list, getRowKey)

async function loadZones() {
  try {
    const res = await getZoneList({ maxResultCount: 1000 })
    const items = res.items ?? []
    zoneOptions.value = items.map((z) => ({
      label: z.code ? `${z.code} - ${z.name}` : z.name,
      value: z.id,
    }))
    const map: Record<string, string> = {}
    for (const z of items) {
      map[z.id] = z.code ? `${z.code} - ${z.name}` : z.name
    }
    zoneMap.value = map
  } catch (e) {
    message.error('加载库区列表失败')
  }
}

async function loadProductOptions(keyword?: string) {
  productLoading.value = true
  try {
    const res = await getProductList({
      maxResultCount: 50,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    })
    productOptions.value = (res.items ?? []).map((p) => ({
      label: p.code ? `${p.code} - ${p.name}` : p.name,
      value: p.id!,
    }))
    for (const p of res.items ?? []) {
      productMap.value[p.id!] = p.code ? `${p.code} - ${p.name}` : p.name
    }
  } catch (e) {
    message.error('加载物料列表失败')
  } finally {
    productLoading.value = false
  }
}

async function resolveProducts(productIds: string[]) {
  const missingIds = productIds.filter((id) => id && !productMap.value[id])
  if (missingIds.length === 0) return

  await Promise.all(
    missingIds.map(async (id) => {
      try {
        const p = await getProduct(id)
        productMap.value[id] = p.code ? `${p.code} - ${p.name}` : p.name
      } catch {
        productMap.value[id] = '未知物料'
      }
    }),
  )
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getStrategyList(listParams.value)
    list.value = res.items ?? []
    syncCheckedRowKeys()
    query.total = res.totalCount ?? 0

    // 逆向解析物料名称
    const productIds = (res.items ?? [])
      .map((x) => x.productId)
      .filter((id): id is string => Boolean(id))
    await resolveProducts(productIds)
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.page = 1
  fetchList()
}

function handleReset() {
  query.taskType = null
  query.isActive = null
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

function handleCreate() {
  dialogMode.value = 'create'
  editId.value = null
  form.value = {
    ruleName: '',
    priority: 10,
    taskType: MoveTaskType.MoveToQc,
    isActive: true,
    sourceZoneId: undefined,
    productCategoryId: undefined,
    productId: undefined,
    targetZoneId: '',
  }
  dialogVisible.value = true
}

async function handleEdit(row: RoutingStrategyDto) {
  dialogMode.value = 'edit'
  editId.value = row.id
  form.value = {
    ruleName: row.ruleName,
    priority: row.priority,
    taskType: row.taskType,
    isActive: row.isActive,
    sourceZoneId: row.sourceZoneId || undefined,
    productCategoryId: row.productCategoryId || undefined,
    productId: row.productId || undefined,
    targetZoneId: row.targetZoneId,
  }
  if (row.productId && !productMap.value[row.productId]) {
    await resolveProducts([row.productId])
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  const payload: CreateRoutingStrategyDto = {
    ...form.value,
    sourceZoneId: form.value.sourceZoneId || undefined,
    productId: form.value.productId || undefined,
  }

  loading.value = true
  try {
    if (dialogMode.value === 'edit' && editId.value) {
      await updateStrategy(editId.value, payload as UpdateRoutingStrategyDto)
      message.success('更新成功')
    } else {
      await createStrategy(payload)
      message.success('创建成功')
    }
    dialogVisible.value = false
    await fetchList()
  } finally {
    loading.value = false
  }
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
    await Promise.all(ids.map((id) => removeStrategy(id)))
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
  const content = ids.length === 1 ? '确定删除选中路由规则吗？' : `确定删除选中的 ${ids.length} 条路由规则吗？`
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

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'routing-strategy-column-settings-v1',
  preferredKeys: ['ruleName', 'priority', 'taskType', 'isActive', 'sourceZoneId', 'targetZoneId', 'productId'],
  resolveTitle: (key) => {
    if (key === 'ruleName') return '规则名称'
    if (key === 'priority') return '优先级'
    if (key === 'taskType') return '任务类型'
    if (key === 'isActive') return '启用状态'
    if (key === 'sourceZoneId') return '源库区'
    if (key === 'targetZoneId') return '目标库区'
    if (key === 'productId') return '关联物料'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RoutingStrategyDto>[number]> = {
  ruleName: { title: createDraggableTitle('ruleName', '规则名称'), key: 'ruleName', minWidth: 160, sorter: 'default' },
  priority: { title: createDraggableTitle('priority', '优先级'), key: 'priority', width: 90, align: 'center', sorter: 'default' },
  taskType: {
    title: createDraggableTitle('taskType', '任务类型'),
    key: 'taskType',
    width: 120,
    align: 'center',
    sorter: 'default',
    render: (row) => taskTypeMap[row.taskType as number] ?? '-',
  },
  isActive: {
    title: createDraggableTitle('isActive', '状态'),
    key: 'isActive',
    width: 100,
    align: 'center',
    sorter: 'default',
    render: (row) =>
      h(
        WmsStatusTag,
        { size: 'small', type: row.isActive ? 'success' : 'error' },
        { default: () => (row.isActive ? '已启用' : '已禁用') },
      ),
  },
  sourceZoneId: {
    title: createDraggableTitle('sourceZoneId', '源库区'),
    key: 'sourceZoneId',
    minWidth: 160,
    render: (row) => (row.sourceZoneId ? (zoneMap.value[row.sourceZoneId] ?? row.sourceZoneId) : '任意库区'),
  },
  targetZoneId: {
    title: createDraggableTitle('targetZoneId', '目标库区'),
    key: 'targetZoneId',
    minWidth: 160,
    render: (row) => zoneMap.value[row.targetZoneId] ?? row.targetZoneId,
  },
  productId: {
    title: createDraggableTitle('productId', '关联物料'),
    key: 'productId',
    minWidth: 180,
    render: (row) => (row.productId ? (productMap.value[row.productId] ?? row.productId) : '所有物料'),
  },
}

const columns = computed<DataTableColumns<RoutingStrategyDto>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<RoutingStrategyDto>[number] => Boolean(item)),
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
  await Promise.all([loadZones(), loadProductOptions()])
  await fetchList()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-select
            :value="query.taskType"
            :options="taskTypeOptions"
            placeholder="任务类型"
            clearable
            style="width: 180px"
            @update:value="(value) => { query.taskType = value; handleQuery() }"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.isActive"
            :options="activeOptions"
            placeholder="启用状态"
            clearable
            style="width: 140px"
            @update:value="(value) => { query.isActive = value; handleQuery() }"
          />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button :loading="loading" @click="handleQuery">查询</n-button>
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
          :title="dialogMode === 'create' ? '新建路由规则' : '编辑路由规则'"
          style="width: var(--modal-width-md)"
          closable
          @close="dialogVisible = false"
        >
          <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="100">
            <n-form-item label="规则名称" path="ruleName">
              <n-input :value="form.ruleName" placeholder="如: 生产入库默认送检" @update:value="(value) => { form.ruleName = value }" />
            </n-form-item>
            <n-form-item label="优先级" path="priority">
              <n-input-number :value="form.priority" :min="1" :max="9999" placeholder="数字越小越优先" @update:value="(value) => { form.priority = value || 10 }" style="width: 100%" />
            </n-form-item>
            <n-form-item label="任务类型" path="taskType">
              <n-select :value="form.taskType" :options="taskTypeOptions" placeholder="请选择移动任务类型" @update:value="(value) => { form.taskType = value }" />
            </n-form-item>
            <n-form-item label="源库区" path="sourceZoneId">
              <n-select :value="form.sourceZoneId" :options="zoneOptions" clearable placeholder="可选，留空代表所有库区" @update:value="(value) => { form.sourceZoneId = value }" />
            </n-form-item>
            <n-form-item label="目标库区" path="targetZoneId">
              <n-select :value="form.targetZoneId" :options="zoneOptions" placeholder="匹配后搬运的目标目的库区" @update:value="(value) => { form.targetZoneId = value }" />
            </n-form-item>
            <n-form-item label="关联物料" path="productId">
              <n-select
                :value="form.productId"
                :options="productOptions"
                clearable
                filterable
                placeholder="可选，留空代表所有物料"
                :loading="productLoading"
                @search="loadProductOptions"
                @update:value="(value) => { form.productId = value }"
              />
            </n-form-item>
            <n-form-item label="启用状态" path="isActive">
              <n-switch :value="form.isActive" @update:value="(value) => { form.isActive = value }" />
            </n-form-item>
          </n-form>
          <template #action>
            <n-space justify="end">
              <n-button @click="dialogVisible = false">取消</n-button>
              <n-button type="primary" :loading="loading" @click="handleSubmit">确定</n-button>
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
