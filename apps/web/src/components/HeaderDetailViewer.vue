<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'HeaderDetailViewer',
})
</script>

<script setup lang="ts">
import {
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NEmpty,
  NModal,
  NSpin,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

type HeaderItem = {
  key: string
  label: string
  value?: string | number | boolean | null
}

const props = withDefaults(defineProps<{
  show: boolean
  title?: string
  loading?: boolean
  width?: string
  headerColumns?: number
  headerItems: HeaderItem[]
  detailTitle?: string
  detailColumns: DataTableColumns<Record<string, unknown>>
  detailData: Record<string, unknown>[]
  rowKey?: (row: Record<string, unknown>) => string | number
}>(), {
  title: '查看详情',
  loading: false,
  width: '960px',
  headerColumns: 3,
  detailTitle: '明细',
  rowKey: (row: Record<string, unknown>) => String(row.id ?? ''),
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

function updateShow(value: boolean) {
  emit('update:show', value)
}

function formatValue(value?: string | number | boolean | null) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}
</script>

<template>
  <n-modal :show="props.show" preset="card" :title="props.title" :style="{ width: props.width }" @update:show="updateShow">
    <n-spin :show="props.loading">
      <n-descriptions :column="props.headerColumns" label-placement="left" bordered>
        <n-descriptions-item v-for="item in props.headerItems" :key="item.key" :label="item.label">
          {{ formatValue(item.value) }}
        </n-descriptions-item>
      </n-descriptions>

      <n-divider>
        {{ props.detailTitle }}
      </n-divider>

      <n-data-table
        class="crud-table-flat"
        :columns="props.detailColumns"
        :data="props.detailData"
        :row-key="props.rowKey"
        :bordered="false"
      />

      <n-empty v-if="!props.loading && props.detailData.length === 0" description="暂无明细" />
    </n-spin>
  </n-modal>
</template>

<style scoped>
</style>
