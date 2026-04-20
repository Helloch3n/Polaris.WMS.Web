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
  NPagination,
  NPopconfirm,
  NSelect,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import * as pickTaskApi from '../../api/wms/pickTask'
import type { PickTaskDto } from '../../api/wms/pickTask'
import TableColumnManager from '../../components/TableColumnManager.vue'
import { withResizable } from '../../utils/table'
import BaseCrudPage from '../../components/BaseCrudPage.vue'
import { useColumnConfig } from '../../composables/useColumnConfig'
import { compareSortValue } from '../../utils/tableColumn'

type TaskRow = PickTaskDto

const message = useMessage()
const loading = ref(false)
const rows = ref<TaskRow[]>([])
const completingIds = ref<Set<string>>(new Set())

const query = reactive({
  containerNo: '',
  status: 'Pending' as string | null,
  page: 1,
  pageSize: 10,
  total: 0,
})

const statusOptions: SelectOption[] = [
  { label: '全部', value: null as unknown as string },
  { label: '待执行', value: 'Pending' },
  { label: '执行中', value: 'InProgress' },
  { label: '已完成', value: 'Completed' },
  { label: '已取消', value: 'Cancelled' },
]

const listParams = computed<pickTaskApi.GetPickTaskListParams>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  containerNo: query.containerNo.trim() || undefined,
  status: query.status ?? undefined,
}))

async function loadData() {
  loading.value = true
  try {
    const data = await pickTaskApi.getList(listParams.value)
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
  query.containerNo = ''
  query.status = 'Pending'
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

async function handleComplete(row: TaskRow) {
  const id = row.id
  completingIds.value = new Set([...completingIds.value, id])
  try {
    await pickTaskApi.complete(id)
    message.success(`盘号 ${row.containerNo} 拣货完成`)
    await loadData()
  } catch {
    // 全局拦截器已弹出 ABP 业务错，处无重提示
  } finally {
    const next = new Set(completingIds.value)
    next.delete(id)
    completingIds.value = next
  }
}

function resolveStatus(raw: string | number): string {
  if (raw === 'Pending' || raw === 0) return 'Pending'
  if (raw === 'InProgress' || raw === 1) return 'InProgress'
  if (raw === 'Completed' || raw === 2) return 'Completed'
  if (raw === 'Cancelled' || raw === 3) return 'Cancelled'
  return String(raw)
}

function getStatusLabel(status: string): string {
  if (status === 'Pending') return '待执行'
  if (status === 'InProgress') return '执行中'
  if (status === 'Completed') return '已完成'
  if (status === 'Cancelled') return '已取消'
  return status
}

function getStatusTagType(status: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (status === 'Pending') return 'warning'
  if (status === 'InProgress') return 'info'
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'default'
  return 'default'
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
  storageKey: 'pick-task-column-settings-v1',
  preferredKeys: ['containerNo', 'fromLocationCode', 'productCode', 'batchNo', 'sn', 'targetLength', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'containerNo') return '盘号'
    if (key === 'fromLocationCode') return '源库位'
    if (key === 'productCode') return '产品编码'
    if (key === 'batchNo') return '批次号'
    if (key === 'sn') return '序列号 SN'
    if (key === 'targetLength') return '目标长度'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<TaskRow>[number]> = {
  containerNo: {
    title: createDraggableTitle('containerNo', '盘号'),
    key: 'containerNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.containerNo, b.containerNo),
    render: (row) => row.containerNo || '-',
  },
  fromLocationCode: {
    title: createDraggableTitle('fromLocationCode', '源库位'),
    key: 'fromLocationCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.fromLocationCode, b.fromLocationCode),
    render: (row) => row.fromLocationCode || '-',
  },
  productCode: {
    title: createDraggableTitle('productCode', '产品编码'),
    key: 'productCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.productCode, b.productCode),
    render: (row) => row.productCode || '-',
  },
  batchNo: {
    title: createDraggableTitle('batchNo', '批次号'),
    key: 'batchNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.batchNo, b.batchNo),
    render: (row) => row.batchNo || '-',
  },
  sn: {
    title: createDraggableTitle('sn', '序列号 SN'),
    key: 'sn',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.sn, b.sn),
    render: (row) => (row.sn ? h(NTag, { type: 'primary', size: 'small' }, { default: () => row.sn }) : '-'),
  },
  targetLength: {
    title: createDraggableTitle('targetLength', '目标长度'),
    key: 'targetLength',
    minWidth: 140,
    align: 'right',
    sorter: (a, b) => compareSortValue(a.targetLength, b.targetLength),
    render: (row) => `${row.targetLength ?? 0} 米`,
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(getStatusLabel(resolveStatus(a.status)), getStatusLabel(resolveStatus(b.status))),
    render: (row) => {
      const status = resolveStatus(row.status)
      return h(
        NTag,
        { type: getStatusTagType(status), size: 'small' },
        { default: () => getStatusLabel(status) },
      )
    },
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
        const status = resolveStatus(row.status)
        const canComplete = status === 'Pending' || status === 'InProgress'
        if (!canComplete) return h('span', { style: 'color: #ccc' }, '-')

        return h(
          NPopconfirm,
          { onPositiveClick: () => handleComplete(row) },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  type: 'primary',
                  loading: completingIds.value.has(row.id),
                },
                { default: () => '完成拣货' },
              ),
            default: () => `确认盘号 ${row.containerNo} 已完成分配拣货？`,
          },
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
            :value="query.containerNo"
            placeholder="请输入盘号"
            clearable
            style="width: 220px"
            @update:value="(value) => (query.containerNo = value)"
            @keyup.enter="onQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.status"
            :options="statusOptions"
            clearable
            placeholder="请选择状态"
            style="width: 160px"
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
</template>

<style scoped>
</style>