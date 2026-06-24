<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NDataTable,
  NInput,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as stocktakeApi from '../../../api/inventory/stocktake'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const orderId = ref(String(route.params.id))
const loading = ref(false)
const order = ref<stocktakeApi.StocktakeOrderDto | null>(null)

// 差异原因映射：detailId -> discrepancyReason
const reasons = ref<Record<string, string>>({})

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function resolveStatusLabel(status?: stocktakeApi.StocktakeOrderStatus) {
  if (status === stocktakeApi.StocktakeOrderStatus.Draft) return '草稿'
  if (status === stocktakeApi.StocktakeOrderStatus.Locked) return '待执行(已锁定)'
  if (status === stocktakeApi.StocktakeOrderStatus.InProgress) return '盘点中'
  if (status === stocktakeApi.StocktakeOrderStatus.InApproval) return '待审核'
  if (status === stocktakeApi.StocktakeOrderStatus.Completed) return '已完成'
  if (status === stocktakeApi.StocktakeOrderStatus.Cancelled) return '已取消'
  return '-'
}

function getStatusTagType(status?: stocktakeApi.StocktakeOrderStatus) {
  if (status === stocktakeApi.StocktakeOrderStatus.Draft) return 'default'
  if (status === stocktakeApi.StocktakeOrderStatus.Locked) return 'warning'
  if (status === stocktakeApi.StocktakeOrderStatus.InProgress) return 'info'
  if (status === stocktakeApi.StocktakeOrderStatus.InApproval) return 'primary'
  if (status === stocktakeApi.StocktakeOrderStatus.Completed) return 'success'
  if (status === stocktakeApi.StocktakeOrderStatus.Cancelled) return 'error'
  return 'default'
}

function resolveModeLabel(mode?: stocktakeApi.StocktakeMode) {
  if (mode === stocktakeApi.StocktakeMode.Dynamic) return '动碰盘点'
  if (mode === stocktakeApi.StocktakeMode.Cycle) return '循环盘点'
  if (mode === stocktakeApi.StocktakeMode.AreaStatic) return '库位静态盘点'
  if (mode === stocktakeApi.StocktakeMode.DetailSelection) return '明细抽盘'
  return '-'
}

const columns: DataTableColumns<stocktakeApi.StocktakeOrderDetailDto> = [
  {
    title: '库位',
    key: 'sourceLocationCode',
    minWidth: 120,
  },
  {
    title: '容器/托盘',
    key: 'containerCode',
    minWidth: 130,
    render: (row) => row.containerCode || '-',
  },
  {
    title: '物料编码',
    key: 'productCode',
    minWidth: 140,
  },
  {
    title: '物料名称',
    key: 'productName',
    minWidth: 180,
  },
  {
    title: '盘号/SN',
    key: 'sn',
    minWidth: 140,
    render: (row) => row.sn || '-',
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 130,
    render: (row) => row.batchNo || '-',
  },
  {
    title: '账面数量',
    key: 'snapshotQty',
    minWidth: 100,
  },
  {
    title: '实盘数量',
    key: 'realQty',
    minWidth: 100,
    render: (row) => (row.realQty !== null && row.realQty !== undefined ? row.realQty : '-'),
  },
  {
    title: '差异数量',
    key: 'diff',
    minWidth: 100,
    render: (row) => {
      if (row.realQty === null || row.realQty === undefined) return '-'
      const diff = row.realQty - row.snapshotQty
      if (diff === 0) return h('span', { style: { color: 'var(--n-text-color-disabled)' } }, '0')
      const color = diff > 0 ? 'var(--n-success-color)' : 'var(--n-error-color)'
      const prefix = diff > 0 ? '+' : ''
      return h('span', { style: { color, fontWeight: 'bold' } }, `${prefix}${diff}`)
    },
  },
  {
    title: '盘点状态',
    key: 'countStatus',
    minWidth: 110,
    render: (row) => {
      if (row.countStatus === stocktakeApi.CountStatus.NotCounted) {
        return h(NTag, { size: 'small', type: 'default' }, { default: () => '未盘' })
      }
      if (row.countStatus === stocktakeApi.CountStatus.Matched) {
        return h(NTag, { size: 'small', type: 'success' }, { default: () => '吻合' })
      }
      if (row.countStatus === stocktakeApi.CountStatus.Discrepancy) {
        return h(NTag, { size: 'small', type: 'error' }, { default: () => '差异' })
      }
      return '-'
    },
  },
  {
    title: '盘点人',
    key: 'counterName',
    minWidth: 110,
    render: (row) => row.counterName || '-',
  },
  {
    title: '盘点时间',
    key: 'countTime',
    minWidth: 160,
    render: (row) => formatDateTime(row.countTime),
  },
  {
    title: '差异原因',
    key: 'discrepancyReason',
    minWidth: 200,
    render: (row) => {
      const isPendingApproval = order.value?.status === stocktakeApi.StocktakeOrderStatus.InApproval
      const hasDiff = row.countStatus === stocktakeApi.CountStatus.Discrepancy

      if (isPendingApproval && hasDiff) {
        return h(NInput, {
          size: 'small',
          value: reasons.value[row.id] || '',
          placeholder: '请输入差异备注...',
          onUpdateValue: (val) => {
            reasons.value[row.id] = val
          },
        })
      }
      return row.discrepancyReason || '-'
    },
  },
]

async function loadData() {
  loading.value = true
  try {
    const data = await stocktakeApi.get(orderId.value)
    order.value = data
    // 初始化差异原因
    if (data.details) {
      data.details.forEach((d) => {
        reasons.value[d.id] = d.discrepancyReason || ''
      })
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

// 锁定并执行盘点
async function handleStart() {
  if (!order.value) return
  dialog.warning({
    title: '确认执行',
    content: '确定要锁定并开始执行当前盘点计划吗？系统将冻结涉及容器/库位！',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await stocktakeApi.startStocktake(orderId.value)
        message.success('已锁定并开始执行，可引导现场使用 PDA 盲盘')
        await loadData()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '执行失败')
      }
    },
  })
}

// 提交审核
async function handleSubmitApproval() {
  if (!order.value) return
  // 检查是否所有明细均已盘点
  const uncounted = order.value.details.some(
    (d) => d.countStatus === stocktakeApi.CountStatus.NotCounted,
  )
  if (uncounted) {
    dialog.warning({
      title: '存在未盘明细',
      content: '当前盘点计划中仍有库位/容器尚未执行盘点，确定要强行提交审核吗？未盘物料系统将无法处理。',
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: submitAction,
    })
  } else {
    submitAction()
  }

  async function submitAction() {
    try {
      await stocktakeApi.submitForApproval(orderId.value)
      message.success('已提交审核')
      await loadData()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '提交失败')
    }
  }
}

// 审核过账
async function handleApproveAndPost() {
  if (!order.value) return
  dialog.warning({
    title: '确认审核过账',
    content: '审核过账后系统将自动进行库存调整（扣减盘亏、增加盘盈），且不可逆，确定过账并解锁吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const dto: stocktakeApi.ApproveStocktakeDto = {
          discrepancyReasons: Object.keys(reasons.value).map((id) => ({
            detailId: id,
            discrepancyReason: reasons.value[id],
          })),
        }
        await stocktakeApi.approveAndPost(orderId.value, dto)
        message.success('盘点差异已完成审核与库存过账调整！相关资源已被解锁。')
        await loadData()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '过账失败')
      }
    },
  })
}

// 驳回
async function handleReject() {
  if (!order.value) return
  dialog.warning({
    title: '确认驳回',
    content: '驳回后，原实盘数据将被清空，盘点状态退回到“已锁定”状态，可重新进行 PDA 盘点，确定吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await stocktakeApi.rejectStocktake(orderId.value)
        message.success('已成功驳回，已锁定资源可重新扫描盘点')
        await loadData()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '驳回失败')
      }
    },
  })
}

// 取消盘点
async function handleCancel() {
  if (!order.value) return
  dialog.warning({
    title: '确认取消',
    content: '取消后盘点计划将被作废，所有锁定的库位与盘具容器将会被自动解锁。确定取消吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await stocktakeApi.cancel(orderId.value)
        message.success('盘点计划已取消并解锁')
        await loadData()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '取消失败')
      }
    },
  })
}

function handleBack() {
  router.push({ name: 'StocktakeManagement' })
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">
    <div class="header-bar">
      <div class="title-section">
        <n-button class="back-btn" secondary size="small" @click="handleBack">返回</n-button>
        <span class="page-title">盘点单详情 - {{ order?.orderNo }}</span>
      </div>

      <div class="action-section">
        <n-space>
          <!-- 草稿状态 -->
          <template v-if="order?.status === stocktakeApi.StocktakeOrderStatus.Draft">
            <n-button type="warning" @click="handleStart">锁定并执行</n-button>
            <n-button type="error" ghost @click="handleCancel">取消盘点</n-button>
          </template>

          <!-- 待执行(已锁定) 或 盘点中 状态 -->
          <template
            v-if="
              order?.status === stocktakeApi.StocktakeOrderStatus.Locked ||
              order?.status === stocktakeApi.StocktakeOrderStatus.InProgress
            "
          >
            <n-button type="primary" @click="handleSubmitApproval">提交审核</n-button>
            <n-button type="error" ghost @click="handleCancel">取消盘点</n-button>
          </template>

          <!-- 待审核 状态 -->
          <template v-if="order?.status === stocktakeApi.StocktakeOrderStatus.InApproval">
            <n-button type="primary" @click="handleApproveAndPost">审核过账</n-button>
            <n-button type="warning" ghost @click="handleReject">驳回盘点</n-button>
            <n-button type="error" ghost @click="handleCancel">取消盘点</n-button>
          </template>
        </n-space>
      </div>
    </div>

    <!-- 盘点单头表信息 -->
    <n-card class="detail-card info-card" :bordered="false" size="small">
      <n-descriptions label-placement="left" bordered :column="4" size="small">
        <n-descriptions-item label="单据号">{{ order?.orderNo }}</n-descriptions-item>
        <n-descriptions-item label="仓库">{{ order?.warehouseName }} ({{ order?.warehouseCode }})</n-descriptions-item>
        <n-descriptions-item label="盘点状态">
          <n-tag :type="getStatusTagType(order?.status)" round size="small">
            {{ resolveStatusLabel(order?.status) }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="盘点模式">{{ resolveModeLabel(order?.mode) }}</n-descriptions-item>
        <n-descriptions-item label="快照冻结时间">{{ formatDateTime(order?.frozenTime) }}</n-descriptions-item>
        <n-descriptions-item label="备注说明" :span="2">{{ order?.description || '-' }}</n-descriptions-item>
        <n-descriptions-item label="创建时间">{{ formatDateTime(order?.creationTime) }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- 盘点单明细表 -->
    <n-card title="盘点明细清单" class="detail-card" :bordered="false" size="small">
      <n-data-table
        :loading="loading"
        :columns="columns"
        :data="order?.details ?? []"
        :row-key="(row) => row.id"
        :bordered="false"
      />
    </n-card>
  </div>
</template>

<style scoped>
.page-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--n-card-color);
  padding: 12px 16px;
  border-radius: 4px;
}
.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
}
.detail-card {
  border-radius: 4px;
}
.info-card {
  padding-top: 10px;
}
</style>
