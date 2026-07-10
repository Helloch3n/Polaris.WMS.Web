<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DetailWorkbench',
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { NSpin } from 'naive-ui'
import type { TagType } from '../utils/statusTag'
import WmsStatusTag from './WmsStatusTag.vue'

const props = withDefaults(defineProps<{
  title?: string | number | null
  subtitle?: string | number | null
  statusLabel?: string | number | null
  statusType?: TagType
  loading?: boolean
  showHeader?: boolean
}>(), {
  title: '详情',
  subtitle: '',
  statusLabel: '',
  statusType: 'default',
  loading: false,
  showHeader: true,
})

const displayTitle = computed(() => {
  if (props.title === null || props.title === undefined || props.title === '') {
    return '详情'
  }
  return String(props.title)
})

const displaySubtitle = computed(() => {
  if (props.subtitle === null || props.subtitle === undefined || props.subtitle === '') {
    return ''
  }
  return String(props.subtitle)
})

defineSlots<{
  actions?: () => any
  metrics?: () => any
  summary?: () => any
}>()
</script>

<template>
  <section class="detail-workbench">
    <div v-if="props.showHeader" class="detail-workbench-toolbar">
      <div class="detail-workbench-title-area">
        <div class="detail-workbench-title-row">
          <h1 class="detail-workbench-title">{{ displayTitle }}</h1>
          <WmsStatusTag
            v-if="props.statusLabel"
            :label="props.statusLabel"
            :type="props.statusType"
          />
        </div>
        <div v-if="displaySubtitle" class="detail-workbench-subtitle">{{ displaySubtitle }}</div>
      </div>

      <div v-if="$slots.actions" class="detail-workbench-actions">
        <slot name="actions" />
      </div>
    </div>

    <n-spin :show="props.loading">
      <div v-if="$slots.metrics" class="detail-workbench-metrics">
        <slot name="metrics" />
      </div>

      <div v-if="$slots.summary" class="detail-workbench-summary">
        <slot name="summary" />
      </div>
    </n-spin>
  </section>
</template>

<style scoped>
.detail-workbench {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-workbench-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.detail-workbench-title-area {
  min-width: 0;
}

.detail-workbench-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.detail-workbench-title {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 700;
  color: var(--wms-text-primary);
}

.detail-workbench-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--wms-text-muted);
}

.detail-workbench-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.detail-workbench-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.detail-workbench-summary {
  width: 100%;
}

:deep(.n-descriptions) {
  --n-th-color: var(--wms-surface-muted);
  --n-td-color: var(--wms-surface-panel);
}

:deep(.n-descriptions-table-header) {
  color: var(--wms-text-secondary);
  font-weight: 600;
}

@media (max-width: 760px) {
  .detail-workbench-toolbar {
    flex-direction: column;
  }

  .detail-workbench-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
