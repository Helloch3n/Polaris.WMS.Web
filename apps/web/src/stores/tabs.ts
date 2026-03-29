import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface TabItem {
  path: string
  name: string
  title: string
  query?: Record<string, string>
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<TabItem[]>([])
  const activeTab = ref('')

  const tabList = computed(() => tabs.value)

  function addTab(tab: TabItem) {
    const exists = tabs.value.find((t) => t.path === tab.path)
    if (!exists) {
      tabs.value.push(tab)
    }
    activeTab.value = tab.path
  }

  function removeTab(path: string) {
    const index = tabs.value.findIndex((t) => t.path === path)
    if (index === -1) return

    const isActive = activeTab.value === path
    tabs.value.splice(index, 1)

    if (isActive && tabs.value.length > 0) {
      const newIndex = Math.min(index, tabs.value.length - 1)
      activeTab.value = tabs.value[newIndex]?.path ?? '/dashboard'
    }

    if (tabs.value.length === 0) {
      activeTab.value = '/dashboard'
    }
  }

  function setActive(path: string) {
    activeTab.value = path
  }

  function closeOthers(path: string) {
    tabs.value = tabs.value.filter((t) => t.path === path)
    activeTab.value = path
  }

  function closeAll() {
    tabs.value = []
    activeTab.value = '/dashboard'
  }

  return { tabs, activeTab, tabList, addTab, removeTab, setActive, closeOthers, closeAll }
})
