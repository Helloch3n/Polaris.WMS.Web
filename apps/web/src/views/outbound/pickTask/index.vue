<script lang="ts">
export default {
  name: 'PickTaskView',
}
</script>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, SelectOption } from 'naive-ui'
import * as moveTaskApi from '../../../api/taskRouting/moveTask'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { withResizable } from '../../../utils/table'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { compareSortValue } from '../../../utils/tableColumn'

type TaskRow = moveTaskApi.MoveTaskDto

const message = useMessage()
const loading = ref(false)
const rows = ref<TaskRow[]>([])

const query = reactive({
  taskNo: '',
  containerCode: '',
  status: moveTaskApi.MoveTaskStatus.Pending as number | null,
  page: 1,
  pageSize: 10,
  total: 0,
})

const statusOptions: SelectOption[] = [
  { label: '全部', value: null as unknown as number },
  { label: '待执行', value: moveTaskApi.MoveTaskStatus.Pending },
  { label: '执行中', value: moveTaskApi.MoveTaskStatus.InProgress },
  { label: '已完成', value: moveTaskApi.MoveTaskStatus.Completed },
  { label: '已取消', value: moveTaskApi.MoveTaskStatus.Cancelled },
]

const listParams = computed<moveTaskApi.MoveTaskSearchDto>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  taskNo: query.taskNo.trim() || undefined,
  containerCode: query.containerCode.trim() || undefined,
  status: query.status ?? undefined,
  taskType: moveTaskApi.MoveTaskType.PickDown, // Only pick down tasks
}))

const completeVisible = ref(false)
const completing = ref(false)
const completeFormRef = ref<FormInst | null>(null)
const completeForm = reactive({
  taskId: '',
  taskNo: '',
  containerCode: '',
  targetLocationCode: '',
  scannedLocationCode: '',
})

const completeRules: FormRules = {
  scannedLocationCode: [{ required: true, message: '请扫描或输入目标库位', trigger: ['blur', 'input'] }],
}

async function loadData() {
  loading.value = true
  try {
    const data = await moveTaskApi.getList(listParams.value)
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
  query.taskNo = ''
  query.containerCode = ''
  query.status = moveTaskApi.MoveTaskStatus.Pending
  query.page = 1
  loadData()
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

function openCompleteModal(row: TaskRow) {
  completeForm.taskId = row.id
  completeForm.taskNo = row.taskNo
  completeForm.containerCode = row.containerCode
  completeForm.targetLocationCode = row.targetLocationCode
  completeForm.scannedLocationCode = row.targetLocationCode // Autofill for convenience
  completeVisible.value = true
}

async function submitComplete() {
  try {
    await completeFormRef.value?.validate()
  } catch {
    return
  }
  
  completing.value = true
  try {
    await moveTaskApi.complete({
      taskId: completeForm.taskId,
      scannedLocationCode: completeForm.scannedLocationCode,
    })
    message.success(`任务 ${completeForm.taskNo} 已成功完成`)
    completeVisible.value = false
    loadData()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '完成任务失败')
  } finally {
    completing.value = false
  }
}

function getStatusLabel(status: moveTaskApi.MoveTaskStatus) {
  switch (status) {
    case moveTaskApi.MoveTaskStatus.Pending:
      return '待执行'
    case moveTaskApi.MoveTaskStatus.InProgress:
      return '执行中'
    case moveTaskApi.MoveTaskStatus.Completed:
      return '已完成'
    case moveTaskApi.MoveTaskStatus.Cancelled:
      return '已取消'
    default:
      return String(status)
  }
}

function getStatusTagType(status: moveTaskApi.MoveTaskStatus) {
  switch (status) {
    case moveTaskApi.MoveTaskStatus.Pending:
      return 'warning'
    case moveTaskApi.MoveTaskStatus.InProgress:
      return 'info'
    case moveTaskApi.MoveTaskStatus.Completed:
      return 'success'
    case moveTaskApi.MoveTaskStatus.Cancelled:
      return 'default'
    default:
      return 'default'
  }
}

function formatDateTime(v?: string): string {
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
  storageKey: 'pick-task-column-settings-v2',
  preferredKeys: ['taskNo', 'containerCode', 'sourceLocationCode', 'targetLocationCode', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'taskNo') return '任务单号'
    if (key === 'containerCode') return '盘号/容器'
    if (key === 'sourceLocationCode') return '源库位'
    if (key === 'targetLocationCode') return '目标库位'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<TaskRow>[number]> = {
  taskNo: {
    title: createDraggableTitle('taskNo', '任务单号'),
    key: 'taskNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.taskNo, b.taskNo),
  },
  containerCode: {
    title: createDraggableTitle('containerCode', '盘号/容器'),
    key: 'containerCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.containerCode, b.containerCode),
  },
  sourceLocationCode: {
    title: createDraggableTitle('sourceLocationCode', '源库位'),
    key: 'sourceLocationCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.sourceLocationCode, b.sourceLocationCode),
  },
  targetLocationCode: {
    title: createDraggableTitle('targetLocationCode', '目标库位'),
    key: 'targetLocationCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.targetLocationCode, b.targetLocationCode),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.status, b.status),
    render: (row) => h(NTag, { type: getStatusTagType(row.status), size: 'small' }, { default: () => getStatusLabel(row.status) }),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 185,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<TaskRow>>(() =>
  withResizable([
    ...columnSettings.value
      .filter((item) => item.visible)
      .map((item) => columnMap[item.key])
      .filter((item): item is DataTableColumns<TaskRow>[number] => Boolean(item)),
    {
      title: '操作',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (row) => {
        const canComplete = row.status === moveTaskApi.MoveTaskStatus.Pending || row.status === moveTaskApi.MoveTaskStatus.InProgress
        if (!canComplete) return h('span', { style: 'color: #ccc' }, '-')

        return h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            onClick: () => openCompleteModal(row),
          },
          { default: () => '完成拣货' }
        )
      },
    },
  ]),
)

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
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
            :value="query.taskNo"
            placeholder="请输入任务单号"
            clearable
            style="width: 200px"
            @update:value="(value) => (query.taskNo = value)"
            @keyup.enter="onQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.containerCode"
            placeholder="请输入盘号"
            clearable
            style="width: 200px"
            @update:value="(value) => (query.containerCode = value)"
            @keyup.enter="onQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.status"
            :options="statusOptions"
            clearable
            placeholder="请选择状态"
            style="width: 150px"
            @update:value="(value) => (query.status = value)"
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
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="rows" :bordered="false" />
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

  <!-- Complete Task Modal -->
  <n-modal :show="completeVisible" preset="card" title="确认完成下架拣货" style="width: 480px" @update:show="(value) => (completeVisible = value)">
    <n-form ref="completeFormRef" :model="completeForm" :rules="completeRules" label-width="120">
      <n-form-item label="任务号">
        <n-text strong>{{ completeForm.taskNo }}</n-text>
      </n-form-item>
      <n-form-item label="盘号/载具">
        <n-text strong>{{ completeForm.containerCode }}</n-text>
      </n-form-item>
      <n-form-item label="计划目标暂存位">
        <n-text depth="3">{{ completeForm.targetLocationCode }}</n-text>
      </n-form-item>
      <n-form-item label="实际扫描库位" path="scannedLocationCode">
        <n-input :value="completeForm.scannedLocationCode" placeholder="请扫描或输入实际送达的暂存位编码" @update:value="(val) => (completeForm.scannedLocationCode = val)" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="completeVisible = false">取消</n-button>
        <n-button type="primary" :loading="completing" @click="submitComplete">确定完成</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
</style>