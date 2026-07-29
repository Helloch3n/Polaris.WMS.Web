<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NDataTable, NDescriptions, NDescriptionsItem, NEmpty, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import * as waveApi from '../../../api/outbound/wave'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import DetailWorkbench from '../../../components/DetailWorkbench.vue'
import { withResizable } from '../../../utils/table'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const id = computed(() => String(route.params.id ?? ''))
const loading = ref(false)
const wave = ref<waveApi.WaveOrderDto | null>(null)

function statusLabel(status?: number) {
  if (status === waveApi.WaveOrderStatus.Created) return '新创建'
  if (status === waveApi.WaveOrderStatus.Released) return '已释放'
  if (status === waveApi.WaveOrderStatus.Completed) return '已完成'
  if (status === waveApi.WaveOrderStatus.Cancelled) return '已取消'
  return '-'
}

function statusType(status?: number) {
  if (status === waveApi.WaveOrderStatus.Created) return 'info' as const
  if (status === waveApi.WaveOrderStatus.Released) return 'warning' as const
  if (status === waveApi.WaveOrderStatus.Completed) return 'success' as const
  if (status === waveApi.WaveOrderStatus.Cancelled) return 'default' as const
  return 'default' as const
}

function date(value?: string | null) {
  if (!value) return '-'
  const result = new Date(value)
  return Number.isNaN(result.getTime()) ? value : result.toLocaleString('zh-CN', { hour12: false })
}

const columns: DataTableColumns<waveApi.WaveOrderLineDto> = withResizable([
  { title: '配货单号', key: 'salesAllocationOrderNo', minWidth: 170, render: row => row.salesAllocationOrderNo ? hCopy(row.salesAllocationOrderNo) : '-' },
  { title: '客户', key: 'customerName', minWidth: 160, render: row => `${row.customerName} / ${row.customerCode}` },
  { title: '物料编码', key: 'productCode', minWidth: 150, render: row => hCopy(row.productCode) },
  { title: '物料名称', key: 'productName', minWidth: 180 },
  { title: '数量', key: 'qty', width: 110, align: 'right', render: row => row.qty.toLocaleString('zh-CN', { maximumFractionDigits: 4 }) },
])

function hCopy(value: string) {
  return h(CopyableText, { value })
}

async function loadDetail() {
  loading.value = true
  try {
    wave.value = await waveApi.get(id.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载波次详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <DetailWorkbench :show-header="false" :loading="loading">
        <template #summary>
          <div class="detail-action-bar">
            <n-button @click="router.push({ name: 'WaveManagement' })">返回列表</n-button>
            <n-button :loading="loading" @click="loadDetail">刷新</n-button>
          </div>
          <n-descriptions bordered label-placement="left" :column="3">
            <n-descriptions-item label="波次号"><CopyableText :value="wave?.waveNo || '-'" strong /></n-descriptions-item>
            <n-descriptions-item label="状态"><WmsStatusTag size="small" :type="statusType(wave?.status)">{{ statusLabel(wave?.status) }}</WmsStatusTag></n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ date(wave?.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="仓库">{{ wave ? `${wave.warehouseName} / ${wave.warehouseCode}` : '-' }}</n-descriptions-item>
            <n-descriptions-item label="明细行数">{{ wave?.lines?.length ?? 0 }}</n-descriptions-item>
            <n-descriptions-item label="备注" :span="3">{{ wave?.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
        </template>
      </DetailWorkbench>
    </template>
    <template #data>
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="wave?.lines ?? []" :bordered="false" :row-key="row => row.id">
        <template #empty><n-empty description="暂无波次明细" /></template>
      </n-data-table>
    </template>
  </BaseCrudPage>
</template>

<style scoped>
.detail-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
