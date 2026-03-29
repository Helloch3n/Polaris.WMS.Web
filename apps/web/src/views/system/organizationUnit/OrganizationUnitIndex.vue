<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NTree,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, SelectOption } from 'naive-ui'

import {
  organizationUnitsApi,
  usersApi,
  type IdentityUserDto,
  type OrganizationUnitCreateDto,
  type OrganizationUnitUserDto,
} from '../../../api/identity'

type DepartmentNode = {
  id: string
  parentId?: string | null
  code?: string
  displayName: string
  children?: DepartmentNode[]
}

type MemberRow = OrganizationUnitUserDto

const message = useMessage()

const treeLoading = ref(false)
const memberLoading = ref(false)

const treePattern = ref('')
const memberKeyword = ref('')
const addUserKeyword = ref('')

const selectedDeptId = ref<string>('')
const selectedDeptName = ref('')

const departmentFlatList = ref<DepartmentNode[]>([])
const departmentTreeData = ref<DepartmentNode[]>([])

const memberRows = ref<MemberRow[]>([])
const addUserVisible = ref(false)
const addUserLoading = ref(false)
const addUserSaving = ref(false)
const addUserRows = ref<IdentityUserDto[]>([])
const addUserCheckedRowKeys = ref<Array<string | number>>([])

const ROOT_PARENT_VALUE = '__ROOT__'

type AddDepartmentFormModel = {
  parentId: string
  displayName: string
}

const addDepartmentVisible = ref(false)
const addDepartmentSaving = ref(false)
const addDepartmentFormRef = ref<FormInst | null>(null)
const addDepartmentForm = ref<AddDepartmentFormModel>({
  parentId: ROOT_PARENT_VALUE,
  displayName: '',
})
const addDepartmentRules: FormRules = {
  displayName: [
    {
      required: true,
      message: '请输入部门名称',
      trigger: ['input', 'blur'],
    },
  ],
}

const departmentParentOptions = computed<SelectOption[]>(() => {
  const options: SelectOption[] = [
    {
      label: '作为根部门',
      value: ROOT_PARENT_VALUE,
    },
  ]

  for (const dept of departmentFlatList.value) {
    options.push({
      label: dept.displayName,
      value: dept.id,
    })
  }

  return options
})

const addUserColumns = computed<DataTableColumns<IdentityUserDto>>(() => [
  {
    type: 'selection',
    width: 48,
  },
  {
    title: '用户名',
    key: 'userName',
    width: 180,
  },
  {
    title: '姓名',
    key: 'name',
    minWidth: 160,
    render: (row) => [row.name, row.surname].filter(Boolean).join(' ') || '-',
  },
  {
    title: '邮箱',
    key: 'email',
    minWidth: 220,
    render: (row) => row.email || '-',
  },
] as DataTableColumns<IdentityUserDto>)

const memberColumns = computed<DataTableColumns<MemberRow>>(() => [
  {
    title: '用户名',
    key: 'userName',
    width: 160,
  },
  {
    title: '姓名',
    key: 'name',
    minWidth: 160,
    render: (row) => row.name || '-',
  },
  {
    title: '邮箱',
    key: 'email',
    minWidth: 220,
    render: (row) => row.email || '-',
  },
] as DataTableColumns<MemberRow>)

const filteredMemberRows = computed(() => {
  const keyword = memberKeyword.value.trim().toLowerCase()
  if (!keyword) return memberRows.value
  return memberRows.value.filter((item) => {
    const fields = [item.userName, item.name, item.email]
    return fields.some((field) => String(field ?? '').toLowerCase().includes(keyword))
  })
})

const selectedMemberIdSet = computed(() => new Set(memberRows.value.map((item) => item.id)))

const filteredAddUserRows = computed(() => {
  const selectedSet = selectedMemberIdSet.value
  const keyword = addUserKeyword.value.trim().toLowerCase()
  return addUserRows.value.filter((item) => {
    if (selectedSet.has(item.id)) return false
    if (!keyword) return true
    const fields = [item.userName, item.name, item.surname, item.email]
    return fields.some((field) => String(field ?? '').toLowerCase().includes(keyword))
  })
})

const memberCardTitle = computed(() => {
  if (!selectedDeptName.value) return '成员列表'
  return `${selectedDeptName.value} - 成员列表`
})

/**
 * 将后端返回的扁平组织列表转换为树结构。
 * 核心思路：
 * 1. 先构建 id -> node 的映射表；
 * 2. 再二次遍历按 parentId 挂接 children；
 * 3. 无 parentId 或 parent 缺失的节点作为根节点。
 */
function buildTree(flatData: DepartmentNode[]): DepartmentNode[] {
  const nodeMap = new Map<string, DepartmentNode>()
  const roots: DepartmentNode[] = []

  for (const item of flatData) {
    nodeMap.set(item.id, {
      ...item,
      children: [],
    })
  }

  for (const node of nodeMap.values()) {
    const parentId = node.parentId ?? null
    if (!parentId) {
      roots.push(node)
      continue
    }

    const parentNode = nodeMap.get(parentId)
    if (!parentNode) {
      roots.push(node)
      continue
    }

    const children = parentNode.children ?? []
    children.push(node)
    parentNode.children = children
  }

  return roots
}

async function getDepartmentsApi(): Promise<DepartmentNode[]> {
  const res = await organizationUnitsApi.getTree()
  return Array.isArray(res.items) ? (res.items as DepartmentNode[]) : []
}

async function getDepartmentMembersApi(departmentId: string): Promise<MemberRow[]> {
  return await organizationUnitsApi.getUsers(departmentId)
}

function getMemberRowKey(row: MemberRow) {
  return row.id
}

function getAddUserRowKey(row: IdentityUserDto) {
  return row.id
}

async function loadDepartments() {
  treeLoading.value = true
  try {
    const flatList = await getDepartmentsApi()
    departmentFlatList.value = flatList
    departmentTreeData.value = buildTree(flatList)
  } catch (e) {
    departmentFlatList.value = []
    departmentTreeData.value = []
    message.error(e instanceof Error ? e.message : '加载部门树失败')
  } finally {
    treeLoading.value = false
  }
}

async function loadMembers() {
  if (!selectedDeptId.value) {
    memberRows.value = []
    return
  }

  memberLoading.value = true
  try {
    memberRows.value = await getDepartmentMembersApi(selectedDeptId.value)
  } catch (e) {
    memberRows.value = []
    message.error(e instanceof Error ? e.message : '加载部门成员失败')
  } finally {
    memberLoading.value = false
  }
}

async function handleDepartmentSelect(keys: Array<string | number>) {
  const key = keys[0]
  selectedDeptId.value = key ? String(key) : ''

  const selectedNode = departmentFlatList.value.find((item) => item.id === selectedDeptId.value)
  selectedDeptName.value = selectedNode?.displayName ?? ''

  await loadMembers()
}

function openAddRootDepartment() {
  addDepartmentForm.value = {
    parentId: ROOT_PARENT_VALUE,
    displayName: '',
  }
  addDepartmentVisible.value = true
}

function openAddChildDepartment() {
  if (!selectedDeptId.value) {
    message.warning('请先在左侧选择父部门')
    return
  }

  addDepartmentForm.value = {
    parentId: selectedDeptId.value,
    displayName: '',
  }
  addDepartmentVisible.value = true
}

function handleDepartmentParentChange(value: string | number | null) {
  addDepartmentForm.value.parentId = value ? String(value) : ROOT_PARENT_VALUE
}

async function submitAddDepartment() {
  if (!addDepartmentFormRef.value) return

  try {
    await addDepartmentFormRef.value.validate()
  } catch {
    return
  }

  const payload: OrganizationUnitCreateDto = {
    displayName: addDepartmentForm.value.displayName.trim(),
    parentId:
      addDepartmentForm.value.parentId && addDepartmentForm.value.parentId !== ROOT_PARENT_VALUE
        ? addDepartmentForm.value.parentId
        : null,
  }

  addDepartmentSaving.value = true
  try {
    const created = await organizationUnitsApi.create(payload)
    message.success('添加部门成功')
    addDepartmentVisible.value = false
    await loadDepartments()

    selectedDeptId.value = created.id
    selectedDeptName.value = created.displayName
    await loadMembers()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '添加部门失败')
  } finally {
    addDepartmentSaving.value = false
  }
}

async function openAddUsersModal() {
  if (!selectedDeptId.value) {
    message.warning('请先在左侧选择部门')
    return
  }

  addUserVisible.value = true
  addUserLoading.value = true
  addUserKeyword.value = ''
  addUserCheckedRowKeys.value = []

  try {
    const data = await usersApi.getList({
      skipCount: 0,
      maxResultCount: 1000,
    })
    addUserRows.value = data.items ?? []
  } catch (e) {
    addUserRows.value = []
    message.error(e instanceof Error ? e.message : '加载用户列表失败')
  } finally {
    addUserLoading.value = false
  }
}

function handleAddUserCheckedRowKeys(keys: Array<string | number>) {
  addUserCheckedRowKeys.value = keys
}

async function submitAddUsers() {
  if (!selectedDeptId.value) {
    message.warning('请先在左侧选择部门')
    return
  }

  const userIds = addUserCheckedRowKeys.value.map((item) => String(item)).filter(Boolean)
  if (!userIds.length) {
    message.warning('请至少选择一个用户')
    return
  }

  addUserSaving.value = true
  try {
    await organizationUnitsApi.addUsers(selectedDeptId.value, userIds)
    message.success('批量添加用户成功')
    addUserVisible.value = false
    await loadMembers()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '批量添加用户失败')
  } finally {
    addUserSaving.value = false
  }
}

onMounted(() => {
  loadDepartments()
})
</script>

<template>
  <div class="organization-page">
    <n-card class="left-panel" :bordered="false" title="部门结构">
      <template #header-extra>
        <n-space>
          <n-button type="primary" size="small" @click="openAddRootDepartment">添加根部门</n-button>
          <n-button size="small" :disabled="!selectedDeptId" @click="openAddChildDepartment">添加子部门</n-button>
        </n-space>
      </template>

      <n-space vertical :size="12">
        <n-input
          :value="treePattern"
          clearable
          placeholder="搜索部门"
          @update:value="(value) => (treePattern = value)"
        />

        <n-tree
          block-line
          expand-on-click
          key-field="id"
          label-field="displayName"
          :pattern="treePattern"
          :data="departmentTreeData"
          :selected-keys="selectedDeptId ? [selectedDeptId] : []"
          :loading="treeLoading"
          @update:selected-keys="handleDepartmentSelect"
        />
      </n-space>
    </n-card>

    <n-card class="right-panel" :bordered="false" :title="memberCardTitle">
      <template #header-extra>
        <n-space>
          <n-button type="primary" :disabled="!selectedDeptId" @click="openAddUsersModal">添加用户</n-button>
          <n-input
            :value="memberKeyword"
            clearable
            placeholder="搜索成员姓名/用户名/邮箱"
            style="width: 240px"
            @update:value="(value) => (memberKeyword = value)"
          />
        </n-space>
      </template>

      <div v-if="!selectedDeptId" class="empty-wrap">
        <n-empty description="请在左侧选择部门" />
      </div>

      <n-data-table
        v-else
        class="member-table"
        :columns="memberColumns"
        :data="filteredMemberRows"
        :loading="memberLoading"
        :row-key="getMemberRowKey"
        :bordered="false"
      />
    </n-card>

    <n-modal
      :show="addUserVisible"
      preset="card"
      :title="`批量添加用户 - ${selectedDeptName || '未选择部门'}`"
      style="width: 860px"
      @update:show="(value) => { addUserVisible = value }"
    >
      <n-space vertical :size="12">
        <n-input
          :value="addUserKeyword"
          clearable
          placeholder="搜索用户名/姓名/邮箱"
          @update:value="(value) => (addUserKeyword = value)"
        />

        <n-data-table
          class="add-user-table"
          :columns="addUserColumns"
          :data="filteredAddUserRows"
          :loading="addUserLoading"
          :row-key="getAddUserRowKey"
          :checked-row-keys="addUserCheckedRowKeys"
          :max-height="420"
          :bordered="false"
          @update:checked-row-keys="handleAddUserCheckedRowKeys"
        />
      </n-space>

      <template #footer>
        <div class="modal-actions">
          <n-button @click="addUserVisible = false">取消</n-button>
          <n-button type="primary" :loading="addUserSaving" @click="submitAddUsers">保存</n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      :show="addDepartmentVisible"
      preset="card"
      title="添加部门"
      style="width: 520px"
      @update:show="(value) => { addDepartmentVisible = value }"
    >
      <n-form
        ref="addDepartmentFormRef"
        :model="addDepartmentForm"
        :rules="addDepartmentRules"
        label-placement="left"
        label-width="88"
      >
        <n-form-item label="上级部门" path="parentId">
          <n-select
            :value="addDepartmentForm.parentId"
            :options="departmentParentOptions"
            placeholder="请选择上级部门"
            @update:value="handleDepartmentParentChange"
          />
        </n-form-item>

        <n-form-item label="部门名称" path="displayName">
          <n-input
            :value="addDepartmentForm.displayName"
            maxlength="64"
            show-count
            placeholder="请输入部门名称"
            @update:value="(value) => (addDepartmentForm.displayName = value)"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="modal-actions">
          <n-button @click="addDepartmentVisible = false">取消</n-button>
          <n-button type="primary" :loading="addDepartmentSaving" @click="submitAddDepartment">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.organization-page {
  display: flex;
  gap: 16px;
  padding: 12px;
  height: calc(100vh - 100px);
  background: #f5f7fb;
}

.left-panel {
  width: 320px;
  flex-shrink: 0;
  overflow: auto;
}

.right-panel {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.empty-wrap {
  height: calc(100% - 12px);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-table {
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
