<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSwitch,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { usePermission } from '../../../composables/usePermission'
import { useTableSelection } from '../../../composables/useTableSelection'
import * as customerApi from '../../../api/masterData/customer'
import { resolveBusinessCategory } from '../../../utils/statusTag'

type CustomerRow = customerApi.CustomerDto

const loading = ref(false)
const rows = ref<CustomerRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const message = useMessage()
const dialog = useDialog()
const { hasPermission } = usePermission()
const canCreate = computed(() => hasPermission('WMS.MasterData.Customers.Create'))
const canUpdate = computed(() => hasPermission('WMS.MasterData.Customers.Update'))
const canDelete = computed(() => hasPermission('WMS.MasterData.Customers.Delete'))

const query = reactive({ code: '', name: '', customerType: '', isInsideCompany: undefined as string | undefined })
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const form = reactive<customerApi.CreateUpdateCustomerDto>(emptyForm())

function getRowKey(row: CustomerRow) {
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

const canSelectOne = computed(() => selectedCount.value === 1)

function emptyForm(): customerApi.CreateUpdateCustomerDto {
  return {
    code: '', name: '', shortName: '', customerType: '', taxpayerNumber: '', isInsideCompany: false,
    insideCompanyCode: '', insideCompanyName: '', legalRepresentative: '', contactName: '', phone: '',
    fax: '', email: '', address: '', isEnabled: true, remark: '',
  }
}

const rules: FormRules = {
  code: [{ required: true, message: '请输入客户编码', trigger: ['input', 'blur'] }],
  name: [{ required: true, message: '请输入客户名称', trigger: ['input', 'blur'] }],
  insideCompanyCode: [{ validator: () => !form.isInsideCompany || Boolean(form.insideCompanyCode?.trim()), message: '请输入内部单位编码', trigger: ['input', 'blur'] }],
  insideCompanyName: [{ validator: () => !form.isInsideCompany || Boolean(form.insideCompanyName?.trim()), message: '请输入内部单位名称', trigger: ['input', 'blur'] }],
}

async function loadData() {
  loading.value = true
  try {
    const result = await customerApi.getList({
      skipCount: (page.value - 1) * pageSize.value,
      maxResultCount: pageSize.value,
      code: query.code || undefined,
      name: query.name || undefined,
      customerType: query.customerType || undefined,
      isInsideCompany: query.isInsideCompany === undefined ? undefined : query.isInsideCompany === 'true',
    })
    rows.value = result.items ?? []
    total.value = result.totalCount ?? 0
    syncCheckedRowKeys()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载客户列表失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() { page.value = 1; loadData() }
function handleReset() {
  Object.assign(query, { code: '', name: '', customerType: '', isInsideCompany: undefined })
  handleQuery()
}

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  dialogVisible.value = true
}

async function openEdit(row: CustomerRow) {
  editingId.value = row.id
  try {
    const data = await customerApi.get(row.id)
    Object.assign(form, {
      ...emptyForm(),
      ...data,
      shortName: data.shortName ?? '', customerType: data.customerType ?? '', taxpayerNumber: data.taxpayerNumber ?? '',
      insideCompanyCode: data.insideCompanyCode ?? '', insideCompanyName: data.insideCompanyName ?? '',
      legalRepresentative: data.legalRepresentative ?? '', contactName: data.contactName ?? '', phone: data.phone ?? '',
      fax: data.fax ?? '', email: data.email ?? '', address: data.address ?? '', remark: data.remark ?? '',
    })
    dialogVisible.value = true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载客户详情失败')
  }
}

function handleInsideCompany(value: boolean) {
  form.isInsideCompany = value
  if (!value) {
    form.insideCompanyCode = ''
    form.insideCompanyName = ''
  }
}

async function submit() {
  await formRef.value?.validate()
  loading.value = true
  try {
    if (editingId.value) await customerApi.update(editingId.value, form)
    else await customerApi.create(form)
    message.success(editingId.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存客户失败')
  } finally {
    loading.value = false
  }
}

function confirmDelete(row: CustomerRow) {
  dialog.warning({
    title: '确认删除',
    content: `确认删除客户 ${row.name}（${row.code}）吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await customerApi.remove(row.id)
        message.success('删除成功')
        if (rows.value.length === 1 && page.value > 1) page.value -= 1
        await loadData()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '删除客户失败')
      }
    },
  })
}

function handleEditSelected() {
  const selected = selectedRows.value[0]
  if (!selected) {
    message.warning('请选择一条客户数据进行编辑')
    return
  }
  openEdit(selected)
}

function handleDeleteSelected() {
  const selected = selectedRows.value[0]
  if (!selected) {
    message.warning('请选择一条客户数据进行删除')
    return
  }
  confirmDelete(selected)
}

const columns = computed<DataTableColumns<CustomerRow>>(() => [
  { type: 'selection', fixed: 'left', width: 44 },
  { title: '客户编码', key: 'code', minWidth: 130 },
  { title: '客户名称', key: 'name', minWidth: 180 },
  { title: '简称', key: 'shortName', minWidth: 120 },
  {
    title: '类型',
    key: 'customerType',
    minWidth: 110,
    render: (row) => {
      const meta = resolveBusinessCategory(row.customerType)
      return h(WmsStatusTag, { label: meta.label, type: meta.tagType })
    },
  },
  { title: '联系人', key: 'contactName', minWidth: 100 },
  { title: '电话', key: 'phone', minWidth: 130 },
  { title: '是否启用', key: 'isEnabled', width: 100, render: row => h(WmsStatusTag, { type: row.isEnabled ? 'success' : 'default', size: 'small' }, { default: () => row.isEnabled ? '启用' : '停用' }) },
  { title: '内部单位', key: 'isInsideCompany', width: 100, render: row => h(WmsStatusTag, { type: row.isInsideCompany ? 'info' : 'default', size: 'small' }, { default: () => row.isInsideCompany ? '是' : '否' }) },
])

onMounted(loadData)
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item><n-input v-model:value="query.code" clearable placeholder="客户编码" @keyup.enter="handleQuery" /></n-form-item>
        <n-form-item><n-input v-model:value="query.name" clearable placeholder="客户名称" @keyup.enter="handleQuery" /></n-form-item>
        <n-form-item><n-input v-model:value="query.customerType" clearable placeholder="客户类型" @keyup.enter="handleQuery" /></n-form-item>
        <n-form-item><n-select v-model:value="query.isInsideCompany" clearable placeholder="内部单位" :options="[{ label: '是', value: 'true' }, { label: '否', value: 'false' }]" style="width: 120px" /></n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item><n-button :loading="loading" @click="handleQuery">查询</n-button></n-form-item>
        <n-form-item><n-button @click="handleReset">重置</n-button></n-form-item>
      </n-form>
    </template>
    <template #actions-left>
      <div class="crud-action-main">
        <n-button v-if="canCreate" type="primary" @click="openCreate">新增</n-button>
        <n-button v-if="canUpdate" :disabled="!canSelectOne || loading" @click="handleEditSelected">编辑</n-button>
        <n-button v-if="canDelete" type="error" :disabled="!canSelectOne || loading" @click="handleDeleteSelected">删除</n-button>
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
        :checked-row-keys="checkedRowKeys"
        :row-props="(row) => ({ onClick: (event) => toggleSingleRow(row, event) })"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      />
    </template>
    <template #pager-left>
      <div class="crud-selection-summary">
        <n-tag size="small" type="info">已选 {{ selectedCount }} 条</n-tag>
        <n-button text :disabled="selectedCount === 0" @click="clearSelection">清空选择</n-button>
      </div>
    </template>
    <template #pager-right><n-pagination :page="page" :page-size="pageSize" :item-count="total" :page-sizes="[10, 20, 50, 100]" show-size-picker @update:page="(value) => { page = value; loadData() }" @update:page-size="(value) => { pageSize = value; page = 1; loadData() }" /></template>
  </BaseCrudPage>

  <n-modal :show="dialogVisible" @update:show="value => dialogVisible = value">
    <n-card :title="editingId ? '编辑客户' : '新增客户'" style="width: min(920px, calc(100vw - 32px))" closable @close="dialogVisible = false">
      <n-form ref="formRef" :model="form" :rules="rules" label-width="110">
        <n-grid :cols="24" :x-gap="16" :y-gap="8">
          <n-grid-item :span="12"><n-form-item label="客户编码" path="code" required><n-input v-model:value="form.code" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="客户名称" path="name" required><n-input v-model:value="form.name" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="客户简称"><n-input v-model:value="form.shortName" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="客户类型"><n-input v-model:value="form.customerType" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="纳税人识别号"><n-input v-model:value="form.taxpayerNumber" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="法定代表人"><n-input v-model:value="form.legalRepresentative" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="是否内部单位"><n-switch :value="form.isInsideCompany" @update:value="handleInsideCompany" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="是否启用"><n-switch v-model:value="form.isEnabled" /></n-form-item></n-grid-item>
          <n-grid-item v-if="form.isInsideCompany" :span="12"><n-form-item label="内部单位编码" path="insideCompanyCode" required><n-input v-model:value="form.insideCompanyCode" /></n-form-item></n-grid-item>
          <n-grid-item v-if="form.isInsideCompany" :span="12"><n-form-item label="内部单位名称" path="insideCompanyName" required><n-input v-model:value="form.insideCompanyName" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="联系人"><n-input v-model:value="form.contactName" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="电话"><n-input v-model:value="form.phone" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="传真"><n-input v-model:value="form.fax" /></n-form-item></n-grid-item>
          <n-grid-item :span="12"><n-form-item label="邮箱"><n-input v-model:value="form.email" /></n-form-item></n-grid-item>
          <n-grid-item :span="24"><n-form-item label="地址"><n-input v-model:value="form.address" /></n-form-item></n-grid-item>
          <n-grid-item :span="24"><n-form-item label="备注"><n-input v-model:value="form.remark" type="textarea" :rows="2" /></n-form-item></n-grid-item>
        </n-grid>
      </n-form>
      <template #footer><div class="modal-actions"><n-button @click="dialogVisible = false">取消</n-button><n-button type="primary" :loading="loading" @click="submit">保存</n-button></div></template>
    </n-card>
  </n-modal>
</template>

<style scoped>
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
</style>
