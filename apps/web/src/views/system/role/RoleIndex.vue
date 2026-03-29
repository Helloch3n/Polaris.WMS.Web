<script setup lang="ts">
/* eslint-disable vue/no-v-model-argument */
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NSpace,
  NSwitch,
  NTag,
  NTree,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, TreeOption } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import * as rolesApi from '../../../api/identity/roles'
import type {
  GetIdentityRolesParams,
  IdentityRoleCreateDto,
  IdentityRoleDto,
  PermissionGrantInfoDto,
} from '../../../api/identity/types'
import * as permissionApi from '../../../api/permissionManagement/permissions'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { compareSortValue } from '../../../utils/tableColumn'
import { withResizable } from '../../../utils/table'

type RoleRow = IdentityRoleDto

const message = useMessage()

const loading = ref(false)
const rows = ref<RoleRow[]>([])
const checkedRowKeys = ref<Array<string | number>>([])

const query = reactive({
  filter: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive<IdentityRoleCreateDto>({
  name: '',
  isDefault: false,
  isPublic: true,
})

const permissionDrawerVisible = ref(false)
const permissionLoading = ref(false)
const permissionSaving = ref(false)
const currentRole = ref<RoleRow | null>(null)
const permissionTree = ref<TreeOption[]>([])
const checkedPermissionKeys = ref<string[]>([])
const allPermissionKeys = ref<string[]>([])
const permissionKeyword = ref('')
const expandedPermissionKeys = ref<Array<string | number>>([])

const listParams = computed<GetIdentityRolesParams>(() => ({
  skipCount: (query.page - 1) * query.pageSize,
  maxResultCount: query.pageSize,
  filter: query.filter.trim() || undefined,
}))

const selectedRole = computed(() => {
  const id = checkedRowKeys.value[0]
  if (!id) return null
  return rows.value.find((item) => item.id === String(id)) ?? null
})

const filteredPermissionTree = computed<TreeOption[]>(() => {
  const keyword = permissionKeyword.value.trim().toLowerCase()
  if (!keyword) return permissionTree.value
  return filterPermissionTree(permissionTree.value, keyword)
})

const permissionSummaryText = computed(() => `已选 ${checkedPermissionKeys.value.length} / ${allPermissionKeys.value.length}`)

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'role-management-column-settings-v1',
  preferredKeys: ['name', 'isDefault', 'isPublic'],
  resolveTitle: (key) => {
    if (key === 'name') return '角色名称'
    if (key === 'isDefault') return '默认'
    if (key === 'isPublic') return '公共'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RoleRow>[number]> = {
  name: {
    title: createDraggableTitle('name', '角色名称'),
    key: 'name',
    minWidth: 200,
    sorter: (a, b) => compareSortValue(a.name, b.name),
  },
  isDefault: {
    title: createDraggableTitle('isDefault', '默认'),
    key: 'isDefault',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isDefault, b.isDefault),
    render: (row) => h(NTag, { type: row.isDefault ? 'success' : 'default', size: 'small' }, { default: () => (row.isDefault ? '是' : '否') }),
  },
  isPublic: {
    title: createDraggableTitle('isPublic', '公共'),
    key: 'isPublic',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isPublic, b.isPublic),
    render: (row) => h(NTag, { type: row.isPublic ? 'success' : 'default', size: 'small' }, { default: () => (row.isPublic ? '是' : '否') }),
  },
}

const columns = computed<DataTableColumns<RoleRow>>(() => withResizable([
  {
    type: 'selection',
    width: 48,
    multiple: false,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<RoleRow>[number] => Boolean(item)),
]))

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个显示字段')
  }
}

async function loadData() {
  loading.value = true
  try {
    const data = await rolesApi.getList(listParams.value)
    rows.value = data.items ?? []
    query.total = data.totalCount ?? 0

    const selectedId = checkedRowKeys.value[0] ? String(checkedRowKeys.value[0]) : ''
    if (selectedId && !rows.value.some((item) => item.id === selectedId)) {
      checkedRowKeys.value = []
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载角色列表失败')
  } finally {
    loading.value = false
  }
}

function onQuery() {
  query.page = 1
  loadData()
}

function onReset() {
  query.filter = ''
  query.page = 1
  loadData()
}

function handlePageChange(page: number) {
  query.page = page
  loadData()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  loadData()
}

function openCreate() {
  createForm.name = ''
  createForm.isDefault = false
  createForm.isPublic = true
  createVisible.value = true
}

function openPermissionDrawerSelected() {
  if (!selectedRole.value) {
    message.warning('请先选择一个角色')
    return
  }
  openPermissionDrawer(selectedRole.value)
}

function handleCheckedRowKeys(keys: Array<string | number>) {
  if (keys.length <= 1) {
    checkedRowKeys.value = keys
    return
  }

  const lastKey = keys[keys.length - 1]
  checkedRowKeys.value = lastKey === undefined ? [] : [lastKey]
}

function getRoleRowKey(row: RoleRow) {
  return row.id
}

async function submitCreate() {
  const name = createForm.name.trim()
  if (!name) {
    message.warning('请输入角色名称')
    return
  }

  creating.value = true
  try {
    await rolesApi.create({
      name,
      isDefault: createForm.isDefault,
      isPublic: createForm.isPublic,
    })
    message.success('新增角色成功')
    createVisible.value = false
    onQuery()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '新增角色失败')
  } finally {
    creating.value = false
  }
}

function buildPermissionTree(permissions: PermissionGrantInfoDto[]) {
  const rootChildren: TreeOption[] = []
  const allKeys: string[] = []
  const checkedKeys: string[] = []

  const permissionNodeMap = new Map<string, TreeOption>()

  for (const permission of permissions) {
    const key = permission.name
    const node: TreeOption = {
      key,
      label: permission.displayName || permission.name,
      children: [],
    }
    permissionNodeMap.set(key, node)
    allKeys.push(key)
    if (permission.isGranted) {
      checkedKeys.push(key)
    }
  }

  for (const permission of permissions) {
    const node = permissionNodeMap.get(permission.name)
    if (!node) continue

    const parentName = permission.parentName
    if (parentName && permissionNodeMap.has(parentName)) {
      const parentNode = permissionNodeMap.get(parentName)
      if (!parentNode) continue
      const children = (parentNode.children ?? []) as TreeOption[]
      children.push(node)
      parentNode.children = children
    } else {
      rootChildren.push(node)
    }
  }

  return {
    tree: rootChildren,
    allKeys,
    checkedKeys,
  }
}

function filterPermissionTree(nodes: TreeOption[], keyword: string): TreeOption[] {
  const result: TreeOption[] = []

  for (const node of nodes) {
    const label = typeof node.label === 'string' ? node.label : ''
    const children = Array.isArray(node.children) ? filterPermissionTree(node.children as TreeOption[], keyword) : []
    const selfMatch = label.toLowerCase().includes(keyword)

    if (selfMatch || children.length > 0) {
      result.push({
        ...node,
        children: children.length > 0 ? children : node.children,
      })
    }
  }

  return result
}

function collectExpandableKeys(nodes: TreeOption[]): Array<string | number> {
  const keys: Array<string | number> = []
  const walk = (items: TreeOption[]) => {
    for (const item of items) {
      if (item.key !== undefined) {
        keys.push(item.key)
      }
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children as TreeOption[])
      }
    }
  }
  walk(nodes)
  return keys
}

async function openPermissionDrawer(role: RoleRow) {
  currentRole.value = role
  permissionDrawerVisible.value = true
  permissionLoading.value = true
  checkedPermissionKeys.value = []
  allPermissionKeys.value = []
  permissionKeyword.value = ''
  expandedPermissionKeys.value = []

  try {
    const data = await permissionApi.getPermissions({
      providerName: 'R',
      providerKey: role.name,
    })

    const groupNodes: TreeOption[] = []
    const allKeys: string[] = []
    const checkedKeys: string[] = []

    for (const group of data.groups ?? []) {
      const result = buildPermissionTree(group.permissions ?? [])
      allKeys.push(...result.allKeys)
      checkedKeys.push(...result.checkedKeys)

      groupNodes.push({
        key: `group:${group.name}`,
        label: group.displayName || group.name,
        checkboxDisabled: true,
        children: result.tree,
      })
    }

    permissionTree.value = groupNodes
    allPermissionKeys.value = Array.from(new Set(allKeys))
    checkedPermissionKeys.value = Array.from(new Set(checkedKeys))
    expandedPermissionKeys.value = groupNodes.map((item) => item.key as string)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载权限树失败')
    permissionTree.value = []
    allPermissionKeys.value = []
    checkedPermissionKeys.value = []
  } finally {
    permissionLoading.value = false
  }
}

function handlePermissionChecked(keys: Array<string | number>) {
  const validKeySet = new Set(allPermissionKeys.value)
  checkedPermissionKeys.value = keys
    .map((key) => String(key))
    .filter((key) => validKeySet.has(key))
}

function selectAllPermissions() {
  checkedPermissionKeys.value = [...allPermissionKeys.value]
}

function invertPermissions() {
  const checkedSet = new Set(checkedPermissionKeys.value)
  checkedPermissionKeys.value = allPermissionKeys.value.filter((key) => !checkedSet.has(key))
}

function clearPermissionSelection() {
  checkedPermissionKeys.value = []
}

function expandAllPermissions() {
  expandedPermissionKeys.value = collectExpandableKeys(permissionTree.value)
}

function collapseAllPermissions() {
  expandedPermissionKeys.value = permissionTree.value.map((item) => item.key as string)
}

function handlePermissionExpandedKeys(keys: Array<string | number>) {
  expandedPermissionKeys.value = keys
}

async function savePermissions() {
  if (!currentRole.value) return

  permissionSaving.value = true
  try {
    const checkedSet = new Set(checkedPermissionKeys.value)
    await permissionApi.updatePermissions(
      {
        providerName: 'R',
        providerKey: currentRole.value.name,
      },
      {
        permissions: allPermissionKeys.value.map((name) => ({
          name,
          isGranted: checkedSet.has(name),
        })),
      },
    )
    message.success('保存权限成功')
    permissionDrawerVisible.value = false
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存权限失败')
  } finally {
    permissionSaving.value = false
  }
}

onMounted(() => {
  loadColumnSettings()
  loadData()
})
</script>

<template>
  <div>
    <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input :value="query.filter" clearable placeholder="请输入角色名称" @update:value="(value) => (query.filter = value)" @keyup.enter="onQuery" />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="onQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="onReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button type="primary" @click="openCreate">新增</n-button>
        <n-button :disabled="!selectedRole" @click="openPermissionDrawerSelected">权限分配</n-button>
      </div>
    </template>

    <template #actions-right>
      <div class="crud-action-tools">
        <TableColumnManager
          :show="showColumnConfig"
          :settings="columnSettings"
          @update:show="handleColumnConfigShowChange"
          @visible-change="handleColumnVisibleChange"
        />
      </div>
    </template>

    <template #data>
      <n-data-table
        class="crud-table-flat"
        :loading="loading"
        :columns="columns"
        :data="rows"
        :row-key="getRoleRowKey"
        :checked-row-keys="checkedRowKeys"
        :bordered="false"
        @update:checked-row-keys="handleCheckedRowKeys"
      />
    </template>

    <template #pager-right>
      <n-pagination
        :page="query.page"
        :page-size="query.pageSize"
        :item-count="query.total"
        :page-sizes="[10, 20, 50, 100]"
        show-size-picker
        @update:page="(page) => { query.page = page; handlePageChange(page) }"
        @update:page-size="(size) => { query.pageSize = size; handlePageSizeChange(size) }"
      />
    </template>
    </BaseCrudPage>

    <n-modal :show="createVisible" preset="card" title="新增角色" style="width: 480px" @update:show="(value) => (createVisible = value)">
    <n-form label-width="90">
      <n-form-item label="角色名称" required>
        <n-input :value="createForm.name" maxlength="64" show-count @update:value="(value) => (createForm.name = value)" />
      </n-form-item>
      <n-form-item label="默认角色">
        <n-switch :value="createForm.isDefault" @update:value="(value) => (createForm.isDefault = value)" />
      </n-form-item>
      <n-form-item label="公共角色">
        <n-switch :value="createForm.isPublic" @update:value="(value) => (createForm.isPublic = value)" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="modal-actions">
        <n-button @click="createVisible = false">取消</n-button>
        <n-button type="primary" :loading="creating" @click="submitCreate">保存</n-button>
      </div>
    </template>
    </n-modal>

    <n-drawer :show="permissionDrawerVisible" placement="right" :width="860" @update:show="(value) => (permissionDrawerVisible = value)">
      <n-drawer-content :title="`权限分配 - ${currentRole?.name ?? ''}`" closable>
        <n-space vertical :size="12" class="permission-panel">
          <n-card :bordered="false" size="small" class="permission-toolbar-card">
            <div class="permission-toolbar-row">
              <n-input
                :value="permissionKeyword"
                clearable
                placeholder="搜索权限名称"
                class="permission-search"
                @update:value="(value) => (permissionKeyword = value)"
              />
              <span class="permission-summary">{{ permissionSummaryText }}</span>
            </div>

            <div class="drawer-tools">
              <n-space>
                <n-button size="small" @click="selectAllPermissions">全选</n-button>
                <n-button size="small" @click="invertPermissions">反选</n-button>
                <n-button size="small" @click="clearPermissionSelection">清空</n-button>
                <n-button size="small" @click="expandAllPermissions">展开全部</n-button>
                <n-button size="small" @click="collapseAllPermissions">收起到分组</n-button>
              </n-space>
              <n-button type="primary" :loading="permissionSaving" @click="savePermissions">保存</n-button>
            </div>
          </n-card>

          <n-card :bordered="false" size="small" class="permission-tree-card">
            <n-tree
              block-line
              checkable
              selectable
              :data="filteredPermissionTree"
              :checked-keys="checkedPermissionKeys"
              :expanded-keys="expandedPermissionKeys"
              :loading="permissionLoading"
              @update:checked-keys="handlePermissionChecked"
              @update:expanded-keys="handlePermissionExpandedKeys"
            />
          </n-card>
        </n-space>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.drawer-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.permission-panel {
  height: 100%;
}

.permission-toolbar-card {
  border: 1px solid #e2e8f0;
}

.permission-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.permission-search {
  max-width: 320px;
}

.permission-summary {
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
}

.permission-tree-card {
  flex: 1;
  overflow: auto;
  border: 1px solid #e2e8f0;
}
</style>
