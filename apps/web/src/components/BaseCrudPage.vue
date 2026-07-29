<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'BaseCrudPage',
})
</script>

<script setup lang="ts">
import { Squares2X2Icon } from '@heroicons/vue/24/outline'
import { NButton, NIcon, NTag, NDropdown } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'

const props = withDefaults(defineProps<{
  searchCollapsible?: boolean
  defaultSearchCollapsed?: boolean
  selectedCount?: number
}>(), {
  searchCollapsible: false,
  defaultSearchCollapsed: false,
  selectedCount: 0,
})

const emit = defineEmits<{
  (e: 'clear-selection'): void
}>()

const settingsStore = useSettingsStore()

const densityOptions = [
  { label: '紧凑模式', key: 'small' },
  { label: '默认模式', key: 'medium' },
  { label: '宽松模式', key: 'large' },
]

function handleDensitySelect(key: string) {
  settingsStore.setTableSize(key as any)
}

defineSlots<{
  search?: () => any
  actions?: () => any
  'actions-left'?: () => any
  'actions-right'?: () => any
  data?: () => any
  'pager-left'?: () => any
  'pager-right'?: () => any
}>()
</script>

<template>
  <div class="crud-page" :class="'density-' + settingsStore.tableSize">
    <div class="unibody-card">
      <!-- 搜索区 -->
      <div
        v-if="$slots.search"
        class="unibody-search-section"
      >
        <div class="slot-shell slot-search">
          <slot name="search" />
        </div>
      </div>

      <!-- 功能操作区 -->
      <div class="unibody-action-section">
        <div class="slot-shell slot-actions">
          <div class="crud-action-split">
            <div class="crud-action-left" style="flex: 1; justify-content: flex-start; min-width: 0;">
              <template v-if="$slots['actions-left'] || $slots['actions-right']">
                <div class="crud-action-split" style="width: 100%; border: none; padding: 0; box-shadow: none;">
                  <div class="crud-action-left">
                    <slot name="actions-left" />
                  </div>
                  <div class="crud-action-right">
                    <slot name="actions-right" />
                  </div>
                </div>
              </template>
              <template v-else-if="$slots.actions">
                <slot name="actions" />
              </template>
            </div>
            
            <div class="crud-action-right-tools" style="display: flex; align-items: center; margin-left: 12px; gap: 8px; flex-shrink: 0;">
              <n-dropdown :options="densityOptions" trigger="click" @select="handleDensitySelect">
                <n-button size="small" quaternary circle title="表格密度">
                  <template #icon>
                    <n-icon size="15">
                      <Squares2X2Icon />
                    </n-icon>
                  </template>
                </n-button>
              </n-dropdown>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据展示与分页区 -->
      <div class="unibody-data-section">
        <div class="slot-shell slot-data">
          <slot name="data" />
        </div>
      </div>

      <!-- 勾选摘要与分页独立于表格内容区 -->
      <div
        v-if="$slots['pager-left'] || $slots['pager-right'] || props.selectedCount > 0"
        class="unibody-pager-section"
      >
        <div class="slot-shell slot-pager">
          <div class="crud-pager crud-pager-split">
            <div class="crud-pager-left">
              <slot name="pager-left">
                <div v-if="props.selectedCount > 0" class="crud-selection-summary">
                  <n-tag size="small" type="info">已选 {{ props.selectedCount }} 条</n-tag>
                  <n-button text @click="emit('clear-selection')">清空选择</n-button>
                </div>
              </slot>
            </div>
            <div class="crud-pager-right">
              <slot name="pager-right" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crud-page {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.unibody-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border-radius: 0;
  background-color: var(--wms-surface-panel);
  border: 0;
  box-shadow: none;
  overflow: hidden;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.unibody-search-section {
  padding: 6px 10px;
  background-color: var(--wms-surface-muted);
  border-bottom: 1px solid var(--wms-border-subtle);
  transition: padding 0.2s ease, 
              background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
              border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.unibody-action-section {
  padding: 8px 12px;
  border-bottom: 1px solid var(--wms-border-subtle);
  background-color: transparent;
  transition: border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.unibody-data-section {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  overflow: hidden;
}

.unibody-pager-section {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 6px 12px;
  box-sizing: border-box;
  border-top: 1px solid var(--wms-border-subtle);
  background-color: transparent;
  transition: border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slot-shell {
  width: 100%;
}

.slot-data {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.slot-search {
  min-height: 30px;
  display: flex;
  align-items: center;
}

:deep(.crud-search-row),
:deep(.crud-search-form) {
  display: flex;
  align-items: center;
  column-gap: 6px;
  row-gap: 5px;
  min-height: 28px;
  width: 100%;
  flex-wrap: wrap;
  overflow: visible;
}

:deep(.crud-search-form) {
  margin: 0;
}

:deep(.crud-search-row > *) {
  flex: 0 0 auto;
}

:deep(.crud-search-form .n-form-item) {
  margin-right: 0;
  margin-bottom: 0;
  flex: 0 0 auto;
  min-width: 0;
  max-width: 100%;
}

:deep(.crud-search-form .n-form-item-blank) {
  min-height: 28px;
  min-width: 0;
  max-width: 100%;
}

:deep(.crud-search-form .n-form-item-feedback-wrapper) {
  display: none;
  min-height: 0;
}

:deep(.crud-search-form .n-form-item-label),
:deep(.crud-search-form .n-form-item-label__text) {
  display: none !important;
}

:deep(.crud-search-form .n-form-item:not(.crud-page-spacer) .n-input),
:deep(.crud-search-form .n-form-item:not(.crud-page-spacer) .n-base-selection),
:deep(.crud-search-form .n-form-item:not(.crud-page-spacer) .n-input-number),
:deep(.crud-search-form .n-form-item:not(.crud-page-spacer) .n-date-picker) {
  width: 180px;
  min-width: 0;
  max-width: 100%;
}

:deep(.crud-search-form .n-form-item .n-button) {
  min-width: 72px;
}

:deep(.crud-search-form .n-form-item.crud-page-spacer) {
  flex: 1 1 auto;
  min-width: 0;
}

:deep(.crud-action-row) {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
}

.crud-action-split {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 32px;
}

.crud-action-left,
.crud-action-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.crud-action-main),
:deep(.crud-action-tools) {
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.crud-page-spacer) {
  flex: 1 1 auto;
  min-width: 0;
}

:deep(.crud-pager) {
  flex: 1 1 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 28px;
  height: auto;
}

.slot-pager {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 28px;
}

.crud-pager-split {
  justify-content: space-between;
}

.crud-pager-left,
.crud-pager-right {
  display: flex;
  align-items: center;
  height: auto;
  min-height: 28px;
}

:deep(.crud-selection-summary) {
  display: flex;
  align-items: center;
  height: 28px;
  gap: 7px;
  color: var(--wms-text-muted);
  font-size: 13px;
  line-height: 1;
}

:deep(.crud-selection-summary .n-tag) {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 7px;
  border-radius: 5px;
  background: var(--wms-surface-hover);
  border-color: var(--wms-border-subtle);
  color: var(--wms-text-primary);
  font-weight: 500;
  line-height: 22px;
}

:deep(.crud-selection-summary .n-button) {
  --n-height: 24px;
  display: inline-flex;
  align-items: center;
  color: var(--wms-text-muted);
  line-height: 1;
}

:deep(.crud-selection-summary .n-button:not(.n-button--disabled):hover) {
  color: var(--wms-text-primary);
}

:deep(.crud-pager-right .n-pagination) {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  min-height: 28px;
}

:deep(.crud-pager-right .n-pagination .n-pagination-item) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  font-weight: 500;
  line-height: 26px;
  margin-top: 0;
  margin-bottom: 0;
}

:deep(.crud-pager-right .n-pagination .n-pagination-item--button) {
  color: var(--wms-text-muted);
}

:deep(.crud-pager-right .n-pagination .n-pagination-item:not(.n-pagination-item--disabled):hover) {
  color: var(--wms-text-primary);
  border-color: var(--wms-border);
}

:deep(.crud-pager-right .n-pagination .n-pagination-item--active) {
  color: var(--wms-text-primary);
  border-color: transparent;
  background: var(--wms-surface-hover);
}

:deep(.crud-pager-right .n-pagination .n-base-selection) {
  --n-height: 26px;
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  color: var(--wms-text-secondary);
}

:deep(.crud-table-flat .n-data-table-wrapper) {
  min-height: 0;
}

:deep(.slot-data .n-data-table) {
  font-size: 12px;
}

:deep(.slot-data .n-data-table-th),
:deep(.slot-data .n-data-table-td) {
  padding-top: 5px !important;
  padding-bottom: 5px !important;
}

:deep(.slot-data .n-data-table-base-table-header) {
  position: sticky;
  top: 0;
  z-index: 3;
}

:deep(.slot-data .n-data-table-base-table-header .n-data-table-th) {
  background: var(--wms-surface-table-header) !important;
  color: var(--wms-text-secondary);
  font-weight: 600;
}

/* ── 表格自动 flex-height：撑满数据区并内部滚动 ── */
:deep(.slot-data > *) {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

:deep(.slot-data .n-data-table:not(.wms-embedded-table)) {
  flex: 1 1 0 !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
}

:deep(.slot-data .n-data-table:not(.wms-embedded-table) > .n-data-table-wrapper) {
  flex: 1 1 0 !important;
  min-height: 0 !important;
  overflow: auto !important;
}

:deep(.slot-data .n-data-table .n-data-table-base-table) {
  height: auto !important;
}

:deep(.crud-table-flat),
:deep(.crud-table-flat .n-data-table-wrapper),
:deep(.crud-table-flat .n-data-table-base-table),
:deep(.crud-table-flat .n-data-table-base-table-header),
:deep(.crud-table-flat .n-data-table-base-table-body) {
  box-shadow: none !important;
}

:deep(.crud-table-flat .n-data-table-th),
:deep(.crud-table-flat .n-data-table-td) {
  background: transparent !important;
  border-color: var(--wms-border-subtle) !important;
}

:deep(.slot-data .n-data-table-td) {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

:deep(.slot-data .n-data-table-td),
:deep(.slot-data .n-data-table-td *) {
  text-align: center;
}

:deep(.slot-data .n-data-table-th),
:deep(.slot-data .n-data-table-th *) {
  text-align: center;
}

:deep(.slot-data .n-data-table-th .n-data-table-th__cell) {
  justify-content: center;
}

:deep(.slot-data .n-data-table-td .n-data-table-td__ellipsis),
:deep(.slot-data .n-data-table-td .n-data-table-td__content) {
  width: 100%;
  justify-content: center;
}

:deep(.crud-draggable-header) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 24px;
  cursor: move;
  user-select: none;
  transition: color 0.15s ease, opacity 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
  padding: 2px 6px;
  border-radius: 4px;
}

:deep(.crud-draggable-header.is-dragging) {
  opacity: 0.5;
}

:deep(.crud-draggable-header.is-drag-over) {
  background: color-mix(in srgb, var(--n-border-color) 65%, transparent);
  outline: 1px dashed var(--n-border-color-hover);
  outline-offset: -1px;
}

:deep(.crud-table-flat .n-data-table-th:hover),
:deep(.crud-table-flat .n-data-table-th__cell:hover),
:deep(.crud-table-flat .n-data-table-td:hover),
:deep(.crud-table-flat .n-data-table-th--sorted),
:deep(.crud-table-flat .n-data-table-td--sorted),
:deep(.crud-table-flat .n-data-table-th--sortable:hover),
:deep(.crud-table-flat .n-data-table-tr--checked .n-data-table-td) {
  box-shadow: none !important;
  background: transparent !important;
}

:deep(.crud-table-flat .n-data-table-tr:hover .n-data-table-td) {
  box-shadow: none !important;
  background: var(--wms-surface-hover) !important;
}

:deep(.crud-table-flat .n-checkbox-box),
:deep(.crud-table-flat .n-checkbox-box:hover),
:deep(.crud-table-flat .n-checkbox.n-checkbox--checked .n-checkbox-box),
:deep(.crud-table-flat .n-checkbox.n-checkbox--focus .n-checkbox-box) {
  box-shadow: none !important;
}


:deep(.n-button) {
  --n-height: 28px;
}

:deep(.crud-search-form .n-input),
:deep(.crud-search-form .n-base-selection),
:deep(.crud-search-form .n-input-number),
:deep(.crud-search-form .n-date-picker) {
  --n-height: 28px;
}

:deep(.crud-search-form .n-base-selection) {
  min-height: 28px;
}

:deep(.n-data-table-th),
:deep(.n-data-table-td) {
  padding-top: 6px;
  padding-bottom: 6px;
}


.slot-data {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.slot-data .n-data-table) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

:deep(.slot-data .n-data-table .n-data-table-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

/* Table size overrides based on settings density classes */
.density-small :deep(.n-data-table-th),
.density-small :deep(.n-data-table-td) {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  font-size: 12px !important;
}
.density-medium :deep(.n-data-table-th),
.density-medium :deep(.n-data-table-td) {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  font-size: 13px !important;
}
.density-large :deep(.n-data-table-th),
.density-large :deep(.n-data-table-td) {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  font-size: 14px !important;
}
</style>
