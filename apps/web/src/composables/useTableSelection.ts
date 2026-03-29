import { computed, ref, type Ref } from 'vue'

export function useTableSelection<Row>(rows: Ref<Row[]>, getRowKey: (row: Row) => string | number) {
  const checkedRowKeys = ref<Array<string | number>>([])

  const selectedRows = computed(() => {
    const selectedKeySet = new Set(checkedRowKeys.value.map((key) => String(key)))
    return rows.value.filter((row) => selectedKeySet.has(String(getRowKey(row))))
  })

  const selectedCount = computed(() => selectedRows.value.length)

  function handleCheckedRowKeysChange(keys: Array<string | number>) {
    checkedRowKeys.value = keys
  }

  function syncCheckedRowKeys() {
    const keySet = new Set(rows.value.map((item) => String(getRowKey(item))))
    checkedRowKeys.value = checkedRowKeys.value.filter((key) => keySet.has(String(key)))
  }

  function selectSingleRow(row: Row) {
    checkedRowKeys.value = [getRowKey(row)]
  }

  function toggleSingleRow(row: Row, event?: MouseEvent) {
    const targetElement = event?.target as HTMLElement | null
    if (
      targetElement?.closest('.n-checkbox')
      || targetElement?.closest('.n-data-table-th__sorter')
    ) {
      return
    }

    const key = getRowKey(row)
    const keyString = String(key)
    const exists = checkedRowKeys.value.some((item) => String(item) === keyString)

    if (exists && checkedRowKeys.value.length === 1) {
      checkedRowKeys.value = []
      return
    }

    checkedRowKeys.value = [key]
  }

  function clearSelection() {
    checkedRowKeys.value = []
  }

  return {
    checkedRowKeys,
    selectedRows,
    selectedCount,
    handleCheckedRowKeysChange,
    syncCheckedRowKeys,
    selectSingleRow,
    toggleSingleRow,
    clearSelection,
  }
}
