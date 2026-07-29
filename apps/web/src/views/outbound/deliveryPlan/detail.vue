<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
import { computed, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NDataTable, NDescriptions, NDescriptionsItem, NEmpty, NForm, NFormItem, NModal, NSelect, NSpace, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as planApi from '../../../api/outbound/salesDeliveryPlan'
import * as allocationApi from '../../../api/outbound/salesAllocationOrder'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import CopyableText from '../../../components/CopyableText.vue'
import DetailWorkbench from '../../../components/DetailWorkbench.vue'
import { usePermission } from '../../../composables/usePermission'
import { withResizable } from '../../../utils/table'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const { hasPermission } = usePermission()
const canCreateAllocation = computed(() => hasPermission('WMS.OutboundOps.SalesAllocationOrders.Create'))
const loading = ref(false)
const plan = ref<planApi.SalesDeliveryPlanDto | null>(null)
const planId = computed(() => String(route.params.id ?? ''))
const allocationModalVisible = ref(false)
const allocationCreating = ref(false)
const allocationWarehouseId = ref<string | null>(null)
const allocationWarehouseOptions = computed(() => {
  const map = new Map<string, string>()
  for (const detail of plan.value?.details ?? []) {
    map.set(detail.warehouseId, `${detail.warehouseName} / ${detail.warehouseCode}`)
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }))
})

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function formatNumber(value?: number | null, digits = 4) {
  if (value == null) return '-'
  return value.toLocaleString('zh-CN', { maximumFractionDigits: digits })
}

function formatMoney(value?: number | null) {
  if (value == null) return '-'
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusMeta(status?: planApi.SalesDeliveryPlanStatus) {
  if (status === planApi.SalesDeliveryPlanStatus.PendingAllocation) return { label: '待配货', type: 'warning' as const }
  if (status === planApi.SalesDeliveryPlanStatus.PartiallyAllocated) return { label: '部分配货', type: 'info' as const }
  if (status === planApi.SalesDeliveryPlanStatus.Allocated) return { label: '已配货', type: 'success' as const }
  if (status === planApi.SalesDeliveryPlanStatus.Executing) return { label: '执行中', type: 'primary' as const }
  if (status === planApi.SalesDeliveryPlanStatus.Completed) return { label: '已完成', type: 'success' as const }
  if (status === planApi.SalesDeliveryPlanStatus.Cancelled) return { label: '已取消', type: 'error' as const }
  return { label: '-', type: 'default' as const }
}

function fullAddress(row: planApi.SalesDeliveryPlanDetailDto) {
  return [row.country, row.province, row.city, row.district, row.address].filter(Boolean).join(' ') || '-'
}

const columns = computed<DataTableColumns<planApi.SalesDeliveryPlanDetailDto>>(() => withResizable([
  { title: '行号', key: 'lineNo', width: 76, align: 'center' },
  { title: '订单行号', key: 'salesOrderLineNo', width: 100, align: 'center' },
  { title: '物料编码', key: 'productCode', minWidth: 150, render: (row) => h(CopyableText, { value: row.productCode }) },
  { title: '物料名称', key: 'productName', minWidth: 180 },
  { title: '仓库', key: 'warehouseName', minWidth: 180, render: (row) => `${row.warehouseName} / ${row.warehouseCode}` },
  { title: '计划数量', key: 'plannedQty', width: 120, align: 'right', render: (row) => formatNumber(row.plannedQty) },
  { title: '单位', key: 'unit', width: 80, align: 'center' },
  { title: '单价', key: 'unitPrice', width: 120, align: 'right', render: (row) => formatNumber(row.unitPrice, 6) },
  { title: '行金额', key: 'lineAmount', width: 130, align: 'right', render: (row) => formatMoney(row.lineAmount) },
  { title: '计划发货日期', key: 'plannedDeliveryDate', width: 180, render: (row) => formatDateTime(row.plannedDeliveryDate) },
  { title: '收货人', key: 'consigneeName', width: 120, render: (row) => row.consigneeName || '-' },
  { title: '联系电话', key: 'phone', width: 140, render: (row) => row.phone || '-' },
  { title: '到货地址', key: 'address', minWidth: 260, render: fullAddress },
  { title: '订单描述', key: 'orderDescription', minWidth: 200, render: (row) => row.orderDescription || '-' },
  { title: '工艺版本', key: 'technicalVersion', width: 120, render: (row) => row.technicalVersion || '-' },
  { title: '特殊要求', key: 'specialRequirements', minWidth: 200, render: (row) => row.specialRequirements || '-' },
  { title: '净重', key: 'netWeight', width: 110, align: 'right', render: (row) => formatNumber(row.netWeight, 6) },
  { title: '毛重', key: 'grossWeight', width: 110, align: 'right', render: (row) => formatNumber(row.grossWeight, 6) },
  { title: '备注', key: 'remark', minWidth: 180, render: (row) => row.remark || '-' },
]))

async function loadDetail() {
  if (!planId.value) return
  loading.value = true
  try {
    plan.value = await planApi.get(planId.value)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载销售发运计划详情失败')
  } finally {
    loading.value = false
  }
}

function openAllocation() {
  allocationWarehouseId.value = allocationWarehouseOptions.value[0]?.value ?? null
  allocationModalVisible.value = true
}

async function createAllocation() {
  if (!plan.value || !allocationWarehouseId.value) return
  allocationCreating.value = true
  try {
    const result = await allocationApi.createFromPlan({
      salesDeliveryPlanId: plan.value.id,
      warehouseId: allocationWarehouseId.value,
    })
    allocationModalVisible.value = false
    await router.push({ name: 'SalesAllocationOrderDetail', params: { id: result.id } })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建销售配货失败')
  } finally {
    allocationCreating.value = false
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
            <n-button @click="router.push({ name: 'SalesDeliveryPlanList' })">返回列表</n-button>
            <n-button
              v-if="canCreateAllocation"
              type="primary"
              :disabled="!plan || plan.status === planApi.SalesDeliveryPlanStatus.Cancelled"
              @click="openAllocation"
            >
              配货
            </n-button>
            <n-button :loading="loading" @click="loadDetail">刷新</n-button>
          </div>
          <n-descriptions bordered label-placement="left" :column="3">
            <n-descriptions-item label="发货计划单号"><CopyableText :value="plan?.planNo || '-'" strong /></n-descriptions-item>
            <n-descriptions-item label="计划状态"><WmsStatusTag size="small" :type="statusMeta(plan?.status).type">{{ statusMeta(plan?.status).label }}</WmsStatusTag></n-descriptions-item>
            <n-descriptions-item label="计划日期">{{ formatDateTime(plan?.planDate) }}</n-descriptions-item>
            <n-descriptions-item label="销售订单"><CopyableText :value="plan?.salesOrderNo || '-'" /></n-descriptions-item>
            <n-descriptions-item label="客户">{{ plan ? `${plan.customerName} / ${plan.customerCode}` : '-' }}</n-descriptions-item>
            <n-descriptions-item label="合同号">{{ plan?.contractNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="承运商">{{ plan?.carrierName ? `${plan.carrierName}${plan.carrierCode ? ` / ${plan.carrierCode}` : ''}` : '-' }}</n-descriptions-item>
            <n-descriptions-item label="销售总金额">{{ formatMoney(plan?.totalSalesAmount) }}</n-descriptions-item>
            <n-descriptions-item label="ERP状态">{{ plan?.sourceStatusCode || '-' }}</n-descriptions-item>
            <n-descriptions-item label="ERP更新时间">{{ formatDateTime(plan?.sourceUpdatedAt) }}</n-descriptions-item>
            <n-descriptions-item label="最后同步时间">{{ formatDateTime(plan?.lastSyncedAt) }}</n-descriptions-item>
            <n-descriptions-item label="涉及仓库">{{ plan?.warehouseNames || '-' }}</n-descriptions-item>
            <n-descriptions-item label="备注" :span="3">{{ plan?.remark || '-' }}</n-descriptions-item>
          </n-descriptions>
        </template>
      </DetailWorkbench>
    </template>

    <template #data>
      <n-data-table
        class="crud-table-flat"
        :loading="loading"
        :columns="columns"
        :data="plan?.details ?? []"
        :bordered="false"
        :row-key="(row) => row.id"
      >
        <template #empty><n-empty description="暂无发货计划明细" /></template>
      </n-data-table>
    </template>
  </BaseCrudPage>
  <n-modal v-model:show="allocationModalVisible" preset="card" title="创建销售配货" style="width: 520px">
    <n-form label-width="100">
      <n-form-item label="发货计划">{{ plan?.planNo }}</n-form-item>
      <n-form-item label="配货仓库">
        <n-select v-model:value="allocationWarehouseId" :options="allocationWarehouseOptions" placeholder="请选择仓库" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="allocationModalVisible = false">取消</n-button>
        <n-button type="primary" :disabled="!allocationWarehouseId" :loading="allocationCreating" @click="createAllocation">
          创建并进入配货
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
.detail-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
