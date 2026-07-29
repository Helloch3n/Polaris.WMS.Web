<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NProgress,
useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import { withResizable } from '../../../utils/table'
import * as reviewApi from '../../../api/outbound/review'
import * as handoverApi from '../../../api/outbound/handover'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const id = computed(() => String(route.params.id ?? ''))
const loading = ref(false)
const operating = ref(false)
const review = ref<reviewApi.OutboundReviewOrderDto | null>(null)
const scanCode = ref('')
const scanInput = ref<InstanceType<typeof NInput> | null>(null)
const exceptionModalVisible = ref(false)
const exceptionLine = ref<reviewApi.OutboundReviewLineDto | null>(null)
const exceptionForm = ref({ exceptionType: '', remark: '' })

const editable = computed(() =>
  review.value != null
  && !([
    reviewApi.OutboundReviewStatus.Completed,
    reviewApi.OutboundReviewStatus.Cancelled,
  ] as number[]).includes(Number(review.value.status)),
)
const canStart = computed(() => review.value?.status === reviewApi.OutboundReviewStatus.Created)
const canComplete = computed(() => {
  const value = review.value
  return value != null
    && value.status === reviewApi.OutboundReviewStatus.Reviewing
    && value.reviewedLineCount === value.totalLineCount
    && value.exceptionLineCount === 0
})
const canReopen = computed(() => review.value?.status === reviewApi.OutboundReviewStatus.Completed)
const canCancel = computed(() => ([
  reviewApi.OutboundReviewStatus.Created,
  reviewApi.OutboundReviewStatus.Reviewing,
  reviewApi.OutboundReviewStatus.Exception,
] as number[]).includes(Number(review.value?.status)))
const percentage = computed(() => {
  const value = review.value
  return value?.totalLineCount ? Math.round(value.reviewedLineCount / value.totalLineCount * 100) : 0
})

function statusLabel(status?: number) {
  if (status === reviewApi.OutboundReviewStatus.Created) return '待复核'
  if (status === reviewApi.OutboundReviewStatus.Reviewing) return '复核中'
  if (status === reviewApi.OutboundReviewStatus.Exception) return '存在异常'
  if (status === reviewApi.OutboundReviewStatus.Completed) return '已完成'
  if (status === reviewApi.OutboundReviewStatus.Cancelled) return '已取消'
  return '-'
}

function statusType(status?: number) {
  if (status === reviewApi.OutboundReviewStatus.Created) return 'warning' as const
  if (status === reviewApi.OutboundReviewStatus.Reviewing) return 'info' as const
  if (status === reviewApi.OutboundReviewStatus.Exception) return 'error' as const
  if (status === reviewApi.OutboundReviewStatus.Completed) return 'success' as const
  return 'default' as const
}

function lineStatusLabel(status: number) {
  if (status === reviewApi.OutboundReviewLineStatus.Pending) return '待复核'
  if (status === reviewApi.OutboundReviewLineStatus.Passed) return '已通过'
  if (status === reviewApi.OutboundReviewLineStatus.Exception) return '异常'
  return String(status)
}

function lineStatusType(status: number) {
  if (status === reviewApi.OutboundReviewLineStatus.Pending) return 'warning' as const
  if (status === reviewApi.OutboundReviewLineStatus.Passed) return 'success' as const
  if (status === reviewApi.OutboundReviewLineStatus.Exception) return 'error' as const
  return 'default' as const
}

function qty(value?: number | null) {
  return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}

function date(value?: string | null) {
  if (!value) return '-'
  const result = new Date(value)
  return Number.isNaN(result.getTime()) ? value : result.toLocaleString('zh-CN', { hour12: false })
}

const columns: DataTableColumns<reviewApi.OutboundReviewLineDto> = withResizable([
  {
    title: '状态',
    key: 'status',
    width: 100,
    fixed: 'left',
    render: row => h(
      WmsStatusTag,
      { size: 'small', type: lineStatusType(row.status), bordered: false },
      { default: () => lineStatusLabel(row.status) },
    ),
  },
  { title: '物料编码', key: 'productCode', minWidth: 160, render: row => h(CopyableText, { value: row.productCode }) },
  { title: '物料名称', key: 'productName', minWidth: 190 },
  { title: '盘号', key: 'containerCode', minWidth: 140, render: row => h(CopyableText, { value: row.containerCode }) },
  { title: 'SN', key: 'sn', minWidth: 150, render: row => h(CopyableText, { value: row.sn }) },
  { title: '批次', key: 'batchNo', minWidth: 130, render: row => row.batchNo || '-' },
  { title: '暂存库位', key: 'locationCode', minWidth: 130 },
  { title: '应复数量', key: 'qty', width: 110, align: 'right', render: row => qty(row.qty) },
  { title: '已复数量', key: 'reviewedQty', width: 110, align: 'right', render: row => qty(row.reviewedQty) },
  { title: '复核时间', key: 'reviewedAt', width: 180, render: row => date(row.reviewedAt) },
  {
    title: '异常说明',
    key: 'exception',
    minWidth: 180,
    render: row => row.exceptionType ? `${row.exceptionType}：${row.exceptionRemark || '-'}` : '-',
  },
  {
    title: '操作',
    key: 'lineAction',
    width: 90,
    fixed: 'right',
    render: row => editable.value
      ? h(NButton, {
          text: true,
          type: 'error',
          onClick: () => openException(row),
        }, { default: () => '登记异常' })
      : '-',
  },
])

async function loadDetail() {
  loading.value = true
  try {
    review.value = await reviewApi.get(id.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载出库复核详情失败')
  } finally {
    loading.value = false
  }
}

async function startReview() {
  operating.value = true
  try {
    review.value = await reviewApi.start(id.value)
    message.success('复核已开始，请扫描库存')
    await focusScan()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '开始复核失败')
  } finally {
    operating.value = false
  }
}

async function submitScan() {
  const code = scanCode.value.trim()
  if (!code) {
    message.warning('请扫描盘号、库存二维码或SN')
    return
  }
  operating.value = true
  try {
    review.value = await reviewApi.scan(id.value, code)
    scanCode.value = ''
    message.success('复核通过')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '扫码复核失败')
  } finally {
    operating.value = false
    await focusScan()
  }
}

function openException(line: reviewApi.OutboundReviewLineDto) {
  exceptionLine.value = line
  exceptionForm.value = {
    exceptionType: line.exceptionType || '',
    remark: line.exceptionRemark || '',
  }
  exceptionModalVisible.value = true
}

async function submitException() {
  if (!exceptionLine.value || !exceptionForm.value.exceptionType.trim() || !exceptionForm.value.remark.trim()) {
    message.warning('请填写异常类型和异常说明')
    return
  }
  operating.value = true
  try {
    review.value = await reviewApi.markException(id.value, {
      lineId: exceptionLine.value.id,
      exceptionType: exceptionForm.value.exceptionType.trim(),
      remark: exceptionForm.value.remark.trim(),
    })
    exceptionModalVisible.value = false
    message.success('异常已登记')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '登记异常失败')
  } finally {
    operating.value = false
  }
}

function completeReview() {
  dialog.warning({
    title: '确认完成复核',
    content: '全部库存均已逐条复核通过。完成后将允许创建出库交接，是否继续？',
    positiveText: '完成复核',
    negativeText: '取消',
    onPositiveClick: async () => {
      operating.value = true
      try {
        await reviewApi.complete(id.value)
        message.success('出库复核已完成')
        await loadDetail()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '完成复核失败')
      } finally {
        operating.value = false
      }
    },
  })
}

async function reopenReview() {
  operating.value = true
  try {
    await reviewApi.reopen(id.value)
    message.success('复核单已重新打开')
    await loadDetail()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重新打开失败')
  } finally {
    operating.value = false
  }
}

async function createHandover() {
  operating.value = true
  try {
    const result = await handoverApi.create({ outboundReviewOrderIds: [id.value] })
    message.success('出库交接已创建')
    await router.push({ name: 'OutboundHandoverDetail', params: { id: result.id } })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建出库交接失败')
  } finally {
    operating.value = false
  }
}

function cancelReview() {
  dialog.warning({
    title: '取消出库复核',
    content: '取消后不会影响已拣库存，且可从原拣货单重新创建复核单。是否继续？',
    positiveText: '确认取消',
    negativeText: '返回',
    onPositiveClick: async () => {
      operating.value = true
      try {
        await reviewApi.cancel(id.value)
        message.success('复核单已取消')
        await loadDetail()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '取消复核失败')
      } finally {
        operating.value = false
      }
    },
  })
}

async function focusScan() {
  await nextTick()
  scanInput.value?.focus()
}

onMounted(async () => {
  await loadDetail()
  if (editable.value) await focusScan()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-descriptions bordered label-placement="left" :column="3" style="width: 100%">
        <n-descriptions-item label="复核单号"><CopyableText :value="review?.reviewNo || '-'" strong /></n-descriptions-item>
        <n-descriptions-item label="状态"><WmsStatusTag size="small" :type="statusType(review?.status)">{{ statusLabel(review?.status) }}</WmsStatusTag></n-descriptions-item>
        <n-descriptions-item label="复核进度">
          <div class="progress-cell">
            <n-progress type="line" :percentage="percentage" :show-indicator="false" style="width: 100px" />
            <span>{{ review?.reviewedLineCount ?? 0 }} / {{ review?.totalLineCount ?? 0 }}</span>
          </div>
        </n-descriptions-item>
        <n-descriptions-item label="拣货单">{{ review?.pickListNo || '-' }}</n-descriptions-item>
        <n-descriptions-item label="波次">{{ review?.waveOrderNo || '-' }}</n-descriptions-item>
        <n-descriptions-item label="仓库">{{ review ? `${review.warehouseName} / ${review.warehouseCode}` : '-' }}</n-descriptions-item>
        <n-descriptions-item label="出库暂存库位">{{ review?.targetLocationCode || '-' }}</n-descriptions-item>
        <n-descriptions-item label="开始时间">{{ date(review?.startedAt) }}</n-descriptions-item>
        <n-descriptions-item label="完成时间">{{ date(review?.completedAt) }}</n-descriptions-item>
        <n-descriptions-item label="备注" :span="3">{{ review?.remark || '-' }}</n-descriptions-item>
      </n-descriptions>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button @click="router.push({ name: 'OutboundReviewList' })">返回列表</n-button>
        <n-button type="primary" :disabled="!canStart || operating" @click="startReview">开始复核</n-button>
        <n-button type="success" :disabled="!canComplete || operating" @click="completeReview">完成复核</n-button>
        <n-button type="warning" :disabled="review?.status !== reviewApi.OutboundReviewStatus.Completed || operating" @click="createHandover">创建交接</n-button>
        <n-button :disabled="!canReopen || operating" @click="reopenReview">重新打开</n-button>
        <n-button type="error" :disabled="!canCancel || operating" @click="cancelReview">取消</n-button>
        <n-button :loading="loading" @click="loadDetail">刷新</n-button>
      </div>
    </template>

    <template #data>
      <div class="review-workbench">
        <n-alert
          v-if="review?.status === reviewApi.OutboundReviewStatus.Exception"
          type="error"
          title="存在复核异常"
          :bordered="false"
        >
          请处理异常库存后重新扫描。重新扫描通过会清除该行异常。
        </n-alert>
        <div class="scan-panel" :class="{ disabled: !editable }">
          <div>
            <div class="scan-title">扫描复核</div>
            <div class="scan-hint">支持盘号、库存二维码、SN；每条实物必须逐一扫描</div>
          </div>
          <n-input
            ref="scanInput"
            v-model:value="scanCode"
            size="large"
            clearable
            placeholder="请扫描库存"
            :disabled="!editable || operating"
            @keyup.enter="submitScan"
          />
          <n-button type="primary" size="large" :disabled="!editable || !scanCode.trim()" :loading="operating" @click="submitScan">确认</n-button>
        </div>
        <div class="table-title">复核明细（{{ review?.lines.length ?? 0 }} 条）</div>
        <n-data-table
          class="crud-table-flat review-lines"
          :columns="columns"
          :data="review?.lines ?? []"
          :loading="loading"
          :bordered="false"
          :row-key="row => row.id"
        >
          <template #empty><n-empty description="暂无复核明细" /></template>
        </n-data-table>
      </div>
    </template>
  </BaseCrudPage>

  <n-modal
    v-model:show="exceptionModalVisible"
    preset="card"
    title="登记复核异常"
    style="width: min(520px, 92vw)"
    :mask-closable="false"
  >
    <n-form label-placement="left" label-width="80">
      <n-form-item label="库存">
        {{ exceptionLine?.containerCode }} / {{ exceptionLine?.sn }}
      </n-form-item>
      <n-form-item label="异常类型" required>
        <n-input v-model:value="exceptionForm.exceptionType" maxlength="50" placeholder="例如：标签不符、包装破损、数量异常" />
      </n-form-item>
      <n-form-item label="异常说明" required>
        <n-input v-model:value="exceptionForm.remark" type="textarea" :rows="4" maxlength="1000" show-count />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="modal-footer">
        <n-button @click="exceptionModalVisible = false">取消</n-button>
        <n-button type="error" :loading="operating" @click="submitException">登记异常</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.review-workbench {
  display: flex;
  min-height: 0;
  flex: 1 1 0;
  flex-direction: column;
  gap: 10px;
}

.progress-cell,
.scan-panel,
.modal-footer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scan-panel {
  flex: 0 0 auto;
  padding: 14px 16px;
  border: 1px solid var(--wms-border-subtle);
  border-radius: 8px;
  background: var(--wms-surface-muted);
}

.scan-panel > :first-child {
  min-width: 230px;
}

.scan-panel .n-input {
  max-width: 620px;
}

.scan-title,
.table-title {
  font-weight: 600;
}

.scan-hint {
  margin-top: 2px;
  color: var(--wms-text-muted);
  font-size: 12px;
}

.scan-panel.disabled {
  opacity: 0.72;
}

.review-lines {
  min-height: 0;
  flex: 1 1 0;
}

.modal-footer {
  justify-content: flex-end;
}
</style>
