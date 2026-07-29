import { computed, readonly, ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type TableDensity = 'small' | 'medium' | 'large'

const THEME_STORAGE_KEY = 'wms-theme'
const preferences: ThemePreference[] = ['light', 'dark', 'system']

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && preferences.includes(value as ThemePreference)
}

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return isThemePreference(stored) ? stored : 'system'
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const sharedResolvedTheme = ref<ResolvedTheme>(
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
)

let themeTransitionFrame: number | undefined

function commitTheme(theme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.add('theme-switching')
  root.dataset.theme = theme
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  sharedResolvedTheme.value = theme

  if (themeTransitionFrame !== undefined) cancelAnimationFrame(themeTransitionFrame)
  themeTransitionFrame = requestAnimationFrame(() => {
    themeTransitionFrame = requestAnimationFrame(() => {
      root.classList.remove('theme-switching')
      themeTransitionFrame = undefined
    })
  })
}

export const useSettingsStore = defineStore('settings', () => {
  const themePreference = ref<ThemePreference>(readPreference())
  const tableSize = ref<TableDensity>((localStorage.getItem('wms-table-size') as TableDensity) || 'medium')
  const resolvedTheme = readonly(sharedResolvedTheme)
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  function resolveTheme(preference = themePreference.value): ResolvedTheme {
    return preference === 'system' ? systemTheme() : preference
  }

  function setThemePreference(preference: ThemePreference) {
    themePreference.value = preference
    localStorage.setItem(THEME_STORAGE_KEY, preference)
    commitTheme(resolveTheme(preference))
  }

  function cycleThemePreference() {
    const current = preferences.indexOf(themePreference.value)
    setThemePreference(preferences[(current + 1) % preferences.length] as ThemePreference)
  }

  function handleSystemThemeChange() {
    if (themePreference.value === 'system') commitTheme(systemTheme())
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY) return
    const preference = isThemePreference(event.newValue) ? event.newValue : 'system'
    themePreference.value = preference
    commitTheme(resolveTheme(preference))
  }

  mediaQuery.addEventListener('change', handleSystemThemeChange)
  window.addEventListener('storage', handleStorage)
  commitTheme(resolveTheme())

  const themeLabel = computed(() => {
    if (themePreference.value === 'system') return '系统'
    return themePreference.value === 'dark' ? '暗色' : '亮色'
  })

  function setTableSize(size: TableDensity) {
    tableSize.value = size
    localStorage.setItem('wms-table-size', size)
  }

  function toggleTableSize() {
    const sizes: TableDensity[] = ['small', 'medium', 'large']
    const next = (sizes.indexOf(tableSize.value) + 1) % sizes.length
    setTableSize(sizes[next] as TableDensity)
  }

  return {
    themePreference,
    resolvedTheme,
    themeLabel,
    tableSize,
    setThemePreference,
    cycleThemePreference,
    setTableSize,
    toggleTableSize,
  }
})
