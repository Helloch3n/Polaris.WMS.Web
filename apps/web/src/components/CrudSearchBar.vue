<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CrudSearchBar',
})
</script>

<script setup lang="ts">
import { NButton, NForm, NFormItem } from 'naive-ui'

withDefaults(defineProps<{
  loading?: boolean
  showReset?: boolean
}>(), {
  loading: false,
  showReset: true,
})

const emit = defineEmits<{
  (e: 'search'): void
  (e: 'reset'): void
}>()

function handleKeyup(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    emit('search')
  }
}
</script>

<template>
  <n-form inline class="crud-search-form" @keyup="handleKeyup">
    <slot />
    <n-form-item class="crud-page-spacer" />
    <n-form-item>
      <n-button type="primary" :loading="loading" @click="emit('search')">查询</n-button>
    </n-form-item>
    <n-form-item v-if="showReset">
      <n-button @click="emit('reset')">重置</n-button>
    </n-form-item>
  </n-form>
</template>
