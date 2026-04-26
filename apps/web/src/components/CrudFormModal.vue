<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CrudFormModal',
})
</script>

<script setup lang="ts">
import { NButton, NModal } from 'naive-ui'

const props = withDefaults(defineProps<{
  show: boolean
  title: string
  loading?: boolean
  width?: 'sm' | 'md' | 'lg' | 'xl'
  confirmText?: string
  cancelText?: string
  showFooter?: boolean
}>(), {
  loading: false,
  width: 'md',
  confirmText: '确认',
  cancelText: '取消',
  showFooter: true,
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm'): void
}>()

const widthMap: Record<string, string> = {
  sm: 'var(--modal-width-sm)',
  md: 'var(--modal-width-md)',
  lg: 'var(--modal-width-lg)',
  xl: 'var(--modal-width-xl)',
}
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    :title="props.title"
    :style="{ width: widthMap[props.width] }"
    @update:show="emit('update:show', $event)"
  >
    <slot />
    <template v-if="props.showFooter" #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <slot name="footer">
          <n-button @click="emit('update:show', false)">{{ props.cancelText }}</n-button>
          <n-button type="primary" :loading="props.loading" @click="emit('confirm')">{{ props.confirmText }}</n-button>
        </slot>
      </div>
    </template>
  </n-modal>
</template>
