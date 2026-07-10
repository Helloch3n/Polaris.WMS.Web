<script setup lang="ts">
import type { CSSProperties } from 'vue'
import {
  NDescriptions,
  NDescriptionsItem,
  NInput,
  NSelect,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'

import * as productionInboundApi from '../../../../api/inbound/productionInbound'
import CopyableText from '../../../../components/CopyableText.vue'
import WmsStatusTag from '../../../../components/WmsStatusTag.vue'

const props = withDefaults(defineProps<{
  mode?: 'readonly' | 'editable'
  model: productionInboundApi.ProductionInboundDto | null
  inboundTypeOptions?: SelectOption[]
  sourceDepartmentOptions?: SelectOption[]
  targetWarehouseOptions?: SelectOption[]
  departmentLoading?: boolean
  warehouseLoading?: boolean
  sourceDepartmentLocked?: boolean
  targetWarehouseLocked?: boolean
  labelStyle?: CSSProperties
  contentStyle?: CSSProperties
}>(), {
  mode: 'readonly',
  inboundTypeOptions: () => [],
  sourceDepartmentOptions: () => [],
  targetWarehouseOptions: () => [],
  departmentLoading: false,
  warehouseLoading: false,
  sourceDepartmentLocked: false,
  targetWarehouseLocked: false,
})

const emit = defineEmits<{
  (e: 'update:sourceOrderNo', value: string): void
  (e: 'update:inboundType', value: productionInboundApi.ProductionInboundType): void
  (e: 'update:sourceDepartmentId', value: string): void
  (e: 'update:targetWarehouseId', value: string): void
}>()

const defaultLabelStyle = {
  width: '136px',
}

const defaultContentStyle = {
  minWidth: '220px',
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizeInboundTypeValue(value: productionInboundApi.ProductionInboundType) {
  if (typeof value === 'string') {
    if (value === 'FinishedProduct' || value === '10') return productionInboundApi.ProductionInboundType.FinishedProduct
    if (value === 'SemiFinishedProduct' || value === '20') return productionInboundApi.ProductionInboundType.SemiFinishedProduct
    if (value === 'WorkInProgress' || value === '30') return productionInboundApi.ProductionInboundType.WorkInProgress
  }
  if (typeof value === 'number') return value
  return null
}

function resolveInboundTypeLabel(value?: productionInboundApi.ProductionInboundType) {
  if (value == null) return '-'
  const normalized = normalizeInboundTypeValue(value)
  if (normalized === productionInboundApi.ProductionInboundType.FinishedProduct) return '成品入库'
  if (normalized === productionInboundApi.ProductionInboundType.SemiFinishedProduct) return '半成品入库'
  if (normalized === productionInboundApi.ProductionInboundType.WorkInProgress) return '工序品/在制品入库'
  return '-'
}

function normalizeStatusValue(status?: productionInboundApi.ProductionInboundStatus) {
  if (status == null) return null
  if (typeof status === 'string') {
    if (status === 'Draft' || status === '0') return productionInboundApi.ProductionInboundStatus.Draft
    if (status === 'InProgress' || status === '1') return productionInboundApi.ProductionInboundStatus.InProgress
    if (status === 'Completed' || status === '2') return productionInboundApi.ProductionInboundStatus.Completed
  }
  if (typeof status === 'number') return status
  return null
}

function resolveStatusLabel(status?: productionInboundApi.ProductionInboundStatus) {
  const value = normalizeStatusValue(status)
  if (value === productionInboundApi.ProductionInboundStatus.Draft) return '草稿'
  if (value === productionInboundApi.ProductionInboundStatus.InProgress) return '作业中'
  if (value === productionInboundApi.ProductionInboundStatus.Completed) return '已完成'
  return '-'
}

function getStatusTagType(status?: productionInboundApi.ProductionInboundStatus) {
  const value = normalizeStatusValue(status)
  if (value === productionInboundApi.ProductionInboundStatus.Draft) return 'default'
  if (value === productionInboundApi.ProductionInboundStatus.InProgress) return 'warning'
  if (value === productionInboundApi.ProductionInboundStatus.Completed) return 'success'
  return 'default'
}

function updateInboundType(value: string | number | null) {
  if (value == null) return
  emit('update:inboundType', value as productionInboundApi.ProductionInboundType)
}

function updateSourceDepartment(value: string | number | null) {
  emit('update:sourceDepartmentId', String(value ?? ''))
}

function updateTargetWarehouse(value: string | number | null) {
  emit('update:targetWarehouseId', String(value ?? ''))
}
</script>

<template>
  <n-descriptions
    class="production-inbound-header-table"
    bordered
    label-placement="left"
    :column="3"
    :label-style="props.labelStyle ?? defaultLabelStyle"
    :content-style="props.contentStyle ?? defaultContentStyle"
  >
    <n-descriptions-item label="入库单号">
      <CopyableText :value="props.model?.orderNo || '-'" strong />
    </n-descriptions-item>

    <n-descriptions-item v-if="props.mode === 'editable'">
      <template #label><span class="required-mark">*</span>来源单号</template>
      <n-input
        :value="props.model?.sourceOrderNo ?? ''"
        placeholder="请输入来源单号"
        maxlength="64"
        clearable
        @update:value="(value) => emit('update:sourceOrderNo', value)"
      />
    </n-descriptions-item>
    <n-descriptions-item v-else label="来源单号">
      <CopyableText :value="props.model?.sourceOrderNo" />
    </n-descriptions-item>

    <n-descriptions-item label="创建时间">
      {{ formatDateTime(props.model?.creationTime) }}
    </n-descriptions-item>

    <n-descriptions-item v-if="props.mode === 'editable'">
      <template #label><span class="required-mark">*</span>入库类型</template>
      <n-select
        :value="props.model?.inboundType"
        :options="props.inboundTypeOptions"
        placeholder="请选择入库类型"
        @update:value="updateInboundType"
      />
    </n-descriptions-item>
    <n-descriptions-item v-else label="入库类型">
      {{ resolveInboundTypeLabel(props.model?.inboundType) }}
    </n-descriptions-item>

    <n-descriptions-item v-if="props.mode === 'editable'">
      <template #label><span class="required-mark">*</span>来源部门</template>
      <n-select
        :value="props.model?.sourceDepartmentId"
        :options="props.sourceDepartmentOptions"
        :loading="props.departmentLoading"
        :disabled="props.sourceDepartmentLocked"
        :clearable="!props.sourceDepartmentLocked"
        :placeholder="props.sourceDepartmentLocked ? '来源部门已锁定' : '请选择来源部门'"
        filterable
        @update:value="updateSourceDepartment"
      />
    </n-descriptions-item>
    <n-descriptions-item v-else label="来源部门">
      {{ props.model?.sourceDepartmentName || props.model?.sourceDepartmentCode || '-' }}
    </n-descriptions-item>

    <n-descriptions-item v-if="props.mode === 'editable'">
      <template #label><span class="required-mark">*</span>目标入库仓库</template>
      <n-select
        :value="props.model?.targetWarehouseId"
        :options="props.targetWarehouseOptions"
        :loading="props.warehouseLoading"
        :disabled="props.targetWarehouseLocked"
        :clearable="!props.targetWarehouseLocked"
        :placeholder="props.targetWarehouseLocked ? '目标入库仓库已锁定' : '请选择目标入库仓库'"
        filterable
        @update:value="updateTargetWarehouse"
      />
    </n-descriptions-item>
    <n-descriptions-item v-else label="目标仓库">
      {{ props.model?.targetWarehouseName || props.model?.targetWarehouseCode || '-' }}
    </n-descriptions-item>

    <n-descriptions-item label="状态">
      <WmsStatusTag
        :label="resolveStatusLabel(props.model?.status)"
        :type="getStatusTagType(props.model?.status)"
      />
    </n-descriptions-item>
  </n-descriptions>
</template>

<style scoped>
.production-inbound-header-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.production-inbound-header-table :deep(.n-descriptions-table-header) {
  width: 136px;
  color: var(--wms-text-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
}

.production-inbound-header-table :deep(.n-descriptions-table-content) {
  color: var(--wms-text-primary);
  font-size: 13px;
  line-height: 20px;
}

.production-inbound-header-table :deep(.n-input),
.production-inbound-header-table :deep(.n-base-selection) {
  --n-height: 28px;
  font-size: 13px;
}

.production-inbound-header-table :deep(.n-input__input-el),
.production-inbound-header-table :deep(.n-base-selection-label),
.production-inbound-header-table :deep(.n-base-selection-input) {
  font-size: 13px;
  line-height: 20px;
}

.required-mark {
  color: var(--wms-status-error);
  margin-right: 4px;
  font-weight: 700;
}
</style>
