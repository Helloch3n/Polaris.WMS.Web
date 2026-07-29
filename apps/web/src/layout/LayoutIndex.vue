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
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightStartOnRectangleIcon as LogoutIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  Bars3Icon as MenuIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CheckIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStackIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  CubeIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  HomeIcon,
  InboxStackIcon,
  ListBulletIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PaperAirplaneIcon,
  QrCodeIcon,
  RectangleGroupIcon,
  ServerIcon,
  ShareIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
  SunIcon,
  TrashIcon,
  TruckIcon,
  UserGroupIcon,
  UserIcon,
  WalletIcon,
  WrenchScrewdriverIcon,
  XCircleIcon,
  XMarkIcon as CloseIcon,
} from '@heroicons/vue/24/outline'
import type { MenuOption, SelectOption } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { useTabsStore } from '../stores/tabs'
import { useSettingsStore } from '../stores/settings'
import { organizationUnitsApi } from '../api/identity'
import * as warehouseApi from '../api/masterData/warehouse'
import * as usersApi from '../api/identity/users'
import PolarisLogo from '../components/PolarisLogo.vue'
import request from '../utils/request'
import CommandPalette from '../components/CommandPalette.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tabsStore = useTabsStore()
const settingsStore = useSettingsStore()
const commandPaletteRef = ref<InstanceType<typeof CommandPalette> | null>(null)

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
      ? [{ label: '全部部门', value: '' }, ...baseOptions]
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
const isMenuCollapsed = ref(false)
const desiredCollapsed = ref(false)
const expandedMenuKeys = ref<Array<string | number>>([])
const refreshKey = ref(0)
const viewKey = computed(() => `${route.fullPath}-${refreshKey.value}`)
let siderTransitionVersion = 0
let expandFrameId: number | null = null

type AppMenuOption = MenuOption & {
  requiredPolicy?: string
  children?: AppMenuOption[]
}

const menuIconByPath = new Map<string, any>([
  ['/master-data', BuildingOffice2Icon],
  ['/master-data/product', CubeIcon],
  ['/master-data/supplier', BuildingStorefrontIcon],
  ['/master-data/customer', UserGroupIcon],
  ['/master-data/warehouse', HomeIcon],
  ['/master-data/zone', Squares2X2Icon],
  ['/master-data/location', MapPinIcon],
  ['/master-data/account-alias', WalletIcon],
  ['/master-data/cost-center', BanknotesIcon],
  ['/inboundManagement', ArrowDownTrayIcon],
  ['/inboundManagement/purchase-receipt', DocumentCheckIcon],
  ['/inboundManagement/asn', QrCodeIcon],
  ['/inboundManagement/purchase-order', ClipboardDocumentListIcon],
  ['/inboundManagement/production-inbound', InboxStackIcon],
  ['/inboundManagement/return', ArrowsRightLeftIcon],
  ['/inboundManagement/misc-inbound-orders', ArchiveBoxIcon],
  ['/inboundManagement/putaway', PaperAirplaneIcon],
  ['/internalManagement', WrenchScrewdriverIcon],
  ['/internalManagement/move-task', ArrowsRightLeftIcon],
  ['/internalManagement/routing-strategy', ShareIcon],
  ['/internalManagement/order', ArrowsRightLeftIcon],
  ['/internalManagement/stocktake', CheckCircleIcon],
  ['/internalManagement/pallet-merge', Square3Stack3DIcon],
  ['/outboundManagement', ArrowUpTrayIcon],
  ['/outboundManagement/sales-order', ShoppingCartIcon],
  ['/outboundManagement/sales-delivery-plan', DocumentTextIcon],
  ['/outboundManagement/sales-allocation-order', ShoppingBagIcon],
  ['/outboundManagement/wave', ChartBarIcon],
  ['/outboundManagement/pick-list', ListBulletIcon],
  ['/outboundManagement/pick-task', CheckCircleIcon],
  ['/outboundManagement/review', ShieldCheckIcon],
  ['/outboundManagement/handover', TruckIcon],
  ['/outboundManagement/purchase-return', ArrowUturnLeftIcon],
  ['/outboundManagement/misc-outbound-orders', ArchiveBoxIcon],
  ['/inventoryManagement', CircleStackIcon],
  ['/inventoryManagement/container', CubeIcon],
  ['/inventoryManagement/inventory', Square3Stack3DIcon],
  ['/inventoryManagement/transactions', BookOpenIcon],
  ['/inventoryManagement/allocation', ShareIcon],
  ['/system', Cog6ToothIcon],
  ['/system/role', ShieldCheckIcon],
  ['/system/organization-unit', UserGroupIcon],
  ['/system/user', UserIcon],
  ['/system/data-sync-task', ArrowPathIcon],
  ['/system/operation-log', DocumentTextIcon],
  ['/system/interface-log', ServerIcon],
])

function renderMenuIcon(path: string) {
  const icon = menuIconByPath.get(path)
  return icon ? () => h(NIcon, { size: 17 }, { default: () => h(icon) }) : undefined
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
      if (children.length > 0) {
        result.push({
          label: title,
          key: `group:${fullPath}`,
          icon: renderMenuIcon(fullPath),
          requiredPolicy,
          children: children,
        })
      }
      continue
    }

    if (!routeRecord.component) {
      continue
    }

    result.push({
      label: title,
      key: fullPath,
      icon: renderMenuIcon(fullPath),
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

function getMenuNodeProps(option: MenuOption) {
  const isRootMenuEntry = menuOptions.value.some((rootOption) => rootOption.key === option.key)
  return isRootMenuEntry ? { class: 'root-menu-entry' } : {}
}

async function onLogout() {
  await authStore.logout({ redirect: true })
}

function onMenuUpdate(key: string) {
  if (key.startsWith('/')) {
    router.push(key)
  }
}

function handleTabClick(path: string) {
  if (draggingTabPath.value || tabDragClickLocked.value) return
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

function renderDropdownIcon(icon: any) {
  return () => h(NIcon, { size: 15 }, { default: () => h(icon) })
}

function renderThemeOptionLabel(label: string, selected: boolean) {
  return () => h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        minWidth: '104px',
      },
    },
    [
      h('span', label),
      selected
        ? h(
            NIcon,
            { size: 16, color: 'var(--wms-text-primary)' },
            { default: () => h(CheckIcon) },
          )
        : null,
    ],
  )
}

const contextMenuOptions = [
  { label: '刷新当前', key: 'refresh-current', icon: renderDropdownIcon(ArrowPathIcon) },
  { type: 'divider', key: 'divider-refresh' },
  { label: '关闭当前', key: 'close-current', icon: renderDropdownIcon(XCircleIcon) },
  { label: '关闭其他', key: 'close-others', icon: renderDropdownIcon(RectangleGroupIcon) },
  { label: '关闭所有', key: 'close-all', icon: renderDropdownIcon(TrashIcon), props: { class: 'is-danger' } },
]

function getContextMenuProps() {
  return { class: 'tab-context-menu' }
}

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

// ---- 标签页拖拽排序 ----
const draggingTabPath = ref('')
const dragOverTabPath = ref('')
const tabDragClickLocked = ref(false)

function handleTabDragStart(e: DragEvent, path: string) {
  draggingTabPath.value = path
  dragOverTabPath.value = ''
  showContextMenu.value = false
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', path)
  }
}

function handleTabDragOver(e: DragEvent, path: string) {
  if (!draggingTabPath.value || draggingTabPath.value === path) return
  e.preventDefault()
  dragOverTabPath.value = path
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

function handleTabDrop(e: DragEvent, path: string) {
  e.preventDefault()
  const sourcePath = draggingTabPath.value || e.dataTransfer?.getData('text/plain') || ''
  if (sourcePath && sourcePath !== path) {
    tabsStore.moveTab(sourcePath, path)
    nextTick(checkTabsOverflow)
    lockTabClickAfterDrag()
  }
  resetTabDragState()
}

function handleTabDragEnd() {
  resetTabDragState()
}

function resetTabDragState() {
  draggingTabPath.value = ''
  dragOverTabPath.value = ''
}

function lockTabClickAfterDrag() {
  tabDragClickLocked.value = true
  window.setTimeout(() => {
    tabDragClickLocked.value = false
  }, 120)
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
const userDropdownOptions = computed(() => [
  {
    label: username.value,
    key: 'account',
    disabled: true,
    icon: renderDropdownIcon(UserIcon),
  },
  { type: 'divider', key: 'divider-account' },
  {
    label: `主题：${settingsStore.themeLabel}`,
    key: 'theme',
    icon: renderDropdownIcon(
      settingsStore.themePreference === 'system'
        ? ComputerDesktopIcon
        : settingsStore.themePreference === 'dark'
          ? MoonIcon
          : SunIcon,
    ),
    children: [
      {
        label: renderThemeOptionLabel('亮色', settingsStore.themePreference === 'light'),
        key: 'theme-light',
        icon: renderDropdownIcon(SunIcon),
      },
      {
        label: renderThemeOptionLabel('暗色', settingsStore.themePreference === 'dark'),
        key: 'theme-dark',
        icon: renderDropdownIcon(MoonIcon),
      },
      {
        label: renderThemeOptionLabel('系统', settingsStore.themePreference === 'system'),
        key: 'theme-system',
        icon: renderDropdownIcon(ComputerDesktopIcon),
      },
    ],
  },
  { type: 'divider', key: 'divider-theme' },
  { label: '退出登录', key: 'logout', icon: renderDropdownIcon(LogoutIcon) },
])

function handleUserDropdownSelect(key: string) {
  if (key === 'theme-light') {
    settingsStore.setThemePreference('light')
  } else if (key === 'theme-dark') {
    settingsStore.setThemePreference('dark')
  } else if (key === 'theme-system') {
    settingsStore.setThemePreference('system')
  } else if (key === 'logout') {
    onLogout()
  }
}

function toggleSider() {
  desiredCollapsed.value = !desiredCollapsed.value
  const transitionVersion = ++siderTransitionVersion

  if (expandFrameId !== null) {
    window.cancelAnimationFrame(expandFrameId)
    expandFrameId = null
  }

  if (desiredCollapsed.value) {
    expandedMenuKeys.value = []
    if (isCollapsed.value) {
      isMenuCollapsed.value = true
      return
    }
    isCollapsed.value = true
    return
  }

  // 先恢复固定画布中的完整菜单，再从下一帧开始向右打开裁剪窗口。
  isMenuCollapsed.value = false
  nextTick(() => {
    if (transitionVersion !== siderTransitionVersion || desiredCollapsed.value) return
    expandFrameId = window.requestAnimationFrame(() => {
      expandFrameId = null
      if (transitionVersion !== siderTransitionVersion || desiredCollapsed.value) return
      isCollapsed.value = false
    })
  })
}

function handleSiderAfterLeave() {
  if (!desiredCollapsed.value || !isCollapsed.value) return
  expandedMenuKeys.value = []
  isMenuCollapsed.value = true
}

function handleSiderAfterEnter() {
  if (desiredCollapsed.value || isCollapsed.value) return
  isMenuCollapsed.value = false
}

function handleMenuExpandedKeys(keys: Array<string | number>) {
  if (!isMenuCollapsed.value) {
    expandedMenuKeys.value = keys
  }
}

function openCommandPalette() {
  commandPaletteRef.value?.open()
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
  if (expandFrameId !== null) {
    window.cancelAnimationFrame(expandFrameId)
    expandFrameId = null
  }
  const el = tabsScrollRef.value
  if (el) el.removeEventListener('scroll', checkTabsOverflow)
  tabsResizeObserver?.disconnect()
})
</script>

<template>
  <n-layout class="layout" has-sider>
    <!-- ========== 侧边栏 ========== -->
    <n-layout-sider width="216" :collapsed-width="60" :collapsed="isCollapsed" collapse-mode="width" class="sidebar"
      content-class="sidebar-content" :class="{ collapsed: isCollapsed, 'menu-collapsed': isMenuCollapsed }"
      bordered @after-enter="handleSiderAfterEnter" @after-leave="handleSiderAfterLeave">
      <div class="sidebar-canvas">
        <div class="logo-wrap">
          <div class="expanded-logo-content" :aria-hidden="isCollapsed">
            <span class="logo-text">极星仓储</span>
            <n-button class="sider-toggle-btn" size="small" quaternary @click="toggleSider">
              <template #icon>
                <n-icon size="16">
                  <MenuIcon />
                </n-icon>
              </template>
            </n-button>
          </div>

          <button
            type="button"
            class="collapsed-logo-container"
            :aria-hidden="!isCollapsed"
            :tabindex="isCollapsed ? 0 : -1"
            aria-label="展开菜单栏"
            @click="toggleSider"
          >
            <PolarisLogo class="brand-logo-collapsed" />
            <div class="hover-icon-overlay">
              <n-icon size="16">
                <MenuIcon />
              </n-icon>
            </div>
          </button>
        </div>

        <n-menu
          class="menu"
          :options="menuOptions"
          :collapsed="isMenuCollapsed"
          :value="route.path"
          :expanded-keys="isMenuCollapsed ? [] : expandedMenuKeys"
          :collapsed-width="60"
          :icon-size="17"
          :collapsed-icon-size="17"
          :root-indent="14.5"
          :node-props="getMenuNodeProps"
          @update:value="onMenuUpdate"
          @update:expanded-keys="handleMenuExpandedKeys"
        />

        <div v-if="isMenuCollapsed" class="collapsed-sidebar-footer">
          <n-button
            class="collapsed-search-btn"
            quaternary
            circle
            title="查找（⌘K）"
            @click="openCommandPalette"
          >
            <template #icon>
              <n-icon size="18"><MagnifyingGlassIcon /></n-icon>
            </template>
          </n-button>
        </div>

        <div class="sidebar-account">
          <n-dropdown
            placement="right-end"
            :options="userDropdownOptions"
            trigger="click"
            @select="handleUserDropdownSelect"
          >
            <button class="user-account-trigger" type="button" :aria-label="`账户：${username}`">
              <span class="user-avatar">{{ username.charAt(0).toUpperCase() }}</span>
              <span class="sidebar-account-name">{{ username }}</span>
              <span class="user-hover-name" role="tooltip">{{ username }}</span>
            </button>
          </n-dropdown>
        </div>
      </div>
    </n-layout-sider>

    <n-layout>
      <!-- ========== 顶栏 ========== -->
      <n-layout-header class="header" bordered>
        <div class="header-left">
          <div class="header-tabs">
            <n-button v-show="showScrollLeft" class="tab-scroll-btn tab-scroll-left" text size="tiny" @click="scrollTabs('left')">
              <n-icon size="14"><ChevronLeftIcon /></n-icon>
            </n-button>
            <div ref="tabsScrollRef" class="tabs-scroll" @scroll="checkTabsOverflow">
              <div
                v-for="tab in tabsStore.tabList"
                :key="tab.path"
                class="tab-item"
                draggable="true"
                :class="{
                  active: tab.path === route.path,
                  dragging: draggingTabPath === tab.path,
                  'drag-over': dragOverTabPath === tab.path,
                }"
                @click="handleTabClick(tab.path)"
                @contextmenu="handleTabContextMenu($event, tab.path)"
                @dragstart="handleTabDragStart($event, tab.path)"
                @dragover="handleTabDragOver($event, tab.path)"
                @drop="handleTabDrop($event, tab.path)"
                @dragend="handleTabDragEnd"
              >
                <span class="tab-label">{{ tab.title }}</span>
                <span v-if="tabsStore.tabList.length > 1" class="tab-close" @click.stop="handleTabClose(tab.path)">
                  <n-icon size="12" aria-hidden="true">
                    <CloseIcon />
                  </n-icon>
                </span>
              </div>
            </div>
            <n-button v-show="showScrollRight" class="tab-scroll-btn tab-scroll-right" text size="tiny" @click="scrollTabs('right')">
              <n-icon size="14"><ChevronRightIcon /></n-icon>
            </n-button>
          </div>
        </div>

        <div class="header-right">
          <div class="work-context">
            <div class="context-field">
              <n-select
                class="warehouse-select context-select"
                size="tiny"
                aria-label="仓库"
                :value="currentWarehouseId"
                :options="warehouseOptions"
                :loading="warehouseLoading"
                clearable
                placeholder="全部仓库"
                @update:value="handleWarehouseChange"
              />
            </div>

            <div class="context-field">
              <n-select
                class="department-select context-select"
                size="tiny"
                aria-label="部门"
                :value="currentDepartmentId"
                :options="departmentOptions"
                :loading="departmentLoading"
                clearable
                placeholder="全部部门"
                @update:value="handleDepartmentChange"
              />
            </div>
          </div>

        </div>
      </n-layout-header>

      <n-dropdown placement="bottom-start" trigger="manual" :x="contextMenuX" :y="contextMenuY"
        :options="contextMenuOptions" :show="showContextMenu" @select="handleContextMenuSelect"
        :menu-props="getContextMenuProps" @clickoutside="handleContextMenuClickOutside" />

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
  <CommandPalette ref="commandPaletteRef" />
</template>

<style scoped>
/* ============================
   全局布局
   ============================ */
.layout {
  min-height: 100vh;
  height: 100vh;
}

/* ============================
   侧边栏
   ============================ */
.sidebar {
  color: var(--wms-text-primary);
  border-right: 1px solid color-mix(in srgb, var(--wms-border-subtle) 88%, transparent) !important;
  box-shadow: 1px 0 0 color-mix(in srgb, var(--wms-surface-elevated) 38%, transparent) inset,
              8px 0 22px rgba(15, 23, 42, 0.03) !important;
  display: flex;
  flex-direction: column;
  justify-content: flex-start !important;
  overflow: hidden !important;
  background-color: var(--wms-surface-sider);
}

/* 动态侧栏只是裁剪窗口，内部画布始终保持展开宽度。 */
.sidebar :deep(.sidebar-content) {
  display: block;
  height: 100%;
  min-height: 0;
  overflow: clip !important;
}

.sidebar-canvas {
  display: flex;
  flex: 0 0 216px;
  flex-direction: column;
  width: 216px;
  min-width: 216px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* Logo 区域 */
.logo-wrap {
  position: relative;
  width: 216px;
  height: 48px;
  flex-shrink: 0;
  overflow: hidden;
}

.expanded-logo-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 216px;
  height: 48px;
  box-sizing: border-box;
  padding: 0 10px 0 15px;
  opacity: 1;
  visibility: visible;
  transition: opacity 0.1s ease;
}

.sidebar.collapsed .expanded-logo-content {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.logo-text {
  font-size: 15px;
  font-weight: 720;
  letter-spacing: 0.02em;
  color: var(--wms-text-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  display: inline-block;
  line-height: 20px;
  white-space: nowrap;
}

.sider-toggle-btn {
  --n-color-hover: var(--wms-surface-hover) !important;
  --n-color-pressed: var(--wms-surface-hover) !important;
  --n-text-color-hover: var(--wms-text-primary) !important;
  --n-text-color-pressed: var(--wms-text-primary) !important;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  color: var(--wms-text-primary);
  transition: color 0.16s ease, background-color 0.16s ease, transform 0.16s ease;
}

.sider-toggle-btn:hover {
  color: var(--wms-text-primary);
  background: var(--wms-surface-hover);
}

/* 折叠状态下的 Logo 容器及悬浮切换 */
.collapsed-logo-container {
  position: absolute;
  top: 8px;
  left: 14px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  color: var(--wms-text-primary);
  background: transparent;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: color 0.16s ease, background-color 0.16s ease, opacity 0.1s ease;
}

.sidebar.collapsed .collapsed-logo-container {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.collapsed-logo-container:hover {
  color: var(--wms-text-primary);
  background-color: var(--wms-surface-hover);
}

.brand-logo-collapsed {
  width: 20px;
  height: 15px;
  color: var(--wms-text-primary);
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
}

.hover-icon-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapsed-logo-container:hover .brand-logo-collapsed {
  opacity: 0;
  transform: scale(0.8);
}

.collapsed-logo-container:hover .hover-icon-overlay {
  opacity: 1;
  transform: scale(1);
}

/* 菜单区域 */
.menu {
  border-right: none;
  padding: 8px 7px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  font-size: 13px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--wms-text-muted) 24%, transparent) transparent;
}

.menu::-webkit-scrollbar {
  width: 4px;
}

.menu::-webkit-scrollbar-track {
  background: transparent;
}

.menu::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--wms-text-muted) 22%, transparent);
  border-radius: 999px;
}

.menu :deep(.n-menu-item-content),
.menu :deep(.n-menu-item-content-header),
.menu :deep(.n-submenu-title) {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
}

.menu :deep(.n-menu-item-content),
.menu :deep(.n-submenu-title) {
  height: 32px !important;
  line-height: 32px !important;
  margin: 1px 0;
  border-radius: 6px;
  color: var(--wms-text-primary);
}

.menu :deep(.n-menu-item-content-header),
.menu :deep(.n-menu-item-content__icon) {
  color: var(--wms-text-primary) !important;
}

.menu :deep(.n-menu-item-content:hover),
.menu :deep(.n-submenu-title:hover),
.menu :deep(.n-menu-item-content.n-menu-item-content--selected),
.menu :deep(.n-submenu-title.n-submenu-title--selected),
.menu :deep(.n-menu-item-content.n-menu-item-content--child-active),
.menu :deep(.n-submenu-title.n-submenu-title--child-active) {
  background: transparent !important;
  color: var(--wms-text-primary) !important;
  font-weight: 500;
  box-shadow: none !important;
}

.menu :deep(.n-menu-item-content:hover::before),
.menu :deep(.n-submenu-title:hover::before),
.menu :deep(.n-menu-item-content.n-menu-item-content--selected::before),
.menu :deep(.n-submenu-title.n-submenu-title--selected::before),
.menu :deep(.n-menu-item-content.n-menu-item-content--child-active::before),
.menu :deep(.n-submenu-title.n-submenu-title--child-active::before) {
  background-color: var(--wms-surface-hover) !important;
  border: none !important;
  box-shadow: none !important;
}

.menu :deep(.n-menu-item-content:hover .n-menu-item-content-header),
.menu :deep(.n-submenu-title:hover .n-menu-item-content-header),
.menu :deep(.n-menu-item-content.n-menu-item-content--selected .n-menu-item-content-header),
.menu :deep(.n-submenu-title.n-submenu-title--selected .n-menu-item-content-header),
.menu :deep(.n-menu-item-content.n-menu-item-content--child-active .n-menu-item-content-header),
.menu :deep(.n-submenu-title.n-submenu-title--child-active .n-menu-item-content-header) {
  color: var(--wms-text-primary) !important;
  font-weight: 500;
}

.menu :deep(.n-menu-item-content:hover .n-menu-item-content__icon),
.menu :deep(.n-submenu-title:hover .n-menu-item-content__icon),
.menu :deep(.n-menu-item-content.n-menu-item-content--selected .n-menu-item-content__icon),
.menu :deep(.n-submenu-title.n-submenu-title--selected .n-menu-item-content__icon),
.menu :deep(.n-menu-item-content.n-menu-item-content--child-active .n-menu-item-content__icon),
.menu :deep(.n-submenu-title.n-submenu-title--child-active .n-menu-item-content__icon) {
  color: var(--wms-text-primary) !important;
}

.menu :deep(.n-menu-item-content:hover .n-submenu-arrow),
.menu :deep(.n-submenu-title:hover .n-submenu-arrow),
.menu :deep(.n-menu-item-content.n-menu-item-content--selected .n-submenu-arrow),
.menu :deep(.n-submenu-title.n-submenu-title--selected .n-submenu-arrow),
.menu :deep(.n-menu-item-content.n-menu-item-content--child-active .n-submenu-arrow),
.menu :deep(.n-submenu-title.n-submenu-title--child-active .n-submenu-arrow),
.menu :deep(.n-menu-item-content:hover .n-menu-item-content__arrow),
.menu :deep(.n-submenu-title:hover .n-menu-item-content__arrow),
.menu :deep(.n-menu-item-content.n-menu-item-content--selected .n-menu-item-content__arrow),
.menu :deep(.n-submenu-title.n-submenu-title--selected .n-menu-item-content__arrow),
.menu :deep(.n-menu-item-content.n-menu-item-content--child-active .n-menu-item-content__arrow),
.menu :deep(.n-submenu-title.n-submenu-title--child-active .n-menu-item-content__arrow) {
  color: var(--wms-text-primary) !important;
}

.menu :deep(.n-menu-item-content.n-menu-item-content--selected::after),
.menu :deep(.n-submenu-title.n-submenu-title--selected::after) {
  display: none !important;
}

.menu :deep(.n-submenu-children) {
  position: relative;
  border-left: none;
  margin-left: 0;
  padding-left: 0;
  transition: color 0.18s ease, background-color 0.18s ease;
}

.menu :deep(.n-submenu-children .n-menu-item-content) {
  height: 30px !important;
  line-height: 30px !important;
  padding-left: 44px !important;
  padding-right: 10px !important;
  color: var(--wms-text-primary);
}

.menu :deep(.n-submenu-arrow),
.menu :deep(.n-menu-item-content__arrow) {
  color: var(--wms-text-primary) !important;
  transform-origin: center;
}

/* 一级菜单始终采用收缩态的 40px 垂直节奏，避免展开后逐项下移。 */
.menu > :deep(.n-submenu) {
  margin-top: 0 !important;
}

.menu :deep(.root-menu-entry) {
  margin-top: 0 !important;
}

.menu :deep(.root-menu-entry.n-menu-item) {
  display: flex !important;
  height: 40px !important;
}

.menu :deep(.root-menu-entry > .n-menu-item-content),
.menu :deep(.root-menu-entry > .n-submenu-title) {
  flex: 1 1 auto;
  min-width: 0;
  margin-top: 4px !important;
  margin-bottom: 4px !important;
  transition-property: color, background-color, border-color !important;
}

.sidebar.menu-collapsed .menu {
  padding: 8px 0;
  width: 60px !important;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 0 0 auto;
  min-height: auto;
  overflow-x: hidden !important;
  overflow-y: visible !important;
}

.sidebar.menu-collapsed .menu :deep(.n-menu-item),
.sidebar.menu-collapsed .menu :deep(.n-submenu) {
  width: 60px !important;
  display: flex !important;
  justify-content: flex-start !important;
  padding: 0 !important;
  margin: 0 !important;
}

.sidebar.menu-collapsed .menu :deep(.n-menu-item-content),
.sidebar.menu-collapsed .menu :deep(.n-submenu-title) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  margin: 4px 14px !important;
  padding: 0 !important;
  border-radius: 8px;
  transition-property: color, background-color, border-color !important;
}

.sidebar.menu-collapsed .menu :deep(.n-menu-item-content::before),
.sidebar.menu-collapsed .menu :deep(.n-submenu-title::before) {
  left: 0 !important;
  right: 0 !important;
  border-radius: 8px !important;
}

.sidebar.menu-collapsed .menu :deep(.n-menu-item-content__icon),
.sidebar.menu-collapsed .menu :deep(.n-submenu-title__icon),
.sidebar.menu-collapsed .menu :deep(.n-submenu-title__prefix) {
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 18px !important;
  height: 18px !important;
  min-width: 18px !important;
  min-height: 18px !important;
  transition: none !important;
}

.sidebar.menu-collapsed .menu :deep(.n-menu-item-content__icon .n-icon),
.sidebar.menu-collapsed .menu :deep(.n-submenu-title__icon .n-icon) {
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.sidebar.menu-collapsed .menu :deep(.n-menu-item-content-header),
.sidebar.menu-collapsed .menu :deep(.n-submenu-title__text),
.sidebar.menu-collapsed .menu :deep(.n-submenu-arrow),
.sidebar.menu-collapsed .menu :deep(.n-menu-item-content__arrow) {
  display: none !important;
}

.sidebar.menu-collapsed .menu :deep(.n-menu-item-content::after),
.sidebar.menu-collapsed .menu :deep(.n-submenu-title::after) {
  display: none !important;
}

.collapsed-sidebar-footer {
  display: flex;
  justify-content: center;
  width: 60px;
  padding: 0 0 8px;
  flex-shrink: 0;
}

.collapsed-search-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--wms-text-secondary);
}

.collapsed-search-btn:hover {
  color: var(--wms-text-primary);
  background: var(--wms-surface-hover);
}

.sidebar-account {
  display: flex;
  justify-content: flex-start;
  flex-shrink: 0;
  margin-top: auto;
  width: 216px;
  height: 42px;
  padding: 4px 10px 5px;
  box-sizing: border-box;
}

.sidebar.menu-collapsed .sidebar-account {
  width: 60px;
}

.user-account-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  width: 100%;
  height: 32px;
  min-width: 0;
  padding: 2px 6px;
  box-sizing: border-box;
  border: 0;
  border-radius: 8px;
  color: var(--wms-text-primary);
  background: transparent;
  cursor: pointer;
}

.user-account-trigger:hover,
.user-account-trigger:focus-visible {
  color: var(--wms-text-primary);
  background: var(--wms-surface-hover);
  outline: none;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--wms-brand), var(--wms-op-outbound));
  color: var(--wms-text-inverse);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-account-name {
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-hover-name {
  position: absolute;
  left: 20px;
  bottom: calc(100% + 8px);
  z-index: 1000;
  padding: 5px 8px;
  border: 1px solid var(--wms-border-subtle);
  border-radius: 6px;
  background: var(--wms-surface-elevated);
  box-shadow: var(--wms-shadow-md);
  color: var(--wms-text-primary);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 4px);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.user-account-trigger:hover .user-hover-name,
.user-account-trigger:focus-visible .user-hover-name {
  opacity: 1;
  transform: translate(-50%, 0);
}

.sidebar:not(.menu-collapsed) .user-hover-name {
  display: none;
}

.sidebar.menu-collapsed .sidebar-account-name {
  display: none;
}

/* ============================
   顶栏
   ============================ */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--wms-border-subtle) !important;
  box-shadow: none !important;
  padding: 0 16px 0 0;
  height: 48px;
  gap: 12px;
  background-color: var(--wms-surface-header);
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
              border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  min-width: 0;
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
  --n-text-color: var(--wms-text-primary) !important;
  --n-text-color-hover: var(--wms-text-primary) !important;
  --n-text-color-pressed: var(--wms-text-primary) !important;
  --n-text-color-focus: var(--wms-text-primary) !important;
  --n-ripple-color: transparent !important;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: var(--wms-text-primary) !important;
  z-index: 1;
}

.tab-scroll-btn:hover,
.tab-scroll-btn:active,
.tab-scroll-btn:focus-visible {
  color: var(--wms-text-primary) !important;
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
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--wms-text-primary);
  border-radius: 6px;
  cursor: grab;
  user-select: none;
  white-space: nowrap;
  transition: color 0.18s ease, background-color 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
  position: relative;
  flex-shrink: 0;
  border: none;
  margin-right: 2px;
}

.tab-item:active {
  cursor: grabbing;
}

.tab-item:hover {
  color: var(--wms-text-primary);
  background: var(--wms-surface-hover);
}

.tab-item.active {
  color: var(--wms-text-primary);
  background: var(--wms-surface-hover);
  font-weight: 600;
  box-shadow: none;
}

.tab-item.active::after {
  display: none;
}

.tab-item.dragging {
  opacity: 0.48;
  transform: scale(0.98);
}

.tab-item.drag-over {
  color: var(--wms-text-primary);
  background: var(--wms-surface-hover);
  box-shadow: inset 0 0 0 1px var(--wms-border);
}

.tab-item.drag-over::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 7px;
  bottom: 7px;
  width: 2px;
  border-radius: 999px;
  background: var(--wms-border-strong);
}

.tab-label {
  line-height: 1;
}

.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  color: var(--wms-text-primary);
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
  margin-left: 2px;
  opacity: 0;
  transform: scale(0.8);
}

.tab-item:hover .tab-close,
.tab-item.active .tab-close {
  opacity: 1;
  transform: scale(1);
}

.tab-close:hover {
  color: var(--wms-status-error);
  background: var(--wms-status-error-bg);
}

:global(.tab-context-menu.n-dropdown-menu) {
  min-width: 152px;
  padding: 5px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--wms-border-subtle) 92%, transparent);
  background: var(--wms-surface-elevated);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.13), 0 1px 0 color-mix(in srgb, var(--wms-text-inverse) 28%, transparent) inset;
}

:global(.tab-context-menu .n-dropdown-option) {
  margin: 1px 0;
}

:global(.tab-context-menu .n-dropdown-option-body) {
  min-height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  color: var(--wms-text-secondary);
  font-size: 13px;
  font-weight: 500;
}

:global(.tab-context-menu .n-dropdown-option-body::before) {
  border-radius: 6px;
  background: transparent;
}

:global(.tab-context-menu .n-dropdown-option-body:hover) {
  color: var(--wms-text-primary);
}

:global(.tab-context-menu .n-dropdown-option-body:hover::before) {
  background: var(--wms-surface-hover);
}

:global(.tab-context-menu .n-dropdown-option-body__prefix) {
  width: 18px;
  margin-right: 7px;
  color: var(--wms-text-muted);
}

:global(.tab-context-menu .n-dropdown-option-body:hover .n-dropdown-option-body__prefix) {
  color: var(--wms-text-primary);
}

:global(.tab-context-menu .n-dropdown-divider) {
  margin: 5px 4px;
  background: var(--wms-border-subtle);
}

:global(.tab-context-menu .n-dropdown-option.is-danger .n-dropdown-option-body) {
  color: var(--wms-status-error);
}

:global(.tab-context-menu .n-dropdown-option.is-danger .n-dropdown-option-body__prefix) {
  color: var(--wms-status-error);
}

:global(.tab-context-menu .n-dropdown-option.is-danger .n-dropdown-option-body:hover::before) {
  background: var(--wms-status-error-bg);
}

/* 用户区域 */
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.work-context {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
}

.context-field {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0;
}

.warehouse-select,
.department-select {
  width: 128px;
}

.context-select {
  transition: background-color 0.2s ease;
}

.context-select :deep(.n-base-selection) {
  border: none !important;
  box-shadow: none !important;
  background-color: var(--wms-surface-muted) !important;
  border-radius: 6px !important;
  transition: background-color 0.2s ease !important;
}

.context-select :deep(.n-base-selection:hover) {
  background-color: var(--wms-surface-hover) !important;
}

/* ============================
   主内容区
   ============================ */
.main {
  padding: 0;
  height: calc(100vh - 48px);
  min-height: 0;
  overflow: hidden;
}

.main-view {
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.main-view > :deep(*) {
  flex: 1 1 0;
  height: 0;
  min-height: 0;
  min-width: 0;
}

@media (max-width: 1180px) {
  .work-context {
    gap: 4px;
  }

  .warehouse-select,
  .department-select {
    width: 108px;
  }
}

@media (max-width: 960px) {
  .department-select {
    display: none;
  }

}
</style>
