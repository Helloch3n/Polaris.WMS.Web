<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'
import {
  get,
  getList,
  type CostCenterDto,
  type CostCenterSearchDto,
} from '../../../api/masterData/costCenter'

type RowItem = CostCenterDto

const message = useMessage()
const loading = ref(false)
const rows = ref<RowItem[]>([])

const query = reactive({
  code: '',
  name: '',
  departmentCode: '',
  departmentName: '',
  companyCode: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<CostCenterDto | null>(null)

const listParams = computed<CostCenterSearchDto>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  code: query.code || undefined,
  name: query.name || undefined,
  departmentCode: query.departmentCode || undefined,
  departmentName: query.departmentName || undefined,
  companyCode: query.companyCode || undefined,
}))

function getRowKey(row: RowItem) {
  return row.id
}

const {
  checkedRowKeys,
  selectedRows,
  selectedCount,
  handleCheckedRowKeysChange,
  syncCheckedRowKeys,
  toggleSingleRow,
  clearSelection,
} = useTableSelection(rows, getRowKey)

const canViewSelected = computed(() => selectedCount.value === 1)

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

async function fetchList() {
  loading.value = true
  try {
    const data = await getList(listParams.value)
    rows.value = data.items ?? []
    syncCheckedRowKeys()
    query.total = data.totalCount ?? 0
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.page = 1
  fetchList()
}

function handleReset() {
  query.code = ''
  query.name = ''
  query.departmentCode = ''
  query.departmentName = ''
  query.companyCode = ''
  query.page = 1
  fetchList()
}

function handlePageChange(page: number) {
  query.page = page
  fetchList()
}

function handlePageSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  fetchList()
}

async function openDetail(row: RowItem) {
  const id = String(row.id ?? '').trim()
  if (!id) {
    message.warning('缺少成本中心 Id，无法查看')
    return
  }

  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await get(id)
  } catch (e) {
    detail.value = null
    message.error(e instanceof Error ? e.message : '加载成本中心详情失败')
  } finally {
    detailLoading.value = false
  }
}

function handleViewSelected() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条成本中心数据')
    return
  }
  openDetail(selected)
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'cost-center-column-settings-v1',
  preferredKeys: ['code', 'name', 'departmentCode', 'departmentName', 'companyCode'],
  resolveTitle: (key) => {
    if (key === 'code') return '成本中心编码'
    if (key === 'name') return '成本中心名称'
    if (key === 'departmentCode') return '部门编码'
    if (key === 'departmentName') return '部门名称'
    if (key === 'companyCode') return '公司编码'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  code: {
    title: createDraggableTitle('code', '成本中心编码'),
    key: 'code',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.code, b.code),
    render: (row) => row.code || '-',
  },
  name: {
    title: createDraggableTitle('name', '成本中心名称'),
    key: 'name',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.name, b.name),
    render: (row) => row.name || '-',
  },
  departmentCode: {
    title: createDraggableTitle('departmentCode', '部门编码'),
    key: 'departmentCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.departmentCode, b.departmentCode),
    render: (row) => row.departmentCode || '-',
  },
  departmentName: {
    title: createDraggableTitle('departmentName', '部门名称'),
    key: 'departmentName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.departmentName, b.departmentName),
    render: (row) => row.departmentName || '-',
  },
  companyCode: {
    title: createDraggableTitle('companyCode', '公司编码'),
    key: 'companyCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.companyCode, b.companyCode),
    render: (row) => row.companyCode || '-',
  },
}

const columns = computed<DataTableColumns<RowItem>>(() =>
  withResizable([
    {
      type: 'selection',
      fixed: 'left',
      width: 44,
    },
    ...columnSettings.value
      .filter((item) => item.visible)
      .map((item) => columnMap[item.key])
      .filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item)),
  ]),
)

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

onMounted(() => {
  loadColumnSettings()
  fetchList()
})
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input
            :value="query.code"
            placeholder="请输入成本中心编码"
            clearable
            style="max-width: 220px"
            @update:value="(value) => { query.code = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.name"
            placeholder="请输入成本中心名称"
            clearable
            style="max-width: 220px"
            @update:value="(value) => { query.name = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.departmentCode"
            placeholder="请输入部门编码"
            clearable
            style="max-width: 180px"
            @update:value="(value) => { query.departmentCode = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.departmentName"
            placeholder="请输入部门名称"
            clearable
            style="max-width: 220px"
            @update:value="(value) => { query.departmentName = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.companyCode"
            placeholder="请输入公司编码"
            clearable
            style="max-width: 180px"
            @update:value="(value) => { query.companyCode = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="handleQuery">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="handleReset">重置</n-button>
        </n-form-item>
      </n-form>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button :disabled="!canViewSelected || loading" @click="handleViewSelected">查看</n-button>
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
        :bordered="false"
        :row-key="getRowKey"
        :checked-row-keys="checkedRowKeys"
        :row-props="(row) => ({ onClick: (event) => toggleSingleRow(row, event), onDblclick: () => openDetail(row) })"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      />

      <n-modal :show="detailVisible" @update:show="(value) => { detailVisible = value }">
        <n-card title="成本中心详情" style="width: 820px" closable @close="detailVisible = false">
          <n-descriptions bordered label-placement="left" :column="2" :label-style="{ width: '150px' }">
            <n-descriptions-item label="成本中心编码">{{ detail?.code || '-' }}</n-descriptions-item>
            <n-descriptions-item label="成本中心名称">{{ detail?.name || '-' }}</n-descriptions-item>
            <n-descriptions-item label="部门编码">{{ detail?.departmentCode || '-' }}</n-descriptions-item>
            <n-descriptions-item label="部门名称">{{ detail?.departmentName || '-' }}</n-descriptions-item>
            <n-descriptions-item label="公司编码">{{ detail?.companyCode || '-' }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ formatDateTime(detail?.creationTime) }}</n-descriptions-item>
            <n-descriptions-item label="最后修改时间">{{ formatDateTime(detail?.lastModificationTime) }}</n-descriptions-item>
            <n-descriptions-item label="创建人">{{ detail?.creatorId || '-' }}</n-descriptions-item>
            <n-descriptions-item label="最后修改人">{{ detail?.lastModifierId || '-' }}</n-descriptions-item>
          </n-descriptions>

          <template #footer>
            <div class="modal-actions">
              <n-button :loading="detailLoading" @click="detailVisible = false">关闭</n-button>
            </div>
          </template>
        </n-card>
      </n-modal>
    </template>

    <template #pager-left>
      <div class="crud-selection-summary">
        <n-tag size="small" type="info">已选 {{ selectedCount }} 条</n-tag>
        <n-button text :disabled="selectedCount === 0" @click="clearSelection">清空选择</n-button>
      </div>
    </template>

    <template #pager-right>
      <n-pagination
        :page="query.page"
        :page-size="query.pageSize"
        :item-count="query.total"
        :page-sizes="[10, 20, 50, 100]"
        show-size-picker
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </template>
  </BaseCrudPage>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
