<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import SupplierForm from './components/SupplierForm.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { usePermission } from '../../../composables/usePermission'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'
import {
  getList,
  get,
  create,
  update,
  remove,
  type GetSupplierListParams,
  type SupplierDto,
  type CreateUpdateSupplierDto,
} from '../../../api/masterData/supplier'

type SupplierRow = SupplierDto & { id?: string }

const loading = ref(false)
const rows = ref<SupplierRow[]>([])
const message = useMessage()
const dialog = useDialog()

const { hasPermission } = usePermission()

const canCreate = computed(() => hasPermission('MasterData.Supplier.Create'))
const canUpdate = computed(() => hasPermission('MasterData.Supplier.Update'))
const canDelete = computed(() => hasPermission('MasterData.Supplier.Delete'))

const query = reactive({
  supplierCode: '',
  supplierName: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增供应商')
const editingId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)

const form = reactive<CreateUpdateSupplierDto>({
  code: '',
  name: '',
  contactPerson: '',
  mobile: '',
  email: '',
  address: '',
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: ['input', 'blur'] }],
  name: [{ required: true, message: '请输入名称', trigger: ['input', 'blur'] }],
}

const listParams = computed<GetSupplierListParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  supplierCode: query.supplierCode || undefined,
  supplierName: query.supplierName || undefined,
}))

function getRowKey(row: SupplierRow) {
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
    const data = await getList(listParams.value)
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
  query.supplierCode = ''
  query.supplierName = ''
  onQuery()
}

function onCreate() {
  editingId.value = null
  dialogTitle.value = '新增供应商'
  Object.assign(form, { code: '', name: '', contactPerson: '', mobile: '', email: '', address: '' })
  dialogVisible.value = true
}

async function onEdit(row: SupplierRow) {
  if (!row.id) return
  editingId.value = row.id
  dialogTitle.value = '编辑供应商'
  const data = await get(row.id)
  Object.assign(form, {
    code: data.code ?? '',
    name: data.name ?? '',
    contactPerson: data.contactPerson ?? '',
    mobile: data.mobile ?? '',
    email: data.email ?? '',
    address: data.address ?? '',
  })
  dialogVisible.value = true
}

async function onSubmit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    if (editingId.value) {
      await update(editingId.value, form)
      message.success('更新成功')
    } else {
      await create(form)
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
  const content = ids.length === 1 ? '确要删除中的供应商吗？' : `确要删除中?${ids.length} 条供应商吗？`
  dialog.warning({
    title: '提示',
    content,
    positiveText: '确认',
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
  storageKey: 'supplier-column-settings-v1',
  preferredKeys: ['code', 'name', 'contactPerson', 'mobile', 'email', 'address'],
  resolveTitle: (key) => {
    if (key === 'code') return '编号'
    if (key === 'name') return '名称'
    if (key === 'contactPerson') return '联系人'
    if (key === 'mobile') return '电话'
    if (key === 'email') return '邮箱'
    if (key === 'address') return '地址'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<SupplierRow>[number]> = {
  code: { title: createDraggableTitle('code', '编号'), key: 'code', minWidth: 140, sorter: (a, b) => compareSortValue(a.code, b.code) },
  name: { title: createDraggableTitle('name', '名称'), key: 'name', minWidth: 180, sorter: (a, b) => compareSortValue(a.name, b.name) },
  contactPerson: {
    title: createDraggableTitle('contactPerson', '联系人'),
    key: 'contactPerson',
    minWidth: 120,
    sorter: (a, b) => compareSortValue(a.contactPerson, b.contactPerson),
  },
  mobile: { title: createDraggableTitle('mobile', '电话'), key: 'mobile', minWidth: 140, sorter: (a, b) => compareSortValue(a.mobile, b.mobile) },
  email: { title: createDraggableTitle('email', '邮箱'), key: 'email', minWidth: 180, sorter: (a, b) => compareSortValue(a.email, b.email) },
  address: { title: createDraggableTitle('address', '地址'), key: 'address', minWidth: 220, sorter: (a, b) => compareSortValue(a.address, b.address) },
}

const columns = computed<DataTableColumns<SupplierRow>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<SupplierRow>[number] => Boolean(item)),
]))

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个显示字段')
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
            :value="query.supplierCode"
            placeholder="请输入供应商编号"
            clearable
            style="max-width: 200px"
            @update:value="(value) => { query.supplierCode = value }"
            @keyup.enter="onQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.supplierName"
            placeholder="请输入供应商名称"
            clearable
            style="max-width: 260px"
            @update:value="(value) => { query.supplierName = value }"
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
        <n-card :title="dialogTitle" style="width: var(--modal-width-lg)" closable @close="dialogVisible = false">
          <n-form ref="formRef" :model="form" :rules="rules" label-width="100">
            <SupplierForm v-model="form" />
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
