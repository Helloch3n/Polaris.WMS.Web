<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import {
  NButton,
  NCheckbox,
  NCheckboxGroup,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import {
  rolesApi,
  usersApi,
  type GetIdentityUsersParams,
  type IdentityUserCreateDto,
  type IdentityUserDto,
  type IdentityUserUpdateDto,
} from '../../../api/identity'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { compareSortValue } from '../../../utils/tableColumn'
import { withResizable } from '../../../utils/table'

const ButtonPolicies = {
  userCreate: 'AbpIdentity.Users.Create',
  userUpdate: 'AbpIdentity.Users.Update',
  userDelete: 'AbpIdentity.Users.Delete',
  userResetPassword: 'AbpIdentity.Users.Update',
} as const

type UserRow = IdentityUserDto

const message = useMessage()

const loading = ref(false)
const rolesLoading = ref(false)
const rows = ref<UserRow[]>([])
const creating = ref(false)
const updating = ref(false)
const resettingPassword = ref(false)
const assigningRoles = ref(false)
const assignRoleLoading = ref(false)
const roleOptions = ref<Array<{ label: string; value: string }>>([])
const checkedRowKeys = ref<Array<string | number>>([])

const createVisible = ref(false)
const editVisible = ref(false)
const resetPasswordVisible = ref(false)
const assignRoleVisible = ref(false)
const editingUserId = ref('')
const assignRoleUserId = ref('')
const assignRoleUserName = ref('')
const assignRoleNames = ref<string[]>([])
const resetPasswordForm = reactive({
  password: '',
  confirmPassword: '',
})

const createForm = reactive<IdentityUserCreateDto>({
  userName: '',
  name: '',
  surname: '',
  email: '',
  phoneNumber: '',
  password: '',
  isActive: true,
  lockoutEnabled: true,
  roleNames: [],
})

const editForm = reactive<IdentityUserUpdateDto>({
  userName: '',
  name: '',
  surname: '',
  email: '',
  phoneNumber: '',
  isActive: true,
  lockoutEnabled: true,
})

const query = reactive({
  filter: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const listParams = computed<GetIdentityUsersParams>(() => ({
  skipCount: (query.page - 1) * query.pageSize,
  maxResultCount: query.pageSize,
  filter: query.filter.trim() || undefined,
}))

const selectedUser = computed(() => {
  const id = checkedRowKeys.value[0]
  if (!id) return null
  return rows.value.find((item) => item.id === String(id)) ?? null
})

const assignRoleCountText = computed(() => `已选择 ${assignRoleNames.value.length} 个角色`)

type UserRoleItem = {
  name?: string
  isAssigned?: boolean
  isGranted?: boolean
}

function extractAssignedRoleNames(payload: unknown): string[] {
  const rawItems = Array.isArray(payload)
    ? payload
    : (
        payload as {
          items?: unknown
        }
      )?.items

  if (!Array.isArray(rawItems)) {
    return []
  }

  const items = rawItems as UserRoleItem[]

  const hasAssignmentField = items.some((item) => typeof item?.isAssigned === 'boolean' || typeof item?.isGranted === 'boolean')

  if (hasAssignmentField) {
    return items
      .filter((item) => item?.isAssigned === true || item?.isGranted === true)
      .map((item) => String(item?.name ?? '').trim())
      .filter(Boolean)
  }

  return items
    .map((item) => String(item?.name ?? '').trim())
    .filter(Boolean)
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'user-management-column-settings-v1',
  preferredKeys: ['userName', 'name', 'email', 'phoneNumber', 'isActive'],
  resolveTitle: (key) => {
    if (key === 'userName') return '用户名'
    if (key === 'name') return '姓名'
    if (key === 'email') return '邮箱'
    if (key === 'phoneNumber') return '手机号'
    if (key === 'isActive') return '状态'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<UserRow>[number]> = {
  userName: {
    title: createDraggableTitle('userName', '用户名'),
    key: 'userName',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.userName, b.userName),
  },
  name: {
    title: createDraggableTitle('name', '姓名'),
    key: 'name',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(`${a.name ?? ''}${a.surname ?? ''}`, `${b.name ?? ''}${b.surname ?? ''}`),
    render: (row) => [row.name, row.surname].filter(Boolean).join(' ') || '-',
  },
  email: {
    title: createDraggableTitle('email', '邮箱'),
    key: 'email',
    minWidth: 220,
    sorter: (a, b) => compareSortValue(a.email, b.email),
    render: (row) => row.email || '-',
  },
  phoneNumber: {
    title: createDraggableTitle('phoneNumber', '手机号'),
    key: 'phoneNumber',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.phoneNumber, b.phoneNumber),
    render: (row) => row.phoneNumber || '-',
  },
  isActive: {
    title: createDraggableTitle('isActive', '状态'),
    key: 'isActive',
    width: 100,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isActive, b.isActive),
    render: (row) =>
      h(
        NTag,
        { type: row.isActive === false ? 'default' : 'success', size: 'small' },
        { default: () => (row.isActive === false ? '禁用' : '启用') },
      ),
  },
}

const columns = computed<DataTableColumns<UserRow>>(() => withResizable([
  {
    type: 'selection',
    width: 48,
    multiple: false,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<UserRow>[number] => Boolean(item)),
]))

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

async function loadUsers() {
  loading.value = true
  try {
    const data = await usersApi.getList(listParams.value)
    rows.value = data.items ?? []
    query.total = data.totalCount ?? 0

    const selectedId = checkedRowKeys.value[0] ? String(checkedRowKeys.value[0]) : ''
    if (selectedId && !rows.value.some((item) => item.id === selectedId)) {
      checkedRowKeys.value = []
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载用户失败')
  } finally {
    loading.value = false
  }
}

async function loadRoleOptions() {
  rolesLoading.value = true
  try {
    const data = await rolesApi.getList({
      skipCount: 0,
      maxResultCount: 200,
    })

    roleOptions.value = (data.items ?? []).map((item) => ({
      label: item.name,
      value: item.name,
    }))
  } catch (e) {
    roleOptions.value = []
    message.error(e instanceof Error ? e.message : '加载角色列表失败')
  } finally {
    rolesLoading.value = false
  }
}

function onQuery() {
  query.page = 1
  loadUsers()
}

function onReset() {
  query.filter = ''
  query.page = 1
  loadUsers()
}

function handlePageChange(page: number) {
  query.page = page
  loadUsers()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  loadUsers()
}

function resetCreateForm() {
  createForm.userName = ''
  createForm.name = ''
  createForm.surname = ''
  createForm.email = ''
  createForm.phoneNumber = ''
  createForm.password = ''
  createForm.isActive = true
  createForm.lockoutEnabled = true
  createForm.roleNames = []
}

function openCreate() {
  resetCreateForm()
  if (!roleOptions.value.length && !rolesLoading.value) {
    loadRoleOptions()
  }
  createVisible.value = true
}

async function submitCreate() {
  const userName = createForm.userName.trim()
  const password = createForm.password.trim()

  if (!userName) {
    message.warning('请输入用户名')
    return
  }

  if (!password) {
    message.warning('请输入密码')
    return
  }

  creating.value = true
  try {
    await usersApi.create({
      userName,
      name: createForm.name?.trim() || undefined,
      surname: createForm.surname?.trim() || undefined,
      email: createForm.email?.trim() || undefined,
      phoneNumber: createForm.phoneNumber?.trim() || undefined,
      password,
      isActive: createForm.isActive,
      lockoutEnabled: createForm.lockoutEnabled,
      roleNames: (createForm.roleNames ?? []).filter(Boolean),
    })

    message.success('新增用户成功')
    createVisible.value = false
    onQuery()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '新增用户失败')
  } finally {
    creating.value = false
  }
}

async function openEdit(row: UserRow) {
  editingUserId.value = row.id
  editForm.userName = row.userName
  editForm.name = row.name ?? ''
  editForm.surname = row.surname ?? ''
  editForm.email = row.email ?? ''
  editForm.phoneNumber = row.phoneNumber ?? ''
  editForm.isActive = row.isActive !== false
  editForm.lockoutEnabled = row.lockoutEnabled !== false

  editVisible.value = true
}

async function openAssignRole(row: UserRow) {
  assignRoleUserId.value = row.id
  assignRoleUserName.value = row.userName
  assignRoleVisible.value = true
  assignRoleLoading.value = true
  assignRoleNames.value = []

  try {
    if (!roleOptions.value.length) {
      await loadRoleOptions()
    }

    const rolesPayload = await usersApi.getRoles(row.id)
    assignRoleNames.value = extractAssignedRoleNames(rolesPayload)
  } catch (e) {
    assignRoleNames.value = row.roleNames ?? []
    message.error(e instanceof Error ? e.message : '加载用户角色失败')
  } finally {
    assignRoleLoading.value = false
  }
}

function openAssignRoleSelected() {
  if (!selectedUser.value) {
    message.warning('请先选择一个用户')
    return
  }
  openAssignRole(selectedUser.value)
}

function selectAllRolesForAssign() {
  assignRoleNames.value = roleOptions.value.map((item) => item.value)
}

function clearAllRolesForAssign() {
  assignRoleNames.value = []
}

function handleAssignRoleNamesChange(values: Array<string | number>) {
  assignRoleNames.value = values.map((value) => String(value))
}

async function submitAssignRole() {
  const userId = assignRoleUserId.value
  if (!userId) {
    message.warning('未找到待分配角色的用户')
    return
  }

  assigningRoles.value = true
  try {
    const userDetail = await usersApi.get(userId)
    await usersApi.update(userId, {
      userName: userDetail.userName,
      name: userDetail.name?.trim() || undefined,
      surname: userDetail.surname?.trim() || undefined,
      email: userDetail.email?.trim() || undefined,
      phoneNumber: userDetail.phoneNumber?.trim() || undefined,
      isActive: userDetail.isActive !== false,
      lockoutEnabled: userDetail.lockoutEnabled !== false,
      roleNames: assignRoleNames.value.filter(Boolean),
    })

    message.success('分配角色成功')
    assignRoleVisible.value = false
    await loadUsers()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '分配角色失败')
  } finally {
    assigningRoles.value = false
  }
}

function openEditSelected() {
  if (!selectedUser.value) {
    message.warning('请先选择一个用户')
    return
  }
  openEdit(selectedUser.value)
}

async function submitEdit() {
  const userName = editForm.userName.trim()
  if (!editingUserId.value) {
    message.warning('未找到待编辑用户')
    return
  }
  if (!userName) {
    message.warning('请输入用户名')
    return
  }

  updating.value = true
  try {
    await usersApi.update(editingUserId.value, {
      userName,
      name: editForm.name?.trim() || undefined,
      surname: editForm.surname?.trim() || undefined,
      email: editForm.email?.trim() || undefined,
      phoneNumber: editForm.phoneNumber?.trim() || undefined,
      isActive: editForm.isActive,
      lockoutEnabled: editForm.lockoutEnabled,
    })

    message.success('更新用户成功')
    editVisible.value = false
    loadUsers()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '更新用户失败')
  } finally {
    updating.value = false
  }
}

async function handleDelete(row: UserRow) {
  try {
    await usersApi.remove(row.id)
    message.success('删除用户成功')

    if (rows.value.length <= 1 && query.page > 1) {
      query.page -= 1
    }
    await loadUsers()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '删除用户失败')
  }
}

async function handleDeleteSelected() {
  if (!selectedUser.value) {
    message.warning('请先选择一个用户')
    return
  }
  await handleDelete(selectedUser.value)
}

function openResetPassword() {
  if (!selectedUser.value) {
    message.warning('请先选择一个用户')
    return
  }
  resetPasswordForm.password = ''
  resetPasswordForm.confirmPassword = ''
  resetPasswordVisible.value = true
}

async function submitResetPassword() {
  if (!selectedUser.value) {
    message.warning('请先选择一个用户')
    return
  }

  const password = resetPasswordForm.password.trim()
  const confirmPassword = resetPasswordForm.confirmPassword.trim()

  if (!password) {
    message.warning('请输入新密码')
    return
  }

  if (password.length < 6) {
    message.warning('密码长度不能少于6位')
    return
  }

  if (password !== confirmPassword) {
    message.warning('两次输入的密码不一致')
    return
  }

  resettingPassword.value = true
  try {
    await usersApi.resetPassword(selectedUser.value.id, password)
    message.success('重置密码成功')
    resetPasswordVisible.value = false
  } catch (e) {
    message.error(e instanceof Error ? e.message : '重置密码失败')
  } finally {
    resettingPassword.value = false
  }
}

function handleCheckedRowKeys(keys: Array<string | number>) {
  if (keys.length <= 1) {
    checkedRowKeys.value = keys
    return
  }

  const lastKey = keys[keys.length - 1]
  checkedRowKeys.value = lastKey === undefined ? [] : [lastKey]
}

function getUserRowKey(row: UserRow) {
  return row.id
}

watch(
  () => query.page,
  () => {
    checkedRowKeys.value = []
  },
)

onMounted(() => {
  loadColumnSettings()
  loadRoleOptions()
  loadUsers()
})
</script>

<template>
  <div>
    <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input
            :value="query.filter"
            clearable
            placeholder="按用户名/姓名/邮箱搜索"
            @update:value="(value) => { query.filter = value }"
            @keyup.enter="onQuery"
          />
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
        <n-button v-permission="ButtonPolicies.userCreate" type="primary" @click="openCreate">新增</n-button>
        <n-button v-permission="ButtonPolicies.userUpdate" :disabled="!selectedUser" @click="openEditSelected">编辑</n-button>
        <n-button v-permission="ButtonPolicies.userUpdate" :disabled="!selectedUser" @click="openAssignRoleSelected">角色分配</n-button>
        <n-button v-permission="ButtonPolicies.userResetPassword" :disabled="!selectedUser" @click="openResetPassword">重置密码</n-button>
        <n-popconfirm @positive-click="handleDeleteSelected">
          <template #trigger>
            <n-button v-permission="ButtonPolicies.userDelete" type="error" :disabled="!selectedUser">删除</n-button>
          </template>
          确认删除当前选中用户吗？
        </n-popconfirm>
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
        :row-key="getUserRowKey"
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

    <n-modal :show="createVisible" preset="card" title="新增用户" style="width: var(--modal-width-md)" @update:show="(value) => { createVisible = value }">
    <n-form label-width="90">
      <n-form-item label="用户名" required>
        <n-input :value="createForm.userName" maxlength="64" show-count @update:value="(value) => { createForm.userName = value }" />
      </n-form-item>
      <n-form-item label="密码" required>
        <n-input :value="createForm.password" type="password" show-password-on="click" maxlength="128" @update:value="(value) => { createForm.password = value }" />
      </n-form-item>
      <n-form-item label="姓名">
        <n-input :value="createForm.name" maxlength="64" @update:value="(value) => { createForm.name = value }" />
      </n-form-item>
      <n-form-item label="姓氏">
        <n-input :value="createForm.surname" maxlength="64" @update:value="(value) => { createForm.surname = value }" />
      </n-form-item>
      <n-form-item label="邮箱">
        <n-input :value="createForm.email" maxlength="128" @update:value="(value) => { createForm.email = value }" />
      </n-form-item>
      <n-form-item label="手机号">
        <n-input :value="createForm.phoneNumber" maxlength="32" @update:value="(value) => { createForm.phoneNumber = value }" />
      </n-form-item>
      <n-form-item label="角色">
        <n-select
          :value="createForm.roleNames"
          multiple
          filterable
          clearable
          :options="roleOptions"
          :loading="rolesLoading"
          placeholder="请选择角色"
          @update:value="(value) => { createForm.roleNames = value }"
        />
      </n-form-item>
      <n-form-item label="启用">
        <n-switch :value="createForm.isActive" @update:value="(value) => { createForm.isActive = value }" />
      </n-form-item>
      <n-form-item label="允许锁定">
        <n-switch :value="createForm.lockoutEnabled" @update:value="(value) => { createForm.lockoutEnabled = value }" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="modal-actions">
        <n-button @click="createVisible = false">取消</n-button>
        <n-button type="primary" :loading="creating" @click="submitCreate">保存</n-button>
      </div>
    </template>
    </n-modal>

    <n-modal :show="editVisible" preset="card" title="编辑用户" style="width: var(--modal-width-md)" @update:show="(value) => { editVisible = value }">
    <n-form label-width="90">
      <n-form-item label="用户名" required>
        <n-input :value="editForm.userName" maxlength="64" show-count @update:value="(value) => { editForm.userName = value }" />
      </n-form-item>
      <n-form-item label="姓名">
        <n-input :value="editForm.name" maxlength="64" @update:value="(value) => { editForm.name = value }" />
      </n-form-item>
      <n-form-item label="姓氏">
        <n-input :value="editForm.surname" maxlength="64" @update:value="(value) => { editForm.surname = value }" />
      </n-form-item>
      <n-form-item label="邮箱">
        <n-input :value="editForm.email" maxlength="128" @update:value="(value) => { editForm.email = value }" />
      </n-form-item>
      <n-form-item label="手机号">
        <n-input :value="editForm.phoneNumber" maxlength="32" @update:value="(value) => { editForm.phoneNumber = value }" />
      </n-form-item>
      <n-form-item label="启用">
        <n-switch :value="editForm.isActive" @update:value="(value) => { editForm.isActive = value }" />
      </n-form-item>
      <n-form-item label="允许锁定">
        <n-switch :value="editForm.lockoutEnabled" @update:value="(value) => { editForm.lockoutEnabled = value }" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="modal-actions">
        <n-button @click="editVisible = false">取消</n-button>
        <n-button type="primary" :loading="updating" @click="submitEdit">保存</n-button>
      </div>
    </template>
    </n-modal>

    <n-modal :show="resetPasswordVisible" preset="card" :title="`重置密码 - ${selectedUser?.userName ?? ''}`" style="width: var(--modal-width-sm)" @update:show="(value) => { resetPasswordVisible = value }">
    <n-form label-width="90">
      <n-form-item label="新密码" required>
        <n-input :value="resetPasswordForm.password" type="password" show-password-on="click" maxlength="128" @update:value="(value) => { resetPasswordForm.password = value }" />
      </n-form-item>
      <n-form-item label="确认密码" required>
        <n-input :value="resetPasswordForm.confirmPassword" type="password" show-password-on="click" maxlength="128" @update:value="(value) => { resetPasswordForm.confirmPassword = value }" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="modal-actions">
        <n-button @click="resetPasswordVisible = false">取消</n-button>
        <n-button type="primary" :loading="resettingPassword" @click="submitResetPassword">保存</n-button>
      </div>
    </template>
    </n-modal>

    <n-modal :show="assignRoleVisible" preset="card" style="width: var(--modal-width-lg)" @update:show="(value) => { assignRoleVisible = value }">
      <div class="assign-role-panel">
        <div class="assign-role-toolbar">
          <span class="assign-role-summary">当前用户：{{ assignRoleUserName }} · {{ assignRoleCountText }}</span>
          <div class="assign-role-actions">
            <n-button size="small" tertiary @click="selectAllRolesForAssign">全选</n-button>
            <n-button size="small" tertiary @click="clearAllRolesForAssign">清空</n-button>
          </div>
        </div>

        <div v-if="rolesLoading || assignRoleLoading" class="assign-role-loading">正在加载角色列表...</div>

        <n-checkbox-group v-else :value="assignRoleNames" @update:value="handleAssignRoleNamesChange">
          <div class="role-grid" v-if="roleOptions.length">
            <label v-for="item in roleOptions" :key="item.value" class="role-item">
              <n-checkbox :value="item.value" />
              <span class="role-name">{{ item.label }}</span>
            </label>
          </div>
          <div v-else class="assign-role-empty">暂无可分配角色</div>
        </n-checkbox-group>
      </div>

      <template #footer>
        <div class="modal-actions">
          <n-button @click="assignRoleVisible = false">取消</n-button>
          <n-button type="primary" :loading="assigningRoles" @click="submitAssignRole">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.assign-role-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 420px;
}

.assign-role-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.assign-role-summary {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.assign-role-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assign-role-loading,
.assign-role-empty {
  color: #64748b;
  font-size: 13px;
  padding: 12px 2px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding: 4px 4px 4px 2px;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.15s ease;
}

.role-item:hover {
  border-color: #a5b4fc;
  background: #eef2ff;
}

.role-name {
  color: #334155;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-all;
}
</style>
