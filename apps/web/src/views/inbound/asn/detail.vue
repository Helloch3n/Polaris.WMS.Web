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

import * as asnApi from '../../../api/inbound/asn'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import { withResizable } from '../../../utils/table'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const detail = ref<asnApi.AsnDto | null>(null)

const detailId = computed(() => String(route.params.id ?? ''))

function resolveAsnStatusLabel(raw: asnApi.AsnStatus | undefined): string {
  const status = raw == null ? '' : String(raw)
  if (status === String(asnApi.AsnStatus.Pending) || status === 'Pending') return '待收货'
  if (status === String(asnApi.AsnStatus.Receiving) || status === 'Receiving') return '收货中'
  if (status === String(asnApi.AsnStatus.Completed) || status === 'Completed') return '已完成'
  return raw == null ? '-' : String(raw)
}

function getAsnStatusTagType(raw: asnApi.AsnStatus | undefined) {
  const label = resolveAsnStatusLabel(raw)
  if (label === '待收货') return 'warning'
  if (label === '收货中') return 'info'
  if (label === '已完成') return 'success'
  return 'default'
}

function formatQuantity(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const detailRows = computed(() => detail.value?.details ?? [])

const columns = computed<DataTableColumns<asnApi.AsnDetailDto>>(() =>
  withResizable([
    { title: 'ASN行号', key: 'scmAsnRowNo', minWidth: 120, render: (row) => row.scmAsnRowNo || '-' },
    { title: '来源采购单号', key: 'sourcePoNo', minWidth: 140, render: (row) => row.sourcePoNo || '-' },
    { title: '来源行号', key: 'sourcePoLineNo', width: 100, align: 'center', render: (row) => row.sourcePoLineNo ?? '-' },
    { title: '物料编码', key: 'productCode', minWidth: 140, render: (row) => row.productCode || '-' },
    { title: '物料名称', key: 'productName', minWidth: 180, render: (row) => row.productName || '-' },
    { title: '供应商批次', key: 'supplierBatchNo', minWidth: 140, render: (row) => row.supplierBatchNo || '-' },
    { title: '载具号', key: 'licensePlate', minWidth: 120, render: (row) => row.licensePlate || '-' },
    { title: '单位', key: 'uom', width: 90, align: 'center', render: (row) => row.uom || '-' },
    { title: '预计数量', key: 'expectedQty', width: 110, align: 'right', render: (row) => formatQuantity(row.expectedQty) },
    { title: '已收数量', key: 'receivedQty', width: 110, align: 'right', render: (row) => formatQuantity(row.receivedQty) },
  ]),
)

async function loadDetail() {
  if (!detailId.value) {
    message.error('缺少 ASN Id，无法查看')
    return
  }

  loading.value = true
  try {
    detail.value = await asnApi.get(detailId.value)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载 ASN 详情失败')
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.push({ name: 'AsnList' })
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
            <n-descriptions-item label="ASN单号">{{ detail?.asnNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag size="small" :type="getAsnStatusTagType(detail?.status)">
                {{ resolveAsnStatusLabel(detail?.status) }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="预计到货">{{ formatDateTime(detail?.expectedArrivalTime) }}</n-descriptions-item>
            <n-descriptions-item label="供应商编码">{{ detail?.supplierCode || '-' }}</n-descriptions-item>
            <n-descriptions-item label="供应商名称" :span="2">{{ detail?.supplierName || '-' }}</n-descriptions-item>
          </n-descriptions>
        </n-spin>
      </div>
    </template>

    <template #data>
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="detailRows" :bordered="false">
        <template #empty>
          <n-empty description="暂无 ASN 明细" />
        </template>
      </n-data-table>
    </template>
  </BaseCrudPage>
</template>
