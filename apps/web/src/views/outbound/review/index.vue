<template>
  <div>
    <BaseCrudPage>
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item>
            <n-input
              :value="searchForm.reviewNo"
              placeholder="请输入复核单号"
              clearable
              style="width: 200px"
              @update:value="(value) => (searchForm.reviewNo = value)"
              @keyup.enter="loadReviews"
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
            <n-button type="primary" :loading="loading" @click="loadReviews">查询</n-button>
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
        <n-data-table class="crud-table-flat" :columns="columns" :data="reviews" :bordered="false" :loading="loading" />
      </template>

      <template #pager-right>
        <n-pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="(page) => { pagination.page = page; loadReviews() }"
          @update:page-size="(size) => { pagination.pageSize = size; handlePageSizeChange(size) }"
        />
      </template>
    </BaseCrudPage>

    <!-- Details Drawer -->
    <n-drawer :show="drawerVisible" placement="right" :width="750" @update:show="(value) => (drawerVisible = value)">
      <n-drawer-content title="出库复核单详情" closable>
        <div v-if="currentReview" style="margin-bottom: 20px">
          <n-descriptions label-placement="left" bordered :column="2" size="small">
            <n-descriptions-item label="复核单号">{{ currentReview.reviewNo }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag :type="getStatusTagType(currentReview.status)" size="small">
                {{ getStatusLabel(currentReview.status) }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(currentReview.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="备注" :span="2">{{ currentReview.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
        </div>

        <n-divider title-placement="left">复核单明细行</n-divider>
        <n-data-table
          :columns="detailItemColumns"
          :data="currentReview?.lines || []"
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
import * as reviewApi from '../../../api/outbound/review'
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

const reviews = ref<reviewApi.OutboundReviewOrderDto[]>([])
const loading = ref(false)

const searchForm = reactive({
  reviewNo: '',
  status: null as number | null,
})

const drawerVisible = ref(false)
const currentReview = ref<reviewApi.OutboundReviewOrderDto | null>(null)
const completingId = ref('')
const handoverCreatingId = ref('')

const statusOptions: SelectOption[] = [
  { label: '待复核', value: reviewApi.OutboundReviewStatus.Created },
  { label: '复核完成', value: reviewApi.OutboundReviewStatus.Completed },
  { label: '已取消', value: reviewApi.OutboundReviewStatus.Cancelled },
]

function getStatusLabel(status: number) {
  switch (status) {
    case reviewApi.OutboundReviewStatus.Created:
      return '待复核'
    case reviewApi.OutboundReviewStatus.Completed:
      return '复核完成'
    case reviewApi.OutboundReviewStatus.Cancelled:
      return '已取消'
    default:
      return String(status)
  }
}

function getStatusTagType(status: number) {
  switch (status) {
    case reviewApi.OutboundReviewStatus.Created:
      return 'warning'
    case reviewApi.OutboundReviewStatus.Completed:
      return 'success'
    case reviewApi.OutboundReviewStatus.Cancelled:
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
  storageKey: 'outbound-review-column-settings-v1',
  preferredKeys: ['reviewNo', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'reviewNo') return '复核单号'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<reviewApi.OutboundReviewOrderDto>[number]> = {
  reviewNo: {
    title: createDraggableTitle('reviewNo', '复核单号'),
    key: 'reviewNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.reviewNo, b.reviewNo),
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

const columns = computed<DataTableColumns<reviewApi.OutboundReviewOrderDto>>(() => withResizable([
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<reviewApi.OutboundReviewOrderDto>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 260,
    align: 'center',
    render: (row) => [
      h(NButton, { size: 'small', type: 'info', quaternary: true, onClick: () => openDrawer(row) }, { default: () => '详情' }),
      row.status === reviewApi.OutboundReviewStatus.Created
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
            { default: () => '完成复核' }
          )
        : null,
      row.status === reviewApi.OutboundReviewStatus.Completed
        ? h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              quaternary: true,
              loading: handoverCreatingId.value === row.id,
              disabled: Boolean(handoverCreatingId.value),
              onClick: () => handleCreateHandover(row),
            },
            { default: () => '创建交接' }
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

const detailItemColumns: DataTableColumns<reviewApi.OutboundReviewLineDto> = [
  { title: '物料编码', key: 'productCode', minWidth: 120 },
  { title: '物料名称', key: 'productName', minWidth: 160 },
  { title: '批次', key: 'batchNo', render: (row) => row.batchNo || '-' },
  { title: '载具/盘号', key: 'containerCode' },
  { title: '出库库位', key: 'locationCode' },
  { title: '数量', key: 'qty', width: 90, align: 'right' },
  { title: 'SN', key: 'sn', render: (row) => row.sn || '-' },
]

async function openDrawer(row: reviewApi.OutboundReviewOrderDto) {
  loading.value = true
  try {
    const review = await reviewApi.get(row.id)
    currentReview.value = review
    drawerVisible.value = true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载详情失败')
  } finally {
    loading.value = false
  }
}

function handleComplete(row: reviewApi.OutboundReviewOrderDto) {
  dialog.warning({
    title: '确认完成复核',
    content: `确认复核单 ${row.reviewNo} 已通过所有物料与数量校验？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      completingId.value = row.id
      try {
        await reviewApi.complete(row.id)
        message.success('复核成功')
        loadReviews()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '复核失败')
      } finally {
        completingId.value = ''
      }
    }
  })
}

function handleCreateHandover(row: reviewApi.OutboundReviewOrderDto) {
  dialog.warning({
    title: '创建出库交接单',
    content: `确认针对复核单 ${row.reviewNo} 生成出库交接单吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      handoverCreatingId.value = row.id
      try {
        await handoverApi.create({
          outboundReviewOrderId: row.id,
        })
        message.success('交接单创建成功')
        loadReviews()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '创建交接单失败')
      } finally {
        handoverCreatingId.value = ''
      }
    }
  })
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
      status: searchForm.status ?? undefined,
    })
    reviews.value = result.items ?? []
    pagination.itemCount = result.totalCount ?? 0
  } finally {
    loading.value = false
  }
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadReviews()
}

function resetSearch() {
  searchForm.reviewNo = ''
  searchForm.status = null
  pagination.page = 1
  loadReviews()
}

onMounted(() => {
  loadColumnSettings()
  loadReviews()
})
</script>

<style scoped>
</style>
