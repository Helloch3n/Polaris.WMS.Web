<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AdvancedCrudTable',
})
</script>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { OptionsOutline } from '@vicons/ionicons5'
import {
  NButton,
  NCheckbox,
  NDataTable,
  NIcon,
  NModal,
  useMessage,
} from 'naive-ui'
import type {
  DataTableColumns,
  DataTableBaseColumn,
  DataTableSortState,
} from 'naive-ui'

type ColumnSetting = {
  key: string
  title: string
  visible: boolean
}

const props = withDefaults(defineProps<{
  loading?: boolean
  data: any[]
  columns: DataTableColumns<any>
  rowKey: (row: any) => string | number
  checkedRowKeys: Array<string | number>
  storageKey: string
  showColumnConfig?: boolean
  hideIdColumnsByDefault?: boolean
}>(), {
  loading: false,
  showColumnConfig: true,
  hideIdColumnsByDefault: true,
})

const emit = defineEmits<{
  (e: 'update:checked-row-keys', keys: Array<string | number>): void
  (e: 'update:sorter', sorter: DataTableSortState | DataTableSortState[] | null): void
}>()

const message = useMessage()

const showConfigModal = ref(false)
const draggingColumnKey = ref<string | null>(null)
const dragOverColumnKey = ref<string | null>(null)
const columnSettings = ref<ColumnSetting[]>([])

const STORAGE_KEY = computed(() => `advanced-crud-table:${props.storageKey}`)

function isDataColumn(column: DataTableColumns<any>[number]): column is DataTableBaseColumn<any> {
  const typed = column as DataTableBaseColumn<any>
  return typed.type === undefined && typeof typed.key === 'string'
}

function isIdLikeKey(key: string) {
  return /(^id$|id$|_id$)/i.test(key)
}

function resolveColumnTitle(column: DataTableBaseColumn<any>, key: string) {
  if (typeof column.title === 'string' && column.title.trim()) {
    return column.title
  }
  return key
}

const baseColumns = computed(() => props.columns.filter(isDataColumn))

function saveSettings() {
  localStorage.setItem(STORAGE_KEY.value, JSON.stringify(columnSettings.value))
}

function syncSettingsByColumns() {
  const base = baseColumns.value
  const existing = new Map(columnSettings.value.map((item) => [item.key, item]))
  const next: ColumnSetting[] = []

  for (const col of base) {
    const key = String(col.key)
    const old = existing.get(key)
    next.push({
      key,
      title: resolveColumnTitle(col, key),
      visible: old ? old.visible : (props.hideIdColumnsByDefault ? !isIdLikeKey(key) : true),
    })
  }

  const before = JSON.stringify(columnSettings.value)
  const after = JSON.stringify(next)
  if (before !== after) {
    columnSettings.value = next
    saveSettings()
  }
}

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY.value)
  if (!raw) {
    syncSettingsByColumns()
    return
  }
  try {
    const parsed = JSON.parse(raw) as Array<Partial<ColumnSetting>>
    if (!Array.isArray(parsed)) {
      syncSettingsByColumns()
      return
    }
    columnSettings.value = parsed
      .filter((item): item is ColumnSetting => Boolean(item && typeof item.key === 'string' && typeof item.visible === 'boolean'))
      .map((item) => ({
        key: item.key,
        title: item.title && typeof item.title === 'string' ? item.title : item.key,
        visible: props.hideIdColumnsByDefault && isIdLikeKey(item.key) ? false : item.visible,
      }))
    syncSettingsByColumns()
  } catch {
    syncSettingsByColumns()
  }
}

watch(() => props.columns, () => {
  syncSettingsByColumns()
}, { deep: true })

watch(() => props.storageKey, () => {
  loadSettings()
})

loadSettings()

function handleVisibleChange(key: string, visible: boolean) {
  const setting = columnSettings.value.find((item) => item.key === key)
  if (!setting) return
  if (!visible) {
    const visibleCount = columnSettings.value.filter((item) => item.visible).length
    if (visibleCount <= 1) {
      message.warning('至少保留一个展示字段')
      return
    }
  }
  setting.visible = visible
  saveSettings()
}

function handleDragStart(key: string, event: DragEvent) {
  draggingColumnKey.value = key
  dragOverColumnKey.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
  }
}

function handleDragOver(key: string, event: DragEvent) {
  if (!draggingColumnKey.value || draggingColumnKey.value === key) return
  event.preventDefault()
  dragOverColumnKey.value = key
}

function handleDrop(targetKey: string, event: DragEvent) {
  event.preventDefault()
  const sourceKey = draggingColumnKey.value
  draggingColumnKey.value = null
  dragOverColumnKey.value = null
  if (!sourceKey || sourceKey === targetKey) return

  const sourceIndex = columnSettings.value.findIndex((item) => item.key === sourceKey)
  const targetIndex = columnSettings.value.findIndex((item) => item.key === targetKey)
  if (sourceIndex < 0 || targetIndex < 0) return

  const next = [...columnSettings.value]
  const [moved] = next.splice(sourceIndex, 1)
  if (!moved) return
  next.splice(targetIndex, 0, moved)
  columnSettings.value = next
  saveSettings()
}

function handleDragEnd() {
  draggingColumnKey.value = null
  dragOverColumnKey.value = null
}

function compareSortValue(left: unknown, right: unknown) {
  if (left === null || left === undefined || left === '') return right === null || right === undefined || right === '' ? 0 : -1
  if (right === null || right === undefined || right === '') return 1
  if (typeof left === 'number' || typeof right === 'number') {
    const leftNumber = Number(left)
    const rightNumber = Number(right)
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber
    }
  }
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    return Number(Boolean(left)) - Number(Boolean(right))
  }
  return String(left).localeCompare(String(right), 'zh-Hans-CN')
}

function createHeaderTitle(title: string, key: string) {
  const isDragging = draggingColumnKey.value === key
  const isDragOver = dragOverColumnKey.value === key && draggingColumnKey.value !== key

  return () => h(
    'span',
    {
      class: ['advanced-header-title', isDragging ? 'is-dragging' : '', isDragOver ? 'is-drag-over' : ''],
      draggable: 'true',
      onDragstart: (event: DragEvent) => handleDragStart(key, event),
      onDragover: (event: DragEvent) => handleDragOver(key, event),
      onDrop: (event: DragEvent) => handleDrop(key, event),
      onDragend: handleDragEnd,
    },
    title,
  )
}

const tableColumns = computed<DataTableColumns<any>>(() => {
  const colMap = new Map(baseColumns.value.map((col) => [String(col.key), col]))

  const visibleCols = columnSettings.value
    .filter((item) => item.visible)
    .map((item) => {
      const source = colMap.get(item.key)
      if (!source) return null
      const nextCol: DataTableBaseColumn<any> = {
        ...source,
        title: createHeaderTitle(item.title, item.key),
      }
      if (!nextCol.sorter && typeof nextCol.key === 'string') {
        const key = nextCol.key
        nextCol.sorter = (a, b) => compareSortValue(a[key], b[key])
      }
      return nextCol
    })
    .filter((item): item is DataTableBaseColumn<any> => Boolean(item))

  return [
    {
      type: 'selection',
      fixed: 'left',
      width: 44,
    },
    ...visibleCols,
  ]
})

function handleCheckedRowKeysChange(keys: Array<string | number>) {
  emit('update:checked-row-keys', keys)
}

function toggleRowSelection(row: any, event: MouseEvent) {
  const targetElement = event.target as HTMLElement | null
  if (
    targetElement?.closest('.n-checkbox')
    || targetElement?.closest('.n-data-table-th__sorter')
  ) {
    return
  }

  const key = props.rowKey(row)
  const keyString = String(key)
  const exists = props.checkedRowKeys.some((item) => String(item) === keyString)
  if (exists && props.checkedRowKeys.length === 1) {
    emit('update:checked-row-keys', [])
    return
  }
  emit('update:checked-row-keys', [key])
}

function handleSorterChange(sorter: DataTableSortState | DataTableSortState[] | null) {
  emit('update:sorter', sorter)
}
</script>

<template>
  <div class="advanced-crud-table">
    <div v-if="props.showColumnConfig" class="advanced-tools">
      <n-button circle @click="showConfigModal = true">
        <n-icon size="14" aria-hidden="true">
          <OptionsOutline />
        </n-icon>
      </n-button>
    </div>

    <n-data-table
      class="crud-table-flat"
      :loading="props.loading"
      :columns="tableColumns"
      :data="props.data"
      :bordered="false"
      :row-key="props.rowKey"
      :row-props="(row) => ({ onClick: (event) => toggleRowSelection(row, event) })"
      :checked-row-keys="props.checkedRowKeys"
      @update:checked-row-keys="handleCheckedRowKeysChange"
      @update:sorter="handleSorterChange"
    />

    <n-modal v-model:show="showConfigModal" preset="card" title="列配置" style="width: 640px">
      <div class="column-config-list">
        <div
          v-for="item in columnSettings"
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
          <n-button @click="showConfigModal = false">关闭</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.advanced-crud-table {
  width: 100%;
}

.advanced-tools {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

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

:deep(.advanced-header-title) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 24px;
  cursor: move;
  user-select: none;
  transition: color 0.15s ease, opacity 0.15s ease, background-color 0.15s ease;
  padding: 2px 6px;
  border-radius: 4px;
}

:deep(.advanced-header-title.is-dragging) {
  opacity: 0.45;
}

:deep(.advanced-header-title.is-drag-over) {
  background: color-mix(in srgb, var(--n-border-color) 65%, transparent);
  outline: 1px dashed var(--n-border-color-hover);
  outline-offset: -1px;
}
</style>
