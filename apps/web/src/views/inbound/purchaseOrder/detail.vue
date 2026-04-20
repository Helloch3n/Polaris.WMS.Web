<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as poApi from '../../../api/purchaseOrder'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { withResizable } from '../../../utils/table'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const detail = ref<poApi.PurchaseOrderDto | null>(null)

const detailId = computed(() => String(route.params.id ?? ''))

function resolvePoStatusLabel(raw: poApi.PurchaseOrderStatus | undefined): string {
  const status = raw == null ? '' : String(raw)
  if (status === String(poApi.PurchaseOrderStatus.Open) || status === 'Open') return '未收货'
  if (status === String(poApi.PurchaseOrderStatus.PartialReceived) || status === 'PartialReceived') return '部分收货'
  if (status === String(poApi.PurchaseOrderStatus.Completed) || status === 'Completed') return '已完成'
  if (status === String(poApi.PurchaseOrderStatus.Closed) || status === 'Closed') return '已关闭'
  return raw == null ? '-' : String(raw)
}

function getPoStatusTagType(raw: poApi.PurchaseOrderStatus | undefined) {
  const label = resolvePoStatusLabel(raw)
  if (label === '未收货') return 'warning'
  if (label === '部分收货') return 'info'
  if (label === '已完成') return 'success'
  return 'default'
}

function formatQuantity(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function formatDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const detailRows = computed(() => detail.value?.details ?? [])

const columns = computed<DataTableColumns<poApi.PurchaseOrderDetailDto>>(() =>
  withResizable([
    { title: '行号', key: 'lineNo', width: 80, align: 'center', render: (row) => row.lineNo ?? '-' },
    { title: '物料编码', key: 'productCode', minWidth: 140, render: (row) => row.productCode || '-' },
    { title: '物料名称', key: 'productName', minWidth: 180, render: (row) => row.productName || '-' },
    { title: '单位', key: 'uom', width: 90, align: 'center', render: (row) => row.uom || '-' },
    { title: '预计数量', key: 'expectedQty', width: 110, align: 'right', render: (row) => formatQuantity(row.expectedQty) },
    { title: '已收数量', key: 'receivedQty', width: 110, align: 'right', render: (row) => formatQuantity(row.receivedQty) },
    { title: '已发数量', key: 'deliveredQty', width: 110, align: 'right', render: (row) => formatQuantity(row.deliveredQty) },
    {
      title: '需质检',
      key: 'isQualityCheckRequired',
      width: 90,
      align: 'center',
      render: (row) => (row.isQualityCheckRequired ? '是' : '否'),
    },
  ]),
)

async function loadDetail() {
  if (!detailId.value) {
    message.error('缺少采购单 Id，无法查看')
    return
  }

  loading.value = true
  try {
    detail.value = await poApi.get(detailId.value)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载采购单详情失败')
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.push({ name: 'PurchaseOrderList' })
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
          <n-button type="primary" :loading="loading" @click="loadDetail">刷新</n-button>
        </div>

        <n-spin :show="loading" style="margin-top: 10px; width: 100%">
          <n-descriptions bordered :column="3" label-placement="left">
            <n-descriptions-item label="采购单号">{{ detail?.poNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag size="small" :type="getPoStatusTagType(detail?.status)">
                {{ resolvePoStatusLabel(detail?.status) }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="下单日期">{{ formatDate(detail?.orderDate) }}</n-descriptions-item>
            <n-descriptions-item label="预计交期">{{ formatDate(detail?.expectedDeliveryDate) }}</n-descriptions-item>
            <n-descriptions-item label="供应商编码">{{ detail?.supplierCode || '-' }}</n-descriptions-item>
            <n-descriptions-item label="供应商名称">{{ detail?.supplierName || '-' }}</n-descriptions-item>
          </n-descriptions>
        </n-spin>
      </div>
    </template>

    <template #data>
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="detailRows" :bordered="false">
        <template #empty>
          <n-empty description="暂无采购单明细" />
        </template>
      </n-data-table>
    </template>
  </BaseCrudPage>
</template>
