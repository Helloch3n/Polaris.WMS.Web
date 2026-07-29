<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onActivated, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NDatePicker,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'
import * as reviewApi from '../../../api/outbound/review'
import * as handoverApi from '../../../api/outbound/handover'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const operating = ref(false)
const hasLoadedOnce = ref(false)
const reviews = ref<reviewApi.OutboundReviewOrderDto[]>([])
const handoverModalVisible = ref(false)

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})
const searchForm = reactive({
  reviewNo: '',
  pickListNo: '',
  status: null as number | null,
})
const handoverForm = reactive({
  carrierCode: '',
  carrierName: '',
  driverName: '',
  driverPhone: '',
  vehicleNo: '',
  logisticsNo: '',
  plannedDepartureTime: null as number | null,
  remark: '',
})

const {
  checkedRowKeys,
  selectedRows,
  selectedCount,
  handleCheckedRowKeysChange,
  syncCheckedRowKeys,
  toggleSingleRow,
  clearSelection,
} = useTableSelection(reviews, row => row.id)

const selectedReview = computed(() => selectedRows.value.length === 1 ? selectedRows.value[0] ?? null : null)
const canStart = computed(() => selectedReview.value?.status === reviewApi.OutboundReviewStatus.Created)
const canComplete = computed(() => {
  const row = selectedReview.value
  return row?.status === reviewApi.OutboundReviewStatus.Reviewing
    && row.reviewedLineCount === row.totalLineCount
    && row.exceptionLineCount === 0
})
const canReopen = computed(() => selectedReview.value?.status === reviewApi.OutboundReviewStatus.Completed)
const canCancel = computed(() => ([
  reviewApi.OutboundReviewStatus.Created,
  reviewApi.OutboundReviewStatus.Reviewing,
  reviewApi.OutboundReviewStatus.Exception,
] as number[]).includes(Number(selectedReview.value?.status)))
const canCreateHandover = computed(() => {
  if (selectedRows.value.length === 0) return false
  const warehouseId = selectedRows.value[0]?.warehouseId
  return selectedRows.value.every(row =>
    row.status === reviewApi.OutboundReviewStatus.Completed && row.warehouseId === warehouseId,
  )
})

const statusOptions: SelectOption[] = [
  { label: '待复核', value: reviewApi.OutboundReviewStatus.Created },
  { label: '复核中', value: reviewApi.OutboundReviewStatus.Reviewing },
  { label: '存在异常', value: reviewApi.OutboundReviewStatus.Exception },
  { label: '已完成', value: reviewApi.OutboundReviewStatus.Completed },
  { label: '已取消', value: reviewApi.OutboundReviewStatus.Cancelled },
]

function statusLabel(status: number) {
  return statusOptions.find(item => item.value === status)?.label ?? String(status)
}

function statusType(status: number) {
  if (status === reviewApi.OutboundReviewStatus.Created) return 'warning' as const
  if (status === reviewApi.OutboundReviewStatus.Reviewing) return 'info' as const
  if (status === reviewApi.OutboundReviewStatus.Exception) return 'error' as const
  if (status === reviewApi.OutboundReviewStatus.Completed) return 'success' as const
  return 'default' as const
}

function date(value?: string | null) {
  if (!value) return '-'
  const result = new Date(value)
  return Number.isNaN(result.getTime()) ? value : result.toLocaleString('zh-CN', { hour12: false })
}

function progress(row: reviewApi.OutboundReviewOrderDto) {
  return `${row.reviewedLineCount} / ${row.totalLineCount}`
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'outbound-review-column-settings-v3',
  preferredKeys: [
    'reviewNo', 'pickListNo', 'waveOrderNo', 'warehouseName',
    'progress', 'exceptionLineCount', 'status', 'creationTime',
  ],
  resolveTitle: key => ({
    reviewNo: '复核单号',
    pickListNo: '拣货单号',
    waveOrderNo: '波次号',
    warehouseName: '仓库',
    progress: '复核进度',
    exceptionLineCount: '异常行',
    status: '状态',
    creationTime: '创建时间',
  }[key] ?? key),
})

const columnMap: Record<string, DataTableColumns<reviewApi.OutboundReviewOrderDto>[number]> = {
  reviewNo: {
    title: createDraggableTitle('reviewNo', '复核单号'),
    key: 'reviewNo',
    minWidth: 170,
    sorter: (a, b) => compareSortValue(a.reviewNo, b.reviewNo),
  },
  pickListNo: {
    title: createDraggableTitle('pickListNo', '拣货单号'),
    key: 'pickListNo',
    minWidth: 170,
    render: row => row.pickListNo || '-',
  },
  waveOrderNo: {
    title: createDraggableTitle('waveOrderNo', '波次号'),
    key: 'waveOrderNo',
    minWidth: 170,
    render: row => row.waveOrderNo || '-',
  },
  warehouseName: {
    title: createDraggableTitle('warehouseName', '仓库'),
    key: 'warehouseName',
    minWidth: 170,
    render: row => `${row.warehouseName || '-'} / ${row.warehouseCode || '-'}`,
  },
  progress: {
    title: createDraggableTitle('progress', '复核进度'),
    key: 'progress',
    width: 110,
    align: 'center',
    render: row => progress(row),
  },
  exceptionLineCount: {
    title: createDraggableTitle('exceptionLineCount', '异常行'),
    key: 'exceptionLineCount',
    width: 90,
    align: 'center',
    render: row => row.exceptionLineCount
      ? h(NTag, { size: 'small', type: 'error', bordered: false }, { default: () => row.exceptionLineCount })
      : '0',
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 110,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.status, b.status),
    render: row => h(
      WmsStatusTag,
      { size: 'small', type: statusType(row.status), bordered: false },
      { default: () => statusLabel(row.status) },
    ),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    width: 180,
    render: row => date(row.creationTime),
  },
}

const columns = computed<DataTableColumns<reviewApi.OutboundReviewOrderDto>>(() => withResizable([
  { type: 'selection', fixed: 'left', width: 44 },
  ...columnSettings.value
    .filter(item => item.visible)
    .map(item => columnMap[item.key])
    .filter((item): item is DataTableColumns<reviewApi.OutboundReviewOrderDto>[number] => Boolean(item)),
]))

function openDetail(row: reviewApi.OutboundReviewOrderDto) {
  router.push({ name: 'OutboundReviewDetail', params: { id: row.id } })
}

function viewSelected() {
  if (selectedReview.value) openDetail(selectedReview.value)
}

async function startSelected() {
  if (!selectedReview.value) return
  operating.value = true
  try {
    await reviewApi.start(selectedReview.value.id)
    message.success('复核已开始')
    openDetail(selectedReview.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '开始复核失败')
  } finally {
    operating.value = false
  }
}

async function completeSelected() {
  if (!selectedReview.value) return
  operating.value = true
  try {
    await reviewApi.complete(selectedReview.value.id)
    message.success('复核已完成')
    await loadReviews()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '完成复核失败')
  } finally {
    operating.value = false
  }
}

async function reopenSelected() {
  if (!selectedReview.value) return
  operating.value = true
  try {
    await reviewApi.reopen(selectedReview.value.id)
    message.success('复核单已重新打开')
    await loadReviews()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重新打开失败')
  } finally {
    operating.value = false
  }
}

function cancelSelected() {
  if (!selectedReview.value) return
  dialog.warning({
    title: '取消出库复核',
    content: `确认取消 ${selectedReview.value.reviewNo}？取消后可从原拣货单重新创建复核单。`,
    positiveText: '确认取消',
    negativeText: '返回',
    onPositiveClick: async () => {
      operating.value = true
      try {
        await reviewApi.cancel(selectedReview.value!.id)
        message.success('复核单已取消')
        await loadReviews()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '取消复核失败')
      } finally {
        operating.value = false
      }
    },
  })
}

function openHandoverModal() {
  if (!canCreateHandover.value) return
  Object.assign(handoverForm, {
    carrierCode: '',
    carrierName: '',
    driverName: '',
    driverPhone: '',
    vehicleNo: '',
    logisticsNo: '',
    plannedDepartureTime: null,
    remark: '',
  })
  handoverModalVisible.value = true
}

async function createHandover() {
  operating.value = true
  try {
    const result = await handoverApi.create({
      outboundReviewOrderIds: selectedRows.value.map(row => row.id),
      carrierCode: handoverForm.carrierCode || null,
      carrierName: handoverForm.carrierName || null,
      driverName: handoverForm.driverName || null,
      driverPhone: handoverForm.driverPhone || null,
      vehicleNo: handoverForm.vehicleNo || null,
      logisticsNo: handoverForm.logisticsNo || null,
      plannedDepartureTime: handoverForm.plannedDepartureTime
        ? new Date(handoverForm.plannedDepartureTime).toISOString()
        : null,
      remark: handoverForm.remark || null,
    })
    handoverModalVisible.value = false
    message.success('出库交接已创建')
    await router.push({ name: 'OutboundHandoverDetail', params: { id: result.id } })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建出库交接失败')
  } finally {
    operating.value = false
  }
}

async function loadReviews() {
  loading.value = true
  try {
    const page = pagination.page ?? 1
    const pageSize = pagination.pageSize ?? 10
    const result = await reviewApi.getList({
      maxResultCount: pageSize,
      skipCount: (page - 1) * pageSize,
      reviewNo: searchForm.reviewNo || undefined,
      pickListNo: searchForm.pickListNo || undefined,
      status: searchForm.status ?? undefined,
    })
    reviews.value = result.items ?? []
    pagination.itemCount = result.totalCount ?? 0
    syncCheckedRowKeys()
  } catch (error) {
    reviews.value = []
    pagination.itemCount = 0
    message.error(error instanceof Error ? error.message : '加载出库复核列表失败')
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  searchForm.reviewNo = ''
  searchForm.pickListNo = ''
  searchForm.status = null
  pagination.page = 1
  loadReviews()
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadReviews()
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) message.warning('至少保留一个展示字段')
}

onMounted(async () => {
  loadColumnSettings()
  if (route.query.status === 'Created') searchForm.status = reviewApi.OutboundReviewStatus.Created
  await loadReviews()
  hasLoadedOnce.value = true
})

onActivated(() => {
  if (hasLoadedOnce.value) loadReviews()
})
</script>

<template>
  <div class="outbound-review-page">
    <BaseCrudPage :selected-count="selectedCount" @clear-selection="clearSelection">
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item>
            <n-input v-model:value="searchForm.reviewNo" placeholder="复核单号" clearable style="width: 190px" @keyup.enter="loadReviews" />
          </n-form-item>
          <n-form-item>
            <n-input v-model:value="searchForm.pickListNo" placeholder="拣货单号" clearable style="width: 190px" @keyup.enter="loadReviews" />
          </n-form-item>
          <n-form-item>
            <n-select v-model:value="searchForm.status" :options="statusOptions" placeholder="状态" clearable style="width: 140px" />
          </n-form-item>
          <n-form-item class="crud-page-spacer" />
          <n-form-item><n-button :loading="loading" @click="loadReviews">查询</n-button></n-form-item>
          <n-form-item><n-button @click="resetSearch">重置</n-button></n-form-item>
        </n-form>
      </template>

      <template #actions-left>
        <div class="crud-action-main">
          <n-button :disabled="!selectedReview" @click="viewSelected">查看</n-button>
          <n-button type="primary" :disabled="!canStart || operating" :loading="operating && canStart" @click="startSelected">开始复核</n-button>
          <n-button type="success" :disabled="!canComplete || operating" @click="completeSelected">完成复核</n-button>
          <n-button type="warning" :disabled="!canCreateHandover || operating" @click="openHandoverModal">创建交接</n-button>
          <n-button :disabled="!canReopen || operating" @click="reopenSelected">重新打开</n-button>
          <n-button type="error" :disabled="!canCancel || operating" @click="cancelSelected">取消</n-button>
          <n-button :loading="loading" @click="loadReviews">刷新</n-button>
        </div>
      </template>

      <template #actions-right>
        <div class="crud-action-tools">
          <TableColumnManager
            :show="showColumnConfig"
            :settings="columnSettings"
            @update:show="showColumnConfig = $event"
            @visible-change="handleColumnVisibleChange"
          />
        </div>
      </template>

      <template #data>
        <n-data-table
          class="crud-table-flat"
          :columns="columns"
          :data="reviews"
          :row-key="row => row.id"
          :checked-row-keys="checkedRowKeys"
          :bordered="false"
          :loading="loading"
          :row-props="row => ({ onClick: (event: MouseEvent) => toggleSingleRow(row, event), onDblclick: () => openDetail(row) })"
          @update:checked-row-keys="handleCheckedRowKeysChange"
        />
      </template>

      <template #pager-right>
        <n-pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="page => { pagination.page = page; loadReviews() }"
          @update:page-size="handlePageSizeChange"
        />
      </template>
    </BaseCrudPage>

    <n-modal
      v-model:show="handoverModalVisible"
      preset="card"
      title="创建出库交接"
      style="width: min(720px, 92vw)"
      :mask-closable="false"
    >
      <n-form label-placement="left" label-width="88">
        <n-form-item label="复核单">
          <div class="source-tags">
            <n-tag v-for="row in selectedRows" :key="row.id" size="small">{{ row.reviewNo }}</n-tag>
          </div>
        </n-form-item>
        <div class="handover-form-grid">
          <n-form-item label="承运商编码"><n-input v-model:value="handoverForm.carrierCode" /></n-form-item>
          <n-form-item label="承运商名称"><n-input v-model:value="handoverForm.carrierName" /></n-form-item>
          <n-form-item label="司机"><n-input v-model:value="handoverForm.driverName" /></n-form-item>
          <n-form-item label="司机电话"><n-input v-model:value="handoverForm.driverPhone" /></n-form-item>
          <n-form-item label="车牌号"><n-input v-model:value="handoverForm.vehicleNo" /></n-form-item>
          <n-form-item label="物流单号"><n-input v-model:value="handoverForm.logisticsNo" /></n-form-item>
          <n-form-item label="计划发车">
            <n-date-picker v-model:value="handoverForm.plannedDepartureTime" type="datetime" clearable style="width: 100%" />
          </n-form-item>
          <n-form-item label="备注"><n-input v-model:value="handoverForm.remark" /></n-form-item>
        </div>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="handoverModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="operating" @click="createHandover">创建并查看</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.outbound-review-page {
  display: flex;
  min-height: 0;
  flex: 1 1 0;
}

.handover-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.source-tags,
.modal-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modal-footer {
  justify-content: flex-end;
}

@media (max-width: 680px) {
  .handover-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
