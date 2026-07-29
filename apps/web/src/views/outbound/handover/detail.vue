<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDataTable,
  NDatePicker,
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
import * as handoverApi from '../../../api/outbound/handover'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const id = computed(() => String(route.params.id ?? ''))
const loading = ref(false)
const operating = ref(false)
const handover = ref<handoverApi.OutboundHandoverOrderDto | null>(null)
const scanCode = ref('')
const scanInput = ref<InstanceType<typeof NInput> | null>(null)
const exceptionModalVisible = ref(false)
const exceptionLine = ref<handoverApi.OutboundHandoverLineDto | null>(null)
const exceptionForm = ref({ exceptionType: '', remark: '' })
const completeModalVisible = ref(false)
const receiverName = ref('')

const transportForm = reactive({
  carrierCode: '',
  carrierName: '',
  driverName: '',
  driverPhone: '',
  vehicleNo: '',
  logisticsNo: '',
  plannedDepartureTime: null as number | null,
  remark: '',
})

const transportEditable = computed(() => handover.value?.status === handoverApi.OutboundHandoverStatus.Created)
const scannable = computed(() =>
  handover.value != null
  && !([
    handoverApi.OutboundHandoverStatus.Completed,
    handoverApi.OutboundHandoverStatus.Cancelled,
  ] as number[]).includes(Number(handover.value.status)),
)
const canStart = computed(() => handover.value?.status === handoverApi.OutboundHandoverStatus.Created)
const canComplete = computed(() => {
  const value = handover.value
  return value != null
    && value.status === handoverApi.OutboundHandoverStatus.InProgress
    && value.loadedLineCount === value.totalLineCount
    && value.exceptionLineCount === 0
})
const canCancel = computed(() => ([
  handoverApi.OutboundHandoverStatus.Created,
  handoverApi.OutboundHandoverStatus.InProgress,
  handoverApi.OutboundHandoverStatus.Exception,
] as number[]).includes(Number(handover.value?.status)))
const percentage = computed(() => {
  const value = handover.value
  return value?.totalLineCount ? Math.round(value.loadedLineCount / value.totalLineCount * 100) : 0
})

function statusLabel(status?: number) {
  if (status === handoverApi.OutboundHandoverStatus.Created) return '待交接'
  if (status === handoverApi.OutboundHandoverStatus.InProgress) return '交接中'
  if (status === handoverApi.OutboundHandoverStatus.Exception) return '存在异常'
  if (status === handoverApi.OutboundHandoverStatus.Completed) return '已完成'
  if (status === handoverApi.OutboundHandoverStatus.Cancelled) return '已取消'
  return '-'
}

function statusType(status?: number) {
  if (status === handoverApi.OutboundHandoverStatus.Created) return 'warning' as const
  if (status === handoverApi.OutboundHandoverStatus.InProgress) return 'info' as const
  if (status === handoverApi.OutboundHandoverStatus.Exception) return 'error' as const
  if (status === handoverApi.OutboundHandoverStatus.Completed) return 'success' as const
  return 'default' as const
}

function lineStatusLabel(status: number) {
  if (status === handoverApi.OutboundHandoverLineStatus.Pending) return '待装车'
  if (status === handoverApi.OutboundHandoverLineStatus.Loaded) return '已装车'
  if (status === handoverApi.OutboundHandoverLineStatus.Exception) return '异常'
  return String(status)
}

function lineStatusType(status: number) {
  if (status === handoverApi.OutboundHandoverLineStatus.Pending) return 'warning' as const
  if (status === handoverApi.OutboundHandoverLineStatus.Loaded) return 'success' as const
  if (status === handoverApi.OutboundHandoverLineStatus.Exception) return 'error' as const
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

const columns: DataTableColumns<handoverApi.OutboundHandoverLineDto> = withResizable([
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
  { title: '出库暂存库位', key: 'locationCode', minWidth: 140 },
  { title: '应交数量', key: 'qty', width: 110, align: 'right', render: row => qty(row.qty) },
  { title: '已交数量', key: 'handedOverQty', width: 110, align: 'right', render: row => qty(row.handedOverQty) },
  { title: '装车时间', key: 'handedOverAt', width: 180, render: row => date(row.handedOverAt) },
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
    render: row => scannable.value
      ? h(NButton, {
          text: true,
          type: 'error',
          onClick: () => openException(row),
        }, { default: () => '登记异常' })
      : '-',
  },
])

function applyDetail(value: handoverApi.OutboundHandoverOrderDto) {
  handover.value = value
  Object.assign(transportForm, {
    carrierCode: value.carrierCode || '',
    carrierName: value.carrierName || '',
    driverName: value.driverName || '',
    driverPhone: value.driverPhone || '',
    vehicleNo: value.vehicleNo || '',
    logisticsNo: value.logisticsNo || '',
    plannedDepartureTime: value.plannedDepartureTime ? new Date(value.plannedDepartureTime).getTime() : null,
    remark: value.remark || '',
  })
}

async function loadDetail() {
  loading.value = true
  try {
    applyDetail(await handoverApi.get(id.value))
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载出库交接详情失败')
  } finally {
    loading.value = false
  }
}

async function saveTransport() {
  operating.value = true
  try {
    const value = await handoverApi.update(id.value, {
      carrierCode: transportForm.carrierCode || null,
      carrierName: transportForm.carrierName || null,
      driverName: transportForm.driverName || null,
      driverPhone: transportForm.driverPhone || null,
      vehicleNo: transportForm.vehicleNo || null,
      logisticsNo: transportForm.logisticsNo || null,
      plannedDepartureTime: transportForm.plannedDepartureTime
        ? new Date(transportForm.plannedDepartureTime).toISOString()
        : null,
      remark: transportForm.remark || null,
    })
    applyDetail(value)
    message.success('运输信息已保存')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存运输信息失败')
  } finally {
    operating.value = false
  }
}

async function startHandover() {
  operating.value = true
  try {
    applyDetail(await handoverApi.start(id.value))
    message.success('交接已开始，请逐一扫描装车库存')
    await focusScan()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '开始交接失败')
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
    applyDetail(await handoverApi.scan(id.value, code))
    scanCode.value = ''
    message.success('装车确认成功')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '扫码交接失败')
  } finally {
    operating.value = false
    await focusScan()
  }
}

function openException(line: handoverApi.OutboundHandoverLineDto) {
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
    applyDetail(await handoverApi.markException(id.value, {
      lineId: exceptionLine.value.id,
      exceptionType: exceptionForm.value.exceptionType.trim(),
      remark: exceptionForm.value.remark.trim(),
    }))
    exceptionModalVisible.value = false
    message.success('异常已登记')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '登记异常失败')
  } finally {
    operating.value = false
  }
}

function openCompleteModal() {
  receiverName.value = handover.value?.receiverName || ''
  completeModalVisible.value = true
}

async function completeHandover() {
  operating.value = true
  try {
    await handoverApi.complete(id.value, receiverName.value.trim() || null)
    completeModalVisible.value = false
    message.success('交接完成，库存已正式扣减')
    await loadDetail()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '完成交接失败')
  } finally {
    operating.value = false
  }
}

function cancelHandover() {
  dialog.warning({
    title: '取消出库交接',
    content: '取消后不扣减库存，关联复核单可以重新创建交接。是否继续？',
    positiveText: '确认取消',
    negativeText: '返回',
    onPositiveClick: async () => {
      operating.value = true
      try {
        await handoverApi.cancel(id.value)
        message.success('交接单已取消')
        await loadDetail()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '取消交接失败')
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
  if (scannable.value) await focusScan()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-descriptions bordered label-placement="left" :column="3" style="width: 100%">
        <n-descriptions-item label="交接单号"><CopyableText :value="handover?.handoverNo || '-'" strong /></n-descriptions-item>
        <n-descriptions-item label="状态"><WmsStatusTag size="small" :type="statusType(handover?.status)">{{ statusLabel(handover?.status) }}</WmsStatusTag></n-descriptions-item>
        <n-descriptions-item label="装车进度">
          <div class="progress-cell">
            <n-progress type="line" :percentage="percentage" :show-indicator="false" style="width: 100px" />
            <span>{{ handover?.loadedLineCount ?? 0 }} / {{ handover?.totalLineCount ?? 0 }}</span>
          </div>
        </n-descriptions-item>
        <n-descriptions-item label="仓库">{{ handover ? `${handover.warehouseName} / ${handover.warehouseCode}` : '-' }}</n-descriptions-item>
        <n-descriptions-item label="开始时间">{{ date(handover?.startedAt) }}</n-descriptions-item>
        <n-descriptions-item label="完成时间">{{ date(handover?.completedAt) }}</n-descriptions-item>
        <n-descriptions-item label="来源复核单" :span="3">
          <div class="source-tags">
            <WmsStatusTag
              v-for="source in handover?.sources.filter(item => item.isActive) ?? []"
              :key="source.id"
              size="small"
              type="info"
            >
              {{ source.outboundReviewOrderNo }}
            </WmsStatusTag>
            <span v-if="!handover?.sources.some(item => item.isActive)">-</span>
          </div>
        </n-descriptions-item>
      </n-descriptions>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button @click="router.push({ name: 'OutboundHandoverList' })">返回列表</n-button>
        <n-button :disabled="!transportEditable || operating" @click="saveTransport">保存运输信息</n-button>
        <n-button type="primary" :disabled="!canStart || operating" @click="startHandover">开始交接</n-button>
        <n-button type="success" :disabled="!canComplete || operating" @click="openCompleteModal">完成交接</n-button>
        <n-button type="error" :disabled="!canCancel || operating" @click="cancelHandover">取消</n-button>
        <n-button :loading="loading" @click="loadDetail">刷新</n-button>
      </div>
    </template>

    <template #data>
      <div class="handover-workbench">
        <div class="transport-panel">
          <div class="section-title">运输与车辆信息</div>
          <n-form label-placement="left" label-width="82" class="transport-form">
            <n-form-item label="承运商编码"><n-input v-model:value="transportForm.carrierCode" :disabled="!transportEditable" /></n-form-item>
            <n-form-item label="承运商名称"><n-input v-model:value="transportForm.carrierName" :disabled="!transportEditable" /></n-form-item>
            <n-form-item label="司机"><n-input v-model:value="transportForm.driverName" :disabled="!transportEditable" /></n-form-item>
            <n-form-item label="司机电话"><n-input v-model:value="transportForm.driverPhone" :disabled="!transportEditable" /></n-form-item>
            <n-form-item label="车牌号"><n-input v-model:value="transportForm.vehicleNo" :disabled="!transportEditable" /></n-form-item>
            <n-form-item label="物流单号"><n-input v-model:value="transportForm.logisticsNo" :disabled="!transportEditable" /></n-form-item>
            <n-form-item label="计划发车">
              <n-date-picker v-model:value="transportForm.plannedDepartureTime" type="datetime" clearable :disabled="!transportEditable" style="width: 100%" />
            </n-form-item>
            <n-form-item label="备注"><n-input v-model:value="transportForm.remark" :disabled="!transportEditable" /></n-form-item>
          </n-form>
        </div>

        <n-alert
          v-if="handover?.status === handoverApi.OutboundHandoverStatus.Exception"
          type="error"
          title="存在交接异常"
          :bordered="false"
        >
          请处理异常库存后重新扫描，重新扫描通过会清除该行异常。
        </n-alert>

        <div class="scan-panel" :class="{ disabled: !scannable }">
          <div>
            <div class="section-title">扫描装车</div>
            <div class="scan-hint">支持盘号、库存二维码、SN；实物装车时逐条确认</div>
          </div>
          <n-input
            ref="scanInput"
            v-model:value="scanCode"
            size="large"
            clearable
            placeholder="请扫描装车库存"
            :disabled="!scannable || operating"
            @keyup.enter="submitScan"
          />
          <n-button type="primary" size="large" :disabled="!scannable || !scanCode.trim()" :loading="operating" @click="submitScan">确认</n-button>
        </div>

        <div class="section-title">交接明细（{{ handover?.lines.length ?? 0 }} 条）</div>
        <n-data-table
          class="crud-table-flat handover-lines"
          :columns="columns"
          :data="handover?.lines ?? []"
          :loading="loading"
          :bordered="false"
          :row-key="row => row.id"
        >
          <template #empty><n-empty description="暂无交接明细" /></template>
        </n-data-table>
      </div>
    </template>
  </BaseCrudPage>

  <n-modal v-model:show="exceptionModalVisible" preset="card" title="登记交接异常" style="width: min(520px, 92vw)" :mask-closable="false">
    <n-form label-placement="left" label-width="80">
      <n-form-item label="库存">{{ exceptionLine?.containerCode }} / {{ exceptionLine?.sn }}</n-form-item>
      <n-form-item label="异常类型" required>
        <n-input v-model:value="exceptionForm.exceptionType" maxlength="50" placeholder="例如：未装车、包装破损、装车不符" />
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

  <n-modal v-model:show="completeModalVisible" preset="card" title="确认交接并正式出库" style="width: min(520px, 92vw)" :mask-closable="false">
    <n-alert type="error" title="不可逆操作" :bordered="false">
      完成交接将立即扣减库存、更新销售订单已发数量并形成正式出库流水，重复提交会被后端拦截。
    </n-alert>
    <n-form-item label="接收人/签收人" style="margin-top: 18px">
      <n-input v-model:value="receiverName" placeholder="选填" maxlength="100" />
    </n-form-item>
    <template #footer>
      <div class="modal-footer">
        <n-button @click="completeModalVisible = false">取消</n-button>
        <n-button type="error" :loading="operating" @click="completeHandover">确认交接并出库</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.handover-workbench {
  display: flex;
  min-height: 0;
  flex: 1 1 0;
  flex-direction: column;
  gap: 10px;
}

.progress-cell,
.source-tags,
.scan-panel,
.modal-footer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.source-tags {
  flex-wrap: wrap;
}

.transport-panel,
.scan-panel {
  flex: 0 0 auto;
  padding: 12px 14px;
  border: 1px solid var(--wms-border-subtle);
  border-radius: 8px;
  background: var(--wms-surface-muted);
}

.transport-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 12px;
  margin-top: 10px;
}

.transport-form :deep(.n-form-item) {
  margin-bottom: 4px;
}

.scan-panel > :first-child {
  min-width: 230px;
}

.scan-panel .n-input {
  max-width: 620px;
}

.section-title {
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

.handover-lines {
  min-height: 0;
  flex: 1 1 0;
}

.modal-footer {
  justify-content: flex-end;
}

@media (max-width: 1200px) {
  .transport-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
