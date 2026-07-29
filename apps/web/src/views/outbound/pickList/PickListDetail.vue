<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, onMounted, ref, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NSpin,
useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as pickListApi from '../../../api/outbound/pickList'
import * as reviewApi from '../../../api/outbound/review'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { withResizable } from '../../../utils/table'

type DetailRow = pickListApi.PickListLineDto

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const creatingReview = ref(false)
const detail = ref<pickListApi.PickListDto | null>(null)

const detailId = computed(() => String(route.params.id ?? ''))
const detailRows = computed(() => detail.value?.lines ?? [])

function getStatusLabel(status: number | undefined) {
  if (status === undefined) return '-'
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

function getStatusTagType(status: number | undefined) {
  if (status === undefined) return 'default'
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

function formatQuantity(value: unknown) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return '-'
  return numberValue.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

const columns = computed<DataTableColumns<DetailRow>>(() => withResizable([
  {
    title: '物料编码',
    key: 'productCode',
    minWidth: 140,
    render: (row) => row.productCode || '-',
  },
  {
    title: '物料名称',
    key: 'productName',
    minWidth: 180,
    render: (row) => row.productName || '-',
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 140,
    render: (row) => row.batchNo || '-',
  },
  {
    title: '源库位',
    key: 'sourceLocationCode',
    minWidth: 140,
    render: (row) => row.sourceLocationCode || '-',
  },
  {
    title: '容器编码',
    key: 'containerCode',
    minWidth: 140,
    render: (row) => row.containerCode || '-',
  },
  {
    title: '目标库位',
    key: 'targetLocationCode',
    minWidth: 140,
    render: (row) => row.targetLocationCode || '-',
  },
  {
    title: '分配件数',
    key: 'qty',
    width: 110,
    align: 'right',
    render: (row) => formatQuantity(row.qty),
  },
  {
    title: '关联搬运任务',
    key: 'moveTaskNo',
    minWidth: 160,
    render: (row) => row.moveTaskNo || '-'
  },
  {
    title: '状态',
    key: 'isPicked',
    width: 110,
    align: 'center',
    render: (row) => h(
      WmsStatusTag,
      { size: 'small', type: row.isPicked ? 'success' : 'warning' },
      { default: () => row.isPicked ? '已拣货' : '待拣货' }
    )
  },
]))

async function loadDetail() {
  if (!detailId.value) {
    message.error('缺少拣货单 Id，无法查看详情')
    return
  }

  loading.value = true
  try {
    detail.value = await pickListApi.get(detailId.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载拣货单详情失败')
  } finally {
    loading.value = false
  }
}

async function handleCreateReview() {
  if (!detail.value) return
  if (detail.value.outboundReviewOrderId) {
    message.warning(`该拣货单已创建复核单 ${detail.value.outboundReviewOrderNo || ''}`)
    return
  }

  dialog.warning({
    title: '创建出库复核单',
    content: `确认针对拣货单 ${detail.value.pickNo} 创建出库复核单吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      creatingReview.value = true
      try {
        const review = await reviewApi.create({
          pickListId: detail.value!.id
        })
        message.success(`出库复核单 ${review.reviewNo} 创建成功`)
        await loadDetail()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '创建复核单失败')
      } finally {
        creatingReview.value = false
      }
    }
  })
}

function handleBack() {
  router.push({ name: 'PickListManagement' })
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <BaseCrudPage :search-collapsible="false">
    <template #search>
      <div style="width: 100%">
        <div style="display: flex; gap: 8px; align-items: center">
          <n-button @click="handleBack">返回列表</n-button>
          <n-button :loading="loading" @click="loadDetail">刷新</n-button>
          <n-button
            v-if="detail?.status === pickListApi.PickListStatus.Picked"
            type="warning"
            :loading="creatingReview"
            :disabled="Boolean(detail?.outboundReviewOrderId)"
            @click="handleCreateReview"
          >
            {{ detail?.outboundReviewOrderId ? `已创建复核单 ${detail.outboundReviewOrderNo || ''}` : '创建复核单' }}
          </n-button>
        </div>

        <n-spin :show="loading" style="margin-top: 10px; width: 100%">
          <n-descriptions bordered :column="3" label-placement="left" size="small">
            <n-descriptions-item label="拣货单号">{{ detail?.pickNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="出库暂存位">{{ detail?.targetLocationCode || '-' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <WmsStatusTag size="small" :type="getStatusTagType(detail?.status)">
                {{ getStatusLabel(detail?.status) }}
              </WmsStatusTag>
            </n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(detail?.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="明细条数">{{ detailRows.length }}</n-descriptions-item>
            <n-descriptions-item label="备注">{{ detail?.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
        </n-spin>
      </div>
    </template>

    <template #data>
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="detailRows" :bordered="false">
        <template #empty>
          <n-empty description="暂无拣货单明细" />
        </template>
      </n-data-table>
    </template>
  </BaseCrudPage>
</template>
