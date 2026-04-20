<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NInput,
  NInputNumber,
  NProgress,
  NSelect,
  NSpin,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'

import * as productionInboundApi from '../../../../api/inbound/productionInbound'
import * as productApi from '../../../../api/masterData/product'
import * as containerApi from '../../../../api/masterData/container'
import * as locationApi from '../../../../api/masterData/location'
import * as warehouseApi from '../../../../api/masterData/warehouse'
import * as organizationUnitsApi from '../../../../api/identity/organizationUnits'
import { useAuthStore } from '../../../../stores/auth'
import BaseCrudPage from '../../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../../composables/useColumnConfig'
import { withResizable } from '../../../../utils/table'

const props = defineProps<{
  mode: 'create' | 'edit'
  inboundId?: string
}>()

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const detailSeed = ref(1)
const checkedDetailKeys = ref<string[]>([])
const warehouseLoading = ref(false)
const departmentLoading = ref(false)
const warehouses = ref<warehouseApi.WarehouseDto[]>([])
const departments = ref<Array<{ id: string; displayName: string; code?: string }>>([])
const productOptions = ref<SelectOption[]>([])
const productLoading = ref(false)
const containerOptions = ref<SelectOption[]>([])
const containerLoading = ref(false)
const locationOptions = ref<SelectOption[]>([])
const locationLoading = ref(false)
const productLookup = ref<Record<string, { id: string; code: string; name: string }>>({})
const containerLookup = ref<Record<string, { id: string; containerCode: string }>>({})
const locationLookup = ref<Record<string, { id: string; code: string }>>({})

const contextWarehouseId = computed(() => String(authStore.currentWarehouseId ?? '').trim())
const contextDepartmentId = computed(() => String(authStore.currentDepartmentId ?? '').trim())
const isTargetWarehouseLockedByContext = computed(() => props.mode === 'create' && Boolean(contextWarehouseId.value))
const isSourceDepartmentLockedByContext = computed(() => props.mode === 'create' && Boolean(contextDepartmentId.value))
const isEditMode = computed(() => props.mode === 'edit')

const headerLabelStyle = {
  width: '120px',
}

const headerContentStyle = {
  minWidth: '220px',
}

const formModel = reactive<productionInboundApi.ProductionInboundDto>({
  id: '',
  orderNo: '',
  sourceOrderNo: '',
  inboundType: productionInboundApi.ProductionInboundType.FinishedProduct,
  sourceDepartmentId: '',
  sourceDepartmentName: '',
  sourceDepartmentCode: '',
  targetWarehouseId: '',
  targetWarehouseName: '',
  targetWarehouseCode: '',
  status: productionInboundApi.ProductionInboundStatus.Draft,
  details: [],
})

type DetailDraftRow = productionInboundApi.ProductionInboundDetailDto

const detailRows = ref<DetailDraftRow[]>(formModel.details ?? [])

const inboundTypeOptions: SelectOption[] = [
  { label: '成品入库', value: productionInboundApi.ProductionInboundType.FinishedProduct },
  { label: '半成品入库', value: productionInboundApi.ProductionInboundType.SemiFinishedProduct },
  { label: '工序品/在制品入库', value: productionInboundApi.ProductionInboundType.WorkInProgress },
]

const warehouseOptions = computed<SelectOption[]>(() => warehouses.value.map((item) => ({
  label: item.code ? `${item.code}${item.name ? ` - ${item.name}` : ''}` : (item.name || '-'),
  value: item.id,
})))

const departmentOptions = computed<SelectOption[]>(() => departments.value.map((item) => ({
  label: item.code ? `${item.code}${item.displayName ? ` - ${item.displayName}` : ''}` : (item.displayName || '-'),
  value: item.id,
})))

const sourceDepartmentOptions = computed(() => {
  if (contextDepartmentId.value) {
    return departmentOptions.value.filter((item) => String(item.value) === contextDepartmentId.value)
  }
  return departmentOptions.value
})

const targetWarehouseOptions = computed(() => {
  if (contextWarehouseId.value) {
    return warehouseOptions.value.filter((item) => String(item.value) === contextWarehouseId.value)
  }
  return warehouseOptions.value
})

function flattenDepartments(nodes: Array<{ id: string; displayName: string; code?: string; children?: any[] }>) {
  const result: Array<{ id: string; displayName: string; code?: string }> = []
  const walk = (items: Array<{ id: string; displayName: string; code?: string; children?: any[] }>) => {
    for (const item of items) {
      result.push({ id: item.id, displayName: item.displayName, code: item.code })
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children)
      }
    }
  }
  walk(nodes)
  return result
}

function applySourceDepartmentSelection(id: string) {
  const target = departments.value.find((item) => item.id === id)
  formModel.sourceDepartmentId = id
  formModel.sourceDepartmentName = target?.displayName ?? ''
  formModel.sourceDepartmentCode = target?.code ?? ''
}

function applyTargetWarehouseSelection(id: string) {
  const target = warehouses.value.find((item) => item.id === id)
  formModel.targetWarehouseId = id
  formModel.targetWarehouseName = target?.name ?? ''
  formModel.targetWarehouseCode = target?.code ?? ''
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizeStatusValue(status: productionInboundApi.ProductionInboundStatus) {
  if (typeof status === 'string') {
    if (status === 'Draft' || status === '0') return productionInboundApi.ProductionInboundStatus.Draft
    if (status === 'InProgress' || status === '1') return productionInboundApi.ProductionInboundStatus.InProgress
    if (status === 'Completed' || status === '2') return productionInboundApi.ProductionInboundStatus.Completed
  }
  if (typeof status === 'number') return status
  return null
}

function resolveStatusLabel(status: productionInboundApi.ProductionInboundStatus) {
  const value = normalizeStatusValue(status)
  if (value === productionInboundApi.ProductionInboundStatus.Draft) return '草稿'
  if (value === productionInboundApi.ProductionInboundStatus.InProgress) return '作业中'
  if (value === productionInboundApi.ProductionInboundStatus.Completed) return '已完成'
  return '-'
}

function getStatusTagType(status: productionInboundApi.ProductionInboundStatus) {
  const value = normalizeStatusValue(status)
  if (value === productionInboundApi.ProductionInboundStatus.Draft) return 'default'
  if (value === productionInboundApi.ProductionInboundStatus.InProgress) return 'warning'
  if (value === productionInboundApi.ProductionInboundStatus.Completed) return 'success'
  return 'default'
}

function normalizeDetailStatusValue(status: productionInboundApi.ProductionInboundDetailStatus) {
  if (typeof status === 'string') {
    if (status === 'Pending' || status === '0') return productionInboundApi.ProductionInboundDetailStatus.Pending
    if (status === 'InProgress' || status === '1') return productionInboundApi.ProductionInboundDetailStatus.InProgress
    if (status === 'Completed' || status === '2') return productionInboundApi.ProductionInboundDetailStatus.Completed
  }
  if (typeof status === 'number') return status
  return null
}

const completedCount = computed(() => detailRows.value.filter((item) => normalizeDetailStatusValue(item.status) === productionInboundApi.ProductionInboundDetailStatus.Completed).length)
const detailTotalCount = computed(() => detailRows.value.length)
const progressPercentage = computed(() => {
  if (detailTotalCount.value <= 0) return 0
  return Math.round((completedCount.value / detailTotalCount.value) * 100)
})

function cloneDetailRow(row: DetailDraftRow): DetailDraftRow {
  return {
    ...row,
    actualLocationId: row.actualLocationId ?? '',
    weight: Number(row.weight ?? 0),
  }
}

function normalizeGuid(value: string | null | undefined): string {
  const text = String(value ?? '').trim()
  const guidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  if (guidPattern.test(text)) {
    return text
  }
  return '00000000-0000-0000-0000-000000000000'
}

function toRequiredGuid(value: string | null | undefined, fallback?: string | null | undefined): string {
  const normalized = normalizeGuid(value)
  if (normalized !== '00000000-0000-0000-0000-000000000000') {
    return normalized
  }
  return normalizeGuid(fallback)
}

function isValidGuid(value: string | null | undefined): boolean {
  return normalizeGuid(value) !== '00000000-0000-0000-0000-000000000000'
}

function safeTrim(value: unknown): string {
  return String(value ?? '').trim()
}

async function loadHeaderOptions() {
  loading.value = true
  warehouseLoading.value = true
  departmentLoading.value = true
  try {
    const [warehouseData, departmentTree] = await Promise.all([
      warehouseApi.getList({ maxResultCount: 1000, skipCount: 0 }),
      organizationUnitsApi.getTree(),
    ])

    warehouses.value = warehouseData.items ?? []
    departments.value = flattenDepartments(departmentTree.items ?? [])

    if (props.mode === 'create' && contextDepartmentId.value) {
      applySourceDepartmentSelection(contextDepartmentId.value)
    }

    if (props.mode === 'create' && contextWarehouseId.value) {
      applyTargetWarehouseSelection(contextWarehouseId.value)
      await loadLocationOptions()
    }
  } catch (e) {
    warehouses.value = []
    departments.value = []
    message.error(e instanceof Error ? e.message : '加载基础数据失败')
  } finally {
    warehouseLoading.value = false
    departmentLoading.value = false
    loading.value = false
  }
}

async function loadDetail() {
  if (!isEditMode.value) return
  const id = String(props.inboundId ?? '').trim()
  if (!id) {
    detailRows.value = []
    formModel.details = []
    return
  }

  loading.value = true
  try {
    const data = await productionInboundApi.getByOrderId(id)
    Object.assign(formModel, {
      ...data,
      id: String(data.id ?? ''),
      details: data.details ?? [],
    })
    detailRows.value = (data.details ?? []).map(cloneDetailRow)
    formModel.details = detailRows.value
    detailSeed.value = detailRows.value.length + 1
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载生产入库详情失败')
  } finally {
    loading.value = false
  }
}

async function loadProductOptions(keyword?: string) {
  productLoading.value = true
  try {
    const data = await productApi.getProductList({
      maxResultCount: 50,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    })
    const items = data.items ?? []
    const lookup: Record<string, { id: string; code: string; name: string }> = {}
    productOptions.value = items.map((item) => {
      const id = String(item.id ?? '')
      if (id) {
        lookup[id] = { id, code: item.code ?? '', name: item.name ?? '' }
      }
      return {
        label: item.code ? `${item.code}${item.name ? ` - ${item.name}` : ''}` : (item.name || '-'),
        value: id,
      }
    }).filter((item) => Boolean(item.value))
    productLookup.value = lookup
  } finally {
    productLoading.value = false
  }
}

async function loadContainerOptions(keyword?: string) {
  containerLoading.value = true
  try {
    const data = await containerApi.getList({
      maxResultCount: 50,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    })
    const items = data.items ?? []
    const lookup: Record<string, { id: string; containerCode: string }> = {}
    containerOptions.value = items.map((item) => {
      const id = String(item.id ?? '')
      if (id) {
        lookup[id] = { id, containerCode: item.containerCode ?? '' }
      }
      return {
        label: item.containerCode || '-',
        value: id,
      }
    }).filter((item) => Boolean(item.value))
    containerLookup.value = lookup
  } finally {
    containerLoading.value = false
  }
}

async function loadLocationOptions(keyword?: string) {
  const warehouseId = formModel.targetWarehouseId?.trim()
  if (!warehouseId) {
    locationOptions.value = []
    locationLookup.value = {}
    return
  }
  locationLoading.value = true
  try {
    const data = await locationApi.getLocationByWarehouseId(warehouseId)
    const source = data.items ?? []
    const filter = keyword?.trim().toLowerCase()
    const items = filter ? source.filter((item) => (item.code ?? '').toLowerCase().includes(filter)) : source
    const lookup: Record<string, { id: string; code: string }> = {}
    locationOptions.value = items.map((item) => {
      const id = String(item.id ?? '')
      if (id) {
        lookup[id] = { id, code: item.code ?? '' }
      }
      return {
        label: item.code || '-',
        value: id,
      }
    }).filter((item) => Boolean(item.value))
    locationLookup.value = lookup
  } finally {
    locationLoading.value = false
  }
}

function handleProductSearch(keyword: string) {
  loadProductOptions(keyword)
}

function handleContainerSearch(keyword: string) {
  loadContainerOptions(keyword)
}

function handleLocationSearch(keyword: string) {
  loadLocationOptions(keyword)
}

function handleBack() {
  router.push({ name: 'ProductionInboundManagement' })
}

function createEmptyDetailRow(): DetailDraftRow {
  const key = `detail-${detailSeed.value++}`
  return {
    id: key,
    productionInboundId: isEditMode.value ? String(formModel.id ?? '').trim() : '',
    productId: '',
    productCode: '',
    productName: '',
    batchNo: '',
    craftVersion: '',
    containerId: '',
    containerCode: '',
    qty: 0,
    unit: '',
    weight: 0,
    sn: '',
    layerIndex: 0,
    relatedOrderNo: '',
    relatedOrderNoLineNo: '',
    actualLocationId: '',
    actualLocationCode: '',
    status: productionInboundApi.ProductionInboundDetailStatus.Pending,
  }
}

function getDetailRowKey(row: DetailDraftRow) {
  return row.id
}

function updateDetailRow(rowKey: string, patch: Partial<DetailDraftRow>) {
  const target = detailRows.value.find((item) => item.id === rowKey)
  if (!target) return
  Object.assign(target, patch)
  formModel.details = detailRows.value
}

function syncActualLocationForSameContainer(rowKey: string, actualLocationId: string, actualLocationCode: string) {
  const sourceRow = detailRows.value.find((item) => item.id === rowKey)
  if (!sourceRow) return

  const sourceContainerId = String(sourceRow.containerId ?? '').trim()
  const sourceContainerCode = String(sourceRow.containerCode ?? '').trim()
  if (!sourceContainerId && !sourceContainerCode) {
    updateDetailRow(rowKey, {
      actualLocationId,
      actualLocationCode,
    })
    return
  }

  detailRows.value = detailRows.value.map((item) => {
    const currentContainerId = String(item.containerId ?? '').trim()
    const currentContainerCode = String(item.containerCode ?? '').trim()
    const isSameContainer = sourceContainerId
      ? currentContainerId === sourceContainerId
      : Boolean(sourceContainerCode && currentContainerCode === sourceContainerCode)

    if (!isSameContainer) {
      return item
    }

    return {
      ...item,
      actualLocationId,
      actualLocationCode,
    }
  })
  formModel.details = detailRows.value
}

function validateSameContainerLocationConsistency() {
  const locationByContainer = new Map<string, string>()
  for (const row of detailRows.value) {
    const containerKey = String(row.containerId ?? '').trim() || String(row.containerCode ?? '').trim()
    if (!containerKey) continue
    const locationKey = String(row.actualLocationId ?? '').trim() || String(row.actualLocationCode ?? '').trim()
    if (!locationByContainer.has(containerKey)) {
      locationByContainer.set(containerKey, locationKey)
      continue
    }
    if (locationByContainer.get(containerKey) !== locationKey) {
      message.warning('同一盘号的实际库位编码必须一致，请检查明细')
      return false
    }
  }
  return true
}

function handleAddDetail() {
  detailRows.value = [...detailRows.value, createEmptyDetailRow()]
  formModel.details = detailRows.value
}

function handleDeleteSelectedDetails() {
  if (checkedDetailKeys.value.length === 0) {
    message.warning('请至少选择一条明细')
    return
  }
  const selectedSet = new Set(checkedDetailKeys.value)
  detailRows.value = detailRows.value.filter((item) => !selectedSet.has(item.id))
  checkedDetailKeys.value = []
  formModel.details = detailRows.value
  message.success('已删除选中明细')
}

function inheritLocationFromSameContainer(rowId: string) {
  const currentRow = detailRows.value.find((item) => item.id === rowId)
  if (!currentRow) return
  const containerId = String(currentRow.containerId ?? '').trim()
  const containerCode = String(currentRow.containerCode ?? '').trim()
  if (!containerId && !containerCode) return

  const peer = detailRows.value.find((item) => {
    if (item.id === rowId) return false
    const peerContainerId = String(item.containerId ?? '').trim()
    const peerContainerCode = String(item.containerCode ?? '').trim()
    if (containerId) return peerContainerId === containerId
    return Boolean(containerCode && peerContainerCode === containerCode)
  })
  if (!peer) return

  syncActualLocationForSameContainer(
    rowId,
    String(peer.actualLocationId ?? '').trim(),
    String(peer.actualLocationCode ?? '').trim(),
  )
}

function handleCheckedDetailKeysUpdate(keys: Array<string | number>) {
  checkedDetailKeys.value = keys.map((key) => String(key))
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'production-inbound-detail-column-settings-v2',
  preferredKeys: [
    'productId',
    'productCode',
    'productName',
    'batchNo',
    'craftVersion',
    'containerId',
    'containerCode',
    'qty',
    'unit',
    'weight',
    'sn',
    'layerIndex',
    'relatedOrderNo',
    'relatedOrderNoLineNo',
    'actualLocationCode',
    'actualLocationId',
  ],
  defaultVisible: (key) => !key.toLowerCase().endsWith('id'),
  resolveTitle: (key) => {
    if (key === 'productId') return '物料ID'
    if (key === 'productCode') return '物料编码'
    if (key === 'productName') return '物料名称'
    if (key === 'batchNo') return '批次号'
    if (key === 'craftVersion') return '工艺版本'
    if (key === 'containerId') return '盘ID'
    if (key === 'containerCode') return '盘号'
    if (key === 'qty') return '数量'
    if (key === 'unit') return '单位'
    if (key === 'weight') return '重量'
    if (key === 'sn') return 'SN'
    if (key === 'layerIndex') return '层号'
    if (key === 'relatedOrderNo') return '关联单号'
    if (key === 'relatedOrderNoLineNo') return '关联行号'
    if (key === 'actualLocationCode') return '实际库位编码'
    if (key === 'actualLocationId') return '实入库位ID'
    return key
  },
})

const detailColumnMap: Record<string, DataTableColumns<DetailDraftRow>[number]> = {
  productId: {
    title: createDraggableTitle('productId', '物料ID'),
    key: 'productId',
    minWidth: 220,
    render: (row) => h(NInput, {
      value: row.productId,
      placeholder: '请输入物料ID',
      onUpdateValue: (value) => updateDetailRow(row.id, { productId: value }),
    }),
  },
  productCode: {
    title: createDraggableTitle('productCode', '物料编码'),
    key: 'productCode',
    minWidth: 220,
    render: (row) => h(NSelect, {
      value: row.productId || null,
      options: productOptions.value,
      filterable: true,
      remote: true,
      clearable: true,
      loading: productLoading.value,
      placeholder: '请选择物料编码',
      onSearch: handleProductSearch,
      onUpdateValue: (value: string | null) => {
        const id = value ? String(value) : ''
        const selected = id ? productLookup.value[id] : undefined
        updateDetailRow(row.id, {
          productId: id,
          productCode: selected?.code ?? '',
          productName: selected?.name ?? '',
        })
      },
    }),
  },
  productName: {
    title: createDraggableTitle('productName', '物料名称'),
    key: 'productName',
    minWidth: 180,
    render: (row) => row.productName ?? '-',
  },
  batchNo: {
    title: createDraggableTitle('batchNo', '批次号'),
    key: 'batchNo',
    minWidth: 180,
    render: (row) => h(NInput, {
      value: row.batchNo,
      placeholder: '请输入批次号',
      onUpdateValue: (value) => updateDetailRow(row.id, { batchNo: value }),
    }),
  },
  craftVersion: {
    title: createDraggableTitle('craftVersion', '工艺版本'),
    key: 'craftVersion',
    minWidth: 160,
    render: (row) => h(NInput, {
      value: row.craftVersion,
      placeholder: '请输入工艺版本',
      onUpdateValue: (value) => updateDetailRow(row.id, { craftVersion: value }),
    }),
  },
  containerId: {
    title: createDraggableTitle('containerId', '盘ID'),
    key: 'containerId',
    minWidth: 220,
    render: (row) => h(NInput, {
      value: row.containerId,
      placeholder: '请输入盘ID',
      onUpdateValue: (value) => updateDetailRow(row.id, { containerId: value }),
    }),
  },
  containerCode: {
    title: createDraggableTitle('containerCode', '盘号'),
    key: 'containerCode',
    minWidth: 180,
    render: (row) => h(NSelect, {
      value: row.containerId || null,
      options: containerOptions.value,
      filterable: true,
      remote: true,
      clearable: true,
      loading: containerLoading.value,
      placeholder: '请选择盘号',
      onSearch: handleContainerSearch,
      onUpdateValue: (value: string | null) => {
        const id = value ? String(value) : ''
        const selected = id ? containerLookup.value[id] : undefined
        updateDetailRow(row.id, {
          containerId: id,
          containerCode: selected?.containerCode ?? '',
        })
        inheritLocationFromSameContainer(row.id)
      },
    }),
  },
  qty: {
    title: createDraggableTitle('qty', '数量'),
    key: 'qty',
    width: 130,
    render: (row) => h(NInputNumber, {
      value: row.qty,
      min: 0,
      precision: 3,
      placeholder: '数量',
      onUpdateValue: (value) => updateDetailRow(row.id, { qty: Number(value ?? 0) }),
    }),
  },
  unit: {
    title: createDraggableTitle('unit', '单位'),
    key: 'unit',
    width: 120,
    render: (row) => h(NInput, {
      value: row.unit,
      placeholder: '单位',
      onUpdateValue: (value) => updateDetailRow(row.id, { unit: value }),
    }),
  },
  weight: {
    title: createDraggableTitle('weight', '重量'),
    key: 'weight',
    width: 130,
    render: (row) => h(NInputNumber, {
      value: row.weight,
      min: 0,
      precision: 3,
      clearable: true,
      placeholder: '重量',
      onUpdateValue: (value) => updateDetailRow(row.id, { weight: Number(value ?? 0) }),
    }),
  },
  sn: {
    title: createDraggableTitle('sn', 'SN'),
    key: 'sn',
    minWidth: 180,
    render: (row) => h(NInput, {
      value: row.sn,
      placeholder: '请输入SN',
      onUpdateValue: (value) => updateDetailRow(row.id, { sn: value }),
    }),
  },
  layerIndex: {
    title: createDraggableTitle('layerIndex', '层号'),
    key: 'layerIndex',
    width: 120,
    render: (row) => h(NInputNumber, {
      value: row.layerIndex,
      min: 0,
      precision: 0,
      placeholder: '层号',
      onUpdateValue: (value) => updateDetailRow(row.id, { layerIndex: Number(value ?? 0) }),
    }),
  },
  relatedOrderNo: {
    title: createDraggableTitle('relatedOrderNo', '关联单号'),
    key: 'relatedOrderNo',
    minWidth: 180,
    render: (row) => h(NInput, {
      value: row.relatedOrderNo,
      placeholder: '请输入关联单号',
      onUpdateValue: (value) => updateDetailRow(row.id, { relatedOrderNo: value }),
    }),
  },
  relatedOrderNoLineNo: {
    title: createDraggableTitle('relatedOrderNoLineNo', '关联行号'),
    key: 'relatedOrderNoLineNo',
    minWidth: 160,
    render: (row) => h(NInput, {
      value: row.relatedOrderNoLineNo,
      placeholder: '请输入关联行号',
      onUpdateValue: (value) => updateDetailRow(row.id, { relatedOrderNoLineNo: value }),
    }),
  },
  actualLocationId: {
    title: createDraggableTitle('actualLocationId', '实入库位ID'),
    key: 'actualLocationId',
    minWidth: 220,
    render: (row) => h(NInput, {
      value: row.actualLocationId,
      placeholder: '请输入实入库位ID',
      onUpdateValue: (value) => syncActualLocationForSameContainer(row.id, value || '', row.actualLocationCode || ''),
    }),
  },
  actualLocationCode: {
    title: createDraggableTitle('actualLocationCode', '实际库位编码'),
    key: 'actualLocationCode',
    minWidth: 220,
    render: (row) => h(NSelect, {
      value: row.actualLocationId || null,
      options: locationOptions.value,
      filterable: true,
      remote: true,
      clearable: true,
      loading: locationLoading.value,
      disabled: !formModel.targetWarehouseId,
      placeholder: formModel.targetWarehouseId ? '请选择实际库位' : '请先选择目标入库仓库',
      onSearch: handleLocationSearch,
      onUpdateValue: (value: string | null) => {
        const id = value ? String(value) : ''
        const selected = id ? locationLookup.value[id] : undefined
        syncActualLocationForSameContainer(row.id, id || '', selected?.code ?? '')
      },
    }),
  },
}

const detailColumns = computed<DataTableColumns<DetailDraftRow>>(() => withResizable(
  [
    {
      type: 'selection',
      fixed: 'left',
      width: 44,
    },
    ...columnSettings.value
      .filter((item) => item.visible)
      .map((item) => detailColumnMap[item.key])
      .filter((item): item is DataTableColumns<DetailDraftRow>[number] => Boolean(item)),
  ],
))

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleSourceDepartmentChange(value: string | null) {
  const id = value ? String(value) : ''
  if (isSourceDepartmentLockedByContext.value) {
    if (id !== contextDepartmentId.value) {
      applySourceDepartmentSelection(contextDepartmentId.value)
      message.warning('已选择当前作业部门，来源部门不允许修改')
    }
    return
  }
  applySourceDepartmentSelection(id)
}

async function handleTargetWarehouseChange(value: string | null) {
  const id = value ? String(value) : ''
  if (isTargetWarehouseLockedByContext.value) {
    if (id !== contextWarehouseId.value) {
      applyTargetWarehouseSelection(contextWarehouseId.value)
      message.warning('已选择当前作业仓库，目标入库仓库不允许修改')
    }
    return
  }
  if (formModel.targetWarehouseId !== id) {
    // Warehouse changed, existing selected actual locations may no longer belong to target warehouse.
    detailRows.value = detailRows.value.map((item) => ({
      ...item,
      actualLocationId: '',
      actualLocationCode: '',
    }))
    formModel.details = detailRows.value
  }
  applyTargetWarehouseSelection(id)
  await loadLocationOptions()
}

function trimFormFields() {
  formModel.sourceOrderNo = (formModel.sourceOrderNo ?? '').trim()
}

function validateForm() {
  if (!formModel.sourceOrderNo) {
    message.warning('来源单号不能为空')
    return false
  }
  if (formModel.sourceOrderNo.length > 64) {
    message.warning('来源单号长度不能超过64位')
    return false
  }
  if (formModel.inboundType === null || formModel.inboundType === undefined || formModel.inboundType === '') {
    message.warning('请选择生产入库类型')
    return false
  }
  if (!formModel.sourceDepartmentId) {
    message.warning('来源部门不能为空')
    return false
  }
  if (!formModel.targetWarehouseId) {
    message.warning('目标入库仓库不能为空')
    return false
  }
  return true
}

async function handleSave() {
  if (saving.value) return
  trimFormFields()

  if (!validateForm()) {
    return
  }

  if (!validateSameContainerLocationConsistency()) {
    return
  }

  const dtoInboundId = String(formModel.id ?? '').trim()

  if (isEditMode.value && !isValidGuid(dtoInboundId)) {
    message.warning('单据ID无效，无法保存')
    return
  }

  const invalidDetailIndex = detailRows.value.findIndex((item) => {
    if (isEditMode.value) {
      const productionInboundId = toRequiredGuid(item.productionInboundId, dtoInboundId)
      if (!isValidGuid(productionInboundId)) return true
    }
    return !isValidGuid(item.productId)
      || !isValidGuid(item.containerId)
      || !isValidGuid(item.actualLocationId)
  })
  if (invalidDetailIndex >= 0) {
    message.warning(`第${invalidDetailIndex + 1}条明细存在无效Guid字段，请检查物料ID/盘ID/实入库位ID`) 
    return
  }

  saving.value = true
  try {
    formModel.details = detailRows.value

    if (isEditMode.value) {
      const payload: productionInboundApi.ProductionInboundDto = {
        ...formModel,
        id: dtoInboundId,
        sourceOrderNo: safeTrim(formModel.sourceOrderNo),
        inboundType: formModel.inboundType,
        sourceDepartmentId: formModel.sourceDepartmentId,
        targetWarehouseId: formModel.targetWarehouseId,
        details: detailRows.value.map((item) => ({
          ...item,
          id: normalizeGuid(item.id),
          productionInboundId: toRequiredGuid(item.productionInboundId, dtoInboundId),
          productId: toRequiredGuid(item.productId),
          productCode: safeTrim(item.productCode),
          productName: safeTrim(item.productName),
          batchNo: safeTrim(item.batchNo),
          craftVersion: safeTrim(item.craftVersion),
          containerId: toRequiredGuid(item.containerId),
          containerCode: toRequiredGuid(item.containerCode, item.containerId),
          qty: Number(item.qty ?? 0),
          unit: safeTrim(item.unit),
          weight: Number(item.weight ?? 0),
          sn: safeTrim(item.sn),
          layerIndex: Number(item.layerIndex ?? 0),
          relatedOrderNo: safeTrim(item.relatedOrderNo),
          relatedOrderNoLineNo: safeTrim(item.relatedOrderNoLineNo),
          actualLocationId: toRequiredGuid(item.actualLocationId),
          actualLocationCode: safeTrim(item.actualLocationCode),
        })),
      }

      const updated = await productionInboundApi.update(payload)
      Object.assign(formModel, {
        ...updated,
        details: updated.details ?? [],
      })
      detailRows.value = (updated.details ?? []).map(cloneDetailRow)
      formModel.details = detailRows.value
      message.success('修改生产入库成功')
    } else {
      const normalizedDetails: productionInboundApi.CreateProductionInboundDetailDto[] = detailRows.value.map((item) => ({
        productId: toRequiredGuid(item.productId),
        batchNo: safeTrim(item.batchNo),
        craftVersion: safeTrim(item.craftVersion),
        containerId: toRequiredGuid(item.containerId),
        qty: Number(item.qty ?? 0),
        unit: safeTrim(item.unit),
        weight: Number(item.weight ?? 0),
        sn: safeTrim(item.sn),
        layerIndex: Number(item.layerIndex ?? 0),
        relatedOrderNo: safeTrim(item.relatedOrderNo),
        relatedOrderNoLineNo: safeTrim(item.relatedOrderNoLineNo),
        actualLocationId: toRequiredGuid(item.actualLocationId),
      }))

      const payload: productionInboundApi.CreateProductionInboundDto = {
        sourceOrderNo: formModel.sourceOrderNo,
        inboundType: formModel.inboundType,
        sourceDepartmentId: formModel.sourceDepartmentId,
        targetWarehouseId: formModel.targetWarehouseId,
        details: normalizedDetails.length > 0 ? normalizedDetails : undefined,
      }

      await productionInboundApi.create(payload)
      message.success('新增生产入库成功')
      router.push({ name: 'ProductionInboundManagement' })
      return
    }

    router.push({ name: 'ProductionInboundManagement' })
  } catch (e) {
    message.error(e instanceof Error ? e.message : (isEditMode.value ? '修改生产入库失败' : '新增生产入库失败'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadColumnSettings()
  loadProductOptions()
  loadContainerOptions()
  loadHeaderOptions().then(() => {
    if (isEditMode.value) {
      loadDetail()
    }
  })
})

watch(
  () => formModel.targetWarehouseId,
  () => {
    loadLocationOptions()
  },
)

watch(
  () => [props.mode, props.inboundId],
  () => {
    if (isEditMode.value && String(props.inboundId ?? '').trim()) {
      loadDetail()
    }
  },
)
</script>

<template>
  <div>
    <BaseCrudPage :search-collapsible="false">
      <template #search>
        <div class="detail-header-wrap">
          <div class="header-action-bar">
            <n-button @click="handleBack">返回列表</n-button>
            <n-button v-if="isEditMode" :loading="loading" @click="loadDetail">刷新</n-button>
            <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
          </div>

          <n-spin :show="loading">
            <n-descriptions
              class="transfer-header-descriptions"
              bordered
              label-placement="left"
              :column="3"
              :label-style="headerLabelStyle"
              :content-style="headerContentStyle"
              style="margin-top: 10px;"
            >
              <n-descriptions-item label="入库单号">
                {{ formModel.orderNo || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="来源单号">
                <n-input
                  :value="formModel.sourceOrderNo"
                  placeholder="请输入来源单号"
                  maxlength="64"
                  clearable
                  @update:value="(value) => { formModel.sourceOrderNo = value }"
                />
              </n-descriptions-item>
              <n-descriptions-item label="创建时间">
                {{ formatDateTime(formModel.creationTime) }}
              </n-descriptions-item>
              <n-descriptions-item label="入库类型">
                <n-select
                  :value="formModel.inboundType"
                  :options="inboundTypeOptions"
                  placeholder="请选择入库类型"
                  @update:value="(value) => { formModel.inboundType = value }"
                />
              </n-descriptions-item>
              <n-descriptions-item label="来源部门">
                <n-select
                  :value="formModel.sourceDepartmentId"
                  :options="sourceDepartmentOptions"
                  :loading="departmentLoading"
                  :disabled="isSourceDepartmentLockedByContext"
                  :clearable="!isSourceDepartmentLockedByContext"
                  :placeholder="isSourceDepartmentLockedByContext ? '来源部门已锁定' : '请选择来源部门'"
                  filterable
                  @update:value="handleSourceDepartmentChange"
                />
              </n-descriptions-item>
              <n-descriptions-item label="目标入库仓库">
                <n-select
                  :value="formModel.targetWarehouseId"
                  :options="targetWarehouseOptions"
                  :loading="warehouseLoading"
                  :disabled="isTargetWarehouseLockedByContext"
                  :clearable="!isTargetWarehouseLockedByContext"
                  :placeholder="isTargetWarehouseLockedByContext ? '目标入库仓库已锁定' : '请选择目标入库仓库'"
                  filterable
                  @update:value="handleTargetWarehouseChange"
                />
              </n-descriptions-item>
              <n-descriptions-item label="状态">
                <n-tag size="small" :type="getStatusTagType(formModel.status)">{{ resolveStatusLabel(formModel.status) }}</n-tag>
              </n-descriptions-item>
            </n-descriptions>

            <div class="detail-progress-wrap">
              <n-text class="detail-progress-label">总体进度</n-text>
              <n-progress
                class="detail-progress-bar"
                type="line"
                :percentage="progressPercentage"
                :height="14"
                :show-indicator="false"
                :border-radius="8"
                :fill-border-radius="8"
                status="success"
              />
              <n-text depth="3" class="detail-progress-meta">
                {{ progressPercentage }}%（已完成: {{ completedCount }}/{{ detailTotalCount }} 条）
              </n-text>
            </div>
          </n-spin>
        </div>
      </template>

      <template #actions-left>
        <div class="crud-action-main">
          <n-button type="primary" secondary @click="handleAddDetail">新增明细</n-button>
          <n-button type="error" secondary :disabled="checkedDetailKeys.length === 0" @click="handleDeleteSelectedDetails">删除选中</n-button>
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
          :columns="detailColumns"
          :data="detailRows"
          :bordered="false"
          :row-key="getDetailRowKey"
          :checked-row-keys="checkedDetailKeys"
          @update:checked-row-keys="handleCheckedDetailKeysUpdate"
        >
          <template #empty>
            <n-empty description="暂无入库明细" />
          </template>
        </n-data-table>
      </template>
    </BaseCrudPage>
  </div>
</template>

<style scoped>
.detail-header-wrap {
  width: 100%;
}

.header-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transfer-header-descriptions :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.transfer-header-descriptions :deep(.n-descriptions-table-header) {
  width: 120px;
}

.detail-progress-wrap {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.detail-progress-label {
  font-weight: 600;
  white-space: nowrap;
}

.detail-progress-bar {
  min-width: 200px;
}

.detail-progress-meta {
  white-space: nowrap;
}
</style>
