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
  NModal,
  NSelect,
useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, SelectOption } from 'naive-ui'

import * as PutawayService from '../../../api/putaway/putaway'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type AvailableContainerRow = PutawayService.AvailableContainerDto

type TaskRow = PutawayService.PutawayTaskDto

const message = useMessage()
const dialog = useDialog()
const route = useRoute()

const activeTab = ref<'source' | 'tasks' | 'all'>('source')

const sourceLoading = ref(false)
const sourceRows = ref<AvailableContainerRow[]>([])

const taskLoading = ref(false)
const taskRows = ref<TaskRow[]>([])

const sourceSelection = useTableSelection(sourceRows, (row) => row.containerNo)
const taskSelection = useTableSelection(taskRows, (row) => row.id)
const selectedSource = computed(
  () => sourceSelection.selectedCount.value === 1 ? sourceSelection.selectedRows.value[0] : undefined,
)
const selectedTask = computed(
  () => taskSelection.selectedCount.value === 1 ? taskSelection.selectedRows.value[0] : undefined,
)
const selectedCount = computed(() =>
  activeTab.value === 'source'
    ? sourceSelection.selectedCount.value
    : taskSelection.selectedCount.value,
)

function getSourceRowKey(row: AvailableContainerRow) {
  return row.containerNo
}

function getTaskRowKey(row: TaskRow) {
  return row.id
}

const canCompleteSelected = computed(() => {
  if (!selectedTask.value) return false
  const status = getStatus(selectedTask.value.status)
  return status === 'Pending' || status === 'InProgress'
})

function clearCurrentSelection() {
  if (activeTab.value === 'source') {
    sourceSelection.clearSelection()
  } else {
    taskSelection.clearSelection()
  }
}
const taskStatusOptions = computed<SelectOption[]>(() => {
  if (activeTab.value === 'tasks') {
    return [
      { label: '全部', value: null as unknown as string },
      { label: '待执行', value: 'Pending' },
      { label: '执行中', value: 'InProgress' },
    ]
  }
  return [
    { label: '全部', value: null as unknown as string },
    { label: '待执行', value: 'Pending' },
    { label: '执行中', value: 'InProgress' },
    { label: '已完成', value: 'Completed' },
    { label: '已取消', value: 'Cancelled' },
  ]
})

const taskQuery = reactive({
  taskNo: '',
  containerNo: '',
  status: null as string | null,
  page: 1,
  pageSize: 10,
  total: 0,
})

const sourceColumnConfig = useColumnConfig({
  storageKey: 'putaway-source-column-settings-v1',
  preferredKeys: ['containerNo', 'displayProductName', 'locationCode', 'displayQuantity'],
  resolveTitle: (key) => {
    if (key === 'containerNo') return '盘号'
    if (key === 'displayProductName') return '物料名称'
    if (key === 'locationCode') return '当前位置'
    if (key === 'displayQuantity') return '数量'
    return key
  },
})

const taskColumnConfig = useColumnConfig({
  storageKey: 'putaway-task-column-settings-v1',
  preferredKeys: ['taskNo', 'containerNo', 'fromLocationCode', 'toLocationCode', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'taskNo') return '任务号'
    if (key === 'containerNo') return '盘号'
    if (key === 'fromLocationCode') return '源库位'
    if (key === 'toLocationCode') return '目标库位'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const completeModalVisible = ref(false)
const completeSubmitting = ref(false)
const completeFormRef = ref<FormInst | null>(null)
const completeForm = reactive({
  taskId: '',
  taskNo: '',
  containerNo: '',
  targetLocationCode: '',
})

const completeRules: FormRules = {
  targetLocationCode: [{ required: true, message: '请扫描输入目标库位', trigger: ['input', 'blur'] }],
}

function getStatus(raw: unknown) {
  if (raw === 0) return 'Pending'
  if (raw === 1) return 'InProgress'
  if (raw === 2) return 'Completed'
  if (raw === 3) return 'Cancelled'
  return typeof raw === 'string' ? raw : 'Pending'
}
function getStatusText(status: string) {
  if (status === 'Pending') return '待执行'
  if (status === 'InProgress') return '执行中'
  if (status === 'Completed') return '已完成'
  if (status === 'Cancelled') return '已取消'
  return status
}
function getStatusType(status: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (status === 'Pending') return 'warning'
  if (status === 'InProgress') return 'info'
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'default'
  return 'default'
}
function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function parseDisplayQuantity(v: unknown): { quantity?: number; unit?: string } {
  const text = typeof v === 'string' ? v.trim() : ''
  if (!text) return {}
  const m = text.match(/^(-?\d+(?:\.\d+)?)\s*(\S+)?$/)
  if (!m) return {}
  const n = Number(m[1])
  return { quantity: Number.isFinite(n) ? n : undefined, unit: m[2] }
}

async function loadSource() {
  sourceLoading.value = true
  try {
    const res = await PutawayService.getAvailableContainers({
    })
    sourceRows.value = res.items ?? []
    sourceSelection.syncCheckedRowKeys()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载待上架资源失败')
  } finally {
    sourceLoading.value = false
  }
}

async function createTask(row: AvailableContainerRow) {
  const containerNo = row.containerNo
  if (!containerNo) {
    message.error('盘号为空，无法生成任务')
    return
  }

  dialog.warning({
    title: '确认',
    content: `确认生成盘号 ${containerNo} 的上架任务吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await PutawayService.create({
          containerNo,
        })
        message.success('任务生成成功')
        await Promise.all([loadSource(), loadTasks()])
      } catch (e) {
        message.error(e instanceof Error ? e.message : '生成任务失败')
      }
    },
  })
}

async function loadTasks() {
  taskLoading.value = true
  try {
    let statuses: string[] | undefined = undefined
    if (activeTab.value === 'tasks') {
      if (!taskQuery.status) {
        statuses = ['Pending', 'InProgress']
      }
    }
    const res = await PutawayService.getList({
      skipCount: (taskQuery.page - 1) * taskQuery.pageSize,
      maxResultCount: taskQuery.pageSize,
      status: taskQuery.status || undefined,
      statuses,
      taskNo: taskQuery.taskNo.trim() || undefined,
      containerNo: taskQuery.containerNo.trim() || undefined,
    })
    taskRows.value = res.items ?? []
    taskSelection.syncCheckedRowKeys()
    taskQuery.total = res.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载任务失败')
  } finally {
    taskLoading.value = false
  }
}

function openCompleteModal(row: TaskRow) {
  completeForm.taskId = row.id ?? ''
  completeForm.taskNo = row.taskNo ?? ''
  completeForm.containerNo = row.containerNo ?? ''
  completeForm.targetLocationCode = ''
  completeModalVisible.value = true
}

async function onConfirmComplete() {
  try {
    await completeFormRef.value?.validate()
  } catch {
    return
  }

  completeSubmitting.value = true
  try {
    const taskId = completeForm.taskId.trim()
    if (!taskId) {
      message.error('缺少任务 ID，无法完成')
      return
    }
    await PutawayService.complete(taskId, {
      targetLocationCode: completeForm.targetLocationCode.trim(),
    })
    message.success('上架完成')
    completeModalVisible.value = false
    await Promise.all([loadTasks(), loadSource()])
  } catch (e) {
    message.error(e instanceof Error ? e.message : '完成上架失败')
  } finally {
    completeSubmitting.value = false
  }
}

function onQuerySource() {
  loadSource()
}

function onResetSource() {
  loadSource()
}

function onRefreshTasks() {
  taskQuery.page = 1
  loadTasks()
}

function onQueryTasks() {
  taskQuery.page = 1
  loadTasks()
}

function onResetTasks() {
  taskQuery.taskNo = ''
  taskQuery.containerNo = ''
  taskQuery.status = null
  taskQuery.page = 1
  loadTasks()
}

function handleTaskPageChange(page: number) {
  taskQuery.page = page
  loadTasks()
}

function handleTaskPageSizeChange(size: number) {
  taskQuery.pageSize = size
  taskQuery.page = 1
  loadTasks()
}

function onTabChange(name: string) {
  activeTab.value = name as 'source' | 'tasks' | 'all'
  if (activeTab.value !== 'source') {
    taskQuery.page = 1
    if (activeTab.value === 'tasks') {
      if (taskQuery.status && taskQuery.status !== 'Pending' && taskQuery.status !== 'InProgress') {
        taskQuery.status = null
      }
    }
    loadTasks()
  } else {
    loadSource()
  }
}

function switchTab(tab: 'source' | 'tasks' | 'all') {
  if (activeTab.value === tab) return
  clearCurrentSelection()
  onTabChange(tab)
}

const sourceColumnMap: Record<string, DataTableColumns<AvailableContainerRow>[number]> = {
  containerNo: {
    title: sourceColumnConfig.createDraggableTitle('containerNo', '盘号'),
    key: 'containerNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.containerNo, b.containerNo),
    render: (row: AvailableContainerRow) => row.containerNo || '-',
  },
  displayProductName: {
    title: sourceColumnConfig.createDraggableTitle('displayProductName', '物料名称'),
    key: 'displayProductName',
    minWidth: 220,
    sorter: (a, b) => compareSortValue(a.displayProductName, b.displayProductName),
    render: (row: AvailableContainerRow) => row.displayProductName || '-',
  },
  locationCode: {
    title: sourceColumnConfig.createDraggableTitle('locationCode', '当前位置'),
    key: 'locationCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.locationCode, b.locationCode),
    render: (row: AvailableContainerRow) => row.locationCode || '-',
  },
  displayQuantity: {
    title: sourceColumnConfig.createDraggableTitle('displayQuantity', '数量'),
    key: 'displayQuantity',
    width: 140,
    sorter: (a, b) => compareSortValue(a.displayQuantity, b.displayQuantity),
    render: (row: AvailableContainerRow) => {
      const parsed = parseDisplayQuantity(row.displayQuantity)
      return parsed.quantity ?? row.displayQuantity ?? '-'
    },
  },
}

const sourceColumns = computed<DataTableColumns<AvailableContainerRow>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...sourceColumnConfig.columnSettings.value
    .filter((item) => item.visible)
    .map((item) => sourceColumnMap[item.key])
    .filter((item): item is DataTableColumns<AvailableContainerRow>[number] => Boolean(item)),
]))

const taskColumnMap: Record<string, DataTableColumns<TaskRow>[number]> = {
  taskNo: {
    title: taskColumnConfig.createDraggableTitle('taskNo', '任务号'),
    key: 'taskNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.taskNo, b.taskNo),
    render: (row: TaskRow) => row.taskNo || '-',
  },
  containerNo: {
    title: taskColumnConfig.createDraggableTitle('containerNo', '盘号'),
    key: 'containerNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.containerNo, b.containerNo),
    render: (row: TaskRow) => row.containerNo || '-',
  },
  fromLocationCode: {
    title: taskColumnConfig.createDraggableTitle('fromLocationCode', '源库位'),
    key: 'fromLocationCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.fromLocationCode, b.fromLocationCode),
    render: (row: TaskRow) => row.fromLocationCode || '-',
  },
  toLocationCode: {
    title: taskColumnConfig.createDraggableTitle('toLocationCode', '目标库位'),
    key: 'toLocationCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.toLocationCode, b.toLocationCode),
    render: (row: TaskRow) => row.toLocationCode || '-',
  },
  status: {
    title: taskColumnConfig.createDraggableTitle('status', '状态'),
    key: 'status',
    width: 130,
    align: 'center',
    sorter: (a, b) => compareSortValue(getStatusText(getStatus(a.status)), getStatusText(getStatus(b.status))),
    render: (row: TaskRow) => {
      const status = getStatus(row.status)
      return h(
        WmsStatusTag,
        { type: getStatusType(status), size: 'small' },
        { default: () => getStatusText(status) },
      )
    },
  },
  creationTime: {
    title: taskColumnConfig.createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row: TaskRow) => formatDateTime(row.creationTime),
  },
}

const taskColumns = computed<DataTableColumns<TaskRow>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...taskColumnConfig.columnSettings.value
    .filter((item) => item.visible)
    .map((item) => taskColumnMap[item.key])
    .filter((item): item is DataTableColumns<TaskRow>[number] => Boolean(item)),
]))

function handleSourceColumnConfigShowChange(value: boolean) {
  sourceColumnConfig.showColumnConfig.value = value
}

function handleTaskColumnConfigShowChange(value: boolean) {
  taskColumnConfig.showColumnConfig.value = value
}

function handleSourceColumnVisibleChange(key: string, visible: boolean) {
  if (!sourceColumnConfig.handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

function handleTaskColumnVisibleChange(key: string, visible: boolean) {
  if (!taskColumnConfig.handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

onMounted(async () => {
  sourceColumnConfig.loadColumnSettings()
  taskColumnConfig.loadColumnSettings()
  const tab = route.query.tab
  const status = route.query.status
  if ((tab === 'tasks' || tab === 'all') && typeof status === 'string') {
    activeTab.value = tab
    taskQuery.status = status
    await loadTasks()
    return
  }
  await loadSource()
})
</script>

<template>
  <BaseCrudPage :selected-count="selectedCount" @clear-selection="clearCurrentSelection">
    <template #search>
      <n-form inline class="crud-search-form" @submit.prevent="onQueryTasks">
        <template v-if="activeTab === 'source'">
          <n-form-item class="crud-page-spacer" />
          <n-form-item>
            <n-button :loading="sourceLoading" @click="onQuerySource">查询</n-button>
          </n-form-item>
          <n-form-item>
            <n-button :loading="sourceLoading" @click="onResetSource">重置</n-button>
          </n-form-item>
        </template>
        <template v-else>
          <n-form-item>
            <n-input
              :value="taskQuery.taskNo"
              clearable
              placeholder="任务号"
              @update:value="(value) => (taskQuery.taskNo = value)"
              @keyup.enter="onQueryTasks"
            />
          </n-form-item>
          <n-form-item>
            <n-input
              :value="taskQuery.containerNo"
              clearable
              placeholder="盘号"
              @update:value="(value) => (taskQuery.containerNo = value)"
              @keyup.enter="onQueryTasks"
            />
          </n-form-item>
          <n-form-item>
            <n-select
              :value="taskQuery.status"
              :options="taskStatusOptions"
              clearable
              placeholder="状态"
              style="width: 160px"
              @update:value="(value) => { taskQuery.status = value; onRefreshTasks() }"
            />
          </n-form-item>
          <n-form-item class="crud-page-spacer" />
          <n-form-item>
            <n-button :loading="taskLoading" @click="onQueryTasks">查询</n-button>
          </n-form-item>
          <n-form-item>
            <n-button :disabled="taskLoading" @click="onResetTasks">重置</n-button>
          </n-form-item>
        </template>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button :type="activeTab === 'source' ? 'primary' : 'default'" @click="switchTab('source')">待上架资源</n-button>
        <n-button :type="activeTab === 'tasks' ? 'primary' : 'default'" @click="switchTab('tasks')">执行任务</n-button>
        <n-button :type="activeTab === 'all' ? 'primary' : 'default'" @click="switchTab('all')">全部</n-button>
        <n-button
          v-if="activeTab === 'source'"
          type="primary"
          :disabled="!selectedSource"
          @click="selectedSource && createTask(selectedSource)"
        >
          生成任务
        </n-button>
        <n-button
          v-else
          type="success"
          :disabled="!canCompleteSelected"
          @click="selectedTask && openCompleteModal(selectedTask)"
        >
          完成上架
        </n-button>
        <n-button
          :loading="activeTab === 'source' ? sourceLoading : taskLoading"
          @click="activeTab === 'source' ? loadSource() : onRefreshTasks()"
        >
          刷新
        </n-button>
      </div>
    </template>

    <template #actions-right>
      <div class="crud-action-tools">
        <TableColumnManager
          v-if="activeTab === 'source'"
          :show="sourceColumnConfig.showColumnConfig.value"
          :settings="sourceColumnConfig.columnSettings.value"
          @update:show="handleSourceColumnConfigShowChange"
          @visible-change="handleSourceColumnVisibleChange"
        />
        <TableColumnManager
          v-else
          :show="taskColumnConfig.showColumnConfig.value"
          :settings="taskColumnConfig.columnSettings.value"
          @update:show="handleTaskColumnConfigShowChange"
          @visible-change="handleTaskColumnVisibleChange"
        />
      </div>
    </template>

    <template #data>
      <n-data-table
        v-if="activeTab === 'source'"
        class="crud-table-flat"
        :loading="sourceLoading"
        :columns="sourceColumns"
        :data="sourceRows"
        :row-key="getSourceRowKey"
        :checked-row-keys="sourceSelection.checkedRowKeys.value"
        :bordered="false"
        :row-props="(row) => ({
          onClick: (event) => sourceSelection.toggleSingleRow(row, event),
        })"
        @update:checked-row-keys="sourceSelection.handleCheckedRowKeysChange"
      />
      <n-data-table
        v-else
        class="crud-table-flat"
        :loading="taskLoading"
        :columns="taskColumns"
        :data="taskRows"
        :row-key="getTaskRowKey"
        :checked-row-keys="taskSelection.checkedRowKeys.value"
        :bordered="false"
        :row-props="(row) => ({
          onClick: (event) => taskSelection.toggleSingleRow(row, event),
        })"
        @update:checked-row-keys="taskSelection.handleCheckedRowKeysChange"
      />
    </template>

    <template #pager-right v-if="activeTab !== 'source'">
      <n-pagination
        :page="taskQuery.page"
        :page-size="taskQuery.pageSize"
        :item-count="taskQuery.total"
        :page-sizes="[10,20,50,100]"
        show-size-picker
        @update:page="handleTaskPageChange"
        @update:page-size="handleTaskPageSizeChange"
      />
    </template>

    <n-modal :show="completeModalVisible" preset="card" title="完成上架" style="width: var(--modal-width-md)" @update:show="(value) => (completeModalVisible = value)">
      <n-form ref="completeFormRef" :model="completeForm" :rules="completeRules" label-width="120">
        <n-form-item>
          <n-input :value="completeForm.taskNo" disabled />
        </n-form-item>
        <n-form-item>
          <n-input :value="completeForm.containerNo" disabled />
        </n-form-item>
        <n-form-item path="targetLocationCode">
          <n-input
            :value="completeForm.targetLocationCode"
            placeholder="请输入目标库位"
            autofocus
            @update:value="(value) => (completeForm.targetLocationCode = value)"
            @keyup.enter="onConfirmComplete"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="modal-actions">
          <n-button @click="completeModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="completeSubmitting" @click="onConfirmComplete">确认</n-button>
        </div>
      </template>
    </n-modal>
  </BaseCrudPage>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
