<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'TableColumnManager',
})
</script>

<script setup lang="ts">
import { OptionsOutline } from '@vicons/ionicons5'
import {
  NButton,
  NCheckbox,
  NIcon,
  NModal,
} from 'naive-ui'
import type { ColumnSetting } from '../composables/useColumnConfig'

const props = withDefaults(defineProps<{
  show: boolean
  settings: ColumnSetting[]
  title?: string
}>(), {
  title: '列配置',
})

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'visible-change', key: string, visible: boolean): void
}>()

function updateShow(value: boolean) {
  emit('update:show', value)
}

function handleVisibleChange(key: string, visible: boolean) {
  emit('visible-change', key, visible)
}
</script>

<template>
  <div>
    <n-button circle @click="updateShow(true)">
      <span class="column-config-trigger">
        <n-icon size="14" class="column-config-icon" aria-hidden="true">
          <OptionsOutline />
        </n-icon>
      </span>
    </n-button>

    <n-modal :show="props.show" preset="card" :title="props.title" style="width: 640px" @update:show="updateShow">
      <div class="column-config-list">
        <div
          v-for="item in props.settings"
          :key="item.key"
          class="column-config-item"
        >
          <n-checkbox
            :checked="item.visible"
            @update:checked="(value) => handleVisibleChange(item.key, value)"
          >
            {{ item.title }}
          </n-checkbox>
        </div>
      </div>
      <template #footer>
        <div class="config-footer">
          <n-button @click="updateShow(false)">关闭</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.column-config-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.column-config-item {
  min-width: 170px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
}

.config-footer {
  display: flex;
  justify-content: flex-end;
}

.column-config-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.column-config-icon {
  width: 14px;
  height: 14px;
}
</style>
