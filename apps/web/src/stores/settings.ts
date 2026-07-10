import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AppTheme = 'light' | 'dark'
export type TableDensity = 'small' | 'medium' | 'large'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<AppTheme>((localStorage.getItem('wms-theme') as AppTheme) || 'light')
  const tableSize = ref<TableDensity>((localStorage.getItem('wms-table-size') as TableDensity) || 'medium')

  function setTheme(newTheme: AppTheme) {
    theme.value = newTheme
    localStorage.setItem('wms-theme', newTheme)
    updateHtmlClass(newTheme)
  }

  function toggleTheme() {
    const nextTheme = theme.value === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
  }

  function setTableSize(size: TableDensity) {
    tableSize.value = size
    localStorage.setItem('wms-table-size', size)
  }

  function toggleTableSize() {
    const sizes: TableDensity[] = ['small', 'medium', 'large']
    const idx = sizes.indexOf(tableSize.value)
    const nextIdx = (idx + 1) % sizes.length
    setTableSize(sizes[nextIdx] as TableDensity)
  }

  function updateHtmlClass(currentTheme: AppTheme) {
    if (typeof document !== 'undefined') {
      const htmlEl = document.documentElement
      if (currentTheme === 'dark') {
        htmlEl.classList.add('dark')
      } else {
        htmlEl.classList.remove('dark')
      }
    }
  }

  // Initialize class on load
  updateHtmlClass(theme.value)

  return {
    theme,
    tableSize,
    setTheme,
    toggleTheme,
    setTableSize,
    toggleTableSize
  }
})
