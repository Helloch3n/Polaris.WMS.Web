<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
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
  NSwitch,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { usePermission } from '../../../composables/usePermission'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProductList,
  updateProduct,
  type GetProductListParams,
  type ProductDto,
  type CreateUpdateProductDto,
} from '../../../api/masterData/product'

type ProductRow = ProductDto & { id?: string }

const loading = ref(false)
const rows = ref<ProductRow[]>([])
const message = useMessage()
const dialog = useDialog()

const { hasPermission } = usePermission()

const canCreate = computed(() => hasPermission('MasterData.Product.Create'))
const canUpdate = computed(() => hasPermission('MasterData.Product.Update'))
const canDelete = computed(() => hasPermission('MasterData.Product.Delete'))

const query = reactive<{
  productCode: string
  productName: string
  page: number
  pageSize: number
  total: number
}>({
  productCode: '',
  productName: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增物料')
const editingId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)

const form = reactive<CreateUpdateProductDto>({
  code: '',
  name: '',
  unit: '',
  auxUnit: '',
  conversionRate: 1,
  isBatchManagementEnabled: false,
  shelfLifeDays: null,
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: ['input', 'blur'] }],
  name: [{ required: true, message: '请输入名称', trigger: ['input', 'blur'] }],
  unit: [{ required: true, message: '请输入单位', trigger: ['input', 'blur'] }],
  auxUnit: [{ required: true, message: '请输入辅助单位', trigger: ['input', 'blur'] }],
  conversionRate: [{ required: true, type: 'number', message: '请输入换算率', trigger: ['input', 'blur'] }],
}

const listParams = computed<GetProductListParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  productCode: query.productCode || undefined,
  productName: query.productName || undefined,
}))

function getRowKey(row: ProductRow) {
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
} = useTableSelection(rows, getRowKey)

async function fetchList() {
  loading.value = true
  try {
    const data = await getProductList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
    query.total = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function onQuery() {
  query.page = 1
  fetchList()
}

function onReset() {
  query.productCode = ''
  query.productName = ''
  onQuery()
}

function onCreate() {
  editingId.value = null
  dialogTitle.value = '新增物料'
  Object.assign(form, {
    code: '',
    name: '',
    unit: '',
    auxUnit: '',
    conversionRate: 1,
    isBatchManagementEnabled: false,
    shelfLifeDays: null,
  })
  dialogVisible.value = true
}

async function onEdit(row: ProductRow) {
  if (!row.id) return
  editingId.value = row.id
  dialogTitle.value = '编辑物料'
  const data = await getProduct(row.id)
  Object.assign(form, {
    code: data.code ?? '',
    name: data.name ?? '',
    unit: data.unit ?? '',
    auxUnit: data.auxUnit ?? '',
    conversionRate: data.conversionRate ?? 1,
    isBatchManagementEnabled: data.isBatchManagementEnabled ?? false,
    shelfLifeDays: data.shelfLifeDays ?? null,
  })
  dialogVisible.value = true
}

async function onSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    if (editingId.value) {
      await updateProduct(editingId.value, form)
      message.success('更新成功')
    } else {
      await createProduct(form)
      message.success('创建成功')
    }
    dialogVisible.value = false
    await fetchList()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
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
  onEdit(selected)
}

async function deleteByIds(ids: string[]) {
  loading.value = true
  try {
    await Promise.all(ids.map((id) => deleteProduct(id)))
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
  const content = ids.length === 1 ? '确定要删除选中的物料吗？' : `确定要删除选中的 ${ids.length} 条物料吗？`
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

function handlePageChange(page: number) {
  query.page = page
  fetchList()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  fetchList()
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'product-column-settings-v1',
  preferredKeys: ['code', 'name', 'unit', 'auxUnit', 'conversionRate', 'shelfLifeDays', 'isBatchManagementEnabled'],
  resolveTitle: (key) => {
    if (key === 'code') return '编码'
    if (key === 'name') return '名称'
    if (key === 'unit') return '单位'
    if (key === 'auxUnit') return '辅助单位'
    if (key === 'conversionRate') return '换算率'
    if (key === 'shelfLifeDays') return '保质期(天)'
    if (key === 'isBatchManagementEnabled') return '是否启用批次'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<ProductRow>[number]> = {
  code: { title: createDraggableTitle('code', '编码'), key: 'code', minWidth: 140, sorter: (a, b) => compareSortValue(a.code, b.code) },
  name: { title: createDraggableTitle('name', '名称'), key: 'name', minWidth: 180, sorter: (a, b) => compareSortValue(a.name, b.name) },
  unit: { title: createDraggableTitle('unit', '单位'), key: 'unit', width: 120, sorter: (a, b) => compareSortValue(a.unit, b.unit) },
  auxUnit: { title: createDraggableTitle('auxUnit', '辅助单位'), key: 'auxUnit', width: 120, sorter: (a, b) => compareSortValue(a.auxUnit, b.auxUnit) },
  conversionRate: {
    title: createDraggableTitle('conversionRate', '换算率'),
    key: 'conversionRate',
    width: 120,
    sorter: (a, b) => compareSortValue(a.conversionRate, b.conversionRate),
    render: (row) => row.conversionRate ?? '-',
  },
  shelfLifeDays: {
    title: createDraggableTitle('shelfLifeDays', '保质期(天)'),
    key: 'shelfLifeDays',
    width: 120,
    sorter: (a, b) => compareSortValue(a.shelfLifeDays, b.shelfLifeDays),
    render: (row) => row.shelfLifeDays ?? '-',
  },
  isBatchManagementEnabled: {
    title: createDraggableTitle('isBatchManagementEnabled', '是否启用批次'),
    key: 'isBatchManagementEnabled',
    width: 160,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isBatchManagementEnabled, b.isBatchManagementEnabled),
    render: (row) =>
      h(
        NTag,
        { type: row.isBatchManagementEnabled ? 'success' : 'default', size: 'small' },
        { default: () => (row.isBatchManagementEnabled ? '是' : '否') },
      ),
  },
}

const columns = computed<DataTableColumns<ProductRow>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<ProductRow>[number] => Boolean(item)),
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
  fetchList()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input
            :value="query.productCode"
            placeholder="请输入物料编码"
            clearable
            style="max-width: 260px"
            @update:value="(value) => { query.productCode = value }"
            @keyup.enter="onQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.productName"
            placeholder="请输入物料名称"
            clearable
            style="max-width: 360px"
            @update:value="(value) => { query.productName = value }"
            @keyup.enter="onQuery"
          />
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

    <template #actions-left>
      <div class="crud-action-main">
        <n-button v-if="canCreate" type="primary" @click="onCreate">新增</n-button>
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

      <n-modal :show="dialogVisible" @update:show="(value) => { dialogVisible = value }">
        <n-card :title="dialogTitle" style="width: var(--modal-width-md)" closable @close="dialogVisible = false">
          <n-form ref="formRef" :model="form" :rules="rules" label-width="100">
            <n-form-item label="编码" path="code">
              <n-input :value="form.code" @update:value="(value) => { form.code = value }" />
            </n-form-item>
            <n-form-item label="名称" path="name">
              <n-input :value="form.name" @update:value="(value) => { form.name = value }" />
            </n-form-item>
            <n-form-item label="单位" path="unit">
              <n-input :value="form.unit" @update:value="(value) => { form.unit = value }" />
            </n-form-item>
            <n-form-item label="辅助单位" path="auxUnit">
              <n-input :value="form.auxUnit" @update:value="(value) => { form.auxUnit = value }" />
            </n-form-item>
            <n-form-item label="换算率" path="conversionRate">
              <n-input-number :value="form.conversionRate" :min="0" :step="0.0001" @update:value="(value) => { form.conversionRate = value ?? 1 }" />
            </n-form-item>
            <n-form-item label="保质期(天)" path="shelfLifeDays">
              <n-input-number :value="form.shelfLifeDays" :min="0" :step="1" @update:value="(value) => { form.shelfLifeDays = value }" />
            </n-form-item>
            <n-form-item label="启用批次">
              <n-switch :value="form.isBatchManagementEnabled" @update:value="(value) => { form.isBatchManagementEnabled = value }" />
            </n-form-item>
          </n-form>

          <template #footer>
            <div class="modal-actions">
              <n-button @click="dialogVisible = false">取消</n-button>
              <n-button type="primary" :loading="loading" @click="onSubmit">保存</n-button>
            </div>
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
        :page-sizes="[10, 20, 50, 100]"
        show-size-picker
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </template>
  </BaseCrudPage>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
