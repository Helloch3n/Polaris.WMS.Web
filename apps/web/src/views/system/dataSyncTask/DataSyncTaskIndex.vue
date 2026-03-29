<script lang="ts">
export default {
  name: 'DataSyncTaskList',
}
</script>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NSpace,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'

import * as api from '../../../api/wms/dataSyncTask'
import type { DataSyncTaskDto, CreateUpdateDataSyncTaskDto } from '../../../api/wms/dataSyncTask'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type TaskRow = DataSyncTaskDto

const message = useMessage()
const loading = ref(false)
const rows = ref<TaskRow[]>([])
const togglingIds = ref<Set<string>>(new Set())
const triggeringIds = ref<Set<string>>(new Set())

const query = reactive({
  filter: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const listParams = computed(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  filter: query.filter || undefined,
}))

async function loadData() {
  loading.value = true
  try {
    const data = await api.getList(listParams.value)
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

function onRefresh() {
  query.filter = ''
  query.page = 1
  loadData()
}

function onReset() {
  onRefresh()
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

// ---- 吁切换 ----
async function handleToggle(row: TaskRow, newVal: boolean) {
  togglingIds.value = new Set([...togglingIds.value, row.id])
  try {
    await api.toggleEnable(row.id, newVal)
    message.success(newVal ? '已启用' : '已停用')
    await loadData()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '切换失败')
  } finally {
    const next = new Set(togglingIds.value)
    next.delete(row.id)
    togglingIds.value = next
  }
}

// ---- 立即触发 ----
async function handleTrigger(row: TaskRow) {
  triggeringIds.value = new Set([...triggeringIds.value, row.id])
  try {
    await api.trigger(row.id)
    message.success('已加入执行队列')
    await loadData()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '触发失败')
  } finally {
    const next = new Set(triggeringIds.value)
    next.delete(row.id)
    triggeringIds.value = next
  }
}

// ---- 鐘舵€佹槧灏?----
function resolveSyncStatus(raw?: number | string): string {
  if (raw === 0 || raw === 'Idle') return 'Idle'
  if (raw === 1 || raw === 'Running') return 'Running'
  if (raw === 2 || raw === 'Success') return 'Success'
  if (raw === 3 || raw === 'Failed') return 'Failed'
  return 'Idle'
}

function getSyncStatusLabel(s: string) {
  if (s === 'Running') return '执行中'
  if (s === 'Success') return '成功'
  if (s === 'Failed') return '失败'
  return '空闲'
}

function getSyncStatusTagType(s: string): 'default' | 'info' | 'success' | 'error' {
  if (s === 'Running') return 'info'
  if (s === 'Success') return 'success'
  if (s === 'Failed') return 'error'
  return 'default'
}

function formatDateTime(v?: string | null) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'data-sync-task-column-settings-v1',
  preferredKeys: ['taskName', 'cronExpression', 'isEnabled', 'lastSyncTime', 'lastSyncStatus', 'lastSyncMessage'],
  resolveTitle: (key) => {
    if (key === 'taskName') return '任务名称'
    if (key === 'cronExpression') return '执行频率'
    if (key === 'isEnabled') return '启用'
    if (key === 'lastSyncTime') return '上次执行时间'
    if (key === 'lastSyncStatus') return '上次状态'
    if (key === 'lastSyncMessage') return '日志/信息'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<TaskRow>[number]> = {
  taskName: {
    title: createDraggableTitle('taskName', '任务名称'),
    key: 'taskName',
    minWidth: 220,
    sorter: (a, b) => compareSortValue(a.taskName, b.taskName),
    render: (row) =>
      h('div', [
        h('span', row.taskName),
        h('span', { style: 'color: #999; font-size: 12px; margin-left: 6px' }, `(${row.taskCode})`),
      ]),
  },
  cronExpression: {
    title: createDraggableTitle('cronExpression', '执行频率'),
    key: 'cronExpression',
    width: 160,
    sorter: (a, b) => compareSortValue(a.cronExpression, b.cronExpression),
    render: (row) =>
      h('code', { style: 'font-size: 12px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px' }, row.cronExpression),
  },
  isEnabled: {
    title: createDraggableTitle('isEnabled', '启用'),
    key: 'isEnabled',
    width: 100,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isEnabled, b.isEnabled),
    render: (row) =>
      h(NPopconfirm, {
        onPositiveClick: () => handleToggle(row, !row.isEnabled),
      }, {
        trigger: () =>
          h(NSwitch, {
            value: row.isEnabled,
            loading: togglingIds.value.has(row.id),
            rubberBand: false,
          }),
        default: () => row.isEnabled ? '停用该任务？' : '启用该任务？',
      }),
  },
  lastSyncTime: {
    title: createDraggableTitle('lastSyncTime', '上次执行时间'),
    key: 'lastSyncTime',
    width: 185,
    sorter: (a, b) => compareSortValue(a.lastSyncTime, b.lastSyncTime),
    render: (row) => formatDateTime(row.lastSyncTime),
  },
  lastSyncStatus: {
    title: createDraggableTitle('lastSyncStatus', '上次状态'),
    key: 'lastSyncStatus',
    width: 110,
    align: 'center',
    sorter: (a, b) => compareSortValue(resolveSyncStatus(a.lastSyncStatus), resolveSyncStatus(b.lastSyncStatus)),
    render: (row) => {
      const s = resolveSyncStatus(row.lastSyncStatus)
      return h(NTag, { type: getSyncStatusTagType(s), size: 'small' }, { default: () => getSyncStatusLabel(s) })
    },
  },
  lastSyncMessage: {
    title: createDraggableTitle('lastSyncMessage', '日志/信息'),
    key: 'lastSyncMessage',
    minWidth: 200,
    ellipsis: { tooltip: true },
    sorter: (a, b) => compareSortValue(a.lastSyncMessage, b.lastSyncMessage),
    render: (row) => row.lastSyncMessage ?? '-',
  },
}

// ---- 列定义 ----
const columns = computed<DataTableColumns<TaskRow>>(() => withResizable([
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<TaskRow>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 220,
    align: 'center',
    render: (row) =>
      h(NSpace, { size: 6, justify: 'center' }, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              type: 'success',
              quaternary: true,
              loading: triggeringIds.value.has(row.id),
              onClick: () => handleTrigger(row),
            },
            { default: () => '立即触发' },
          ),
          h(
            NButton,
            { size: 'small', type: 'primary', quaternary: true, onClick: () => openEdit(row) },
            { default: () => '编辑' },
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: async () => {
                await api.remove(row.id)
                message.success('删除成功')
                await loadData()
              },
            },
            {
              trigger: () =>
                h(NButton, { size: 'small', type: 'error', quaternary: true }, { default: () => '删除' }),
              default: () => '确认删除该同步任务吗？',
            },
          ),
        ],
      }),
  },
]))

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const submitting = ref(false)

const form = reactive<CreateUpdateDataSyncTaskDto>({
  taskCode: '',
  taskName: '',
  cronExpression: '',
  isEnabled: true,
})

const rules: FormRules = {
  taskCode: [{ required: true, message: '请输入任务编码', trigger: ['input', 'blur'] }],
  taskName: [{ required: true, message: '请输入任务名称', trigger: ['input', 'blur'] }],
  cronExpression: [{ required: true, message: '请输入 Cron 表达式', trigger: ['input', 'blur'] }],
}

function openCreate() {
  dialogMode.value = 'create'
  editingId.value = null
  Object.assign(form, { taskCode: '', taskName: '', cronExpression: '', isEnabled: true })
  dialogVisible.value = true
}

function openEdit(row: TaskRow) {
  dialogMode.value = 'edit'
  editingId.value = row.id
  Object.assign(form, {
    taskCode: row.taskCode,
    taskName: row.taskName,
    cronExpression: row.cronExpression,
    isEnabled: row.isEnabled,
  })
  dialogVisible.value = true
}

async function onSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (dialogMode.value === 'edit' && editingId.value) {
      await api.update(editingId.value, { ...form })
      message.success('更新成功')
    } else {
      await api.create({ ...form })
      message.success('创建成功')
    }
    dialogVisible.value = false
    await loadData()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadColumnSettings()
  loadData()
})
</script>

<template>
  <div>
    <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input
            :value="query.filter"
            placeholder="请输入任务名称"
            clearable
            style="max-width: 260px"
            @update:value="(value) => (query.filter = value)"
            @keyup.enter="onQuery"
          />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button :loading="loading" @click="onReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button type="primary" @click="openCreate">新增</n-button>
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
        size="small"
        striped
      />
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

    <n-modal :show="dialogVisible" @update:show="(value) => (dialogVisible = value)">
      <n-card
        :title="dialogMode === 'create' ? '新增同步任务' : '编辑同步任务'"
        style="width: 560px"
        closable
        @close="dialogVisible = false"
      >
        <n-form ref="formRef" :model="form" :rules="rules" label-width="110">
          <n-form-item label="任务编码" path="taskCode">
            <n-input :value="form.taskCode" :disabled="dialogMode === 'edit'" placeholder="全局唯一编码" @update:value="(value) => (form.taskCode = value)" />
          </n-form-item>
          <n-form-item label="任务名称" path="taskName">
            <n-input :value="form.taskName" placeholder="例：同步 ERP 物料" @update:value="(value) => (form.taskName = value)" />
          </n-form-item>
          <n-form-item label="Cron 表达式" path="cronExpression">
            <div style="width: 100%">
              <n-input :value="form.cronExpression" placeholder="0 0 * * * ?" @update:value="(value) => (form.cronExpression = value)" />
              <span style="color: #999; font-size: 12px">例: 0 0 * * * ? 代表每小时执行一次</span>
            </div>
          </n-form-item>
          <n-form-item label="启用">
            <n-switch :value="form.isEnabled" @update:value="(value) => (form.isEnabled = value)" />
          </n-form-item>
        </n-form>

        <template #footer>
          <div class="modal-actions">
            <n-button @click="dialogVisible = false">取消</n-button>
            <n-button type="primary" :loading="submitting" @click="onSubmit">保存</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>