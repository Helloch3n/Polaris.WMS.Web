<template>
  <div>
    <BaseCrudPage>
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item>
            <n-input
              :value="searchKeyword"
              placeholder="请输入订单号/客户"
              clearable
              style="max-width: 320px"
              @update:value="(value) => (searchKeyword = value)"
              @keyup.enter="loadOrders"
            />
          </n-form-item>
          <n-form-item class="crud-page-spacer" />
          <n-form-item>
            <n-button type="primary" :loading="loading" @click="loadOrders">查询</n-button>
          </n-form-item>
          <n-form-item>
            <n-button @click="resetSearch">重置</n-button>
          </n-form-item>
        </n-form>
      </template>

      <template #actions-left>
        <div class="crud-action-main">
          <n-button type="primary" @click="openCreate">新增</n-button>
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
        <n-data-table class="crud-table-flat" :columns="columns" :data="orders" :bordered="false" :loading="loading" />
      </template>

      <template #pager-right>
        <n-pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="(page) => { pagination.page = page; loadOrders() }"
          @update:page-size="(size) => { pagination.pageSize = size; handlePageSizeChange(size) }"
        />
      </template>
    </BaseCrudPage>

    <n-modal :show="createVisible" preset="card" title="新建出库单" @update:show="(value) => (createVisible = value)">
      <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100">
        <n-form-item label="来源单号" path="sourceOrderNo">
          <n-input :value="createForm.sourceOrderNo" placeholder="请输入来源单号/外部单号" @update:value="(value) => (createForm.sourceOrderNo = value)" />
        </n-form-item>
        <n-form-item label="客户" path="customerName">
          <n-input :value="createForm.customerName" placeholder="请输入客户名" @update:value="(value) => (createForm.customerName = value)" />
        </n-form-item>
        <n-form-item label="明细">
          <div class="items">
            <div v-for="(item, index) in createForm.items" :key="index" class="item-row">
              <n-input :value="item.productCode" placeholder="产品编码" style="width: 220px" @update:value="(value) => (item.productCode = value)" />
              <n-input-number
                :value="item.targetLength"
                :min="0"
                :step="0.1"
                placeholder="目标长度"
                style="width: 160px"
                @update:value="(value) => (item.targetLength = value ?? 0)"
              />
              <n-input-number
                :value="item.quantity"
                :min="1"
                :step="1"
                placeholder="需求件数"
                style="width: 140px"
                @update:value="(value) => (item.quantity = value ?? 1)"
              />
              <n-button size="tiny" type="error" tertiary @click="removeItem(index)">删除</n-button>
            </div>
            <n-button text @click="addItem">新增</n-button>
          </div>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="createVisible = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="submitCreate">提交</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-drawer :show="drawerVisible" placement="right" :width="640" :show-mask="false" @update:show="(value) => (drawerVisible = value)">
      <n-card title="订单详情" :bordered="false">
        <n-space vertical :size="16">
          <div>
            <p>订单号：{{ currentOrder?.orderNo }}</p>
            <p>来源单号：{{ currentOrder?.sourceOrderNo || '-' }}</p>
            <p>客户：{{ currentOrder?.customerName }}</p>
            <p>
              状态：
              <n-tag :type="currentOrder ? getStatusTagType(currentOrder.status) : 'default'">
                {{ currentOrder ? getStatusLabel(currentOrder.status) : '-' }}
              </n-tag>
            </p>
          </div>

          <n-data-table
            title="订单明细（展开查看拣货任务）"
            :columns="detailItemColumns"
            :data="drawerItemRows"
            :loading="pickTaskLoading"
            :bordered="false"
            :single-line="false"
          />
        </n-space>
      </n-card>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-v-model-argument */
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NDrawer,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'
import * as outboundApi from '../../../api/wms/outbound'
import * as pickTaskApi from '../../../api/wms/pickTask'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

const message = useMessage()

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const orders = ref<outboundApi.OutboundOrderDto[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const createVisible = ref(false)
const drawerVisible = ref(false)
const currentOrder = ref<outboundApi.OutboundOrderDto | null>(null)
const creating = ref(false)
const createFormRef = ref<FormInst | null>(null)
const createForm = reactive({
  sourceOrderNo: '',
  customerName: '',
  items: [{ productCode: '', targetLength: 0, quantity: 1 }],
})
const createRules: FormRules = {
  customerName: [{ required: true, message: '请输入客户名', trigger: ['blur', 'input'] }],
}

function getStatusMeta(rawStatus: number) {
  switch (rawStatus) {
    case 0:
      return { label: '待分配', tagType: 'info' as const }
    case 1:
      return { label: '部分分配', tagType: 'warning' as const }
    case 2:
      return { label: '已分配', tagType: 'success' as const }
    case 3:
      return { label: '拣货中', tagType: 'primary' as const }
    case 4:
      return { label: '已发货/部分发货', tagType: 'success' as const }
    case 5:
      return { label: '已完成', tagType: 'default' as const }
    default:
      return { label: String(rawStatus), tagType: 'default' as const }
  }
}

function getStatusLabel(status: outboundApi.OutboundOrderDto['status']) {
  return getStatusMeta(Number(status)).label
}

function getStatusTagType(status: outboundApi.OutboundOrderDto['status']) {
  return getStatusMeta(Number(status)).tagType
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const dateValue = new Date(v)
  if (Number.isNaN(dateValue.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())} ${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}:${pad(dateValue.getSeconds())}`
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'outbound-order-column-settings-v1',
  preferredKeys: ['orderNo', 'customerName', 'sourceOrderNo', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'orderNo') return '订单号'
    if (key === 'customerName') return '客户'
    if (key === 'sourceOrderNo') return '来源单号'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<outboundApi.OutboundOrderDto>[number]> = {
  orderNo: {
    title: createDraggableTitle('orderNo', '订单号'),
    key: 'orderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.orderNo, b.orderNo),
  },
  customerName: {
    title: createDraggableTitle('customerName', '客户'),
    key: 'customerName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.customerName, b.customerName),
  },
  sourceOrderNo: {
    title: createDraggableTitle('sourceOrderNo', '来源单号'),
    key: 'sourceOrderNo',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.sourceOrderNo, b.sourceOrderNo),
    render: (row) => row.sourceOrderNo || '-',
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(getStatusLabel(a.status), getStatusLabel(b.status)),
    render: (row) =>
      h(
        NTag,
        { type: getStatusTagType(row.status), size: 'small' },
        { default: () => getStatusLabel(row.status) },
      ),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 200,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<outboundApi.OutboundOrderDto>>(() => withResizable([
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<outboundApi.OutboundOrderDto>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 200,
    align: 'center',
    render: (row) => [
      (row.status === 0 || row.status === 1)
        ? h(NButton, { size: 'small', type: 'primary', quaternary: true, onClick: () => handleAllocate(row) }, { default: () => '分配' })
        : null,
      h(NButton, { size: 'small', type: 'info', quaternary: true, onClick: () => openDrawer(row) }, { default: () => '详情' }),
    ],
  },
]))

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

const pickTaskLoading = ref(false)

type DrawerItemRow = outboundApi.OutboundOrderItemDto & {
  childrenTasks: pickTaskApi.PickTaskDto[]
}

function resolvePickTaskStatus(raw: string | number): string {
  if (raw === 'Pending' || raw === 0) return 'Pending'
  if (raw === 'InProgress' || raw === 1) return 'InProgress'
  if (raw === 'Completed' || raw === 2) return 'Completed'
  if (raw === 'Cancelled' || raw === 3) return 'Cancelled'
  return String(raw)
}

function getPickTaskStatusLabel(status: string): string {
  if (status === 'Pending') return '待执行'
  if (status === 'InProgress') return '执行中'
  if (status === 'Completed') return '已完成'
  if (status === 'Cancelled') return '已取消'
  return status
}

function getPickTaskStatusTagType(status: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (status === 'Pending') return 'warning'
  if (status === 'InProgress') return 'info'
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'default'
  return 'default'
}

const taskColumns: DataTableColumns<pickTaskApi.PickTaskDto> = [
  { title: '盘号', key: 'containerNo', minWidth: 140, render: (row) => row.containerNo || '-' },
  { title: '源库位', key: 'fromLocationCode', minWidth: 140, render: (row) => row.fromLocationCode || '-' },
  {
    title: '目标长度',
    key: 'targetLength',
    width: 140,
    align: 'right',
    render: (row) => `${row.targetLength ?? 0} 米`,
  },
  {
    title: '库存ID前缀',
    key: 'inventoryIdShort',
    width: 130,
    render: (row) => (row.inventoryId ? row.inventoryId.slice(0, 8) : '-'),
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    align: 'center',
    render: (row) => {
      const status = resolvePickTaskStatus(row.status)
      return h(
        NTag,
        { size: 'small', type: getPickTaskStatusTagType(status) },
        { default: () => getPickTaskStatusLabel(status) },
      )
    },
  },
]

const detailItemColumns: DataTableColumns<DrawerItemRow> = [
  {
    type: 'expand',
    renderExpand: (row) => {
      if (!row.childrenTasks?.length) {
        return h(
          'div',
          { style: { padding: '8px 12px' } },
          h(NEmpty, { description: '暂无分配任务', size: 'small' }),
        )
      }
      return h(NDataTable, {
        size: 'small',
        bordered: false,
        columns: taskColumns,
        data: row.childrenTasks,
        singleLine: false,
      })
    },
  },
  { title: '产品编码', key: 'productCode', minWidth: 160 },
  { title: '目标长度', key: 'targetLength', width: 120, align: 'right' },
  {
    title: '需求/已分配件数',
    key: 'qty',
    width: 160,
    align: 'right',
    render: (row) => `${row.quantity ?? 0} / ${row.allocatedQuantity ?? 0}`,
  },
]

const drawerItemRows = ref<DrawerItemRow[]>([])

const buildDrawerItemRows = (
  order: outboundApi.OutboundOrderDto | null,
  tasks: pickTaskApi.PickTaskDto[],
): DrawerItemRow[] => {
  const taskMap = new Map<string, pickTaskApi.PickTaskDto[]>()

  for (const task of tasks) {
    const itemId = task.outboundOrderItemId
    if (!itemId) continue
    const list = taskMap.get(itemId) ?? []
    list.push(task)
    taskMap.set(itemId, list)
  }

  return (order?.items ?? []).map((item) => ({
    ...item,
    childrenTasks: item.id ? (taskMap.get(item.id) ?? []) : [],
  }))
}

async function openDrawer(row: outboundApi.OutboundOrderDto) {
  loading.value = true
  pickTaskLoading.value = true
  try {
    const order = await outboundApi.get(row.id)
    const pickTasks = await pickTaskApi.getTasksByOrderId(order.id)

    currentOrder.value = order
    drawerItemRows.value = buildDrawerItemRows(order, pickTasks)
    drawerVisible.value = true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载详情失败')
    drawerItemRows.value = []
  } finally {
    loading.value = false
    pickTaskLoading.value = false
  }
}

function addItem() {
  createForm.items.push({ productCode: '', targetLength: 0, quantity: 1 })
}

function removeItem(index: number) {
  if (createForm.items.length <= 1) return
  createForm.items.splice(index, 1)
}

async function loadOrders() {
  loading.value = true
  try {
    const page = pagination.page ?? 1
    const pageSize = pagination.pageSize ?? 10
    const result = await outboundApi.getList({
      maxResultCount: pageSize,
      skipCount: (page - 1) * pageSize,
      filter: searchKeyword.value || undefined,
    })
    orders.value = result.items ?? []
    pagination.itemCount = result.totalCount ?? 0
  } finally {
    loading.value = false
  }
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadOrders()
}

function resetSearch() {
  searchKeyword.value = ''
  pagination.page = 1
  loadOrders()
}

function openCreate() {
  createVisible.value = true
}

async function submitCreate() {
  try {
    await createFormRef.value?.validate()
  } catch {
    return
  }
  creating.value = true
  try {
    await outboundApi.create({
      sourceOrderNo: createForm.sourceOrderNo,
      customerName: createForm.customerName,
      items: createForm.items.map(({ productCode, targetLength, quantity }) => ({
        productCode,
        targetLength: Number(targetLength),
        quantity: Number(quantity),
      })),
    })
    message.success('新建成功')
    createVisible.value = false
    loadOrders()
  } finally {
    creating.value = false
  }
}

async function handleAllocate(row: outboundApi.OutboundOrderDto) {
  try {
    await outboundApi.allocate(row.id)
    message.success('分配成功')
    loadOrders()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '分配失败')
  }
}

onMounted(() => {
  loadColumnSettings()
  loadOrders()
})
</script>

<style scoped>
</style>
