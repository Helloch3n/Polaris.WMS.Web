<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'WmsStatusTag',
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { NTag } from 'naive-ui'
import type { TagType } from '../utils/statusTag'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label?: string | number | null
  type?: TagType
  compact?: boolean
}>(), {
  label: '-',
  type: 'default',
  compact: true,
})

const displayLabel = computed(() => {
  if (props.label === null || props.label === undefined || props.label === '') {
    return '-'
  }
  return String(props.label)
})
</script>

<template>
  <n-tag
    v-bind="$attrs"
    class="wms-status-tag"
    :class="`wms-status-tag--${props.type}`"
    :type="props.type"
    :size="props.compact ? 'small' : 'medium'"
    :bordered="false"
    round
  >
    <slot>{{ displayLabel }}</slot>
  </n-tag>
</template>

<style scoped>
.wms-status-tag {
  min-width: 64px;
  max-width: 100%;
  justify-content: center;
  padding-inline: 12px;
  border: 0;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.wms-status-tag--warning {
  background-color: var(--wms-status-pending-bg);
  color: var(--wms-status-pending);
}

.wms-status-tag--success {
  background-color: var(--wms-status-success-bg);
  color: var(--wms-status-success);
}

.wms-status-tag--info,
.wms-status-tag--primary {
  background-color: var(--wms-status-progress-bg);
  color: var(--wms-status-progress);
}

.wms-status-tag--error {
  background-color: var(--wms-status-error-bg);
  color: var(--wms-status-error);
}

.wms-status-tag--default {
  background-color: var(--wms-status-draft-bg);
  color: var(--wms-status-draft);
}
</style>
