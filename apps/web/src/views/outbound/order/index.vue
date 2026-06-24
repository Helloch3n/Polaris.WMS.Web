<template>
  <div>
    <BaseCrudPage>
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item label="订单号">
            <n-input
              :value="searchForm.orderNo"
              placeholder="请输入订单号"
              clearable
              style="width: 200px"
              @update:value="(value) => (searchForm.orderNo = value)"
              @keyup.enter="loadOrders"
            />
          </n-form-item>
          <n-form-item label="客户编码">
            <n-input
              :value="searchForm.customerCode"
              placeholder="请输入客户编码"
              clearable
              style="width: 200px"
              @update:value="(value) => (searchForm.customerCode = value)"
              @keyup.enter="loadOrders"
            />
          </n-form-item>
          <n-form-item label="状态">
            <n-select
              :value="searchForm.status"
              :options="statusOptions"
              placeholder="请选择状态"
              clearable
              style="width: 150px"
              @update:value="(value) => (searchForm.status = value)"
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
          <n-button v-if="canCreate" type="primary" @click="openCreate">新增</n-button>
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

    <!-- Create Modal -->
    <n-modal :show="createVisible" preset="card" title="新建销售订单" style="width: 800px" @update:show="(value) => (createVisible = value)">
      <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100">
        <n-grid :cols="2" :x-gap="12">
          <n-form-item-gi label="订单号" path="orderNo">
            <n-input :value="createForm.orderNo" placeholder="请输入销售订单号" @update:value="(value) => (createForm.orderNo = value)" />
          </n-form-item-gi>
          <n-form-item-gi label="客户" path="customerId">
            <n-select
              :value="createForm.customerId"
              :options="customerOptions"
              placeholder="请选择客户"
              filterable
              @update:value="(value) => (createForm.customerId = value)"
            />
          </n-form-item-gi>
          <n-form-item-gi label="订单日期" path="orderDate">
            <n-date-picker
              :value="createForm.orderDate"
              type="datetime"
              placeholder="选择订单日期"
              style="width: 100%"
              @update:value="(value) => (createForm.orderDate = value)"
            />
          </n-form-item-gi>
          <n-form-item-gi label="计划发货时间" path="expectedDeliveryTime">
            <n-date-picker
              :value="createForm.expectedDeliveryTime"
              type="datetime"
              placeholder="选择发货时间"
              style="width: 100%"
              @update:value="(value) => (createForm.expectedDeliveryTime = value)"
            />
          </n-form-item-gi>
        </n-grid>
        <n-form-item label="备注" path="remark">
          <n-input :value="createForm.remark" type="textarea" placeholder="请输入备注" @update:value="(value) => (createForm.remark = value)" />
        </n-form-item>

        <n-divider title-placement="left">订单明细</n-divider>

        <div style="margin-bottom: 12px">
          <n-button size="small" type="primary" secondary @click="addItem">添加物料</n-button>
        </div>

        <n-data-table
          :columns="itemFormColumns"
          :data="createForm.items"
          size="small"
          :bordered="false"
        />
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="createVisible = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="submitCreate">提交</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Details Drawer -->
    <n-drawer :show="drawerVisible" placement="right" :width="720" @update:show="(value) => (drawerVisible = value)">
      <n-drawer-content title="销售订单详情" closable>
        <n-descriptions label-placement="left" bordered :column="2" style="margin-bottom: 20px">
          <n-descriptions-item label="订单号">{{ currentOrder?.orderNo }}</n-descriptions-item>
          <n-descriptions-item label="客户">{{ currentOrder?.customerName }} ({{ currentOrder?.customerCode }})</n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="currentOrder ? getStatusTagType(currentOrder.status) : 'default'">
              {{ currentOrder ? getStatusLabel(currentOrder.status) : '-' }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="订单日期">{{ formatDateTime(currentOrder?.orderDate) }}</n-descriptions-item>
          <n-descriptions-item label="计划发货时间">{{ formatDateTime(currentOrder?.expectedDeliveryTime) || '-' }}</n-descriptions-item>
          <n-descriptions-item label="创建时间">{{ formatDateTime(currentOrder?.creationTime) }}</n-descriptions-item>
          <n-descriptions-item label="备注" :span="2">{{ currentOrder?.remark || '-' }}</n-descriptions-item>
        </n-descriptions>

        <n-divider title-placement="left">订单明细</n-divider>
        <n-data-table
          :columns="detailItemColumns"
          :data="currentOrder?.details || []"
          size="small"
          :bordered="false"
        />
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-v-model-argument */
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NDataTable,
  NDatePicker,
  NDivider,
  NDrawer,
  NDrawerContent,
  NDescriptions,
  NDescriptionsItem,
  NForm,
  NFormItem,
  NFormItemGi,
  NGrid,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NTag,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, PaginationProps, SelectOption } from 'naive-ui'
import * as salesOrderApi from '../../../api/outbound/salesOrder'
import * as customerApi from '../../../api/masterData/customer'
import * as productApi from '../../../api/masterData/product'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { usePermission } from '../../../composables/usePermission'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

const message = useMessage()
const dialog = useDialog()

const { hasPermission } = usePermission()

const canCreate = computed(() => hasPermission('WMS.OutboundOps.SalesOrders.Create'))
const canDelete = computed(() => hasPermission('WMS.OutboundOps.SalesOrders.Delete'))

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const orders = ref<salesOrderApi.SalesOrderDto[]>([])
const loading = ref(false)

const searchForm = reactive({
  orderNo: '',
  customerCode: '',
  status: null as number | null,
})

const createVisible = ref(false)
const drawerVisible = ref(false)
const currentOrder = ref<salesOrderApi.SalesOrderDto | null>(null)
const creating = ref(false)
const createFormRef = ref<FormInst | null>(null)

interface FormItem {
  productId: string
  productCode: string
  productName: string
  unit: string
  qty: number
  remark: string
}

const createForm = reactive({
  orderNo: '',
  customerId: '',
  orderDate: null as number | null,
  expectedDeliveryTime: null as number | null,
  remark: '',
  items: [] as FormItem[],
})

const createRules: FormRules = {
  orderNo: [{ required: true, message: '请输入销售订单号', trigger: ['blur', 'input'] }],
  customerId: [{ required: true, message: '请选择客户', trigger: ['blur', 'change'] }],
  orderDate: [{ required: true, type: 'number', message: '请选择订单日期', trigger: ['blur', 'change'] }],
}

const statusOptions: SelectOption[] = [
  { label: '开立', value: salesOrderApi.SalesOrderStatus.Open },
  { label: '部分发货', value: salesOrderApi.SalesOrderStatus.PartiallyShipped },
  { label: '完成', value: salesOrderApi.SalesOrderStatus.Completed },
  { label: '已取消', value: salesOrderApi.SalesOrderStatus.Cancelled },
]

const customerOptions = ref<SelectOption[]>([])
const productOptions = ref<SelectOption[]>([])
const productLookup = ref<Record<string, productApi.ProductDto>>({})

function getStatusLabel(status: number) {
  switch (status) {
    case salesOrderApi.SalesOrderStatus.Open:
      return '开立'
    case salesOrderApi.SalesOrderStatus.PartiallyShipped:
      return '部分发货'
    case salesOrderApi.SalesOrderStatus.Completed:
      return '完成'
    case salesOrderApi.SalesOrderStatus.Cancelled:
      return '已取消'
    default:
      return String(status)
  }
}

function getStatusTagType(status: number) {
  switch (status) {
    case salesOrderApi.SalesOrderStatus.Open:
      return 'info'
    case salesOrderApi.SalesOrderStatus.PartiallyShipped:
      return 'warning'
    case salesOrderApi.SalesOrderStatus.Completed:
      return 'success'
    case salesOrderApi.SalesOrderStatus.Cancelled:
      return 'default'
    default:
      return 'default'
  }
}

function formatDateTime(v?: string | number | null) {
  if (!v) return '-'
  const dateValue = new Date(v)
  if (Number.isNaN(dateValue.getTime())) return String(v)
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
  storageKey: 'sales-order-column-settings-v1',
  preferredKeys: ['orderNo', 'customerName', 'status', 'orderDate', 'expectedDeliveryTime', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'orderNo') return '订单号'
    if (key === 'customerName') return '客户'
    if (key === 'status') return '状态'
    if (key === 'orderDate') return '订单时间'
    if (key === 'expectedDeliveryTime') return '计划发货时间'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<salesOrderApi.SalesOrderDto>[number]> = {
  orderNo: {
    title: createDraggableTitle('orderNo', '订单号'),
    key: 'orderNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.orderNo, b.orderNo),
  },
  customerName: {
    title: createDraggableTitle('customerName', '客户'),
    key: 'customerName',
    minWidth: 160,
    render: (row) => `${row.customerName} (${row.customerCode})`,
    sorter: (a, b) => compareSortValue(a.customerName, b.customerName),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.status, b.status),
    render: (row) =>
      h(
        NTag,
        { type: getStatusTagType(row.status), size: 'small' },
        { default: () => getStatusLabel(row.status) },
      ),
  },
  orderDate: {
    title: createDraggableTitle('orderDate', '订单时间'),
    key: 'orderDate',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.orderDate, b.orderDate),
    render: (row) => formatDateTime(row.orderDate),
  },
  expectedDeliveryTime: {
    title: createDraggableTitle('expectedDeliveryTime', '计划发货时间'),
    key: 'expectedDeliveryTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.expectedDeliveryTime, b.expectedDeliveryTime),
    render: (row) => formatDateTime(row.expectedDeliveryTime),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<salesOrderApi.SalesOrderDto>>(() => withResizable([
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<salesOrderApi.SalesOrderDto>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 160,
    align: 'center',
    render: (row) => [
      h(NButton, { size: 'small', type: 'info', quaternary: true, onClick: () => openDrawer(row) }, { default: () => '详情' }),
      row.status === salesOrderApi.SalesOrderStatus.Open && canDelete.value
        ? h(NButton, { size: 'small', type: 'error', quaternary: true, onClick: () => handleDelete(row) }, { default: () => '删除' })
        : null,
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

const detailItemColumns: DataTableColumns<salesOrderApi.SalesOrderDetailDto> = [
  { title: '行号', key: 'lineNo', width: 70, align: 'center' },
  { title: '产品编码', key: 'productCode', minWidth: 140 },
  { title: '产品名称', key: 'productName', minWidth: 180 },
  { title: '单位', key: 'unit', width: 80, align: 'center' },
  { title: '需求数量', key: 'qty', width: 100, align: 'right' },
  { title: '已分配数量', key: 'allocatedQty', width: 110, align: 'right' },
  { title: '已出库数量', key: 'shippedQty', width: 110, align: 'right' },
  { title: '备注', key: 'remark', minWidth: 120, render: (row) => row.remark || '-' },
]

const itemFormColumns = computed<DataTableColumns<FormItem>>(() => [
  {
    title: '物料',
    key: 'productId',
    minWidth: 280,
    render: (row) => h(NSelect, {
      value: row.productId || null,
      options: productOptions.value,
      filterable: true,
      remote: true,
      loading: productLoading.value,
      placeholder: '选择物料',
      onSearch: handleProductSearch,
      onUpdateValue: (val: string | null) => {
        if (!val) {
          row.productId = ''
          row.productCode = ''
          row.productName = ''
          row.unit = ''
          return
        }
        const prod = productLookup.value[val]
        if (prod) {
          row.productId = val
          row.productCode = prod.code
          row.productName = prod.name
          row.unit = prod.unit
        }
      }
    })
  },
  {
    title: '产品编码',
    key: 'productCode',
    width: 130,
    render: (row) => row.productCode || '-'
  },
  {
    title: '数量',
    key: 'qty',
    width: 140,
    render: (row) => h(NInputNumber, {
      value: row.qty,
      min: 0.001,
      precision: 3,
      placeholder: '数量',
      onUpdateValue: (val) => { row.qty = val || 0 }
    })
  },
  {
    title: '单位',
    key: 'unit',
    width: 80,
    render: (row) => row.unit || '-'
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 150,
    render: (row) => h(NInput, {
      value: row.remark,
      placeholder: '备注',
      onUpdateValue: (val) => { row.remark = val }
    })
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    align: 'center',
    render: (_, index) => h(NButton, {
      size: 'small',
      type: 'error',
      quaternary: true,
      onClick: () => removeItem(index)
    }, { default: () => '删除' })
  }
])

async function openDrawer(row: salesOrderApi.SalesOrderDto) {
  loading.value = true
  try {
    const order = await salesOrderApi.get(row.id)
    currentOrder.value = order
    drawerVisible.value = true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载详情失败')
  } finally {
    loading.value = false
  }
}

function addItem() {
  createForm.items.push({
    productId: '',
    productCode: '',
    productName: '',
    unit: '',
    qty: 1,
    remark: '',
  })
}

function removeItem(index: number) {
  createForm.items.splice(index, 1)
}

async function loadOrders() {
  loading.value = true
  try {
    const page = pagination.page ?? 1
    const pageSize = pagination.pageSize ?? 10
    const result = await salesOrderApi.getList({
      maxResultCount: pageSize,
      skipCount: (page - 1) * pageSize,
      orderNo: searchForm.orderNo || undefined,
      customerCode: searchForm.customerCode || undefined,
      status: searchForm.status ?? undefined,
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
  searchForm.orderNo = ''
  searchForm.customerCode = ''
  searchForm.status = null
  pagination.page = 1
  loadOrders()
}

const productLoading = ref(false)

async function handleProductSearch(query: string) {
  if (!query) return
  productLoading.value = true
  try {
    const res = await productApi.getProductList({
      filter: query,
      maxResultCount: 20
    })
    productOptions.value = (res.items ?? []).map(p => ({
      label: `${p.code} - ${p.name}`,
      value: p.id || ''
    }))
    res.items?.forEach(p => {
      if (p.id) {
        productLookup.value[p.id] = p
      }
    })
  } catch (e) {
    console.error(e)
  } finally {
    productLoading.value = false
  }
}

async function loadCustomers() {
  try {
    const res = await customerApi.getList({
      maxResultCount: 1000
    })
    customerOptions.value = (res.items ?? []).map(c => ({
      label: `${c.name} (${c.code})`,
      value: c.id
    }))
  } catch (e) {
    message.error('加载客户数据失败')
  }
}

async function openCreate() {
  // Generate code or clear
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const code = `SO${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
  
  createForm.orderNo = code
  createForm.customerId = ''
  createForm.orderDate = now.getTime()
  createForm.expectedDeliveryTime = now.getTime() + 24 * 60 * 60 * 1000 // default next day
  createForm.remark = ''
  createForm.items = []
  addItem() // Add first row
  
  createVisible.value = true
}

async function submitCreate() {
  try {
    await createFormRef.value?.validate()
  } catch {
    return
  }
  
  if (createForm.items.length === 0) {
    message.warning('请添加至少一条明细')
    return
  }
  
  const invalidItem = createForm.items.find(item => !item.productId || item.qty <= 0)
  if (invalidItem) {
    message.warning('请确保明细选择物料且数量大于 0')
    return
  }

  creating.value = true
  try {
    await salesOrderApi.create({
      orderNo: createForm.orderNo,
      customerId: createForm.customerId,
      orderDate: new Date(createForm.orderDate!).toISOString(),
      expectedDeliveryTime: createForm.expectedDeliveryTime ? new Date(createForm.expectedDeliveryTime).toISOString() : undefined,
      remark: createForm.remark || undefined,
      details: createForm.items.map((item, idx) => ({
        lineNo: idx + 1,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        qty: item.qty,
        remark: item.remark || undefined,
      }))
    })
    message.success('新建成功')
    createVisible.value = false
    loadOrders()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '新建失败')
  } finally {
    creating.value = false
  }
}

function handleDelete(row: salesOrderApi.SalesOrderDto) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除销售订单 ${row.orderNo} 吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await salesOrderApi.deleteOrder(row.id)
        message.success('删除成功')
        loadOrders()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '删除失败')
      }
    }
  })
}

onMounted(() => {
  loadColumnSettings()
  loadOrders()
  loadCustomers()
})
</script>

<style scoped>
</style>
