<script setup lang="ts">
import { computed, ref, nextTick, onMounted } from 'vue'
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
import { MenuOutline as MenuIcon, CloseOutline as CloseIcon, LogOutOutline as LogoutIcon } from '@vicons/ionicons5'
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

function toggleSider() {
  isCollapsed.value = !isCollapsed.value
}

onMounted(() => {
  loadRealWarehouses()
  loadCurrentUserDepartments()
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
              <linearGradient id="polaris-gem-bg" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#1D4ED8" />
                <stop offset="0.55" stop-color="#5B6CFF" />
                <stop offset="1" stop-color="#8B5CF6" />
              </linearGradient>
              <linearGradient id="polaris-gem-star" x1="7" y1="6" x2="17" y2="18" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#F8FAFF" />
                <stop offset="1" stop-color="#DDE7FF" />
              </linearGradient>
              <linearGradient id="polaris-gem-trail" x1="16" y1="2" x2="7" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#ffffff" stop-opacity="0.9" />
                <stop offset="1" stop-color="#c7d2fe" stop-opacity="0" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="24" height="24" rx="6.8" fill="url(#polaris-gem-bg)" />
            <path d="M12 4.9L13.9 10.1L19.1 12L13.9 13.9L12 19.1L10.1 13.9L4.9 12L10.1 10.1L12 4.9Z"
              fill="url(#polaris-gem-star)" />
            <path class="warehouse-scan" d="M8.4 12H15.6" stroke="#EEF2FF" stroke-width="1" stroke-linecap="round" />
            <circle class="warehouse-beacon" cx="16.7" cy="7.5" r="1" fill="#EAF0FF" />
            <circle class="warehouse-beacon-ring" cx="16.7" cy="7.5" r="1" stroke="#C7D2FE" stroke-width="0.85"
              fill="none" />
            <g class="star-fall-group">
              <path class="star-trail" d="M16.8 4.4L12.8 8.8" stroke="url(#polaris-gem-trail)" stroke-width="1"
                stroke-linecap="round" />
              <circle class="star-fall" cx="16.8" cy="4.4" r="0.85" fill="#ffffff" />
            </g>
          </svg>
        </div>
        <span class="logo-text" :class="{ hidden: isCollapsed }">Polaris WMS</span>
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
            <div class="tabs-scroll">
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
          </div>
        </div>

        <div class="header-right">
          <div class="warehouse-switch">
            <span class="warehouse-label">当前作业仓库</span>
            <n-select
              class="warehouse-select"
              size="small"
              :value="currentWarehouseId"
              :options="warehouseOptions"
              :loading="warehouseLoading"
              clearable
              placeholder="请选择仓库"
              @update:value="handleWarehouseChange"
            />
          </div>

          <div class="department-switch">
            <span class="department-label">当前作业部门</span>
            <n-select
              class="department-select"
              size="small"
              :value="currentDepartmentId"
              :options="departmentOptions"
              :loading="departmentLoading"
              clearable
              placeholder="请选择部门"
              @update:value="handleDepartmentChange"
            />
          </div>

          <div class="user-badge">
            <div class="user-avatar">{{ username.charAt(0).toUpperCase() }}</div>
            <span class="user-name">{{ username }}</span>
          </div>
          <n-button size="small" quaternary type="error" @click="onLogout">
            <template #icon>
              <n-icon size="14" aria-hidden="true">
                <LogoutIcon />
              </n-icon>
            </template>
            退出
          </n-button>
        </div>
      </n-layout-header>

      <n-dropdown placement="bottom-start" trigger="manual" :x="contextMenuX" :y="contextMenuY"
        :options="contextMenuOptions" :show="showContextMenu" @select="handleContextMenuSelect"
        @clickoutside="handleContextMenuClickOutside" />

      <!-- ========== 主内容 ========== -->
      <n-layout-content class="main">
        <router-view v-slot="{ Component }">
          <keep-alive :include="cachedViews">
            <component :is="Component" :key="viewKey" />
          </keep-alive>
        </router-view>
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
  background: linear-gradient(145deg, rgba(129, 140, 248, 0.2), rgba(99, 102, 241, 0.1));
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
  border: 1px solid rgba(129, 140, 248, 0.4);
  transform: scale(0.84);
  opacity: 0;
  pointer-events: none;
  z-index: 0;
}

.logo-icon::before {
  animation: logo-ripple 3s ease-out infinite;
}

.logo-icon::after {
  animation: logo-ripple 3s ease-out 1.5s infinite;
}

.brand-warehouse {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.28));
  transform-origin: center;
  animation: warehouse-float 4.2s ease-in-out infinite;
  width: 100%;
  height: 100%;
}

.warehouse-scan {
  animation: warehouse-scan-move 2.4s ease-in-out infinite;
}

.warehouse-beacon {
  animation: warehouse-beacon-pulse 2.2s ease-in-out infinite;
}

.warehouse-beacon-ring {
  animation: warehouse-ring-pulse 2.2s ease-out infinite;
}

.star-fall-group {
  transform-origin: center;
}

.star-fall {
  animation: star-fall-drop 2.8s ease-in-out infinite;
}

.star-trail {
  animation: star-fall-trail 2.8s ease-in-out infinite;
}

@keyframes logo-ripple {
  0% {
    transform: scale(0.82);
    opacity: 0;
  }

  20% {
    opacity: 0.52;
  }

  72% {
    opacity: 0.12;
  }

  100% {
    transform: scale(1.38);
    opacity: 0;
  }
}

@keyframes warehouse-float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-1px);
  }
}

@keyframes warehouse-scan-move {

  0%,
  20% {
    opacity: 0;
    transform: translateY(-0.5px);
  }

  50% {
    opacity: 0.92;
    transform: translateY(5px);
  }

  100% {
    opacity: 0;
    transform: translateY(9px);
  }
}

@keyframes warehouse-beacon-pulse {

  0%,
  100% {
    opacity: 0.72;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}

@keyframes warehouse-ring-pulse {
  0% {
    opacity: 0.6;
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(1.85);
  }
}

@keyframes star-fall-drop {
  0% {
    transform: translate(0, 0) scale(0.7);
    opacity: 0;
  }

  15% {
    opacity: 1;
  }

  55% {
    transform: translate(-3.9px, 5px) scale(1);
    opacity: 0.95;
  }

  100% {
    transform: translate(-5.8px, 7px) scale(0.7);
    opacity: 0;
  }
}

@keyframes star-fall-trail {
  0% {
    transform: translate(0, 0);
    opacity: 0;
  }

  18% {
    opacity: 0.65;
  }

  60% {
    transform: translate(-3.9px, 5px);
    opacity: 0.4;
  }

  100% {
    transform: translate(-5.8px, 7px);
    opacity: 0;
  }
}

.logo-text {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.5px;
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
  color: #4f46e5;
  background: #eef2ff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(79, 70, 229, 0.08);
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
  color: #a5b4fc;
}

.tab-item.active .tab-close:hover {
  color: #ef4444;
  background: #fee2e2;
}

/* 用户区域 */
.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.warehouse-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}

.department-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}

.warehouse-label {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
}

.department-label {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
}

.warehouse-select {
  width: 170px;
}

.department-select {
  width: 150px;
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
  padding: 20px 24px;
  min-height: calc(100vh - 48px);
  overflow: auto;
  background: #f5f7fb;
}
</style>