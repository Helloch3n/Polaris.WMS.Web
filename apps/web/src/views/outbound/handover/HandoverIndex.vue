<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NSelect,
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
import * as handoverApi from '../../../api/outbound/handover'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const operating = ref(false)
const hasLoadedOnce = ref(false)
const handovers = ref<handoverApi.OutboundHandoverOrderDto[]>([])
const completeModalVisible = ref(false)
const receiverName = ref('')

const pagination = reactive<PaginationProps>({ page: 1, pageSize: 10, itemCount: 0 })
const searchForm = reactive({
  handoverNo: '',
  reviewNo: '',
  vehicleNo: '',
  status: null as number | null,
})
const {
  checkedRowKeys,
  selectedRows,
  selectedCount,
  handleCheckedRowKeysChange,
  syncCheckedRowKeys,
  toggleSingleRow,
  clearSelection,
} = useTableSelection(handovers, row => row.id)
const selectedHandover = computed(() => selectedRows.value.length === 1 ? selectedRows.value[0] ?? null : null)
const canStart = computed(() => selectedHandover.value?.status === handoverApi.OutboundHandoverStatus.Created)
const canComplete = computed(() => {
  const value = selectedHandover.value
  return value != null
    && value.status === handoverApi.OutboundHandoverStatus.InProgress
    && value.loadedLineCount === value.totalLineCount
    && value.exceptionLineCount === 0
})
const canCancel = computed(() => ([
  handoverApi.OutboundHandoverStatus.Created,
  handoverApi.OutboundHandoverStatus.InProgress,
  handoverApi.OutboundHandoverStatus.Exception,
] as number[]).includes(Number(selectedHandover.value?.status)))

const statusOptions: SelectOption[] = [
  { label: '待交接', value: handoverApi.OutboundHandoverStatus.Created },
  { label: '交接中', value: handoverApi.OutboundHandoverStatus.InProgress },
  { label: '存在异常', value: handoverApi.OutboundHandoverStatus.Exception },
  { label: '已完成', value: handoverApi.OutboundHandoverStatus.Completed },
  { label: '已取消', value: handoverApi.OutboundHandoverStatus.Cancelled },
]

function statusLabel(status: number) {
  return statusOptions.find(item => item.value === status)?.label ?? String(status)
}

function statusType(status: number) {
  if (status === handoverApi.OutboundHandoverStatus.Created) return 'warning' as const
  if (status === handoverApi.OutboundHandoverStatus.InProgress) return 'info' as const
  if (status === handoverApi.OutboundHandoverStatus.Exception) return 'error' as const
  if (status === handoverApi.OutboundHandoverStatus.Completed) return 'success' as const
  return 'default' as const
}

function date(value?: string | null) {
  if (!value) return '-'
  const result = new Date(value)
  return Number.isNaN(result.getTime()) ? value : result.toLocaleString('zh-CN', { hour12: false })
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'outbound-handover-column-settings-v2',
  preferredKeys: [
    'handoverNo', 'reviewNos', 'warehouseName', 'carrierName', 'vehicleNo',
    'progress', 'status', 'creationTime',
  ],
  resolveTitle: key => ({
    handoverNo: '交接单号',
    reviewNos: '复核单',
    warehouseName: '仓库',
    carrierName: '承运商',
    vehicleNo: '车牌号',
    progress: '装车进度',
    status: '状态',
    creationTime: '创建时间',
  }[key] ?? key),
})

const columnMap: Record<string, DataTableColumns<handoverApi.OutboundHandoverOrderDto>[number]> = {
  handoverNo: {
    title: createDraggableTitle('handoverNo', '交接单号'),
    key: 'handoverNo',
    minWidth: 170,
    sorter: (a, b) => compareSortValue(a.handoverNo, b.handoverNo),
  },
  reviewNos: {
    title: createDraggableTitle('reviewNos', '复核单'),
    key: 'reviewNos',
    minWidth: 210,
    ellipsis: { tooltip: true },
    render: row => row.sources.filter(source => source.isActive).map(source => source.outboundReviewOrderNo).join('、') || '-',
  },
  warehouseName: {
    title: createDraggableTitle('warehouseName', '仓库'),
    key: 'warehouseName',
    minWidth: 170,
    render: row => `${row.warehouseName || '-'} / ${row.warehouseCode || '-'}`,
  },
  carrierName: {
    title: createDraggableTitle('carrierName', '承运商'),
    key: 'carrierName',
    minWidth: 150,
    render: row => row.carrierName || row.carrierCode || '-',
  },
  vehicleNo: {
    title: createDraggableTitle('vehicleNo', '车牌号'),
    key: 'vehicleNo',
    minWidth: 120,
    render: row => row.vehicleNo || '-',
  },
  progress: {
    title: createDraggableTitle('progress', '装车进度'),
    key: 'progress',
    width: 110,
    align: 'center',
    render: row => `${row.loadedLineCount} / ${row.totalLineCount}`,
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

const columns = computed<DataTableColumns<handoverApi.OutboundHandoverOrderDto>>(() => withResizable([
  { type: 'selection', fixed: 'left', width: 44 },
  ...columnSettings.value
    .filter(item => item.visible)
    .map(item => columnMap[item.key])
    .filter((item): item is DataTableColumns<handoverApi.OutboundHandoverOrderDto>[number] => Boolean(item)),
]))

function openDetail(row: handoverApi.OutboundHandoverOrderDto) {
  router.push({ name: 'OutboundHandoverDetail', params: { id: row.id } })
}

function viewSelected() {
  if (selectedHandover.value) openDetail(selectedHandover.value)
}

async function startSelected() {
  if (!selectedHandover.value) return
  operating.value = true
  try {
    await handoverApi.start(selectedHandover.value.id)
    message.success('交接已开始')
    openDetail(selectedHandover.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '开始交接失败')
  } finally {
    operating.value = false
  }
}

function openCompleteModal() {
  receiverName.value = ''
  completeModalVisible.value = true
}

async function completeSelected() {
  if (!selectedHandover.value) return
  operating.value = true
  try {
    await handoverApi.complete(selectedHandover.value.id, receiverName.value.trim() || null)
    completeModalVisible.value = false
    message.success('交接完成，库存已正式出库')
    await loadHandovers()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '完成交接失败')
  } finally {
    operating.value = false
  }
}

function cancelSelected() {
  if (!selectedHandover.value) return
  dialog.warning({
    title: '取消出库交接',
    content: `确认取消 ${selectedHandover.value.handoverNo}？取消后关联复核单可以重新创建交接。`,
    positiveText: '确认取消',
    negativeText: '返回',
    onPositiveClick: async () => {
      operating.value = true
      try {
        await handoverApi.cancel(selectedHandover.value!.id)
        message.success('交接单已取消')
        await loadHandovers()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '取消交接失败')
      } finally {
        operating.value = false
      }
    },
  })
}

async function loadHandovers() {
  loading.value = true
  try {
    const page = pagination.page ?? 1
    const pageSize = pagination.pageSize ?? 10
    const result = await handoverApi.getList({
      maxResultCount: pageSize,
      skipCount: (page - 1) * pageSize,
      handoverNo: searchForm.handoverNo || undefined,
      reviewNo: searchForm.reviewNo || undefined,
      vehicleNo: searchForm.vehicleNo || undefined,
      status: searchForm.status ?? undefined,
    })
    handovers.value = result.items ?? []
    pagination.itemCount = result.totalCount ?? 0
    syncCheckedRowKeys()
  } catch (error) {
    handovers.value = []
    pagination.itemCount = 0
    message.error(error instanceof Error ? error.message : '加载出库交接列表失败')
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  searchForm.handoverNo = ''
  searchForm.reviewNo = ''
  searchForm.vehicleNo = ''
  searchForm.status = null
  pagination.page = 1
  loadHandovers()
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadHandovers()
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) message.warning('至少保留一个展示字段')
}

onMounted(async () => {
  loadColumnSettings()
  await loadHandovers()
  hasLoadedOnce.value = true
})
onActivated(() => {
  if (hasLoadedOnce.value) loadHandovers()
})
</script>

<template>
  <div class="outbound-handover-page">
    <BaseCrudPage :selected-count="selectedCount" @clear-selection="clearSelection">
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item><n-input v-model:value="searchForm.handoverNo" placeholder="交接单号" clearable @keyup.enter="loadHandovers" /></n-form-item>
          <n-form-item><n-input v-model:value="searchForm.reviewNo" placeholder="复核单号" clearable @keyup.enter="loadHandovers" /></n-form-item>
          <n-form-item><n-input v-model:value="searchForm.vehicleNo" placeholder="车牌号" clearable @keyup.enter="loadHandovers" /></n-form-item>
          <n-form-item><n-select v-model:value="searchForm.status" :options="statusOptions" placeholder="状态" clearable style="width: 140px" /></n-form-item>
          <n-form-item class="crud-page-spacer" />
          <n-form-item><n-button :loading="loading" @click="loadHandovers">查询</n-button></n-form-item>
          <n-form-item><n-button @click="resetSearch">重置</n-button></n-form-item>
        </n-form>
      </template>

      <template #actions-left>
        <div class="crud-action-main">
          <n-button :disabled="!selectedHandover" @click="viewSelected">查看</n-button>
          <n-button type="primary" :disabled="!canStart || operating" @click="startSelected">开始交接</n-button>
          <n-button type="success" :disabled="!canComplete || operating" @click="openCompleteModal">完成交接</n-button>
          <n-button type="error" :disabled="!canCancel || operating" @click="cancelSelected">取消</n-button>
          <n-button :loading="loading" @click="loadHandovers">刷新</n-button>
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
          :data="handovers"
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
          @update:page="page => { pagination.page = page; loadHandovers() }"
          @update:page-size="handlePageSizeChange"
        />
      </template>
    </BaseCrudPage>

    <n-modal v-model:show="completeModalVisible" preset="card" title="完成出库交接" style="width: min(500px, 92vw)" :mask-closable="false">
      <div class="complete-warning">
        完成交接将立即扣减库存并形成正式出库记录，此操作不可重复、不可撤销。
      </div>
      <n-form-item label="接收人/签收人">
        <n-input v-model:value="receiverName" placeholder="选填" maxlength="100" />
      </n-form-item>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="completeModalVisible = false">取消</n-button>
          <n-button type="error" :loading="operating" @click="completeSelected">确认交接并出库</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.outbound-handover-page {
  display: flex;
  min-height: 0;
  flex: 1 1 0;
}

.complete-warning {
  margin-bottom: 18px;
  color: var(--n-color-error);
  line-height: 1.7;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
