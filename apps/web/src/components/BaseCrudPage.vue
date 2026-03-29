<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'BaseCrudPage',
})
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDownOutline, ChevronUpOutline } from '@vicons/ionicons5'
import { NButton, NCard, NIcon } from 'naive-ui'

const props = withDefaults(defineProps<{
  searchCollapsible?: boolean
  defaultSearchCollapsed?: boolean
}>(), {
  searchCollapsible: true,
  defaultSearchCollapsed: false,
})

const searchCollapsed = ref(props.defaultSearchCollapsed)

function toggleSearchCollapsed() {
  searchCollapsed.value = !searchCollapsed.value
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
  <div class="crud-page">

    <n-card
      v-if="$slots.search"
      class="search-card"
      :class="{ 'is-collapsed': props.searchCollapsible && searchCollapsed }"
      :bordered="false"
    >
      <div v-show="!searchCollapsed" class="slot-shell slot-search">
        <slot name="search" />
      </div>
      <div v-if="props.searchCollapsible" class="search-toggle-wrap">
        <span class="search-toggle-line" />
        <n-button
          text
          size="small"
          class="search-toggle-btn"
          @click="toggleSearchCollapsed"
        >
          <span class="search-toggle-icon" aria-hidden="true">
            <n-icon size="14">
              <ChevronDownOutline v-if="searchCollapsed" />
              <ChevronUpOutline v-else />
            </n-icon>
          </span>
        </n-button>
      </div>
    </n-card>

    <n-card v-if="$slots.actions || $slots['actions-left'] || $slots['actions-right']" class="action-card" :bordered="false">
      <div class="slot-shell slot-actions">
        <template v-if="$slots['actions-left'] || $slots['actions-right']">
          <div class="crud-action-split">
            <div class="crud-action-left">
              <slot name="actions-left" />
            </div>
            <div class="crud-action-right">
              <slot name="actions-right" />
            </div>
          </div>
        </template>
        <template v-else>
          <slot name="actions" />
        </template>
      </div>
    </n-card>

    <n-card class="data-card" :bordered="false">
      <div class="slot-shell slot-data">
        <slot name="data" />
      </div>
      <div v-if="$slots['pager-left'] || $slots['pager-right']" class="slot-shell slot-pager">
        <div class="crud-pager crud-pager-split">
          <div class="crud-pager-left">
            <slot name="pager-left" />
          </div>
          <div class="crud-pager-right">
            <slot name="pager-right" />
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.crud-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-card,
.action-card,
.data-card {
  width: 100%;
}

.slot-shell {
  width: 100%;
}

.slot-search {
  min-height: 36px;
  display: flex;
  align-items: center;
}

.search-toggle-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 0;
  height: 1px;
}

.search-toggle-line {
  width: 100%;
  height: 1px;
  background: var(--n-border-color);
}

.search-toggle-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  padding: 0 4px;
  height: 14px;
  min-width: 20px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--n-text-color-3);
  transition: color 0.2s ease, background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.search-toggle-btn:hover {
  color: var(--n-text-color-2);
  background: color-mix(in srgb, var(--n-color-hover) 88%, transparent);
  transform: translateY(calc(-50% - 1px));
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.1);
}

.search-toggle-btn:active {
  transform: translateY(-50%);
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.08);
}

.search-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  line-height: 1;
}

:deep(.search-card.is-collapsed .n-card__content) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

:deep(.search-card.is-collapsed .slot-search) {
  min-height: 0;
}

:deep(.crud-search-row),
:deep(.crud-search-form) {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  width: 100%;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
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
}

:deep(.crud-search-form .n-form-item:not(.crud-page-spacer) .n-input),
:deep(.crud-search-form .n-form-item:not(.crud-page-spacer) .n-base-selection),
:deep(.crud-search-form .n-form-item:not(.crud-page-spacer) .n-input-number),
:deep(.crud-search-form .n-form-item:not(.crud-page-spacer) .n-date-picker) {
  min-width: 180px;
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
  gap: 8px;
  min-height: 36px;
}

.crud-action-split {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 36px;
}

.crud-action-left,
.crud-action-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.crud-action-main),
:deep(.crud-action-tools) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.crud-page-spacer) {
  flex: 1 1 auto;
  min-width: 0;
}

:deep(.crud-pager) {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 40px;
  padding-top: 12px;
}

.slot-pager {
  padding-top: 12px;
}

.crud-pager-split {
  justify-content: space-between;
}

.crud-pager-left,
.crud-pager-right {
  display: flex;
  align-items: center;
}

:deep(.crud-selection-summary) {
  display: flex;
  align-items: center;
  gap: 8px;
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
:deep(.crud-table-flat .n-data-table-tr:hover .n-data-table-td),
:deep(.crud-table-flat .n-data-table-th__cell:hover),
:deep(.crud-table-flat .n-data-table-td:hover),
:deep(.crud-table-flat .n-data-table-th--sorted),
:deep(.crud-table-flat .n-data-table-td--sorted),
:deep(.crud-table-flat .n-data-table-th--sortable:hover),
:deep(.crud-table-flat .n-data-table-tr--checked .n-data-table-td) {
  box-shadow: none !important;
  background: transparent !important;
}

:deep(.crud-table-flat .n-checkbox-box),
:deep(.crud-table-flat .n-checkbox-box:hover),
:deep(.crud-table-flat .n-checkbox.n-checkbox--checked .n-checkbox-box),
:deep(.crud-table-flat .n-checkbox.n-checkbox--focus .n-checkbox-box) {
  box-shadow: none !important;
}

:deep(.n-card) {
  --n-padding-top: 12px;
  --n-padding-bottom: 12px;
}

:deep(.n-button) {
  --n-height: 30px;
}

:deep(.n-input),
:deep(.n-base-selection),
:deep(.n-input-number) {
  --n-height: 30px;
}

:deep(.n-data-table-th),
:deep(.n-data-table-td) {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
