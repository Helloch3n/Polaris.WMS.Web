<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NIcon } from 'naive-ui'
import { CommandLineIcon, CursorArrowRaysIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()

const visible = ref(false)
const searchVal = ref('')
const activeIndex = ref(0)
const inputRef = ref<any>(null)
const listContainerRef = ref<HTMLElement | null>(null)

// Gather all registered routes that have metadata titles
const routesList = computed(() => {
  return router.getRoutes()
    .filter(r => r.meta?.title && !r.meta.hidden && r.path !== '/' && !r.path.includes(':'))
    .map(r => ({
      type: 'route',
      title: r.meta.title as string,
      path: r.path,
      description: `跳转至 ${r.meta.title}`,
    }))
})

// Build list of static commands
const commandList = [
  { type: 'command', title: '/dark', description: '切换至暗色主题', action: () => settingsStore.setThemePreference('dark') },
  { type: 'command', title: '/light', description: '切换至亮色主题', action: () => settingsStore.setThemePreference('light') },
  { type: 'command', title: '/system', description: '主题跟随操作系统', action: () => settingsStore.setThemePreference('system') },
  { type: 'command', title: '/compact', description: '表格紧凑模式', action: () => settingsStore.setTableSize('small') },
  { type: 'command', title: '/medium', description: '表格默认模式', action: () => settingsStore.setTableSize('medium') },
  { type: 'command', title: '/loose', description: '表格宽松模式', action: () => settingsStore.setTableSize('large') },
]

// Combined search results
const filteredResults = computed(() => {
  const query = searchVal.value.trim().toLowerCase()
  if (!query) {
    // Show commands + a few common routes when empty
    return [...commandList, ...routesList.value.slice(0, 5)]
  }

  // Filter commands
  const matchedCommands = commandList.filter(c => 
    c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)
  )

  // Filter routes
  const matchedRoutes = routesList.value.filter(r => 
    r.title.toLowerCase().includes(query) || r.path.toLowerCase().includes(query)
  )

  return [...matchedCommands, ...matchedRoutes]
})

// Reset pointer on query change
watch(searchVal, () => {
  activeIndex.value = 0
})

function toggleVisible() {
  visible.value = !visible.value
  if (visible.value) {
    searchVal.value = ''
    activeIndex.value = 0
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
}

function open() {
  if (!visible.value) {
    toggleVisible()
  }
}

function handleSelect(item: any) {
  if (item.type === 'route') {
    router.push(item.path)
  } else if (item.type === 'command') {
    item.action()
  }
  visible.value = false
}

// Keyboard shortcuts global handler
function handleKeyDown(e: KeyboardEvent) {
  // Command + K or Ctrl + K
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    toggleVisible()
    return
  }

  if (!visible.value) return

  // Close with Escape
  if (e.key === 'Escape') {
    e.preventDefault()
    visible.value = false
    return
  }

  // Arrow Down
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const total = filteredResults.value.length
    if (total > 0) {
      activeIndex.value = (activeIndex.value + 1) % total
      scrollToActive()
    }
  }

  // Arrow Up
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    const total = filteredResults.value.length
    if (total > 0) {
      activeIndex.value = (activeIndex.value - 1 + total) % total
      scrollToActive()
    }
  }

  // Enter to execute
  if (e.key === 'Enter') {
    e.preventDefault()
    const activeItem = filteredResults.value[activeIndex.value]
    if (activeItem) {
      handleSelect(activeItem)
    }
  }
}

function scrollToActive() {
  nextTick(() => {
    const container = listContainerRef.value
    if (!container) return
    const activeEl = container.querySelector('.palette-item.active') as HTMLElement
    if (!activeEl) return

    const containerHeight = container.clientHeight
    const itemTop = activeEl.offsetTop
    const itemHeight = activeEl.clientHeight

    if (itemTop + itemHeight > container.scrollTop + containerHeight) {
      container.scrollTop = itemTop + itemHeight - containerHeight
    } else if (itemTop < container.scrollTop) {
      container.scrollTop = itemTop
    }
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="command-palette-overlay" @click.self="visible = false">
        <div class="command-palette-modal">
          <div class="palette-search-wrapper">
            <n-input
              ref="inputRef"
              v-model:value="searchVal"
              placeholder="输入 / 指令或检索页面名称..."
              size="large"
              clearable
              bordered
              class="palette-input"
            >
              <template #prefix>
                <n-icon size="20" class="text-slate-400 mr-1">
                  <MagnifyingGlassIcon />
                </n-icon>
              </template>
            </n-input>
          </div>

          <div
            ref="listContainerRef"
            class="palette-results-wrapper"
          >
            <div
              v-for="(item, index) in filteredResults"
              :key="item.title"
              class="palette-item"
              :class="{ active: index === activeIndex }"
              @mouseenter="activeIndex = index"
              @click="handleSelect(item)"
            >
              <div class="palette-item-icon">
                <n-icon v-if="item.type === 'command'" size="16">
                  <CommandLineIcon />
                </n-icon>
                <n-icon v-else size="16">
                  <CursorArrowRaysIcon />
                </n-icon>
              </div>
              <div class="palette-item-content">
                <div class="palette-item-title">{{ item.title }}</div>
                <div class="palette-item-desc">{{ item.description }}</div>
              </div>
              <div v-if="item.type === 'command'" class="palette-item-tag">指令</div>
              <div v-else class="palette-item-tag path">页面</div>
            </div>
            
            <div v-if="filteredResults.length === 0" class="palette-empty">
              未找到匹配项
            </div>
          </div>

          <div class="palette-footer">
            <span class="footer-tip">按 <kbd>↑↓</kbd> 移动</span>
            <span class="footer-tip">按 <kbd>Enter</kbd> 选择</span>
            <span class="footer-tip">按 <kbd>Esc</kbd> 退出</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.command-palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(12px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 14vh;
}

.command-palette-modal {
  width: 90%;
  max-width: 600px;
  background: var(--wms-surface-elevated);
  border: 1px solid var(--wms-border-subtle);
  border-radius: 14px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 40px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 480px;
}

.palette-search-wrapper {
  padding: 14px;
  border-bottom: 1px solid var(--wms-border-subtle);
}

.palette-input :deep(.n-input) {
  background: var(--wms-surface-muted) !important;
  border-radius: 8px;
}

.palette-results-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  max-height: 320px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: transform 0.15s ease;
}

.palette-item.active {
  background-color: var(--wms-surface-hover);
}

.palette-item-icon {
  color: var(--wms-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: var(--wms-surface-muted);
  flex-shrink: 0;
}

.palette-item.active .palette-item-icon {
  background-color: var(--wms-surface-panel);
  color: var(--wms-text-primary);
}

.palette-item-content {
  flex: 1;
  min-width: 0;
}

.palette-item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--wms-text-primary);
}

.palette-item-desc {
  font-size: 12px;
  color: var(--wms-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.palette-item-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #fee2e2;
  color: #ef4444;
  font-weight: 500;
}

.palette-item-tag.path {
  background-color: #e0f2fe;
  color: #0284c7;
}

.palette-empty {
  padding: 32px;
  text-align: center;
  color: var(--wms-text-muted);
  font-size: 14px;
}

.palette-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--wms-border-subtle);
  background-color: var(--wms-surface-muted);
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--wms-text-muted);
}

.palette-footer kbd {
  background: var(--wms-surface-panel);
  border: 1px solid var(--wms-border);
  border-radius: 3px;
  padding: 1px 4px;
  font-family: inherit;
  font-size: 10px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.1);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
