<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
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
  NSelect,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { useTableSelection } from '../../../composables/useTableSelection'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'
import {
  get,
  getList,
  type AccountAliasDto,
  type AccountAliasSearchDto,
} from '../../../api/masterData/accountAlias'

type RowItem = AccountAliasDto

const message = useMessage()
const loading = ref(false)
const rows = ref<RowItem[]>([])

const query = reactive({
  alias: '',
  description: '',
  isActiveAtNow: null as number | null,
  page: 1,
  pageSize: 10,
  total: 0,
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<AccountAliasDto | null>(null)

const listParams = computed<AccountAliasSearchDto>(() => ({
  maxResultCount: query.pageSize,
  skipCount: (query.page - 1) * query.pageSize,
  alias: query.alias || undefined,
  description: query.description || undefined,
  isActiveAtNow: query.isActiveAtNow === null ? undefined : query.isActiveAtNow === 1,
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

const activeOptions: SelectOption[] = [
  { label: '是', value: 1 },
  { label: '否', value: 0 },
]

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatRequired(value: boolean | undefined) {
  return value ? '是' : '否'
}

function resolveProductionCostTypeLabel(value: AccountAliasDto['productionCostType'] | undefined) {
  if (value == null || value === '') return '-'
  const raw = String(value)
  if (raw === '0' || raw === 'None') return '无'
  if (raw === '1' || raw === 'Material') return '材料'
  if (raw === '2' || raw === 'Labor') return '人工'
  if (raw === '3' || raw === 'ManufacturingOverhead') return '制造费用'
  if (raw === '4' || raw === 'Subcontracting') return '委外'
  return raw
}

function getRequiredTagType(value: boolean | undefined) {
  return value ? 'success' : 'default'
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
  query.alias = ''
  query.description = ''
  query.isActiveAtNow = null
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
    message.warning('缺少账户别名 Id，无法查看')
    return
  }

  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await get(id)
  } catch (e) {
    detail.value = null
    message.error(e instanceof Error ? e.message : '加载账户别名详情失败')
  } finally {
    detailLoading.value = false
  }
}

function handleViewSelected() {
  const selected = selectedRows.value[0]
  if (!selected || selectedRows.value.length !== 1) {
    message.warning('请选择一条账户别名数据')
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
  storageKey: 'account-alias-column-settings-v1',
  preferredKeys: [
    'alias',
    'description',
    'effectiveDate',
    'expireDate',
    'productionCostType',
    'isUnitPriceRequired',
    'isProjectRequired',
    'isDepartmentRequired',
    'isProductionNoRequired',
    'isWorkOrderOperationRequired',
    'isSupplierRequired',
    'isCustomerRequired',
    'isWorkOrderAttributeRequired',
  ],
  resolveTitle: (key) => {
    if (key === 'alias') return '账户别名'
    if (key === 'description') return '描述'
    if (key === 'effectiveDate') return '生效日期'
    if (key === 'expireDate') return '失效日期'
    if (key === 'productionCostType') return '生产成本类型'
    if (key === 'isUnitPriceRequired') return '需要单价'
    if (key === 'isProjectRequired') return '需要项目'
    if (key === 'isDepartmentRequired') return '需要部门'
    if (key === 'isProductionNoRequired') return '需要生产号'
    if (key === 'isWorkOrderOperationRequired') return '需要工单工序'
    if (key === 'isSupplierRequired') return '需要供应商'
    if (key === 'isCustomerRequired') return '需要客户'
    if (key === 'isWorkOrderAttributeRequired') return '需要工单属性'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  alias: {
    title: createDraggableTitle('alias', '账户别名'),
    key: 'alias',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.alias, b.alias),
    render: (row) => row.alias || '-',
  },
  description: {
    title: createDraggableTitle('description', '描述'),
    key: 'description',
    minWidth: 220,
    sorter: (a, b) => compareSortValue(a.description, b.description),
    render: (row) => row.description || '-',
  },
  effectiveDate: {
    title: createDraggableTitle('effectiveDate', '生效日期'),
    key: 'effectiveDate',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.effectiveDate, b.effectiveDate),
    render: (row) => formatDate(row.effectiveDate),
  },
  expireDate: {
    title: createDraggableTitle('expireDate', '失效日期'),
    key: 'expireDate',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.expireDate, b.expireDate),
    render: (row) => formatDate(row.expireDate),
  },
  productionCostType: {
    title: createDraggableTitle('productionCostType', '生产成本类型'),
    key: 'productionCostType',
    minWidth: 150,
    sorter: (a, b) => compareSortValue(a.productionCostType, b.productionCostType),
    render: (row) => resolveProductionCostTypeLabel(row.productionCostType),
  },
  isUnitPriceRequired: {
    title: createDraggableTitle('isUnitPriceRequired', '需要单价'),
    key: 'isUnitPriceRequired',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isUnitPriceRequired, b.isUnitPriceRequired),
    render: (row) => h(NTag, { size: 'small', type: getRequiredTagType(row.isUnitPriceRequired) }, { default: () => formatRequired(row.isUnitPriceRequired) }),
  },
  isProjectRequired: {
    title: createDraggableTitle('isProjectRequired', '需要项目'),
    key: 'isProjectRequired',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isProjectRequired, b.isProjectRequired),
    render: (row) => h(NTag, { size: 'small', type: getRequiredTagType(row.isProjectRequired) }, { default: () => formatRequired(row.isProjectRequired) }),
  },
  isDepartmentRequired: {
    title: createDraggableTitle('isDepartmentRequired', '需要部门'),
    key: 'isDepartmentRequired',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isDepartmentRequired, b.isDepartmentRequired),
    render: (row) => h(NTag, { size: 'small', type: getRequiredTagType(row.isDepartmentRequired) }, { default: () => formatRequired(row.isDepartmentRequired) }),
  },
  isProductionNoRequired: {
    title: createDraggableTitle('isProductionNoRequired', '需要生产号'),
    key: 'isProductionNoRequired',
    width: 130,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isProductionNoRequired, b.isProductionNoRequired),
    render: (row) => h(NTag, { size: 'small', type: getRequiredTagType(row.isProductionNoRequired) }, { default: () => formatRequired(row.isProductionNoRequired) }),
  },
  isWorkOrderOperationRequired: {
    title: createDraggableTitle('isWorkOrderOperationRequired', '需要工单工序'),
    key: 'isWorkOrderOperationRequired',
    width: 150,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isWorkOrderOperationRequired, b.isWorkOrderOperationRequired),
    render: (row) => h(NTag, { size: 'small', type: getRequiredTagType(row.isWorkOrderOperationRequired) }, { default: () => formatRequired(row.isWorkOrderOperationRequired) }),
  },
  isSupplierRequired: {
    title: createDraggableTitle('isSupplierRequired', '需要供应商'),
    key: 'isSupplierRequired',
    width: 130,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isSupplierRequired, b.isSupplierRequired),
    render: (row) => h(NTag, { size: 'small', type: getRequiredTagType(row.isSupplierRequired) }, { default: () => formatRequired(row.isSupplierRequired) }),
  },
  isCustomerRequired: {
    title: createDraggableTitle('isCustomerRequired', '需要客户'),
    key: 'isCustomerRequired',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isCustomerRequired, b.isCustomerRequired),
    render: (row) => h(NTag, { size: 'small', type: getRequiredTagType(row.isCustomerRequired) }, { default: () => formatRequired(row.isCustomerRequired) }),
  },
  isWorkOrderAttributeRequired: {
    title: createDraggableTitle('isWorkOrderAttributeRequired', '需要工单属性'),
    key: 'isWorkOrderAttributeRequired',
    width: 150,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isWorkOrderAttributeRequired, b.isWorkOrderAttributeRequired),
    render: (row) => h(NTag, { size: 'small', type: getRequiredTagType(row.isWorkOrderAttributeRequired) }, { default: () => formatRequired(row.isWorkOrderAttributeRequired) }),
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
            :value="query.alias"
            placeholder="请输入账户别名"
            clearable
            style="max-width: 240px"
            @update:value="(value) => { query.alias = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-input
            :value="query.description"
            placeholder="请输入描述"
            clearable
            style="max-width: 320px"
            @update:value="(value) => { query.description = value }"
            @keyup.enter="handleQuery"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            :value="query.isActiveAtNow"
            :options="activeOptions"
            placeholder="当前是否有效"
            clearable
            style="width: 180px"
            @update:value="(value) => { query.isActiveAtNow = value }"
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
        <n-card title="账户别名详情" style="width: 880px" closable @close="detailVisible = false">
          <n-descriptions bordered label-placement="left" :column="2" :label-style="{ width: '160px' }">
            <n-descriptions-item label="账户别名">{{ detail?.alias || '-' }}</n-descriptions-item>
            <n-descriptions-item label="描述">{{ detail?.description || '-' }}</n-descriptions-item>
            <n-descriptions-item label="生效日期">{{ formatDate(detail?.effectiveDate) }}</n-descriptions-item>
            <n-descriptions-item label="失效日期">{{ formatDate(detail?.expireDate) }}</n-descriptions-item>
            <n-descriptions-item label="生产成本类型">{{ resolveProductionCostTypeLabel(detail?.productionCostType) }}</n-descriptions-item>
            <n-descriptions-item label="需要单价">{{ formatRequired(detail?.isUnitPriceRequired) }}</n-descriptions-item>
            <n-descriptions-item label="需要项目">{{ formatRequired(detail?.isProjectRequired) }}</n-descriptions-item>
            <n-descriptions-item label="需要部门">{{ formatRequired(detail?.isDepartmentRequired) }}</n-descriptions-item>
            <n-descriptions-item label="需要生产号">{{ formatRequired(detail?.isProductionNoRequired) }}</n-descriptions-item>
            <n-descriptions-item label="需要工单工序">{{ formatRequired(detail?.isWorkOrderOperationRequired) }}</n-descriptions-item>
            <n-descriptions-item label="需要供应商">{{ formatRequired(detail?.isSupplierRequired) }}</n-descriptions-item>
            <n-descriptions-item label="需要客户">{{ formatRequired(detail?.isCustomerRequired) }}</n-descriptions-item>
            <n-descriptions-item label="需要工单属性">{{ formatRequired(detail?.isWorkOrderAttributeRequired) }}</n-descriptions-item>
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
