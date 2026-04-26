<script setup lang="ts">
import { computed, h, ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteMeta, RouteRecordRaw } from 'vue-router'
import {
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NButton,
  NIcon,
  NDropdown,
  NSelect,
} from 'naive-ui'
import { MenuOutline as MenuIcon, CloseOutline as CloseIcon, LogOutOutline as LogoutIcon, ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import type { MenuOption, SelectOption } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { useTabsStore } from '../stores/tabs'
import { organizationUnitsApi } from '../api/identity'
import * as warehouseApi from '../api/masterData/warehouse'
import * as usersApi from '../api/identity/users'
import request from '../utils/request'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tabsStore = useTabsStore()

function unwrapMaybeRef<T>(source: T | { value: T }): T {
  if (source && typeof source === 'object' && 'value' in source) {
    return (source as { value: T }).value
  }
  return source as T
}

const username = computed(() => authStore.user?.username ?? 'User')
const warehouseOptions = ref<SelectOption[]>([])
const warehouseLoading = ref(false)

const departmentOptions = ref<SelectOption[]>([])
const departmentLoading = ref(false)

const currentWarehouseId = computed(() => authStore.currentWarehouseId)
const currentDepartmentId = computed(() => authStore.currentDepartmentId)
const canViewAllWarehouses = computed(() => authStore.hasPermission('WMS.Global.ViewAllWarehousesData'))
const canViewAllDepartments = computed(() => authStore.hasPermission('WMS.Global.ViewAllDepartmentsData'))

// 变更仓库上下文后强制刷新，确保全局请求头上下文立即生效
function handleWarehouseChange(value: string | null) {
  authStore.setContext(value, authStore.currentDepartmentId)
  window.location.reload()
}

async function loadRealWarehouses() {
  warehouseLoading.value = true
  try {
    let currentUserId = ''

    try {
      const appConfig = await request.get<{ currentUser?: { id?: string } }>('/api/abp/application-configuration')
      currentUserId = appConfig.data?.currentUser?.id ?? ''
    } catch {
      currentUserId = ''
    }

    if (!currentUserId) {
      const username = authStore.user?.username?.trim().toLowerCase()
      if (username) {
        try {
          const userPage = await usersApi.getList({
            skipCount: 0,
            maxResultCount: 20,
            filter: username,
          })
          const matchedUser = (userPage.items ?? []).find((item) => (item.userName ?? '').trim().toLowerCase() === username)
          currentUserId = matchedUser?.id ?? ''
        } catch {
          currentUserId = ''
        }
      }
    }

    const data = await warehouseApi.getList({
      skipCount: 0,
      maxResultCount: 1000,
    })

    let allowedWarehouseIdSet: Set<string> | null = null
    if (currentUserId) {
      try {
        const warehouseIds = await warehouseApi.getWarehousesByUser(currentUserId)
        allowedWarehouseIdSet = new Set((warehouseIds ?? []).map((id) => String(id)))
      } catch {
        allowedWarehouseIdSet = null
      }
    }

    const baseOptions = (data.items ?? []).map((item) => {
      const name = (item.name ?? '').trim()
      return {
        label: name || '未命名仓库',
        value: item.id,
      }
    }).filter((item) => !allowedWarehouseIdSet || allowedWarehouseIdSet.has(String(item.value)))

    warehouseOptions.value = canViewAllWarehouses.value
      ? [{ label: '全部仓库', value: '' }, ...baseOptions]
      : baseOptions

    if (!warehouseOptions.value.length) {
      if (authStore.currentWarehouseId !== '') {
        authStore.setContext('', authStore.currentDepartmentId)
        window.location.reload()
      }
      return
    }

    const currentWarehouseId = authStore.currentWarehouseId
    const existsInOptions = warehouseOptions.value.some((item) => String(item.value) === currentWarehouseId)
    if (!existsInOptions) {
      const nextWarehouseId = canViewAllWarehouses.value
        ? ''
        : String(warehouseOptions.value[0]?.value ?? '')
      authStore.setContext(nextWarehouseId, authStore.currentDepartmentId)
      window.location.reload()
    }
  } finally {
    warehouseLoading.value = false
  }
}

// 变更部门上下文后强制刷新，确保全局请求头上下文立即生效
function handleDepartmentChange(value: string | null) {
  authStore.setContext(authStore.currentWarehouseId, value)
  window.location.reload()
}

type DepartmentNode = {
  id: string
  displayName: string
  code?: string
  children?: DepartmentNode[]
}

function flattenDepartments(nodes: DepartmentNode[]): DepartmentNode[] {
  const result: DepartmentNode[] = []
  const walk = (items: DepartmentNode[]) => {
    for (const item of items) {
      result.push(item)
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children)
      }
    }
  }
  walk(nodes)
  return result
}

function buildDepartmentLabel(item: DepartmentNode): string {
  return item.displayName?.trim() || '未命名部门'
}

async function loadCurrentUserDepartments() {
  const username = authStore.user?.username?.trim().toLowerCase()
  if (!username) {
    departmentOptions.value = []
    return
  }

  departmentLoading.value = true
  try {
    const treeResult = await organizationUnitsApi.getTree()
    const flatDepartments = flattenDepartments((treeResult.items ?? []) as DepartmentNode[])

    const matchedDepartments: DepartmentNode[] = []
    for (const department of flatDepartments) {
      try {
        const users = await organizationUnitsApi.getUsers(department.id)
        const exists = users.some((item) => (item.userName ?? '').trim().toLowerCase() === username)
        if (exists) {
          matchedDepartments.push(department)
        }
      } catch {
        // 单个部门获取失败时忽略，继续加载其他部门
      }
    }

    const baseOptions = matchedDepartments.map((item) => ({
      label: buildDepartmentLabel(item),
      value: item.id,
    }))

    departmentOptions.value = canViewAllDepartments.value
      ? [{ label: '全部车间', value: '' }, ...baseOptions]
      : baseOptions

    if (!departmentOptions.value.length) {
      if (authStore.currentDepartmentId !== '') {
        authStore.setContext(authStore.currentWarehouseId, '')
        window.location.reload()
      }
      return
    }

    const currentDepartmentId = authStore.currentDepartmentId
    const existsInOptions = departmentOptions.value.some((item) => String(item.value) === currentDepartmentId)
    if (!existsInOptions) {
      const nextDepartmentId = canViewAllDepartments.value
        ? ''
        : String(departmentOptions.value[0]?.value ?? '')
      authStore.setContext(authStore.currentWarehouseId, nextDepartmentId)
      window.location.reload()
    }
  } finally {
    departmentLoading.value = false
  }
}

const isCollapsed = ref(false)
const refreshKey = ref(0)
const viewKey = computed(() => `${route.fullPath}-${refreshKey.value}`)

type AppMenuOption = MenuOption & {
  requiredPolicy?: string
  children?: AppMenuOption[]
}

function joinPath(parentPath: string, childPath: string): string {
  if (childPath.startsWith('/')) {
    return childPath
  }

  const parent = parentPath === '/' ? '' : parentPath
  const joined = `${parent}/${childPath}`
  return joined.replace(/\/+/g, '/') || '/'
}

function hasRoutePermission(meta: RouteMeta): boolean {
  const requiredPolicy = typeof meta.requiredPolicy === 'string' ? meta.requiredPolicy : ''
  return !requiredPolicy || authStore.hasPermission(requiredPolicy)
}

function buildMenuFromRoutes(routes: RouteRecordRaw[], parentPath: string): AppMenuOption[] {
  const result: AppMenuOption[] = []
  const sortedRoutes = [...routes].sort((left, right) => {
    const leftOrder = typeof left.meta?.order === 'number' ? left.meta.order : Number.MAX_SAFE_INTEGER
    const rightOrder = typeof right.meta?.order === 'number' ? right.meta.order : Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
  })

  for (const routeRecord of sortedRoutes) {
    const meta = (routeRecord.meta ?? {}) as RouteMeta
    if (meta.hidden === true || !hasRoutePermission(meta)) {
      continue
    }
    const requiredPolicy = typeof meta.requiredPolicy === 'string' ? meta.requiredPolicy : undefined

    const fullPath = joinPath(parentPath, routeRecord.path)
    if (fullPath.includes(':')) {
      continue
    }

    const children = Array.isArray(routeRecord.children)
      ? buildMenuFromRoutes(routeRecord.children, fullPath)
      : []
    const hasConfiguredChildren = Array.isArray(routeRecord.children) && routeRecord.children.length > 0

    const title = typeof meta.title === 'string' ? meta.title : ''
    if (!title) {
      if (children.length > 0) {
        result.push(...children)
      }
      continue
    }

    if (hasConfiguredChildren) {
      result.push({
        label: title,
        key: `group:${fullPath}`,
        requiredPolicy,
        children: children.length > 0 ? children : undefined,
      })
      continue
    }

    if (!routeRecord.component) {
      continue
    }

    result.push({
      label: title,
      key: fullPath,
      requiredPolicy,
    })
  }

  return result
}

const menuOptions = computed(() => {
  const layoutRoute = router.options.routes.find((routeRecord) => routeRecord.path === '/')
  const children = Array.isArray(layoutRoute?.children) ? layoutRoute.children : []
  return buildMenuFromRoutes(children, '/')
})

async function onLogout() {
  await authStore.logout({ redirect: true })
}

function onMenuUpdate(key: string) {
  if (key.startsWith('/')) {
    router.push(key)
  }
}

function handleTabClick(path: string) {
  tabsStore.setActive(path)
  router.push(path)
}

function handleTabClose(path: string) {
  tabsStore.removeTab(path)
  if (route.path === path) {
    const nextPath = unwrapMaybeRef<string>(tabsStore.activeTab)
    router.push(nextPath || '/dashboard')
  }
}

const cachedViews = computed(() =>
  unwrapMaybeRef<Array<{ name: string }>>(tabsStore.tabList).map((t) => t.name).filter(Boolean),
)

// ---- 右键菜单 ----
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTab = ref('')

const contextMenuOptions = [
  { label: '关闭当前', key: 'close-current' },
  { label: '关闭其他', key: 'close-others' },
  { label: '关闭所有', key: 'close-all' },
  { label: '刷新当前', key: 'refresh-current' },
]

function handleTabContextMenu(e: MouseEvent, path: string) {
  e.preventDefault()
  contextMenuTab.value = path
  showContextMenu.value = false
  nextTick(() => {
    contextMenuX.value = e.clientX
    contextMenuY.value = e.clientY
    showContextMenu.value = true
  })
}

function handleContextMenuSelect(key: string) {
  showContextMenu.value = false
  const path = contextMenuTab.value
  if (key === 'close-current') {
    handleTabClose(path)
  } else if (key === 'close-others') {
    tabsStore.closeOthers(path)
    router.push(path)
  } else if (key === 'close-all') {
    tabsStore.closeAll()
    router.push('/dashboard')
  } else if (key === 'refresh-current') {
    refreshKey.value = Date.now()
  }
}

function handleContextMenuClickOutside() {
  showContextMenu.value = false
}

// ---- 标签页滚动 ----
const tabsScrollRef = ref<HTMLElement | null>(null)
const showScrollLeft = ref(false)
const showScrollRight = ref(false)

function checkTabsOverflow() {
  const el = tabsScrollRef.value
  if (!el) return
  showScrollLeft.value = el.scrollLeft > 2
  showScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
}

function scrollTabs(direction: 'left' | 'right') {
  const el = tabsScrollRef.value
  if (!el) return
  el.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' })
}

let tabsResizeObserver: ResizeObserver | null = null

// ---- 用户下拉菜单 ----
const userDropdownOptions = [
  { label: '退出登录', key: 'logout', icon: () => h(NIcon, { size: 14 }, { default: () => h(LogoutIcon) }) },
]

function handleUserDropdownSelect(key: string) {
  if (key === 'logout') {
    onLogout()
  }
}

function toggleSider() {
  isCollapsed.value = !isCollapsed.value
}

onMounted(() => {
  loadRealWarehouses()
  loadCurrentUserDepartments()
  nextTick(() => {
    checkTabsOverflow()
    const el = tabsScrollRef.value
    if (el) {
      el.addEventListener('scroll', checkTabsOverflow, { passive: true })
      tabsResizeObserver = new ResizeObserver(checkTabsOverflow)
      tabsResizeObserver.observe(el)
    }
  })
})

onBeforeUnmount(() => {
  const el = tabsScrollRef.value
  if (el) el.removeEventListener('scroll', checkTabsOverflow)
  tabsResizeObserver?.disconnect()
})
</script>

<template>
  <n-layout class="layout" has-sider>
    <!-- ========== 侧边栏 ========== -->
    <n-layout-sider width="230" :collapsed-width="72" :collapsed="isCollapsed" collapse-mode="width" class="sidebar"
      :class="{ collapsed: isCollapsed }" bordered>
      <div class="logo-wrap">
        <div class="logo-icon">
          <svg class="brand-warehouse" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="polaris-bg" x1="1" y1="1" x2="23" y2="23" gradientUnits="userSpaceOnUse">
                <stop stop-color="#3B82F6" />
                <stop offset="1" stop-color="#1E40AF" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="24" height="24" rx="5.2" fill="url(#polaris-bg)" />
            <path d="M12 3.8C12.4 9.8,15 11.2,18.8 12C15 12.8,12.4 15,12 20.2C11.6 15,9 12.8,5.2 12C9 11.2,11.6 9.8,12 3.8Z" fill="white" fill-opacity="0.95" />
          </svg>
        </div>
        <span class="logo-text" :class="{ hidden: isCollapsed }">极星仓储</span>
      </div>

      <n-menu class="menu" :options="menuOptions" :collapsed="isCollapsed" :value="route.path"
        @update:value="onMenuUpdate" />

    </n-layout-sider>

    <n-layout>
      <!-- ========== 顶栏 ========== -->
      <n-layout-header class="header" bordered>
        <div class="header-left">
          <n-button class="collapse-btn" size="small" quaternary @click="toggleSider">
            <template #icon>
              <n-icon size="16">
                <MenuIcon />
              </n-icon>
            </template>
          </n-button>

          <div class="header-tabs">
            <n-button v-show="showScrollLeft" class="tab-scroll-btn tab-scroll-left" text size="tiny" @click="scrollTabs('left')">
              <n-icon size="14"><ChevronBackOutline /></n-icon>
            </n-button>
            <div ref="tabsScrollRef" class="tabs-scroll" @scroll="checkTabsOverflow">
              <div v-for="tab in tabsStore.tabList" :key="tab.path" class="tab-item"
                :class="{ active: tab.path === route.path }" @click="handleTabClick(tab.path)"
                @contextmenu="handleTabContextMenu($event, tab.path)">
                <span class="tab-label">{{ tab.title }}</span>
                <span v-if="tabsStore.tabList.length > 1" class="tab-close" @click.stop="handleTabClose(tab.path)">
                  <n-icon size="12" aria-hidden="true">
                    <CloseIcon />
                  </n-icon>
                </span>
              </div>
            </div>
            <n-button v-show="showScrollRight" class="tab-scroll-btn tab-scroll-right" text size="tiny" @click="scrollTabs('right')">
              <n-icon size="14"><ChevronForwardOutline /></n-icon>
            </n-button>
          </div>
        </div>

        <div class="header-right">
          <div class="warehouse-switch">
            <n-select
              class="warehouse-select"
              size="tiny"
              :value="currentWarehouseId"
              :options="warehouseOptions"
              :loading="warehouseLoading"
              clearable
              placeholder="仓库"
              @update:value="handleWarehouseChange"
            />
          </div>

          <div class="department-switch">
            <n-select
              class="department-select"
              size="tiny"
              :value="currentDepartmentId"
              :options="departmentOptions"
              :loading="departmentLoading"
              clearable
              placeholder="部门"
              @update:value="handleDepartmentChange"
            />
          </div>

          <n-dropdown :options="userDropdownOptions" trigger="click" @select="handleUserDropdownSelect">
            <div class="user-badge" style="cursor: pointer;">
              <div class="user-avatar">{{ username.charAt(0).toUpperCase() }}</div>
              <span class="user-name">{{ username }}</span>
            </div>
          </n-dropdown>
        </div>
      </n-layout-header>

      <n-dropdown placement="bottom-start" trigger="manual" :x="contextMenuX" :y="contextMenuY"
        :options="contextMenuOptions" :show="showContextMenu" @select="handleContextMenuSelect"
        @clickoutside="handleContextMenuClickOutside" />

      <!-- ========== 主内容 ========== -->
      <n-layout-content class="main">
        <div class="main-view">
          <router-view v-slot="{ Component }">
            <keep-alive :include="cachedViews">
              <component :is="Component" :key="viewKey" />
            </keep-alive>
          </router-view>
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
/* ============================
   全局布局
   ============================ */
.layout {
  min-height: 100vh;
  height: 100vh;
  background: #f5f7fb;
}

/* ============================
   侧边栏
   ============================ */
.sidebar {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 55%, #e2e8f0 100%);
  color: #0f172a;
  border-right: 1px solid rgba(15, 23, 42, 0.06) !important;
  box-shadow: 2px 0 12px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
}

.sidebar.collapsed .logo-wrap {
  justify-content: center;
  padding: 0;
}

.sidebar.collapsed .logo-text {
  display: none;
}

/* Logo 区域 */
.logo-wrap {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.logo-icon {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(145deg, rgba(37, 99, 235, 0.15), rgba(29, 78, 216, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  isolation: isolate;
}

.logo-icon::before,
.logo-icon::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 10px;
  border: 1px solid rgba(37, 99, 235, 0.3);
  transform: scale(0.84);
  opacity: 0;
  pointer-events: none;
  z-index: 0;
}

.logo-icon::before,
.logo-icon::after {
  display: none;
}

.brand-warehouse {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 0 6px rgba(37, 99, 235, 0.3));
  width: 100%;
  height: 100%;
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 1px;
}

.logo-text.hidden {
  display: none;
}

/* 菜单区域 */
.menu {
  border-right: none;
  padding: 12px 8px;
  flex: 1;
  overflow-y: auto;
}

/* ============================
   顶栏
   ============================ */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: none !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  padding: 0 16px 0 0;
  height: 48px;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.collapse-btn {
  margin-left: 6px;
}

.header-tabs {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  position: relative;
}

.tab-scroll-btn {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: #94a3b8;
  z-index: 1;
}

.tab-scroll-btn:hover {
  color: #2563eb;
}

.tabs-scroll {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 10px;
}

.tabs-scroll::-webkit-scrollbar {
  display: none;
}

/* Tab 标签 */
.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
  color: #64748b;
  border-radius: 9px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex-shrink: 0;
}

.tab-item:hover {
  color: #334155;
  background: #f1f5f9;
}

.tab-item.active {
  color: #2563eb;
  background: #eff6ff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.08);
}

.tab-label {
  line-height: 1;
}

.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: #94a3b8;
  transition: all 0.15s ease;
  margin-left: 2px;
}

.tab-close:hover {
  color: #ef4444;
  background: #fee2e2;
}

.tab-item.active .tab-close {
  color: #93c5fd;
}

.tab-item.active .tab-close:hover {
  color: #ef4444;
  background: #fee2e2;
}

/* 用户区域 */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.warehouse-switch,
.department-switch {
  display: flex;
  align-items: center;
}

.warehouse-select {
  width: 130px;
}

.department-select {
  width: 120px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-name {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

/* ============================
   主内容区
   ============================ */
.main {
  padding: 8px 10px;
  height: calc(100vh - 48px);
  min-height: 0;
  overflow: hidden;
  background: #f5f7fb;
}

.main-view {
  height: 100%;
  min-height: 0;
  overflow: auto;
}
</style>