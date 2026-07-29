<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NSelect,
useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'

import * as moveTaskApi from '../../../api/taskRouting/moveTask'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type RowItem = moveTaskApi.MoveTaskDto

const message = useMessage()
const route = useRoute()
const loading = ref(false)
const rows = ref<RowItem[]>([])

const query = reactive({
  taskNo: '',
  containerCode: '',
  status: null as moveTaskApi.MoveTaskStatus | number | string | null,
  taskType: null as moveTaskApi.MoveTaskType | number | string | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const statusOptions: SelectOption[] = [
  { label: '待执行', value: moveTaskApi.MoveTaskStatus.Pending },
  { label: '执行中', value: moveTaskApi.MoveTaskStatus.InProgress },
  { label: '已完成', value: moveTaskApi.MoveTaskStatus.Completed },
  { label: '已取消', value: moveTaskApi.MoveTaskStatus.Cancelled },
]

const taskTypeOptions: SelectOption[] = [
  { label: '入库上架', value: moveTaskApi.MoveTaskType.Putaway },
  { label: '移库送检', value: moveTaskApi.MoveTaskType.MoveToQc },
  { label: '库内理货', value: moveTaskApi.MoveTaskType.InternalMove },
  { label: '拣货下架', value: moveTaskApi.MoveTaskType.PickDown },
]

const listParams = computed<moveTaskApi.MoveTaskSearchDto>(() => ({
  maxResultCount: pagination.pageSize ?? 10,
  skipCount: ((pagination.page ?? 1) - 1) * (pagination.pageSize ?? 10),
  taskNo: query.taskNo.trim() || undefined,
  containerCode: query.containerCode.trim() || undefined,
  status: query.status ?? undefined,
  taskType: query.taskType ?? undefined,
}))

function normalizeTaskStatusValue(value: moveTaskApi.MoveTaskStatus | number | string | undefined) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'pending' || normalized === '10') return moveTaskApi.MoveTaskStatus.Pending
    if (normalized === 'inprogress' || normalized === '20') return moveTaskApi.MoveTaskStatus.InProgress
    if (normalized === 'completed' || normalized === '30') return moveTaskApi.MoveTaskStatus.Completed
    if (normalized === 'cancelled' || normalized === '40') return moveTaskApi.MoveTaskStatus.Cancelled
  }
  if (typeof value === 'number') {
    return value
  }
  return null
}

function normalizeTaskTypeValue(value: moveTaskApi.MoveTaskType | number | string | undefined) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'putaway' || normalized === '10') return moveTaskApi.MoveTaskType.Putaway
    if (normalized === 'movetoqc' || normalized === '20') return moveTaskApi.MoveTaskType.MoveToQc
    if (normalized === 'internalmove' || normalized === '30') return moveTaskApi.MoveTaskType.InternalMove
    if (normalized === 'pickdown' || normalized === '40') return moveTaskApi.MoveTaskType.PickDown
  }
  if (typeof value === 'number') {
    return value
  }
  return null
}

function resolveTaskStatusLabel(value: moveTaskApi.MoveTaskStatus | number | string | undefined) {
  const normalized = normalizeTaskStatusValue(value)
  if (normalized === moveTaskApi.MoveTaskStatus.Pending) return '待执行'
  if (normalized === moveTaskApi.MoveTaskStatus.InProgress) return '执行中'
  if (normalized === moveTaskApi.MoveTaskStatus.Completed) return '已完成'
  if (normalized === moveTaskApi.MoveTaskStatus.Cancelled) return '已取消'
  return '-'
}

function getTaskStatusTagType(value: moveTaskApi.MoveTaskStatus | number | string | undefined) {
  const normalized = normalizeTaskStatusValue(value)
  if (normalized === moveTaskApi.MoveTaskStatus.Pending) return 'warning'
  if (normalized === moveTaskApi.MoveTaskStatus.InProgress) return 'info'
  if (normalized === moveTaskApi.MoveTaskStatus.Completed) return 'success'
  if (normalized === moveTaskApi.MoveTaskStatus.Cancelled) return 'default'
  return 'default'
}

function resolveTaskTypeLabel(value: moveTaskApi.MoveTaskType | number | string | undefined) {
  const normalized = normalizeTaskTypeValue(value)
  if (normalized === moveTaskApi.MoveTaskType.Putaway) return '入库上架'
  if (normalized === moveTaskApi.MoveTaskType.MoveToQc) return '移库送检'
  if (normalized === moveTaskApi.MoveTaskType.InternalMove) return '库内理货'
  if (normalized === moveTaskApi.MoveTaskType.PickDown) return '拣货下架'
  return '-'
}

function getTaskTypeTagType(value: moveTaskApi.MoveTaskType | number | string | undefined) {
  const normalized = normalizeTaskTypeValue(value)
  if (normalized === moveTaskApi.MoveTaskType.Putaway) return 'success'
  if (normalized === moveTaskApi.MoveTaskType.MoveToQc) return 'warning'
  if (normalized === moveTaskApi.MoveTaskType.InternalMove) return 'info'
  if (normalized === moveTaskApi.MoveTaskType.PickDown) return 'primary'
  return 'default'
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'move-task-column-settings-v1',
  preferredKeys: [
    'taskNo',
    'taskType',
    'status',
    'containerCode',
    'sourceLocationCode',
    'targetLocationCode',
    'creationTime',
  ],
  resolveTitle: (key) => {
    if (key === 'taskNo') return '任务号'
    if (key === 'taskType') return '任务类型'
    if (key === 'status') return '状态'
    if (key === 'containerCode') return '容器编码'
    if (key === 'sourceLocationCode') return '源库位'
    if (key === 'targetLocationCode') return '目标库位'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  taskNo: {
    title: createDraggableTitle('taskNo', '任务号'),
    key: 'taskNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.taskNo, b.taskNo),
    render: (row) => row.taskNo || '-',
  },
  taskType: {
    title: createDraggableTitle('taskType', '任务类型'),
    key: 'taskType',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(normalizeTaskTypeValue(a.taskType), normalizeTaskTypeValue(b.taskType)),
    render: (row) => h(WmsStatusTag, { size: 'small', type: getTaskTypeTagType(row.taskType) }, { default: () => resolveTaskTypeLabel(row.taskType) }),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(normalizeTaskStatusValue(a.status), normalizeTaskStatusValue(b.status)),
    render: (row) => h(WmsStatusTag, { size: 'small', type: getTaskStatusTagType(row.status) }, { default: () => resolveTaskStatusLabel(row.status) }),
  },
  containerCode: {
    title: createDraggableTitle('containerCode', '容器编码'),
    key: 'containerCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.containerCode, b.containerCode),
    render: (row) => row.containerCode || '-',
  },
  sourceLocationCode: {
    title: createDraggableTitle('sourceLocationCode', '源库位'),
    key: 'sourceLocationCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.sourceLocationCode, b.sourceLocationCode),
    render: (row) => row.sourceLocationCode || '-',
  },
  targetLocationCode: {
    title: createDraggableTitle('targetLocationCode', '目标库位'),
    key: 'targetLocationCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.targetLocationCode, b.targetLocationCode),
    render: (row) => row.targetLocationCode || '-',
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<RowItem>>(() => withResizable(
  columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item)),
))

async function loadData() {
  loading.value = true
  try {
    const data = await moveTaskApi.getList(listParams.value)
    rows.value = data.items ?? []
    pagination.itemCount = data.totalCount ?? 0
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载搬运任务列表失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  query.taskNo = ''
  query.containerCode = ''
  query.status = null
  query.taskType = null
  pagination.page = 1
  loadData()
}

function handlePageChange(page: number) {
  pagination.page = page
  loadData()
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

onMounted(() => {
  loadColumnSettings()
  const status = route.query.status
  if (typeof status === 'string') {
    query.status = normalizeTaskStatusValue(status)
  }
  loadData()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form" @submit.prevent="handleQuery">
        <n-form-item>
          <n-input v-model:value="query.taskNo" clearable placeholder="请输入任务号" @keyup.enter="handleQuery" />
        </n-form-item>
        <n-form-item>
          <n-input v-model:value="query.containerCode" clearable placeholder="请输入容器编码" @keyup.enter="handleQuery" />
        </n-form-item>
        <n-form-item>
          <n-select v-model:value="query.status" clearable :options="statusOptions" placeholder="请选择状态" style="width: 160px" />
        </n-form-item>
        <n-form-item>
          <n-select v-model:value="query.taskType" clearable :options="taskTypeOptions" placeholder="请选择任务类型" style="width: 160px" />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button :loading="loading" @click="handleQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button :disabled="loading" @click="handleReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-right>
      <n-button :disabled="loading" @click="loadData">刷新</n-button>
      <TableColumnManager v-model:show="showColumnConfig" :settings="columnSettings" @visible-change="handleVisibleChange" />
    </template>

    <template #data>
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="rows" :bordered="false" />
    </template>

    <template #pager-right>
      <n-pagination
        :page="pagination.page"
        :page-size="pagination.pageSize"
        :item-count="pagination.itemCount"
        show-size-picker
        :page-sizes="[10, 20, 50, 100]"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </template>
  </BaseCrudPage>
</template>
