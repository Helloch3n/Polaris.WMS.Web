<template>
  <div>
    <BaseCrudPage>
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item>
            <n-input
              :value="searchForm.shipmentNo"
              placeholder="请输入发货单号"
              clearable
              style="width: 200px"
              @update:value="(value) => (searchForm.shipmentNo = value)"
              @keyup.enter="loadShipments"
            />
          </n-form-item>
          <n-form-item>
            <n-input
              :value="searchForm.customerCode"
              placeholder="请输入客户编码"
              clearable
              style="width: 200px"
              @update:value="(value) => (searchForm.customerCode = value)"
              @keyup.enter="loadShipments"
            />
          </n-form-item>
          <n-form-item>
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
            <n-button type="primary" :loading="loading" @click="loadShipments">查询</n-button>
          </n-form-item>
          <n-form-item>
            <n-button @click="resetSearch">重置</n-button>
          </n-form-item>
        </n-form>
      </template>

      <template #actions-left>
        <n-space>
          <n-button type="primary" @click="openCreate">手工创建</n-button>
          <n-button type="info" :disabled="selectedRowKeys.length === 0" @click="openCreateWave">创建波次</n-button>
        </n-space>
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
          :columns="columns"
          :data="shipments"
          :bordered="false"
          :loading="loading"
          :row-key="(row) => row.id"
          :checked-row-keys="selectedRowKeys"
          @update:checked-row-keys="handleCheckedRowKeysChange"
        />
      </template>

      <template #pager-right>
        <n-pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="(page) => { pagination.page = page; loadShipments() }"
          @update:page-size="(size) => { pagination.pageSize = size; handlePageSizeChange(size) }"
        />
      </template>
    </BaseCrudPage>

    <!-- Create Shipment Modal -->
    <n-modal :show="createVisible" preset="card" title="新建销售发货单" style="width: 800px" @update:show="(value) => (createVisible = value)">
      <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100">
        <n-grid :cols="2" :x-gap="12">
          <n-form-item-gi label="发货单号" path="shipmentNo">
            <n-input :value="createForm.shipmentNo" placeholder="请输入发货单号" @update:value="(value) => (createForm.shipmentNo = value)" />
          </n-form-item-gi>
          <n-form-item-gi label="关联销售订单" path="sourceSalesOrderId">
            <n-select
              :value="createForm.sourceSalesOrderId"
              :options="openSalesOrderOptions"
              placeholder="可选择关联的销售订单"
              clearable
              filterable
              @update:value="handleSalesOrderSelect"
            />
          </n-form-item-gi>
          <n-form-item-gi label="客户" path="customerId">
            <n-select
              :value="createForm.customerId"
              :options="customerOptions"
              placeholder="请选择客户"
              filterable
              :disabled="Boolean(createForm.sourceSalesOrderId)"
              @update:value="(value) => (createForm.customerId = value)"
            />
          </n-form-item-gi>
          <n-form-item-gi label="收货人" path="deliveryContactName">
            <n-input :value="createForm.deliveryContactName" placeholder="收货人姓名" @update:value="(value) => (createForm.deliveryContactName = value)" />
          </n-form-item-gi>
          <n-form-item-gi label="联系电话" path="deliveryPhone">
            <n-input :value="createForm.deliveryPhone" placeholder="收货人电话" @update:value="(value) => (createForm.deliveryPhone = value)" />
          </n-form-item-gi>
          <n-form-item-gi label="收货地址" path="deliveryAddress" :span="2">
            <n-input :value="createForm.deliveryAddress" placeholder="收货人地址" @update:value="(value) => (createForm.deliveryAddress = value)" />
          </n-form-item-gi>
        </n-grid>
        <n-form-item label="备注" path="remark">
          <n-input :value="createForm.remark" type="textarea" placeholder="请输入备注" @update:value="(value) => (createForm.remark = value)" />
        </n-form-item>

        <n-divider title-placement="left">发货单明细</n-divider>

        <div style="margin-bottom: 12px">
          <n-button size="small" type="primary" secondary :disabled="Boolean(createForm.sourceSalesOrderId)" @click="addItem">添加物料</n-button>
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

    <!-- Create Wave Modal -->
    <n-modal :show="waveVisible" preset="card" title="创建波次单" style="width: 480px" @update:show="(value) => (waveVisible = value)">
      <n-form label-width="100">
        <n-form-item label="所选发货单">
          <n-text depth="3">已选择 {{ selectedRowKeys.length }} 个销售发货单</n-text>
        </n-form-item>
        <n-form-item label="备注">
          <n-input :value="waveForm.remark" type="textarea" placeholder="请输入波次备注" @update:value="(value) => (waveForm.remark = value)" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="waveVisible = false">取消</n-button>
          <n-button type="primary" :loading="creatingWave" @click="submitCreateWave">确定创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Allocation Drawer -->
    <n-drawer :show="allocationVisible" placement="right" :width="850" @update:show="(value) => (allocationVisible = value)">
      <n-drawer-content title="手工库存分配" closable>
        <div v-if="currentShipment" style="margin-bottom: 16px">
          <n-descriptions label-placement="left" bordered :column="2" size="small">
            <n-descriptions-item label="发货单号">{{ currentShipment.shipmentNo }}</n-descriptions-item>
            <n-descriptions-item label="客户">{{ currentShipment.customerName }}</n-descriptions-item>
            <n-descriptions-item label="关联订单">{{ currentShipment.sourceSalesOrderNo || '-' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag :type="getStatusTagType(currentShipment.status)" size="small">
                {{ getStatusLabel(currentShipment.status) }}
              </n-tag>
            </n-descriptions-item>
          </n-descriptions>
        </div>

        <n-divider title-placement="left">发货明细行（展开管理分配）</n-divider>

        <n-data-table
          :columns="allocationDetailColumns"
          :data="currentShipment?.details || []"
          size="small"
          :bordered="false"
        />
      </n-drawer-content>
    </n-drawer>

    <!-- Add Allocation Modal -->
    <n-modal :show="addAllocVisible" preset="card" title="添加库存分配" style="width: 500px" @update:show="(value) => (addAllocVisible = value)">
      <n-form ref="allocFormRef" :model="allocForm" :rules="allocRules" label-width="100">
        <n-form-item label="物料">
          <n-text strong>{{ allocTargetLine?.productCode }} - {{ allocTargetLine?.productName }}</n-text>
        </n-form-item>
        <n-form-item label="盘号/载具" path="containerCode">
          <n-select
            :value="allocForm.containerCode"
            :options="containerOptions"
            placeholder="请搜索并选择盘号"
            filterable
            remote
            :loading="containerLoading"
            :on-search="handleContainerSearch"
            @update:value="(val) => (allocForm.containerCode = val)"
          />
        </n-form-item>
        <n-form-item label="来源库位" path="locationCode">
          <n-select
            :value="allocForm.locationCode"
            :options="locationOptions"
            placeholder="请选择库位"
            filterable
            remote
            :loading="locationLoading"
            :on-search="handleLocationSearch"
            @update:value="(val) => (allocForm.locationCode = val)"
          />
        </n-form-item>
        <n-form-item label="批次" path="batchNo">
          <n-input :value="allocForm.batchNo" placeholder="请输入批次号" @update:value="(val) => (allocForm.batchNo = val)" />
        </n-form-item>
        <n-form-item label="序列号/SN" path="sn">
          <n-input :value="allocForm.sn" placeholder="请输入SN" @update:value="(val) => (allocForm.sn = val)" />
        </n-form-item>
        <n-form-item label="分配数量" path="qty">
          <n-input-number :value="allocForm.qty" :min="0.001" :precision="3" style="width: 100%" @update:value="(val) => (allocForm.qty = val || 0)" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="addAllocVisible = false">取消</n-button>
          <n-button type="primary" :loading="allocating" @click="submitAddAllocation">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Details Drawer -->
    <n-drawer :show="drawerVisible" placement="right" :width="720" @update:show="(value) => (drawerVisible = value)">
      <n-drawer-content title="销售发货单详情" closable>
        <n-descriptions label-placement="left" bordered :column="2" style="margin-bottom: 20px" size="small">
          <n-descriptions-item label="发货单号">{{ currentShipment?.shipmentNo }}</n-descriptions-item>
          <n-descriptions-item label="客户">{{ currentShipment?.customerName }} ({{ currentShipment?.customerCode }})</n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="currentShipment ? getStatusTagType(currentShipment.status) : 'default'">
              {{ currentShipment ? getStatusLabel(currentShipment.status) : '-' }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="关联订单">{{ currentShipment?.sourceSalesOrderNo || '-' }}</n-descriptions-item>
          <n-descriptions-item label="收货人">{{ currentShipment?.deliveryContactName || '-' }}</n-descriptions-item>
          <n-descriptions-item label="联系电话">{{ currentShipment?.deliveryPhone || '-' }}</n-descriptions-item>
          <n-descriptions-item label="收货地址" :span="2">{{ currentShipment?.deliveryAddress || '-' }}</n-descriptions-item>
          <n-descriptions-item label="创建时间">{{ formatDateTime(currentShipment?.creationTime) }}</n-descriptions-item>
          <n-descriptions-item label="备注" :span="2">{{ currentShipment?.remark || '-' }}</n-descriptions-item>
        </n-descriptions>

        <n-divider title-placement="left">发货明细行</n-divider>
        <n-data-table
          :columns="detailItemColumns"
          :data="currentShipment?.details || []"
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
  NText,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, PaginationProps, SelectOption } from 'naive-ui'
import * as salesShipmentApi from '../../../api/outbound/salesShipment'
import * as salesOrderApi from '../../../api/outbound/salesOrder'
import * as customerApi from '../../../api/masterData/customer'
import * as productApi from '../../../api/masterData/product'
import * as waveApi from '../../../api/outbound/wave'
import * as containerApi from '../../../api/masterData/container'
import * as locationApi from '../../../api/masterData/location'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

const message = useMessage()
const dialog = useDialog()

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const shipments = ref<salesShipmentApi.SalesShipmentDto[]>([])
const loading = ref(false)
const selectedRowKeys = ref<string[]>([])

const searchForm = reactive({
  shipmentNo: '',
  customerCode: '',
  status: null as number | null,
})

const createVisible = ref(false)
const waveVisible = ref(false)
const drawerVisible = ref(false)
const allocationVisible = ref(false)
const addAllocVisible = ref(false)

const currentShipment = ref<salesShipmentApi.SalesShipmentDto | null>(null)
const creating = ref(false)
const creatingWave = ref(false)
const allocating = ref(false)

const createFormRef = ref<FormInst | null>(null)
const allocFormRef = ref<FormInst | null>(null)

interface FormItem {
  sourceSalesOrderLineId?: string | null
  lineNo: number
  productId: string
  productCode: string
  productName: string
  unit: string
  requiredQty: number
  remark: string
}

const createForm = reactive({
  shipmentNo: '',
  sourceSalesOrderId: null as string | null,
  sourceSalesOrderNo: '',
  customerId: '',
  deliveryContactName: '',
  deliveryPhone: '',
  deliveryAddress: '',
  remark: '',
  items: [] as FormItem[],
})

const createRules: FormRules = {
  shipmentNo: [{ required: true, message: '请输入发货单号', trigger: ['blur', 'input'] }],
  customerId: [{ required: true, message: '请选择客户', trigger: ['blur', 'change'] }],
}

const waveForm = reactive({
  remark: '',
})

const allocTargetLine = ref<salesShipmentApi.SalesShipmentDetailDto | null>(null)
const allocForm = reactive({
  containerCode: '',
  locationCode: '',
  batchNo: '',
  sn: '',
  qty: 1,
})

const allocRules: FormRules = {
  containerCode: [{ required: true, message: '请选择盘具', trigger: ['blur', 'change'] }],
  locationCode: [{ required: true, message: '请选择库位', trigger: ['blur', 'change'] }],
  qty: [{ required: true, type: 'number', message: '请输入大于 0 的数量', trigger: ['blur', 'input'] }],
}

const statusOptions: SelectOption[] = [
  { label: '创建', value: salesShipmentApi.OutboundOrderStatus.Created },
  { label: '部分分配', value: salesShipmentApi.OutboundOrderStatus.PartiallyAllocated },
  { label: '已分配', value: salesShipmentApi.OutboundOrderStatus.Allocated },
  { label: '拣货中', value: salesShipmentApi.OutboundOrderStatus.Picking },
  { label: '已发货', value: salesShipmentApi.OutboundOrderStatus.Shipped },
  { label: '完成', value: salesShipmentApi.OutboundOrderStatus.Completed },
]

const customerOptions = ref<SelectOption[]>([])
const productOptions = ref<SelectOption[]>([])
const productLookup = ref<Record<string, productApi.ProductDto>>({})
const openSalesOrderOptions = ref<SelectOption[]>([])
const openSalesOrders = ref<salesOrderApi.SalesOrderDto[]>([])

const containerOptions = ref<SelectOption[]>([])
const containerLoading = ref(false)
const locationOptions = ref<SelectOption[]>([])
const locationLoading = ref(false)

function getStatusLabel(status: number) {
  switch (status) {
    case salesShipmentApi.OutboundOrderStatus.Created:
      return '创建'
    case salesShipmentApi.OutboundOrderStatus.PartiallyAllocated:
      return '部分分配'
    case salesShipmentApi.OutboundOrderStatus.Allocated:
      return '已分配'
    case salesShipmentApi.OutboundOrderStatus.Picking:
      return '拣货中'
    case salesShipmentApi.OutboundOrderStatus.Shipped:
      return '已发货'
    case salesShipmentApi.OutboundOrderStatus.Completed:
      return '完成'
    default:
      return String(status)
  }
}

function getStatusTagType(status: number) {
  switch (status) {
    case salesShipmentApi.OutboundOrderStatus.Created:
      return 'info'
    case salesShipmentApi.OutboundOrderStatus.PartiallyAllocated:
      return 'warning'
    case salesShipmentApi.OutboundOrderStatus.Allocated:
      return 'success'
    case salesShipmentApi.OutboundOrderStatus.Picking:
      return 'primary'
    case salesShipmentApi.OutboundOrderStatus.Shipped:
      return 'success'
    case salesShipmentApi.OutboundOrderStatus.Completed:
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

function handleCheckedRowKeysChange(keys: Array<string | number>) {
  selectedRowKeys.value = keys.map(k => String(k))
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'sales-shipment-column-settings-v1',
  preferredKeys: ['shipmentNo', 'customerName', 'status', 'sourceSalesOrderNo', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'shipmentNo') return '发货单号'
    if (key === 'customerName') return '客户'
    if (key === 'status') return '状态'
    if (key === 'sourceSalesOrderNo') return '销售订单'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<salesShipmentApi.SalesShipmentDto>[number]> = {
  shipmentNo: {
    title: createDraggableTitle('shipmentNo', '发货单号'),
    key: 'shipmentNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.shipmentNo, b.shipmentNo),
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
  sourceSalesOrderNo: {
    title: createDraggableTitle('sourceSalesOrderNo', '销售订单'),
    key: 'sourceSalesOrderNo',
    minWidth: 160,
    render: (row) => row.sourceSalesOrderNo || '-',
    sorter: (a, b) => compareSortValue(a.sourceSalesOrderNo || '', b.sourceSalesOrderNo || ''),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<salesShipmentApi.SalesShipmentDto>>(() => withResizable([
  {
    type: 'selection',
    fixed: 'left',
    width: 44,
  },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<salesShipmentApi.SalesShipmentDto>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 280,
    align: 'center',
    render: (row) => [
      h(NButton, { size: 'small', type: 'info', quaternary: true, onClick: () => openDrawer(row) }, { default: () => '详情' }),
      (row.status === salesShipmentApi.OutboundOrderStatus.Created || row.status === salesShipmentApi.OutboundOrderStatus.PartiallyAllocated)
        ? h(NButton, { size: 'small', type: 'primary', quaternary: true, onClick: () => openAllocation(row) }, { default: () => '分配' })
        : null,
      (row.status === salesShipmentApi.OutboundOrderStatus.Created || row.status === salesShipmentApi.OutboundOrderStatus.PartiallyAllocated || row.status === salesShipmentApi.OutboundOrderStatus.Allocated)
        ? h(NButton, { size: 'small', type: 'warning', quaternary: true, onClick: () => handleDirectShip(row) }, { default: () => '一键发货' })
        : null,
      row.status === salesShipmentApi.OutboundOrderStatus.Created
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

const detailItemColumns: DataTableColumns<salesShipmentApi.SalesShipmentDetailDto> = [
  { title: '行号', key: 'lineNo', width: 70, align: 'center' },
  { title: '产品编码', key: 'productCode', minWidth: 140 },
  { title: '产品名称', key: 'productName', minWidth: 180 },
  { title: '单位', key: 'unit', width: 80, align: 'center' },
  { title: '需求数量', key: 'requiredQty', width: 100, align: 'right' },
  { title: '已分配数量', key: 'allocatedQty', width: 110, align: 'right' },
  { title: '已拣货数量', key: 'pickedQty', width: 110, align: 'right' },
  { title: '已发货数量', key: 'shippedQty', width: 110, align: 'right' },
  { title: '备注', key: 'remark', minWidth: 120, render: (row) => row.remark || '-' },
]

const allocationDetailColumns = computed<DataTableColumns<salesShipmentApi.SalesShipmentDetailDto>>(() => [
  {
    type: 'expand',
    renderExpand: (row) => {
      if (!row.allocations?.length) {
        return h('div', { style: { padding: '8px 24px', color: '#94a3b8' } }, '暂无分配库存数据')
      }
      return h(NDataTable, {
        size: 'small',
        bordered: false,
        columns: [
          { title: '盘号/载具', key: 'containerCode' },
          { title: '库位', key: 'sourceLocationCode' },
          { title: '批次', key: 'batchNo', render: (r: any) => r.batchNo || '-' },
          { title: 'SN', key: 'sn', render: (r: any) => r.sn || '-' },
          { title: '分配数量', key: 'qty', align: 'right' },
          {
            title: '状态',
            key: 'status',
            render: (r: any) => {
              // Reserved (10)
              if (r.status === 10) return h(NTag, { size: 'small', type: 'warning' }, { default: () => '已预留' })
              if (r.status === 20) return h(NTag, { size: 'small', type: 'info' }, { default: () => '已建搬运' })
              if (r.status === 30) return h(NTag, { size: 'small', type: 'success' }, { default: () => '已下架' })
              return String(r.status)
            }
          },
          {
            title: '操作',
            key: 'action',
            width: 80,
            align: 'center',
            render: (r: any) => {
              if (r.status !== 10) return null // Only allow deleting if not yet picked or task created
              return h(NButton, {
                size: 'small',
                type: 'error',
                quaternary: true,
                onClick: () => handleRemoveAllocation(row.id, r.id)
              }, { default: () => '释配' })
            }
          }
        ],
        data: row.allocations,
      })
    }
  },
  { title: '行号', key: 'lineNo', width: 70, align: 'center' },
  { title: '产品编码', key: 'productCode', minWidth: 120 },
  { title: '产品名称', key: 'productName', minWidth: 160 },
  { title: '需求件数', key: 'requiredQty', width: 100, align: 'right' },
  { title: '已分配件数', key: 'allocatedQty', width: 100, align: 'right' },
  {
    title: '分配操作',
    key: 'allocAction',
    width: 120,
    align: 'center',
    render: (row) => {
      const remaining = row.requiredQty - row.allocatedQty
      if (remaining <= 0) {
        return h(NText, { depth: 3 }, { default: () => '分配完成' })
      }
      return h(NButton, {
        size: 'small',
        type: 'primary',
        secondary: true,
        onClick: () => openAddAllocation(row)
      }, { default: () => '分配库存' })
    }
  }
])

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
      disabled: Boolean(createForm.sourceSalesOrderId),
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
    title: '发货数量',
    key: 'requiredQty',
    width: 140,
    render: (row) => h(NInputNumber, {
      value: row.requiredQty,
      min: 0.001,
      precision: 3,
      placeholder: '数量',
      disabled: Boolean(createForm.sourceSalesOrderId),
      onUpdateValue: (val) => { row.requiredQty = val || 0 }
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
      disabled: Boolean(createForm.sourceSalesOrderId),
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
      disabled: Boolean(createForm.sourceSalesOrderId),
      onClick: () => removeItem(index)
    }, { default: () => '删除' })
  }
])

async function openDrawer(row: salesShipmentApi.SalesShipmentDto) {
  loading.value = true
  try {
    const shipment = await salesShipmentApi.get(row.id)
    currentShipment.value = shipment
    drawerVisible.value = true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载详情失败')
  } finally {
    loading.value = false
  }
}

async function openAllocation(row: salesShipmentApi.SalesShipmentDto) {
  loading.value = true
  try {
    const shipment = await salesShipmentApi.get(row.id)
    currentShipment.value = shipment
    allocationVisible.value = true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载发货详情失败')
  } finally {
    loading.value = false
  }
}

function openAddAllocation(line: salesShipmentApi.SalesShipmentDetailDto) {
  allocTargetLine.value = line
  allocForm.containerCode = ''
  allocForm.locationCode = ''
  allocForm.batchNo = ''
  allocForm.sn = ''
  allocForm.qty = line.requiredQty - line.allocatedQty
  
  // Clear lists
  containerOptions.value = []
  locationOptions.value = []
  
  addAllocVisible.value = true
}

async function handleContainerSearch(query: string) {
  if (!query) return
  containerLoading.value = true
  try {
    const res = await containerApi.getList({
      filter: query,
      maxResultCount: 20
    })
    containerOptions.value = (res.items ?? []).map(c => ({
      label: c.containerCode,
      value: c.containerCode
    }))
  } catch (e) {
    console.error(e)
  } finally {
    containerLoading.value = false
  }
}

async function handleLocationSearch(query: string) {
  if (!query) return
  locationLoading.value = true
  try {
    const res = await locationApi.getLocationByWarehouseId('') // Empty string to query all warehouses
    const keyword = query.toLowerCase()
    locationOptions.value = (res.items ?? [])
      .filter(l => (l.code ?? '').toLowerCase().includes(keyword))
      .slice(0, 20)
      .map(l => ({
        label: l.code,
        value: l.code
      }))
  } catch (e) {
    console.error(e)
  } finally {
    locationLoading.value = false
  }
}

async function submitAddAllocation() {
  try {
    await allocFormRef.value?.validate()
  } catch {
    return
  }
  
  if (!currentShipment.value || !allocTargetLine.value) return
  
  allocating.value = true
  try {
    await salesShipmentApi.addAllocation({
      salesShipmentId: currentShipment.value.id,
      detailId: allocTargetLine.value.id,
      containerCode: allocForm.containerCode,
      locationCode: allocForm.locationCode,
      batchNo: allocForm.batchNo || '',
      sn: allocForm.sn || '',
      qty: allocForm.qty,
    })
    message.success('预留分配库存成功')
    addAllocVisible.value = false
    
    // Refresh drawer
    const refreshed = await salesShipmentApi.get(currentShipment.value.id)
    currentShipment.value = refreshed
    loadShipments() // Refresh main grid
  } catch (e) {
    message.error(e instanceof Error ? e.message : '分配失败')
  } finally {
    allocating.value = false
  }
}

async function handleRemoveAllocation(detailId: string, allocationId: string) {
  if (!currentShipment.value) return
  dialog.warning({
    title: '取消分配',
    content: '确定要取消并释放这条库存分配预留吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await salesShipmentApi.removeAllocation(currentShipment.value!.id, detailId, allocationId)
        message.success('取消分配成功')
        
        // Refresh drawer
        const refreshed = await salesShipmentApi.get(currentShipment.value!.id)
        currentShipment.value = refreshed
        loadShipments() // Refresh main grid
      } catch (e) {
        message.error(e instanceof Error ? e.message : '释放分配失败')
      }
    }
  })
}

function addItem() {
  createForm.items.push({
    lineNo: createForm.items.length + 1,
    productId: '',
    productCode: '',
    productName: '',
    unit: '',
    requiredQty: 1,
    remark: '',
  })
}

function removeItem(index: number) {
  createForm.items.splice(index, 1)
  // Re-index
  createForm.items.forEach((item, idx) => {
    item.lineNo = idx + 1
  })
}

async function loadShipments() {
  loading.value = true
  try {
    const page = pagination.page ?? 1
    const pageSize = pagination.pageSize ?? 10
    const result = await salesShipmentApi.getList({
      maxResultCount: pageSize,
      skipCount: (page - 1) * pageSize,
      shipmentNo: searchForm.shipmentNo || undefined,
      customerCode: searchForm.customerCode || undefined,
      status: searchForm.status ?? undefined,
    })
    shipments.value = result.items ?? []
    pagination.itemCount = result.totalCount ?? 0
  } finally {
    loading.value = false
  }
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadShipments()
}

function resetSearch() {
  searchForm.shipmentNo = ''
  searchForm.customerCode = ''
  searchForm.status = null
  pagination.page = 1
  loadShipments()
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

async function loadOpenSalesOrders() {
  try {
    // Open is 10
    const res = await salesOrderApi.getList({
      status: salesOrderApi.SalesOrderStatus.Open,
      maxResultCount: 1000
    })
    openSalesOrders.value = res.items ?? []
    openSalesOrderOptions.value = openSalesOrders.value.map(o => ({
      label: `${o.orderNo} - ${o.customerName}`,
      value: o.id
    }))
  } catch (e) {
    console.error(e)
  }
}

async function handleSalesOrderSelect(val: string | null) {
  if (!val) {
    createForm.sourceSalesOrderId = null
    createForm.sourceSalesOrderNo = ''
    createForm.customerId = ''
    createForm.deliveryContactName = ''
    createForm.deliveryPhone = ''
    createForm.deliveryAddress = ''
    createForm.items = []
    addItem()
    return
  }
  
  try {
    const fullOrder = await salesOrderApi.get(val)
    createForm.sourceSalesOrderId = val
    createForm.sourceSalesOrderNo = fullOrder.orderNo
    createForm.customerId = fullOrder.customerId
    createForm.deliveryContactName = ''
    createForm.deliveryPhone = ''
    createForm.deliveryAddress = ''
    createForm.remark = fullOrder.remark || ''
    
    createForm.items = fullOrder.details
      .filter(d => (d.qty - d.shippedQty) > 0)
      .map((d, idx) => ({
        sourceSalesOrderLineId: d.id,
        lineNo: idx + 1,
        productId: d.productId,
        productCode: d.productCode,
        productName: d.productName,
        unit: d.unit,
        requiredQty: d.qty - d.shippedQty,
        remark: d.remark || '',
      }))
      
    if (createForm.items.length === 0) {
      message.warning('该销售订单中的所有物料都已发货完成。')
    }
  } catch (e) {
    message.error('获取销售订单明细失败')
  }
}

async function openCreate() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const code = `SH${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
  
  createForm.shipmentNo = code
  createForm.sourceSalesOrderId = null
  createForm.sourceSalesOrderNo = ''
  createForm.customerId = ''
  createForm.deliveryContactName = ''
  createForm.deliveryPhone = ''
  createForm.deliveryAddress = ''
  createForm.remark = ''
  createForm.items = []
  addItem()
  
  loadOpenSalesOrders()
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
  
  const invalidItem = createForm.items.find(item => !item.productId || item.requiredQty <= 0)
  if (invalidItem) {
    message.warning('请确保明细选择物料且发货数量大于 0')
    return
  }

  creating.value = true
  try {
    await salesShipmentApi.create({
      shipmentNo: createForm.shipmentNo,
      sourceSalesOrderId: createForm.sourceSalesOrderId || undefined,
      sourceSalesOrderNo: createForm.sourceSalesOrderNo || undefined,
      customerId: createForm.customerId,
      deliveryContactName: createForm.deliveryContactName || undefined,
      deliveryPhone: createForm.deliveryPhone || undefined,
      deliveryAddress: createForm.deliveryAddress || undefined,
      remark: createForm.remark || undefined,
      details: createForm.items.map(item => ({
        sourceSalesOrderLineId: item.sourceSalesOrderLineId || undefined,
        lineNo: item.lineNo,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        requiredQty: item.requiredQty,
        remark: item.remark || undefined,
      }))
    })
    message.success('新建成功')
    createVisible.value = false
    loadShipments()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '新建失败')
  } finally {
    creating.value = false
  }
}

function openCreateWave() {
  waveForm.remark = ''
  waveVisible.value = true
}

async function submitCreateWave() {
  creatingWave.value = true
  try {
    await waveApi.create({
      salesShipmentIds: selectedRowKeys.value,
      remark: waveForm.remark || undefined,
    })
    message.success('创建波次成功')
    waveVisible.value = false
    selectedRowKeys.value = []
    loadShipments()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '创建波次失败')
  } finally {
    creatingWave.value = false
  }
}

async function handleDirectShip(row: salesShipmentApi.SalesShipmentDto) {
  dialog.warning({
    title: '一键发货',
    content: `确认直接对发货单 ${row.shipmentNo} 执行一键发货吗？这会直接出库扣减库存！`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await salesShipmentApi.approveAndExecute(row.id)
        message.success('发货成功')
        loadShipments()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '发货失败')
      }
    }
  })
}

function handleDelete(row: salesShipmentApi.SalesShipmentDto) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除发货单 ${row.shipmentNo} 吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await salesShipmentApi.deleteShipment(row.id)
        message.success('删除成功')
        loadShipments()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '删除失败')
      }
    }
  })
}

onMounted(() => {
  loadColumnSettings()
  loadShipments()
  loadCustomers()
})
</script>

<style scoped>
</style>
