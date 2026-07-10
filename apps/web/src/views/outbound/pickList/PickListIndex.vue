<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NSelect,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'

import * as pickListApi from '../../../api/outbound/pickList'
import * as reviewApi from '../../../api/outbound/review'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

type RowItem = pickListApi.PickListDto

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const releasingId = ref('')
const creatingReviewId = ref('')
const rows = ref<RowItem[]>([])

const query = reactive({
  pickNo: '',
  status: null as pickListApi.PickListStatus | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const statusOptions: SelectOption[] = [
  { label: '新创建', value: pickListApi.PickListStatus.Created },
  { label: '任务已下发', value: pickListApi.PickListStatus.TaskCreated },
  { label: '拣货中', value: pickListApi.PickListStatus.Picking },
  { label: '已拣货', value: pickListApi.PickListStatus.Picked },
  { label: '已取消', value: pickListApi.PickListStatus.Cancelled },
]

const listParams = computed<pickListApi.PickListSearchDto>(() => ({
  maxResultCount: pagination.pageSize ?? 10,
  skipCount: ((pagination.page ?? 1) - 1) * (pagination.pageSize ?? 10),
  pickNo: query.pickNo.trim() || undefined,
  status: query.status ?? undefined,
}))

function getRowKey(row: RowItem) {
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

const canViewDetail = computed(() => selectedCount.value === 1)
const canReleaseSelected = computed(() => selectedRows.value.length === 1 && selectedRows.value[0]?.status === pickListApi.PickListStatus.Created)
const canCreateReviewSelected = computed(() => selectedRows.value.length === 1 && selectedRows.value[0]?.status === pickListApi.PickListStatus.Picked)

function getStatusLabel(status: number) {
  switch (status) {
    case pickListApi.PickListStatus.Created:
      return '新创建'
    case pickListApi.PickListStatus.TaskCreated:
      return '任务已下发'
    case pickListApi.PickListStatus.Picking:
      return '拣货中'
    case pickListApi.PickListStatus.Picked:
      return '已拣货'
    case pickListApi.PickListStatus.Cancelled:
      return '已取消'
    default:
      return String(status)
  }
}

function getStatusTagType(status: number) {
  switch (status) {
    case pickListApi.PickListStatus.Created:
      return 'info'
    case pickListApi.PickListStatus.TaskCreated:
      return 'warning'
    case pickListApi.PickListStatus.Picking:
      return 'primary'
    case pickListApi.PickListStatus.Picked:
      return 'success'
    case pickListApi.PickListStatus.Cancelled:
      return 'default'
    default:
      return 'default'
  }
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
  storageKey: 'pick-list-column-settings-v2',
  preferredKeys: [
    'pickNo',
    'targetLocationCode',
    'status',
    'detailCount',
    'creationTime',
  ],
  resolveTitle: (key) => {
    if (key === 'pickNo') return '拣货单号'
    if (key === 'targetLocationCode') return '暂存库位'
    if (key === 'status') return '状态'
    if (key === 'detailCount') return '明细数'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  pickNo: {
    title: createDraggableTitle('pickNo', '拣货单号'),
    key: 'pickNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.pickNo, b.pickNo),
  },
  targetLocationCode: {
    title: createDraggableTitle('targetLocationCode', '暂存库位'),
    key: 'targetLocationCode',
    minWidth: 140,
    render: (row) => row.targetLocationCode || '-',
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.status, b.status),
    render: (row) => h(NTag, { size: 'small', type: getStatusTagType(row.status) }, { default: () => getStatusLabel(row.status) }),
  },
  detailCount: {
    title: createDraggableTitle('detailCount', '明细数'),
    key: 'detailCount',
    width: 100,
    align: 'right',
    render: (row) => row.lines?.length ?? 0,
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<RowItem>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 260,
    align: 'center',
    fixed: 'right',
    render: (row) => {
      const rowReleasing = releasingId.value === row.id
      const rowReviewing = creatingReviewId.value === row.id
      return h('div', { style: 'display: flex; gap: 8px; justify-content: center;' }, [
        h(
          NButton,
          {
            size: 'small',
            type: 'info',
            quaternary: true,
            onClick: () => handleView(row),
          },
          { default: () => '详情' },
        ),
        row.status === pickListApi.PickListStatus.Created
          ? h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                quaternary: true,
                disabled: Boolean(releasingId.value),
                loading: rowReleasing,
                onClick: () => handleRelease(row),
              },
              { default: () => '释放' },
            )
          : null,
        row.status === pickListApi.PickListStatus.Picked
          ? h(
              NButton,
              {
                size: 'small',
                type: 'warning',
                quaternary: true,
                disabled: Boolean(creatingReviewId.value),
                loading: rowReviewing,
                onClick: () => handleCreateReview(row),
              },
              { default: () => '创建复核' },
            )
          : null,
      ])
    },
  },
]))

async function loadData() {
  loading.value = true
  try {
    const data = await pickListApi.getList(listParams.value)
    rows.value = data.items ?? []
    pagination.itemCount = data.totalCount ?? 0
    syncCheckedRowKeys()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载拣货单列表失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  query.pickNo = ''
  query.status = null
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

function handleView(row: RowItem) {
  if (!row.id) {
    message.error('缺少拣货单 Id，无法查看详情')
    return
  }
  router.push({ name: 'PickListDetail', params: { id: row.id } })
}

function handleViewSelected() {
  const row = selectedRows.value[0]
  if (!row) {
    message.warning('请选择一条拣货单')
    return
  }
  handleView(row)
}

function handleRelease(row: RowItem) {
  if (!row.id) {
    message.error('缺少拣货单 Id，无法释放')
    return
  }

  if (row.status !== pickListApi.PickListStatus.Created) {
    message.warning('当前拣货单状态不允许释放')
    return
  }

  dialog.warning({
    title: '确认释放',
    content: `确认释放拣货单 ${row.pickNo || ''} 吗？释放后将生成下架搬运任务。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      releasingId.value = row.id
      try {
        await pickListApi.release(row.id)
        message.success('拣货单释放成功')
        await loadData()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '释放拣货单失败')
      } finally {
        releasingId.value = ''
      }
    },
  })
}

function handleReleaseSelected() {
  const row = selectedRows.value[0]
  if (!row) {
    message.warning('请选择一条拣货单')
    return
  }
  handleRelease(row)
}

async function handleCreateReview(row: RowItem) {
  dialog.warning({
    title: '创建出库复核单',
    content: `确认针对拣货单 ${row.pickNo} 创建出库复核单吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      creatingReviewId.value = row.id
      try {
        await reviewApi.create({
          pickListId: row.id
        })
        message.success('创建出库复核单成功')
        await loadData()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '创建复核单失败')
      } finally {
        creatingReviewId.value = ''
      }
    }
  })
}

function handleCreateReviewSelected() {
  const row = selectedRows.value[0]
  if (!row) {
    message.warning('请选择一条拣货单')
    return
  }
  handleCreateReview(row)
}

onMounted(() => {
  loadColumnSettings()
  loadData()
})
</script>

<template>
  <BaseCrudPage :selected-count="selectedCount" @clear-selection="clearSelection">
    <template #search>
      <n-form inline class="crud-search-form" @submit.prevent="handleQuery">
        <n-form-item>
          <n-input v-model:value="query.pickNo" clearable placeholder="请输入拣货单号" @keyup.enter="handleQuery" />
        </n-form-item>
        <n-form-item>
          <n-select v-model:value="query.status" clearable :options="statusOptions" placeholder="请选择状态" style="width: 160px" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="handleQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button :disabled="loading" @click="handleReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <n-button :disabled="!canViewDetail" @click="handleViewSelected">查看详情</n-button>
      <n-button type="primary" ghost :disabled="!canReleaseSelected || Boolean(releasingId)" :loading="Boolean(releasingId) && canReleaseSelected" @click="handleReleaseSelected">
        释放
      </n-button>
      <n-button type="warning" ghost :disabled="!canCreateReviewSelected || Boolean(creatingReviewId)" :loading="Boolean(creatingReviewId) && canCreateReviewSelected" @click="handleCreateReviewSelected">
        创建复核
      </n-button>
    </template>

    <template #actions-right>
      <n-button :disabled="loading" @click="loadData">刷新</n-button>
      <TableColumnManager v-model:show="showColumnConfig" :settings="columnSettings" @visible-change="handleVisibleChange" />
    </template>

    <template #data>
      <n-data-table
        class="crud-table-flat"
        :loading="loading"
        :columns="columns"
        :data="rows"
        :bordered="false"
        :checked-row-keys="checkedRowKeys"
        :row-key="getRowKey"
        @update:checked-row-keys="handleCheckedRowKeysChange"
        @row-click="toggleSingleRow"
      />
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