<template>
  <div>
    <BaseCrudPage>
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item>
            <n-input
              :value="searchForm.handoverNo"
              placeholder="请输入交接单号"
              clearable
              style="width: 200px"
              @update:value="(value) => (searchForm.handoverNo = value)"
              @keyup.enter="loadHandovers"
            />
          </n-form-item>
          <n-form-item>
            <n-select
              :value="searchForm.status"
              :options="statusOptions"
              placeholder="请选择状态"
              clearable
              style="width: 150px"
              @update:value="(value) => (searchForm.status = value)"
            />
          </n-form-item>
          <n-form-item class="crud-page-spacer" />
          <n-form-item>
            <n-button type="primary" :loading="loading" @click="loadHandovers">查询</n-button>
          </n-form-item>
          <n-form-item>
            <n-button @click="resetSearch">重置</n-button>
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
        <n-data-table class="crud-table-flat" :columns="columns" :data="handovers" :bordered="false" :loading="loading" />
      </template>

      <template #pager-right>
        <n-pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="(page) => { pagination.page = page; loadHandovers() }"
          @update:page-size="(size) => { pagination.pageSize = size; handlePageSizeChange(size) }"
        />
      </template>
    </BaseCrudPage>

    <!-- Details Drawer -->
    <n-drawer :show="drawerVisible" placement="right" :width="750" @update:show="(value) => (drawerVisible = value)">
      <n-drawer-content title="出库交接单详情" closable>
        <div v-if="currentHandover" style="margin-bottom: 20px">
          <n-descriptions label-placement="left" bordered :column="2" size="small">
            <n-descriptions-item label="交接单号">{{ currentHandover.handoverNo }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag :type="getStatusTagType(currentHandover.status)" size="small">
                {{ getStatusLabel(currentHandover.status) }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="关联复核单Id">{{ currentHandover.outboundReviewOrderId }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(currentHandover.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="备注" :span="2">{{ currentHandover.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
        </div>

        <n-divider title-placement="left">交接明细行</n-divider>
        <n-data-table
          :columns="detailItemColumns"
          :data="currentHandover?.lines || []"
          size="small"
          :bordered="false"
        />
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-v-model-argument */
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NDivider,
  NDrawer,
  NDrawerContent,
  NDescriptions,
  NDescriptionsItem,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NSelect,
  NTag,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import * as handoverApi from '../../../api/outbound/handover'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

const message = useMessage()
const dialog = useDialog()

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const handovers = ref<handoverApi.OutboundHandoverOrderDto[]>([])
const loading = ref(false)

const searchForm = reactive({
  handoverNo: '',
  status: null as number | null,
})

const drawerVisible = ref(false)
const currentHandover = ref<handoverApi.OutboundHandoverOrderDto | null>(null)
const completingId = ref('')

const statusOptions: SelectOption[] = [
  { label: '待交接', value: handoverApi.OutboundHandoverStatus.Created },
  { label: '交接完成', value: handoverApi.OutboundHandoverStatus.Completed },
  { label: '已取消', value: handoverApi.OutboundHandoverStatus.Cancelled },
]

function getStatusLabel(status: number) {
  switch (status) {
    case handoverApi.OutboundHandoverStatus.Created:
      return '待交接'
    case handoverApi.OutboundHandoverStatus.Completed:
      return '交接完成'
    case handoverApi.OutboundHandoverStatus.Cancelled:
      return '已取消'
    default:
      return String(status)
  }
}

function getStatusTagType(status: number) {
  switch (status) {
    case handoverApi.OutboundHandoverStatus.Created:
      return 'warning'
    case handoverApi.OutboundHandoverStatus.Completed:
      return 'success'
    case handoverApi.OutboundHandoverStatus.Cancelled:
      return 'default'
    default:
      return 'default'
  }
}

function formatDateTime(v?: string | number | null) {
  if (!v) return '-'
  const dateValue = new Date(v)
  if (Number.isNaN(dateValue.getTime())) return String(v)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())} ${dateValue.getHours()}:${pad(dateValue.getMinutes())}:${pad(dateValue.getSeconds())}`
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'outbound-handover-column-settings-v1',
  preferredKeys: ['handoverNo', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'handoverNo') return '交接单号'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<handoverApi.OutboundHandoverOrderDto>[number]> = {
  handoverNo: {
    title: createDraggableTitle('handoverNo', '交接单号'),
    key: 'handoverNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.handoverNo, b.handoverNo),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.status, b.status),
    render: (row) =>
      h(
        NTag,
        { type: getStatusTagType(row.status), size: 'small' },
        { default: () => getStatusLabel(row.status) },
      ),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<handoverApi.OutboundHandoverOrderDto>>(() => withResizable([
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<handoverApi.OutboundHandoverOrderDto>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 200,
    align: 'center',
    render: (row) => [
      h(NButton, { size: 'small', type: 'info', quaternary: true, onClick: () => openDrawer(row) }, { default: () => '详情' }),
      row.status === handoverApi.OutboundHandoverStatus.Created
        ? h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              quaternary: true,
              loading: completingId.value === row.id,
              disabled: Boolean(completingId.value),
              onClick: () => handleComplete(row),
            },
            { default: () => '完成交接' }
          )
        : null,
    ],
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

const detailItemColumns: DataTableColumns<handoverApi.OutboundHandoverLineDto> = [
  { title: '物料编码', key: 'productCode', minWidth: 120 },
  { title: '物料名称', key: 'productName', minWidth: 160 },
  { title: '批次', key: 'batchNo', render: (row) => row.batchNo || '-' },
  { title: '载具/盘号', key: 'containerCode' },
  { title: '出库库位', key: 'locationCode' },
  { title: '数量', key: 'qty', width: 90, align: 'right' },
  { title: 'SN', key: 'sn', render: (row) => row.sn || '-' },
]

async function openDrawer(row: handoverApi.OutboundHandoverOrderDto) {
  loading.value = true
  try {
    const handover = await handoverApi.get(row.id)
    currentHandover.value = handover
    drawerVisible.value = true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载详情失败')
  } finally {
    loading.value = false
  }
}

function handleComplete(row: handoverApi.OutboundHandoverOrderDto) {
  dialog.warning({
    title: '确认完成出库交接',
    content: `确认完成交接单 ${row.handoverNo} 并执行库存实出？此操作将扣减库存，且不可逆转！`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      completingId.value = row.id
      try {
        await handoverApi.complete(row.id)
        message.success('交接出库成功')
        loadHandovers()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '交接失败')
      } finally {
        completingId.value = ''
      }
    }
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
      status: searchForm.status ?? undefined,
    })
    handovers.value = result.items ?? []
    pagination.itemCount = result.totalCount ?? 0
  } finally {
    loading.value = false
  }
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadHandovers()
}

function resetSearch() {
  searchForm.handoverNo = ''
  searchForm.status = null
  pagination.page = 1
  loadHandovers()
}

onMounted(() => {
  loadColumnSettings()
  loadHandovers()
})
</script>

<style scoped>
</style>
