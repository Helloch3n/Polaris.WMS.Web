import { h, ref } from 'vue'

type ColumnSetting = {
  key: string
  title: string
  visible: boolean
}

type UseColumnConfigOptions = {
  storageKey: string
  preferredKeys: string[]
  resolveTitle: (key: string) => string
  defaultVisible?: (key: string) => boolean
  minVisible?: number
}

function ensureUniqueTitles(settings: ColumnSetting[], resolveTitle: (key: string) => string) {
  const titleCount = new Map<string, number>()
  return settings.map((item) => {
    const baseTitle = resolveTitle(item.key)
    const count = titleCount.get(baseTitle) ?? 0
    titleCount.set(baseTitle, count + 1)
    if (count === 0) {
      return {
        ...item,
        title: baseTitle,
      }
    }
    return {
      ...item,
      title: `${baseTitle}${count + 1}`,
    }
  })
}

export function useColumnConfig(options: UseColumnConfigOptions) {
  const {
    storageKey,
    preferredKeys,
    resolveTitle,
    defaultVisible = () => true,
    minVisible = 1,
  } = options

  const showColumnConfig = ref(false)
  const draggingColumnKey = ref<string | null>(null)
  const dragOverColumnKey = ref<string | null>(null)

  const columnSettings = ref<ColumnSetting[]>(
    ensureUniqueTitles(
      preferredKeys.map((key) => ({
        key,
        title: '',
        visible: defaultVisible(key),
      })),
      resolveTitle,
    ),
  )

  function saveColumnSettings() {
    localStorage.setItem(storageKey, JSON.stringify(columnSettings.value))
  }

  function loadColumnSettings() {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Array<Partial<ColumnSetting>>
      if (!Array.isArray(parsed)) return
      const normalized: ColumnSetting[] = []
      for (const item of parsed) {
        if (!item || typeof item.key !== 'string' || typeof item.visible !== 'boolean') {
          continue
        }
        normalized.push({
          key: item.key,
          title: '',
          visible: item.visible,
        })
      }
      if (normalized.length > 0) {
        columnSettings.value = ensureUniqueTitles(normalized, resolveTitle)
      }
    } catch {
      columnSettings.value = ensureUniqueTitles(
        preferredKeys.map((key) => ({
          key,
          title: '',
          visible: defaultVisible(key),
        })),
        resolveTitle,
      )
    }
  }

  function syncColumnSettingsByKeys(targetKeys: string[]) {
    const uniqueTargetKeys = Array.from(new Set(targetKeys))
    const currentMap = new Map(columnSettings.value.map((item) => [item.key, item]))
    const next: ColumnSetting[] = []

    for (const item of columnSettings.value) {
      if (uniqueTargetKeys.includes(item.key)) {
        next.push({
          key: item.key,
          title: '',
          visible: item.visible,
        })
      }
    }

    for (const key of uniqueTargetKeys) {
      if (!currentMap.has(key)) {
        next.push({ key, title: '', visible: defaultVisible(key) })
      }
    }

    if (next.length === 0) return

    const before = JSON.stringify(columnSettings.value)
    const normalizedNext = ensureUniqueTitles(next, resolveTitle)
    const after = JSON.stringify(normalizedNext)
    if (before !== after) {
      columnSettings.value = normalizedNext
      saveColumnSettings()
    }
  }

  function handleVisibleChange(key: string, visible: boolean) {
    const setting = columnSettings.value.find((item) => item.key === key)
    if (!setting) return true

    if (!visible) {
      const visibleCount = columnSettings.value.filter((item) => item.visible).length
      if (visibleCount <= minVisible) {
        return false
      }
    }

    setting.visible = visible
    saveColumnSettings()
    return true
  }

  function handleDragStart(key: string, event: DragEvent) {
    draggingColumnKey.value = key
    dragOverColumnKey.value = null
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', key)
    }
  }

  function handleDragEnter(targetKey: string) {
    if (!draggingColumnKey.value || draggingColumnKey.value === targetKey) return
    dragOverColumnKey.value = targetKey
  }

  function handleDragOver(targetKey: string, event: DragEvent) {
    if (!draggingColumnKey.value || draggingColumnKey.value === targetKey) return
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    dragOverColumnKey.value = targetKey
  }

  function handleDragLeave(targetKey: string) {
    if (dragOverColumnKey.value === targetKey) {
      dragOverColumnKey.value = null
    }
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
    saveColumnSettings()
  }

  function handleDragEnd() {
    draggingColumnKey.value = null
    dragOverColumnKey.value = null
  }

  function createDraggableTitle(key: string, text?: string) {
    const title = text ?? resolveTitle(key)
    const isDragging = draggingColumnKey.value === key
    const isDragOver = dragOverColumnKey.value === key && draggingColumnKey.value !== key
    return () => h(
      'span',
      {
        class: [
          'crud-draggable-header',
          isDragging ? 'is-dragging' : '',
          isDragOver ? 'is-drag-over' : '',
        ],
        draggable: 'true',
        onDragstart: (event: DragEvent) => handleDragStart(key, event),
        onDragenter: () => handleDragEnter(key),
        onDragover: (event: DragEvent) => handleDragOver(key, event),
        onDragleave: () => handleDragLeave(key),
        onDrop: (event: DragEvent) => handleDrop(key, event),
        onDragend: handleDragEnd,
      },
      h('span', title),
    )
  }

  return {
    showColumnConfig,
    columnSettings,
    loadColumnSettings,
    syncColumnSettingsByKeys,
    handleVisibleChange,
    createDraggableTitle,
  }
}

export type { ColumnSetting }
