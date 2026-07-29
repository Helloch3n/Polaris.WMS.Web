<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CopyableText',
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Square2StackIcon } from '@heroicons/vue/24/outline'
import { NButton, NIcon, useMessage } from 'naive-ui'

const props = withDefaults(defineProps<{
  value?: string | number | null
  emptyText?: string
  strong?: boolean
}>(), {
  emptyText: '-',
  strong: false,
})

const message = useMessage()

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') {
    return props.emptyText
  }
  return String(props.value)
})

const canCopy = computed(() => displayValue.value !== props.emptyText)

async function handleCopy() {
  if (!canCopy.value) return
  try {
    await navigator.clipboard.writeText(displayValue.value)
    message.success('已复制')
  } catch {
    message.warning('复制失败，请手动复制')
  }
}
</script>

<template>
  <span class="copyable-text" :class="{ 'is-strong': props.strong, 'is-empty': !canCopy }">
    <span class="copyable-value" :title="displayValue">{{ displayValue }}</span>
    <n-button
      v-if="canCopy"
      class="copyable-button"
      size="tiny"
      quaternary
      circle
      title="复制"
      @click.stop="handleCopy"
    >
      <template #icon>
        <n-icon size="13">
          <Square2StackIcon />
        </n-icon>
      </template>
    </n-button>
  </span>
</template>

<style scoped>
.copyable-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
  min-width: 0;
  font-family: var(--n-font-family-mono), 'SFMono-Regular', Consolas, monospace;
  color: var(--wms-text-primary);
}

.copyable-text.is-strong {
  font-weight: 700;
}

.copyable-text.is-empty {
  font-family: inherit;
  color: var(--wms-text-muted);
}

.copyable-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copyable-button {
  flex-shrink: 0;
  opacity: 0;
}

.copyable-text:hover .copyable-button {
  opacity: 1;
}

</style>
