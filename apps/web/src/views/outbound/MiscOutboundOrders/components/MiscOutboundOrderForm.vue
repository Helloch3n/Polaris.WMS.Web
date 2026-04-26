<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'

import * as miscOutboundOrderApi from '../../../../api/outbound/MiscOutboundOrders/miscOutboundOrders'
import * as accountAliasApi from '../../../../api/masterData/accountAlias'
import * as containerApi from '../../../../api/masterData/container'
import * as costCenterApi from '../../../../api/masterData/costCenter'
import * as inventoryApi from '../../../../api/masterData/inventory'
import * as locationApi from '../../../../api/masterData/location'
import * as productApi from '../../../../api/masterData/product'
import * as warehouseApi from '../../../../api/masterData/warehouse'
import BaseCrudPage from '../../../../components/BaseCrudPage.vue'
import { withResizable } from '../../../../utils/table'

const props = defineProps<{
  mode: 'create' | 'edit'
  orderId?: string
}>()

type DetailRow = miscOutboundOrderApi.MiscOutboundOrderDetailDto & {
  inventoryId?: string
}
type InventoryRow = inventoryApi.Inventory

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'

const router = useRouter()
const message = useMessage()

const loading = ref(false)
const saving = ref(false)
const warehouseLoading = ref(false)
const containerLoading = ref(false)
const productLoading = ref(false)
const accountAliasLoading = ref(false)
const costCenterLoading = ref(false)
const detailSeed = ref(1)
const activeTab = ref<'header' | 'details'>('header')
const checkedDetailRowKeys = ref<string[]>([])
const warehouses = ref<warehouseApi.WarehouseDto[]>([])
const containerOptions = ref<SelectOption[]>([])
const productOptions = ref<SelectOption[]>([])
const accountAliasOptions = ref<SelectOption[]>([])
const costCenterOptions = ref<SelectOption[]>([])
const locationOptionsByWarehouse = ref<Record<string, SelectOption[]>>({})
const locationLoadingByWarehouse = ref<Record<string, boolean>>({})
const containerLookup = ref<Record<string, { id: string; containerCode: string }>>({})
const productLookup = ref<Record<string, { id: string; code: string; name: string; unit: string }>>({})
const accountAliasLookup = ref<Record<string, { id: string; alias: string; description: string }>>({})
const costCenterLookup = ref<Record<string, { id: string; code: string; name: string }>>({})
const locationLookupByWarehouse = ref<Record<string, Record<string, { id: string; code: string }>>>({})
const inventoryModalVisible = ref(false)
const inventoryLoading = ref(false)
const inventoryAdding = ref(false)
const inventoryRows = ref<InventoryRow[]>([])
const checkedInventoryRowKeys = ref<string[]>([])

const inventoryQuery = reactive({
  containerNo: '',
  productId: '',
  relatedOrderNo: '',
  warehouseCode: '',
  zoneCode: '',
  page: 1,
  pageSize: 10,
  total: 0,
})

const formModel = reactive<miscOutboundOrderApi.MiscOutboundOrderDto>({
  id: EMPTY_GUID,
  orderNo: '',
  accountAliasId: '',
  accountAliasDescription: '',
  costCenterId: '',
  costCenterCode: '',
  costCenterName: '',
  type: miscOutboundOrderApi.MiscOperationType.Outbound,
  status: miscOutboundOrderApi.MiscOrderStatus.Draft,
  remark: '',
  details: [],
})

const detailRows = ref<DetailRow[]>([])

const isEditMode = computed(() => props.mode === 'edit')
const isCreateMode = computed(() => props.mode === 'create')
const pageTagText = computed(() => (isEditMode.value ? '编辑模式' : '新增模式'))

const headerLabelStyle = {
  width: '120px',
}

const headerContentStyle = {
  minWidth: '220px',
}

const warehouseOptions = computed<SelectOption[]>(() =>
  warehouses.value.map((item) => ({
    label: item.code ? `${item.code}${item.name ? ` - ${item.name}` : ''}` : (item.name || '-'),
    value: item.id,
  })),
)

const inventoryListParams = computed<inventoryApi.GetInventoryListParams>(() => ({
  maxResultCount: inventoryQuery.pageSize,
  skipCount: (inventoryQuery.page - 1) * inventoryQuery.pageSize,
  containerNo: inventoryQuery.containerNo.trim() || undefined,
  containerCode: inventoryQuery.containerNo.trim() || undefined,
  productId: inventoryQuery.productId.trim() || undefined,
  relatedOrderNo: inventoryQuery.relatedOrderNo.trim() || undefined,
  warehouseCode: inventoryQuery.warehouseCode.trim() || undefined,
  zoneCode: inventoryQuery.zoneCode.trim() || undefined,
}))

const selectedInventoryRows = computed(() => {
  const selectedSet = new Set(checkedInventoryRowKeys.value)
  return inventoryRows.value.filter((row) => selectedSet.has(String(row.id ?? '')))
})

function normalizeOperationTypeValue(value: miscOutboundOrderApi.MiscOperationType) {
  if (typeof value === 'string') {
    if (value === 'Inbound' || value === '1') return miscOutboundOrderApi.MiscOperationType.Inbound
    if (value === 'Outbound' || value === '2') return miscOutboundOrderApi.MiscOperationType.Outbound
  }
  if (typeof value === 'number') {
    return value
  }
  return null
}

function resolveOperationTypeLabel(value: miscOutboundOrderApi.MiscOperationType) {
  const normalized = normalizeOperationTypeValue(value)
  if (normalized === miscOutboundOrderApi.MiscOperationType.Inbound) return '入库'
  if (normalized === miscOutboundOrderApi.MiscOperationType.Outbound) return '出库'
  return '-'
}

function getOperationTypeTagType(value: miscOutboundOrderApi.MiscOperationType) {
  const normalized = normalizeOperationTypeValue(value)
  if (normalized === miscOutboundOrderApi.MiscOperationType.Inbound) return 'success'
  if (normalized === miscOutboundOrderApi.MiscOperationType.Outbound) return 'warning'
  return 'default'
}

function normalizeStatusValue(value: miscOutboundOrderApi.MiscOrderStatus) {
  if (typeof value === 'string') {
    if (value === 'Draft' || value === '0') return miscOutboundOrderApi.MiscOrderStatus.Draft
    if (value === 'Executed' || value === '1') return miscOutboundOrderApi.MiscOrderStatus.Executed
  }
  if (typeof value === 'number') {
    return value
  }
  return null
}

function isDraftStatus(value: miscOutboundOrderApi.MiscOrderStatus) {
  return normalizeStatusValue(value) === miscOutboundOrderApi.MiscOrderStatus.Draft
}

function resolveStatusLabel(value: miscOutboundOrderApi.MiscOrderStatus) {
  const normalized = normalizeStatusValue(value)
  if (normalized === miscOutboundOrderApi.MiscOrderStatus.Draft) return '草稿'
  if (normalized === miscOutboundOrderApi.MiscOrderStatus.Executed) return '已执行'
  return '-'
}

function getStatusTagType(value: miscOutboundOrderApi.MiscOrderStatus) {
  const normalized = normalizeStatusValue(value)
  if (normalized === miscOutboundOrderApi.MiscOrderStatus.Draft) return 'warning'
  if (normalized === miscOutboundOrderApi.MiscOrderStatus.Executed) return 'success'
  return 'default'
}

function isGuid(value: string | null | undefined) {
  const text = String(value ?? '').trim()
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(text)
}

function normalizeGuid(value: string | null | undefined) {
  const text = String(value ?? '').trim()
  if (isGuid(text)) {
    return text
  }
  return EMPTY_GUID
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function normalizeInventoryContainerNo(row: InventoryRow) {
  const record = row as InventoryRow & {
    ContainerNo?: unknown
    containerCode?: unknown
    ContainerCode?: unknown
    reelNo?: unknown
    ReelNo?: unknown
  }
  const raw = row.containerNo
    ?? record.ContainerNo
    ?? row.containerCode
    ?? record.containerCode
    ?? record.ContainerCode
    ?? row.reelNo
    ?? record.reelNo
    ?? record.ReelNo
  if (typeof raw === 'string') return raw.trim()
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  return ''
}

function normalizeInventorySn(row: InventoryRow) {
  const raw = row.sn ?? row.SN
  return typeof raw === 'string' ? raw.trim() : ''
}

function isDetailRowEmpty(row: DetailRow) {
  return !String(row.warehouseId ?? '').trim()
    && !String(row.locationId ?? '').trim()
    && !String(row.containerId ?? '').trim()
    && !String(row.productId ?? '').trim()
    && !String(row.sn ?? '').trim()
    && !String(row.batchNo ?? '').trim()
    && !String(row.craftVersion ?? '').trim()
    && !String(row.unit ?? '').trim()
    && Number(row.qty ?? 0) <= 0
    && !String(row.remark ?? '').trim()
}

function getDetailDedupKey(row: DetailRow) {
  return [
    String(row.warehouseId ?? '').trim(),
    String(row.locationId ?? '').trim(),
    String(row.containerId ?? '').trim(),
    String(row.productId ?? '').trim(),
    String(row.batchNo ?? '').trim(),
    String(row.sn ?? '').trim(),
    String(row.craftVersion ?? '').trim(),
  ].join('|')
}

function findWarehouseByCode(warehouseCode: string) {
  const targetCode = String(warehouseCode ?? '').trim()
  if (!targetCode) return undefined
  return warehouses.value.find((item) => String(item.code ?? '').trim() === targetCode)
}

function mergeSelectOptions(current: SelectOption[], incoming: SelectOption[]) {
  const merged = new Map<string, SelectOption>()
  for (const option of current) {
    merged.set(String(option.value), option)
  }
  for (const option of incoming) {
    merged.set(String(option.value), option)
  }
  return Array.from(merged.values())
}

function setLocationLoading(warehouseId: string, loadingValue: boolean) {
  locationLoadingByWarehouse.value = {
    ...locationLoadingByWarehouse.value,
    [warehouseId]: loadingValue,
  }
}

function setLocationOptions(warehouseId: string, options: SelectOption[]) {
  const existing = locationOptionsByWarehouse.value[warehouseId] ?? []
  locationOptionsByWarehouse.value = {
    ...locationOptionsByWarehouse.value,
    [warehouseId]: mergeSelectOptions(existing, options),
  }
}

function setLocationLookup(warehouseId: string, lookup: Record<string, { id: string; code: string }>) {
  const existing = locationLookupByWarehouse.value[warehouseId] ?? {}
  locationLookupByWarehouse.value = {
    ...locationLookupByWarehouse.value,
    [warehouseId]: {
      ...existing,
      ...lookup,
    },
  }
}

function ensureWarehouseOptionByRow(row: DetailRow) {
  if (!row.warehouseId) return
  if (warehouses.value.some((item) => item.id === row.warehouseId)) return
  warehouses.value = [
    ...warehouses.value,
    {
      id: row.warehouseId,
      code: row.warehouseCode || '',
      name: row.warehouseName || '',
    },
  ]
}

function ensureContainerOptionByRow(row: DetailRow) {
  if (!row.containerId) return
  containerLookup.value[row.containerId] = {
    id: row.containerId,
    containerCode: row.containerCode || row.containerId,
  }
  const option: SelectOption = {
    label: row.containerCode || row.containerId,
    value: row.containerId,
  }
  containerOptions.value = mergeSelectOptions(containerOptions.value, [option])
}

function ensureProductOptionByRow(row: DetailRow) {
  if (!row.productId) return
  const label = row.productCode
    ? `${row.productCode}${row.productName ? ` - ${row.productName}` : ''}`
    : (row.productName || row.productId)
  productLookup.value[row.productId] = {
    id: row.productId,
    code: row.productCode || '',
    name: row.productName || '',
    unit: row.unit || '',
  }
  const option: SelectOption = {
    label,
    value: row.productId,
  }
  productOptions.value = mergeSelectOptions(productOptions.value, [option])
}

function ensureLocationOptionByRow(row: DetailRow) {
  if (!row.warehouseId || !row.locationId) return
  const option: SelectOption = {
    label: row.locationCode || row.locationId,
    value: row.locationId,
  }
  setLocationOptions(row.warehouseId, [option])
  setLocationLookup(row.warehouseId, {
    [row.locationId]: {
      id: row.locationId,
      code: row.locationCode || row.locationId,
    },
  })
}

async function loadWarehouseOptions() {
  warehouseLoading.value = true
  try {
    const data = await warehouseApi.getList({ maxResultCount: 1000, skipCount: 0 })
    warehouses.value = data.items ?? []
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载仓库数据失败')
  } finally {
    warehouseLoading.value = false
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
    const incomingOptions: SelectOption[] = []
    const incomingLookup: Record<string, { id: string; containerCode: string }> = {}
    for (const item of data.items ?? []) {
      const id = String(item.id ?? '').trim()
      if (!id) continue
      incomingLookup[id] = {
        id,
        containerCode: item.containerCode || id,
      }
      incomingOptions.push({
        label: item.containerCode || id,
        value: id,
      })
    }
    containerLookup.value = {
      ...containerLookup.value,
      ...incomingLookup,
    }
    containerOptions.value = mergeSelectOptions(containerOptions.value, incomingOptions)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载容器数据失败')
  } finally {
    containerLoading.value = false
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
    const incomingOptions: SelectOption[] = []
    const incomingLookup: Record<string, { id: string; code: string; name: string; unit: string }> = {}
    for (const item of data.items ?? []) {
      const id = String(item.id ?? '').trim()
      if (!id) continue
      incomingLookup[id] = {
        id,
        code: item.code || '',
        name: item.name || '',
        unit: item.unit || '',
      }
      incomingOptions.push({
        label: item.code ? `${item.code}${item.name ? ` - ${item.name}` : ''}` : (item.name || id),
        value: id,
      })
    }
    productLookup.value = {
      ...productLookup.value,
      ...incomingLookup,
    }
    productOptions.value = mergeSelectOptions(productOptions.value, incomingOptions)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载物料数据失败')
  } finally {
    productLoading.value = false
  }
}

function formatCostCenterLabel(code: string, name: string, fallback: string) {
  const trimmedCode = String(code ?? '').trim()
  const trimmedName = String(name ?? '').trim()
  if (trimmedCode && trimmedName) return `${trimmedCode} - ${trimmedName}`
  return trimmedCode || trimmedName || fallback
}

async function loadAccountAliasOptions(keyword?: string) {
  accountAliasLoading.value = true
  try {
    const data = await accountAliasApi.getList({
      maxResultCount: 50,
      skipCount: 0,
      alias: keyword?.trim() || undefined,
    })
    const incomingOptions: SelectOption[] = []
    const incomingLookup: Record<string, { id: string; alias: string; description: string }> = {}
    for (const item of data.items ?? []) {
      const id = String(item.id ?? '').trim()
      if (!id) continue
      incomingLookup[id] = {
        id,
        alias: item.alias || id,
        description: item.description || '',
      }
      incomingOptions.push({
        label: item.alias || id,
        value: id,
      })
    }
    accountAliasLookup.value = {
      ...accountAliasLookup.value,
      ...incomingLookup,
    }
    accountAliasOptions.value = mergeSelectOptions(accountAliasOptions.value, incomingOptions)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载账户别名数据失败')
  } finally {
    accountAliasLoading.value = false
  }
}

async function loadCostCenterOptions(keyword?: string) {
  costCenterLoading.value = true
  try {
    const data = await costCenterApi.getList({
      maxResultCount: 50,
      skipCount: 0,
      code: keyword?.trim() || undefined,
    })
    const incomingOptions: SelectOption[] = []
    const incomingLookup: Record<string, { id: string; code: string; name: string }> = {}
    for (const item of data.items ?? []) {
      const id = String(item.id ?? '').trim()
      if (!id) continue
      const code = String(item.code ?? '').trim()
      const name = String(item.name ?? '').trim()
      incomingLookup[id] = {
        id,
        code,
        name,
      }
      incomingOptions.push({
        label: formatCostCenterLabel(code, name, id),
        value: id,
      })
    }
    costCenterLookup.value = {
      ...costCenterLookup.value,
      ...incomingLookup,
    }
    costCenterOptions.value = mergeSelectOptions(costCenterOptions.value, incomingOptions)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载成本中心数据失败')
  } finally {
    costCenterLoading.value = false
  }
}

async function ensureAccountAliasOptionById(id: string, fallbackDescription?: string) {
  const trimmedId = String(id ?? '').trim()
  if (!trimmedId) return
  if (accountAliasLookup.value[trimmedId]) return
  try {
    const data = await accountAliasApi.get(trimmedId)
    const alias = String(data.alias ?? '').trim() || trimmedId
    const description = String(data.description ?? '').trim()
    accountAliasLookup.value = {
      ...accountAliasLookup.value,
      [trimmedId]: {
        id: trimmedId,
        alias,
        description,
      },
    }
    accountAliasOptions.value = mergeSelectOptions(accountAliasOptions.value, [{ label: alias, value: trimmedId }])
    if (!formModel.accountAliasDescription && description) {
      formModel.accountAliasDescription = description
    }
    return
  } catch {
    // 降级使用单据已返回信息，避免下拉缺少当前值
  }
  const fallbackLabel = String(fallbackDescription ?? '').trim() || trimmedId
  accountAliasLookup.value = {
    ...accountAliasLookup.value,
    [trimmedId]: {
      id: trimmedId,
      alias: fallbackLabel,
      description: String(fallbackDescription ?? '').trim(),
    },
  }
  accountAliasOptions.value = mergeSelectOptions(accountAliasOptions.value, [{ label: fallbackLabel, value: trimmedId }])
}

async function ensureCostCenterOptionById(id: string, fallbackCode?: string, fallbackName?: string) {
  const trimmedId = String(id ?? '').trim()
  if (!trimmedId) return
  if (costCenterLookup.value[trimmedId]) return
  try {
    const data = await costCenterApi.get(trimmedId)
    const code = String(data.code ?? '').trim()
    const name = String(data.name ?? '').trim()
    costCenterLookup.value = {
      ...costCenterLookup.value,
      [trimmedId]: {
        id: trimmedId,
        code,
        name,
      },
    }
    costCenterOptions.value = mergeSelectOptions(costCenterOptions.value, [{
      label: formatCostCenterLabel(code, name, trimmedId),
      value: trimmedId,
    }])
    if (!formModel.costCenterCode && code) formModel.costCenterCode = code
    if (!formModel.costCenterName && name) formModel.costCenterName = name
    return
  } catch {
    // 降级使用单据已返回信息，避免下拉缺少当前值
  }
  const code = String(fallbackCode ?? '').trim()
  const name = String(fallbackName ?? '').trim()
  costCenterLookup.value = {
    ...costCenterLookup.value,
    [trimmedId]: {
      id: trimmedId,
      code,
      name,
    },
  }
  costCenterOptions.value = mergeSelectOptions(costCenterOptions.value, [{
    label: formatCostCenterLabel(code, name, trimmedId),
    value: trimmedId,
  }])
}

async function loadLocationOptionsByWarehouse(warehouseId: string, warehouseCode: string, keyword?: string) {
  if (!warehouseId) return
  setLocationLoading(warehouseId, true)
  try {
    const data = await locationApi.getList({
      maxResultCount: 50,
      skipCount: 0,
      locationCode: keyword?.trim() || undefined,
      warehouseCode: warehouseCode || undefined,
    })
    const incomingOptions: SelectOption[] = []
    const incomingLookup: Record<string, { id: string; code: string }> = {}
    for (const item of data.items ?? []) {
      const id = String(item.id ?? '').trim()
      if (!id) continue
      incomingLookup[id] = {
        id,
        code: item.code || id,
      }
      incomingOptions.push({
        label: item.code || id,
        value: id,
      })
    }
    setLocationLookup(warehouseId, incomingLookup)
    setLocationOptions(warehouseId, incomingOptions)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载库位数据失败')
  } finally {
    setLocationLoading(warehouseId, false)
  }
}

function getLocationOptions(row: DetailRow) {
  if (!row.warehouseId) return []
  return locationOptionsByWarehouse.value[row.warehouseId] ?? []
}

function getLocationLoading(row: DetailRow) {
  if (!row.warehouseId) return false
  return Boolean(locationLoadingByWarehouse.value[row.warehouseId])
}

function handleWarehouseChange(rowId: string, warehouseId: string) {
  const target = warehouses.value.find((item) => item.id === warehouseId)
  updateDetailRow(rowId, {
    warehouseId,
    warehouseCode: target?.code ?? '',
    warehouseName: target?.name ?? '',
    locationId: '',
    locationCode: '',
  })
  if (warehouseId) {
    loadLocationOptionsByWarehouse(warehouseId, target?.code ?? '')
  }
}

function handleLocationChange(row: DetailRow, rowId: string, locationId: string) {
  const locationLookup = locationLookupByWarehouse.value[row.warehouseId] ?? {}
  const target = locationLookup[locationId]
  updateDetailRow(rowId, {
    locationId,
    locationCode: target?.code ?? '',
  })
}

function handleContainerChange(rowId: string, containerId: string) {
  const target = containerLookup.value[containerId]
  updateDetailRow(rowId, {
    containerId,
    containerCode: target?.containerCode ?? '',
  })
}

function handleProductChange(rowId: string, productId: string) {
  const target = productLookup.value[productId]
  updateDetailRow(rowId, {
    productId,
    productCode: target?.code ?? '',
    productName: target?.name ?? '',
    unit: target?.unit || '',
  })
}

function handleAccountAliasChange(value: string) {
  const accountAliasId = String(value ?? '').trim()
  const target = accountAliasLookup.value[accountAliasId]
  formModel.accountAliasId = accountAliasId
  formModel.accountAliasDescription = target?.description ?? ''
}

function handleCostCenterChange(value: string) {
  const costCenterId = String(value ?? '').trim()
  const target = costCenterLookup.value[costCenterId]
  formModel.costCenterId = costCenterId
  formModel.costCenterCode = target?.code ?? ''
  formModel.costCenterName = target?.name ?? ''
}

function handleCheckedDetailKeysUpdate(keys: Array<string | number>) {
  checkedDetailRowKeys.value = keys.map((key) => String(key))
}

function createEmptyDetailRow(): DetailRow {
  return {
    id: `tmp-${detailSeed.value++}`,
    inventoryId: '',
    warehouseId: '',
    warehouseCode: '',
    warehouseName: '',
    locationId: '',
    locationCode: '',
    containerId: '',
    containerCode: '',
    productId: '',
    productCode: '',
    productName: '',
    sn: '',
    batchNo: '',
    craftVersion: '',
    unit: '',
    qty: 0,
    remark: '',
  }
}

function getDetailRowKey(row: DetailRow) {
  return row.id
}

function updateDetailRow(rowId: string, patch: Partial<DetailRow>) {
  detailRows.value = detailRows.value.map((item) => (item.id === rowId ? { ...item, ...patch } : item))
}

async function loadInventoryRows() {
  inventoryLoading.value = true
  try {
    const data = await inventoryApi.getList(inventoryListParams.value)
    inventoryRows.value = (data.items ?? []).map((item) => ({
      ...item,
      containerNo: normalizeInventoryContainerNo(item),
      sn: normalizeInventorySn(item),
    }))
    inventoryQuery.total = Number(data.totalCount ?? 0)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载库存数据失败')
  } finally {
    inventoryLoading.value = false
  }
}

async function ensureLocationIdByCode(warehouseId: string, warehouseCode: string, locationCode: string) {
  const trimmedWarehouseId = String(warehouseId ?? '').trim()
  const trimmedLocationCode = String(locationCode ?? '').trim()
  if (!trimmedWarehouseId || !trimmedLocationCode) return ''

  const existing = Object.values(locationLookupByWarehouse.value[trimmedWarehouseId] ?? {}).find(
    (item) => String(item.code ?? '').trim() === trimmedLocationCode,
  )
  if (existing?.id) {
    return existing.id
  }

  await loadLocationOptionsByWarehouse(trimmedWarehouseId, warehouseCode, trimmedLocationCode)
  const matched = Object.values(locationLookupByWarehouse.value[trimmedWarehouseId] ?? {}).find(
    (item) => String(item.code ?? '').trim() === trimmedLocationCode,
  )
  return matched?.id ?? ''
}

async function buildDetailRowsFromInventory(rows: InventoryRow[]) {
  const locationCache = new Map<string, string>()
  const mappedRows: DetailRow[] = []

  for (const row of rows) {
    const inventoryId = String(row.id ?? '').trim()
    const rawWarehouseId = String((row as InventoryRow & { warehouseId?: unknown }).warehouseId ?? '').trim()
    const warehouseCode = String(row.warehouseCode ?? '').trim()
    const warehouse = rawWarehouseId
      ? warehouses.value.find((item) => item.id === rawWarehouseId)
      : findWarehouseByCode(warehouseCode)
    const warehouseId = rawWarehouseId || warehouse?.id || ''
    const warehouseName = String(row.warehouseName ?? warehouse?.name ?? '').trim()

    const locationCode = String(row.locationCode ?? '').trim()
    const rawLocationId = String((row as InventoryRow & { locationId?: unknown }).locationId ?? '').trim()
    let locationId = rawLocationId

    if (!locationId && warehouseId && locationCode) {
      const cacheKey = `${warehouseId}::${locationCode}`
      if (locationCache.has(cacheKey)) {
        locationId = locationCache.get(cacheKey) ?? ''
      } else {
        const resolved = await ensureLocationIdByCode(warehouseId, warehouseCode, locationCode)
        locationCache.set(cacheKey, resolved)
        locationId = resolved
      }
    }

    const containerId = String(row.containerId ?? '').trim()
    const containerCode = normalizeInventoryContainerNo(row) || String(row.containerCode ?? '').trim() || containerId
    const productId = String(row.productId ?? '').trim()
    const qty = Number(row.availableQuantity ?? row.quantity ?? 0)

    const detailRow: DetailRow = {
      id: `tmp-${detailSeed.value++}`,
      inventoryId,
      warehouseId,
      warehouseCode,
      warehouseName,
      locationId,
      locationCode,
      containerId,
      containerCode,
      productId,
      productCode: String(row.productCode ?? '').trim(),
      productName: String(row.productName ?? '').trim(),
      sn: normalizeInventorySn(row),
      batchNo: String(row.batchNo ?? '').trim(),
      craftVersion: String(row.craftVersion ?? '').trim(),
      unit: String(row.unit ?? '').trim(),
      qty: Number.isFinite(qty) ? qty : 0,
      remark: '',
    }

    ensureWarehouseOptionByRow(detailRow)
    ensureContainerOptionByRow(detailRow)
    ensureProductOptionByRow(detailRow)
    ensureLocationOptionByRow(detailRow)
    mappedRows.push(detailRow)
  }

  return mappedRows
}

async function handleConfirmAddByInventory() {
  if (selectedInventoryRows.value.length === 0) {
    message.warning('请至少选择一条库存')
    return
  }

  inventoryAdding.value = true
  try {
    const candidates = await buildDetailRowsFromInventory(selectedInventoryRows.value)

    const existingInventoryIdSet = new Set(
      detailRows.value
        .map((item) => String(item.inventoryId ?? '').trim())
        .filter((item) => Boolean(item)),
    )
    const existingDedupKeySet = new Set(detailRows.value.map((item) => getDetailDedupKey(item)))
    const rowsToAdd: DetailRow[] = []

    for (const row of candidates) {
      const inventoryId = String(row.inventoryId ?? '').trim()
      const dedupKey = getDetailDedupKey(row)
      const byInventoryIdDuplicate = Boolean(inventoryId) && existingInventoryIdSet.has(inventoryId)
      const byBusinessKeyDuplicate = existingDedupKeySet.has(dedupKey)
      if (byInventoryIdDuplicate || byBusinessKeyDuplicate) {
        continue
      }
      rowsToAdd.push(row)
      if (inventoryId) {
        existingInventoryIdSet.add(inventoryId)
      }
      existingDedupKeySet.add(dedupKey)
    }

    if (rowsToAdd.length === 0) {
      message.info('所选库存已存在于明细中')
      inventoryModalVisible.value = false
      return
    }

    let shouldReplacePlaceholder = false
    if (detailRows.value.length === 1) {
      const firstDetailRow = detailRows.value[0]
      if (firstDetailRow) {
        shouldReplacePlaceholder = isDetailRowEmpty(firstDetailRow)
      }
    }
    detailRows.value = shouldReplacePlaceholder ? rowsToAdd : [...detailRows.value, ...rowsToAdd]
    checkedInventoryRowKeys.value = []
    inventoryModalVisible.value = false
    message.success(`已通过库存新增 ${rowsToAdd.length} 条明细`)
  } finally {
    inventoryAdding.value = false
  }
}

async function handleOpenInventoryModal() {
  inventoryModalVisible.value = true
  checkedInventoryRowKeys.value = []
  inventoryQuery.page = 1
  await loadInventoryRows()
}

function handleInventoryCheckedRowKeysUpdate(keys: Array<string | number>) {
  checkedInventoryRowKeys.value = keys.map((item) => String(item))
}

function handleInventoryQuery() {
  inventoryQuery.page = 1
  loadInventoryRows()
}

function handleInventoryReset() {
  inventoryQuery.containerNo = ''
  inventoryQuery.productId = ''
  inventoryQuery.relatedOrderNo = ''
  inventoryQuery.warehouseCode = ''
  inventoryQuery.zoneCode = ''
  inventoryQuery.page = 1
  loadInventoryRows()
}

function handleInventoryPageChange(page: number) {
  inventoryQuery.page = page
  loadInventoryRows()
}

function handleInventoryPageSizeChange(pageSize: number) {
  inventoryQuery.pageSize = pageSize
  inventoryQuery.page = 1
  loadInventoryRows()
}

function resetCreateDefaults() {
  formModel.id = EMPTY_GUID
  formModel.orderNo = ''
  formModel.accountAliasId = ''
  formModel.accountAliasDescription = ''
  formModel.costCenterId = ''
  formModel.costCenterCode = ''
  formModel.costCenterName = ''
  formModel.type = miscOutboundOrderApi.MiscOperationType.Outbound
  formModel.status = miscOutboundOrderApi.MiscOrderStatus.Draft
  formModel.remark = ''
  detailRows.value = [createEmptyDetailRow()]
  checkedDetailRowKeys.value = []
}

function handleAddDetailRow() {
  detailRows.value = [...detailRows.value, createEmptyDetailRow()]
}

function handleDeleteSelectedDetails() {
  if (checkedDetailRowKeys.value.length === 0) {
    message.warning('请先选择需要删除的明细')
    return
  }

  const selected = new Set(checkedDetailRowKeys.value)
  detailRows.value = detailRows.value.filter((item) => !selected.has(item.id))
  checkedDetailRowKeys.value = []

  if (detailRows.value.length === 0) {
    detailRows.value = [createEmptyDetailRow()]
  }
}

function buildDetailPayload(): miscOutboundOrderApi.CreateMiscOutboundOrderDetailDto[] {
  return detailRows.value.map((item) => ({
    warehouseId: String(item.warehouseId ?? '').trim(),
    warehouseCode: String(item.warehouseCode ?? '').trim(),
    warehouseName: String(item.warehouseName ?? '').trim(),
    locationId: String(item.locationId ?? '').trim(),
    locationCode: String(item.locationCode ?? '').trim(),
    containerId: String(item.containerId ?? '').trim(),
    containerCode: String(item.containerCode ?? '').trim(),
    productId: String(item.productId ?? '').trim(),
    productCode: String(item.productCode ?? '').trim(),
    productName: String(item.productName ?? '').trim(),
    sn: String(item.sn ?? '').trim(),
    batchNo: String(item.batchNo ?? '').trim(),
    craftVersion: String(item.craftVersion ?? '').trim() || null,
    unit: String(item.unit ?? '').trim(),
    qty: Number(item.qty ?? 0),
    remark: String(item.remark ?? '').trim() || null,
  }))
}

function buildCreatePayload(): miscOutboundOrderApi.CreateMiscOutboundOrderDto {
  const payloadDetails = buildDetailPayload()
  return {
    orderNo: String(formModel.orderNo ?? '').trim(),
    accountAliasId: String(formModel.accountAliasId ?? '').trim(),
    accountAliasDescription: String(formModel.accountAliasDescription ?? '').trim(),
    costCenterId: String(formModel.costCenterId ?? '').trim(),
    costCenterCode: String(formModel.costCenterCode ?? '').trim(),
    costCenterName: String(formModel.costCenterName ?? '').trim(),
    remark: String(formModel.remark ?? '').trim() || null,
    details: payloadDetails,
  }
}

function buildUpdatePayload(): miscOutboundOrderApi.UpdateMiscOutboundOrderDto {
  const payloadDetails = buildDetailPayload()
  return {
    accountAliasId: String(formModel.accountAliasId ?? '').trim(),
    accountAliasDescription: String(formModel.accountAliasDescription ?? '').trim(),
    costCenterId: String(formModel.costCenterId ?? '').trim(),
    costCenterCode: String(formModel.costCenterCode ?? '').trim(),
    costCenterName: String(formModel.costCenterName ?? '').trim(),
    remark: String(formModel.remark ?? '').trim() || null,
    details: payloadDetails,
  }
}

function validatePayload(details: miscOutboundOrderApi.CreateMiscOutboundOrderDetailDto[], requireOrderNo: boolean) {
  const orderNo = String(formModel.orderNo ?? '').trim()
  const accountAliasId = String(formModel.accountAliasId ?? '').trim()
  const costCenterId = String(formModel.costCenterId ?? '').trim()
  if (requireOrderNo && !orderNo) {
    activeTab.value = 'header'
    message.warning('请填写单据号')
    return false
  }

  if (!accountAliasId) {
    activeTab.value = 'header'
    message.warning('请选择账户别名')
    return false
  }

  if (!costCenterId) {
    activeTab.value = 'header'
    message.warning('请选择成本中心')
    return false
  }

  if (details.length === 0) {
    activeTab.value = 'details'
    message.warning('请至少维护一条明细')
    return false
  }

  const invalidIndex = details.findIndex((item) =>
    !item.warehouseId || !item.locationId || !item.containerId || !item.productId || !item.unit || Number(item.qty) <= 0,
  )

  if (invalidIndex >= 0) {
    activeTab.value = 'details'
    message.warning(`第 ${invalidIndex + 1} 行明细必填项未完成（仓库/库位/容器/物料/单位/数量）`)
    return false
  }

  return true
}

async function handleSave() {
  saving.value = true
  try {
    if (isEditMode.value) {
      const updatePayload = buildUpdatePayload()
      if (!validatePayload(updatePayload.details, false)) {
        return
      }
      await miscOutboundOrderApi.update(normalizeGuid(formModel.id), updatePayload)
      message.success('编辑保存成功')
    } else {
      const createPayload = buildCreatePayload()
      if (!validatePayload(createPayload.details, true)) {
        return
      }
      await miscOutboundOrderApi.create(createPayload)
      message.success('新增保存成功')
    }

    router.push({ name: 'MiscOutboundOrdersManagement' })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function loadDetail() {
  if (!isEditMode.value) {
    resetCreateDefaults()
    return
  }

  const id = String(props.orderId ?? '').trim()
  if (!id) {
    message.error('缺少单据 Id，无法编辑')
    router.push({ name: 'MiscOutboundOrdersManagement' })
    return
  }

  loading.value = true
  try {
    const data = await miscOutboundOrderApi.get(id)
    if (!isDraftStatus(data.status ?? miscOutboundOrderApi.MiscOrderStatus.Draft)) {
      message.warning('当前其他出库单不是草稿状态，无法编辑')
      await router.replace({ name: 'MiscOutboundOrdersDetail', params: { id } })
      return
    }

    formModel.id = normalizeGuid(data.id)
    formModel.orderNo = String(data.orderNo ?? '')
    formModel.accountAliasId = String(data.accountAliasId ?? '')
    formModel.accountAliasDescription = String(data.accountAliasDescription ?? '')
    formModel.costCenterId = String(data.costCenterId ?? '')
    formModel.costCenterCode = String(data.costCenterCode ?? '')
    formModel.costCenterName = String(data.costCenterName ?? '')
    formModel.type = data.type ?? miscOutboundOrderApi.MiscOperationType.Outbound
    formModel.status = data.status ?? miscOutboundOrderApi.MiscOrderStatus.Draft
    formModel.remark = String(data.remark ?? '')
    await Promise.all([
      ensureAccountAliasOptionById(formModel.accountAliasId, formModel.accountAliasDescription),
      ensureCostCenterOptionById(formModel.costCenterId, formModel.costCenterCode, formModel.costCenterName),
    ])

    detailRows.value = (data.details ?? []).map((item) => ({
      id: item.id && String(item.id).trim() ? String(item.id) : `tmp-${detailSeed.value++}`,
      warehouseId: String(item.warehouseId ?? ''),
      warehouseCode: String(item.warehouseCode ?? ''),
      warehouseName: String(item.warehouseName ?? ''),
      locationId: String(item.locationId ?? ''),
      locationCode: String(item.locationCode ?? ''),
      containerId: String(item.containerId ?? ''),
      containerCode: String(item.containerCode ?? ''),
      productId: String(item.productId ?? ''),
      productCode: String(item.productCode ?? ''),
      productName: String(item.productName ?? ''),
      sn: String(item.sn ?? ''),
      batchNo: String(item.batchNo ?? ''),
      craftVersion: String(item.craftVersion ?? ''),
      unit: String(item.unit ?? ''),
      qty: Number(item.qty ?? 0),
      remark: String(item.remark ?? ''),
    }))

    if (detailRows.value.length === 0) {
      detailRows.value = [createEmptyDetailRow()]
    }

    for (const row of detailRows.value) {
      ensureWarehouseOptionByRow(row)
      ensureContainerOptionByRow(row)
      ensureProductOptionByRow(row)
      ensureLocationOptionByRow(row)
    }

    const warehousePairs = new Map<string, string>()
    for (const row of detailRows.value) {
      if (!row.warehouseId) continue
      warehousePairs.set(row.warehouseId, row.warehouseCode)
    }
    await Promise.all(
      Array.from(warehousePairs.entries()).map(([warehouseId, warehouseCode]) =>
        loadLocationOptionsByWarehouse(warehouseId, warehouseCode),
      ),
    )

    checkedDetailRowKeys.value = []
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载编辑数据失败')
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.push({ name: 'MiscOutboundOrdersManagement' })
}

const inventoryColumns = computed<DataTableColumns<InventoryRow>>(() => withResizable([
  {
    type: 'selection',
    width: 44,
    fixed: 'left',
  },
  {
    title: '盘号',
    key: 'containerNo',
    minWidth: 180,
    render: (row) => normalizeInventoryContainerNo(row) || '-',
  },
  {
    title: '仓库',
    key: 'warehouseCode',
    minWidth: 140,
    render: (row) => row.warehouseCode || '-',
  },
  {
    title: '库位',
    key: 'locationCode',
    minWidth: 140,
    render: (row) => row.locationCode || '-',
  },
  {
    title: '物料编码',
    key: 'productCode',
    minWidth: 160,
    render: (row) => row.productCode || '-',
  },
  {
    title: '物料名称',
    key: 'productName',
    minWidth: 200,
    render: (row) => row.productName || '-',
  },
  {
    title: '可用数量',
    key: 'availableQuantity',
    minWidth: 120,
    align: 'right',
    render: (row) => String(row.availableQuantity ?? row.quantity ?? 0),
  },
  {
    title: '单位',
    key: 'unit',
    width: 100,
    render: (row) => row.unit || '-',
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 160,
    render: (row) => row.batchNo || '-',
  },
  {
    title: 'SN',
    key: 'sn',
    minWidth: 180,
    render: (row) => normalizeInventorySn(row) || '-',
  },
  {
    title: '工艺版本',
    key: 'craftVersion',
    minWidth: 140,
    render: (row) => row.craftVersion || '-',
  },
]))

const detailColumns = computed<DataTableColumns<DetailRow>>(() => withResizable([
  {
    type: 'selection',
    width: 44,
    fixed: 'left',
  },
  {
    title: '仓库',
    key: 'warehouseSelect',
    minWidth: 220,
    render: (row) => h(NSelect, {
      value: row.warehouseId || null,
      options: warehouseOptions.value,
      filterable: true,
      clearable: true,
      loading: warehouseLoading.value,
      placeholder: '请选择仓库',
      onUpdateValue: (value) => handleWarehouseChange(row.id, value ? String(value) : ''),
    }),
  },
  {
    title: '库位',
    key: 'locationSelect',
    minWidth: 180,
    render: (row) => h(NSelect, {
      value: row.locationId || null,
      options: getLocationOptions(row),
      filterable: true,
      remote: true,
      clearable: true,
      loading: getLocationLoading(row),
      disabled: !row.warehouseId,
      placeholder: row.warehouseId ? '请选择库位' : '请先选择仓库',
      onFocus: () => {
        if (row.warehouseId) {
          loadLocationOptionsByWarehouse(row.warehouseId, row.warehouseCode)
        }
      },
      onSearch: (keyword) => {
        if (row.warehouseId) {
          loadLocationOptionsByWarehouse(row.warehouseId, row.warehouseCode, keyword)
        }
      },
      onUpdateValue: (value) => handleLocationChange(row, row.id, value ? String(value) : ''),
    }),
  },
  {
    title: '容器',
    key: 'containerSelect',
    minWidth: 200,
    render: (row) => h(NSelect, {
      value: row.containerId || null,
      options: containerOptions.value,
      filterable: true,
      remote: true,
      clearable: true,
      loading: containerLoading.value,
      placeholder: '请选择容器',
      onFocus: () => {
        loadContainerOptions()
      },
      onSearch: (keyword) => {
        loadContainerOptions(keyword)
      },
      onUpdateValue: (value) => handleContainerChange(row.id, value ? String(value) : ''),
    }),
  },
  {
    title: '物料',
    key: 'productSelect',
    minWidth: 240,
    render: (row) => h(NSelect, {
      value: row.productId || null,
      options: productOptions.value,
      filterable: true,
      remote: true,
      clearable: true,
      loading: productLoading.value,
      placeholder: '请选择物料',
      onFocus: () => {
        loadProductOptions()
      },
      onSearch: (keyword) => {
        loadProductOptions(keyword)
      },
      onUpdateValue: (value) => handleProductChange(row.id, value ? String(value) : ''),
    }),
  },
  {
    title: 'SN',
    key: 'sn',
    minWidth: 140,
    render: (row) => h(NInput, {
      value: row.sn,
      placeholder: 'SN',
      onUpdateValue: (value) => updateDetailRow(row.id, { sn: value }),
    }),
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 140,
    render: (row) => h(NInput, {
      value: row.batchNo,
      placeholder: '批次号',
      onUpdateValue: (value) => updateDetailRow(row.id, { batchNo: value }),
    }),
  },
  {
    title: '工艺版本',
    key: 'craftVersion',
    minWidth: 140,
    render: (row) => h(NInput, {
      value: row.craftVersion ?? '',
      placeholder: '工艺版本',
      onUpdateValue: (value) => updateDetailRow(row.id, { craftVersion: value }),
    }),
  },
  {
    title: '单位',
    key: 'unit',
    width: 120,
    render: (row) => h(NInput, {
      value: row.unit,
      placeholder: '单位',
      onUpdateValue: (value) => updateDetailRow(row.id, { unit: value }),
    }),
  },
  {
    title: '数量',
    key: 'qty',
    width: 140,
    render: (row) => h(NInputNumber, {
      value: row.qty,
      min: 0,
      precision: 3,
      placeholder: '数量',
      onUpdateValue: (value) => updateDetailRow(row.id, { qty: Number(value ?? 0) }),
    }),
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 160,
    render: (row) => h(NInput, {
      value: row.remark ?? '',
      placeholder: '备注',
      onUpdateValue: (value) => updateDetailRow(row.id, { remark: value }),
    }),
  },
]))

onMounted(async () => {
  await Promise.all([
    loadWarehouseOptions(),
    loadContainerOptions(),
    loadProductOptions(),
    loadAccountAliasOptions(),
    loadCostCenterOptions(),
  ])
  await loadDetail()
})
</script>

<template>
  <BaseCrudPage v-if="isCreateMode" :search-collapsible="false">
    <template #search>
      <div class="detail-header-wrap">
        <div class="header-action-bar">
          <n-button @click="handleBack">返回列表</n-button>
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
            <n-descriptions-item label="单据号">
              <n-input :value="formModel.orderNo" :disabled="isEditMode" placeholder="请输入单据号" @update:value="(value) => { formModel.orderNo = value }" />
            </n-descriptions-item>
            <n-descriptions-item label="账户别名">
              <n-select
                :value="formModel.accountAliasId || null"
                :options="accountAliasOptions"
                filterable
                remote
                clearable
                :loading="accountAliasLoading"
                placeholder="请选择账户别名"
                @focus="() => { loadAccountAliasOptions() }"
                @search="(keyword) => { loadAccountAliasOptions(keyword) }"
                @update:value="(value) => { handleAccountAliasChange(value ? String(value) : '') }"
              />
            </n-descriptions-item>
            <n-descriptions-item label="创建时间">
              {{ formatDateTime(formModel.creationTime) }}
            </n-descriptions-item>
            <n-descriptions-item label="账户别名描述">
              <span class="readonly-value">{{ formModel.accountAliasDescription || '-' }}</span>
            </n-descriptions-item>
            <n-descriptions-item label="成本中心">
              <n-select
                :value="formModel.costCenterId || null"
                :options="costCenterOptions"
                filterable
                remote
                clearable
                :loading="costCenterLoading"
                placeholder="请选择成本中心"
                @focus="() => { loadCostCenterOptions() }"
                @search="(keyword) => { loadCostCenterOptions(keyword) }"
                @update:value="(value) => { handleCostCenterChange(value ? String(value) : '') }"
              />
            </n-descriptions-item>
            <n-descriptions-item label="业务类型">
              <n-tag size="small" :type="getOperationTypeTagType(formModel.type)">
                {{ resolveOperationTypeLabel(formModel.type) }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="成本中心编码">
              <span class="readonly-value">{{ formModel.costCenterCode || '-' }}</span>
            </n-descriptions-item>
            <n-descriptions-item label="成本中心名称">
              <span class="readonly-value">{{ formModel.costCenterName || '-' }}</span>
            </n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag size="small" :type="getStatusTagType(formModel.status)">
                {{ resolveStatusLabel(formModel.status) }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="备注" :span="2">
              <n-input
                :value="String(formModel.remark ?? '')"
                type="textarea"
                placeholder="请输入备注"
                @update:value="(value) => { formModel.remark = value }"
              />
            </n-descriptions-item>
          </n-descriptions>
        </n-spin>
      </div>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button type="primary" secondary @click="handleAddDetailRow">新增明细</n-button>
        <n-button secondary @click="handleOpenInventoryModal">通过库存添加</n-button>
        <n-button type="error" secondary :disabled="checkedDetailRowKeys.length === 0" @click="handleDeleteSelectedDetails">删除选中</n-button>
      </div>
    </template>

    <template #actions-right>
      <div class="crud-action-tools">
        <n-tag size="small" type="info">{{ pageTagText }}</n-tag>
      </div>
    </template>

    <template #data>
      <n-data-table
        class="crud-table-flat"
        :columns="detailColumns"
        :data="detailRows"
        :bordered="false"
        :row-key="getDetailRowKey"
        :checked-row-keys="checkedDetailRowKeys"
        :scroll-x="2800"
        @update:checked-row-keys="handleCheckedDetailKeysUpdate"
      />
    </template>
  </BaseCrudPage>

  <BaseCrudPage v-else :search-collapsible="false">
    <template #actions-left>
      <div class="crud-action-main">
        <n-button @click="handleBack">返回列表</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
      </div>
    </template>

    <template #actions-right>
      <div class="crud-action-tools">
        <n-tag size="small" type="info">{{ pageTagText }}</n-tag>
      </div>
    </template>

    <template #data>
      <div v-if="loading" class="form-loading-wrap">正在加载表单数据...</div>

      <n-tabs v-else v-model:value="activeTab" type="line" animated>
        <n-tab-pane name="header" tab="单头信息">
          <n-form :model="formModel" label-placement="left" label-width="140" class="form-tab-panel">
            <n-form-item label="单据号">
              <n-input :value="formModel.orderNo" :disabled="isEditMode" placeholder="请输入单据号" @update:value="(value) => { formModel.orderNo = value }" />
            </n-form-item>
            <n-form-item label="账户别名">
              <n-select
                :value="formModel.accountAliasId || null"
                :options="accountAliasOptions"
                filterable
                remote
                clearable
                :loading="accountAliasLoading"
                placeholder="请选择账户别名"
                @focus="() => { loadAccountAliasOptions() }"
                @search="(keyword) => { loadAccountAliasOptions(keyword) }"
                @update:value="(value) => { handleAccountAliasChange(value ? String(value) : '') }"
              />
            </n-form-item>
            <n-form-item label="账户别名描述">
              <span class="readonly-value">{{ formModel.accountAliasDescription || '-' }}</span>
            </n-form-item>
            <n-form-item label="成本中心">
              <n-select
                :value="formModel.costCenterId || null"
                :options="costCenterOptions"
                filterable
                remote
                clearable
                :loading="costCenterLoading"
                placeholder="请选择成本中心"
                @focus="() => { loadCostCenterOptions() }"
                @search="(keyword) => { loadCostCenterOptions(keyword) }"
                @update:value="(value) => { handleCostCenterChange(value ? String(value) : '') }"
              />
            </n-form-item>
            <n-form-item label="成本中心编码">
              <span class="readonly-value">{{ formModel.costCenterCode || '-' }}</span>
            </n-form-item>
            <n-form-item label="成本中心名称">
              <span class="readonly-value">{{ formModel.costCenterName || '-' }}</span>
            </n-form-item>
            <n-form-item label="业务类型">
              <n-tag size="small" :type="getOperationTypeTagType(formModel.type)">
                {{ resolveOperationTypeLabel(formModel.type) }}
              </n-tag>
            </n-form-item>
            <n-form-item label="状态">
              <n-tag size="small" :type="getStatusTagType(formModel.status)">
                {{ resolveStatusLabel(formModel.status) }}
              </n-tag>
            </n-form-item>
            <n-form-item label="备注">
              <n-input
                :value="String(formModel.remark ?? '')"
                type="textarea"
                placeholder="请输入备注"
                @update:value="(value) => { formModel.remark = value }"
              />
            </n-form-item>
          </n-form>
        </n-tab-pane>

        <n-tab-pane name="details" tab="明细信息">
          <div class="detail-toolbar">
            <n-button type="primary" @click="handleAddDetailRow">新增明细</n-button>
            <n-button @click="handleOpenInventoryModal">通过库存添加</n-button>
            <n-button type="error" ghost @click="handleDeleteSelectedDetails">删除选中</n-button>
          </div>

          <n-data-table
            class="crud-table-flat"
            :columns="detailColumns"
            :data="detailRows"
            :bordered="false"
            :row-key="getDetailRowKey"
            :checked-row-keys="checkedDetailRowKeys"
            :scroll-x="2800"
            @update:checked-row-keys="handleCheckedDetailKeysUpdate"
          />
        </n-tab-pane>
      </n-tabs>
    </template>
  </BaseCrudPage>

  <n-modal
    class="inventory-modal-fullscreen"
    :show="inventoryModalVisible"
    preset="card"
    title="通过库存添加明细"
    style="width: 100vw; height: 100vh; margin: 0"
    @update:show="(value) => { inventoryModalVisible = value }"
  >
    <n-form inline class="crud-search-form">
      <n-form-item>
        <n-input
          :value="inventoryQuery.containerNo"
          clearable
          placeholder="请输入盘号"
          @update:value="(value) => { inventoryQuery.containerNo = value }"
        />
      </n-form-item>
      <n-form-item>
        <n-input
          :value="inventoryQuery.productId"
          clearable
          placeholder="请输入物料Id"
          @update:value="(value) => { inventoryQuery.productId = value }"
        />
      </n-form-item>
      <n-form-item>
        <n-input
          :value="inventoryQuery.relatedOrderNo"
          clearable
          placeholder="请输入所属单据"
          @update:value="(value) => { inventoryQuery.relatedOrderNo = value }"
        />
      </n-form-item>
      <n-form-item>
        <n-input
          :value="inventoryQuery.warehouseCode"
          clearable
          placeholder="请输入仓库编码"
          @update:value="(value) => { inventoryQuery.warehouseCode = value }"
        />
      </n-form-item>
      <n-form-item>
        <n-input
          :value="inventoryQuery.zoneCode"
          clearable
          placeholder="请输入库区编码"
          @update:value="(value) => { inventoryQuery.zoneCode = value }"
        />
      </n-form-item>
      <n-form-item class="crud-page-spacer" />
      <n-form-item>
        <n-button type="primary" :loading="inventoryLoading" @click="handleInventoryQuery">查询</n-button>
      </n-form-item>
      <n-form-item>
        <n-button :disabled="inventoryLoading" @click="handleInventoryReset">重置</n-button>
      </n-form-item>
    </n-form>

    <n-spin :show="inventoryLoading || inventoryAdding">
      <n-empty v-if="inventoryRows.length === 0" description="暂无可用库存" />
      <n-data-table
        v-else
        class="crud-table-flat"
        :columns="inventoryColumns"
        :data="inventoryRows"
        :bordered="false"
        :row-key="(row) => String(row.id ?? '')"
        :checked-row-keys="checkedInventoryRowKeys"
        :scroll-x="2000"
        :max-height="'calc(100vh - 280px)'"
        @update:checked-row-keys="handleInventoryCheckedRowKeysUpdate"
      />
    </n-spin>

    <template #footer>
      <div class="inventory-modal-footer">
        <n-pagination
          :page="inventoryQuery.page"
          :page-size="inventoryQuery.pageSize"
          :item-count="inventoryQuery.total"
          show-size-picker
          :page-sizes="[10, 20, 50, 100]"
          @update:page="handleInventoryPageChange"
          @update:page-size="handleInventoryPageSizeChange"
        />
        <div class="inventory-modal-actions">
          <n-tag size="small" type="info">已选 {{ selectedInventoryRows.length }} 条库存</n-tag>
          <n-button @click="inventoryModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="inventoryAdding" @click="handleConfirmAddByInventory">确认添加</n-button>
        </div>
      </div>
    </template>
  </n-modal>
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

.form-loading-wrap {
  padding: 24px;
  color: var(--n-text-color-2);
}

.form-tab-panel {
  max-width: 960px;
}

.readonly-value {
  display: inline-block;
  width: 100%;
  color: var(--n-text-color);
}

.detail-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.inventory-modal-fullscreen {
  margin: 0;
}

.inventory-modal-fullscreen :deep(.n-card) {
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  margin: 0;
  border-radius: 0;
}

.inventory-modal-fullscreen :deep(.n-card__content) {
  overflow: auto;
}

.inventory-modal-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.inventory-modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
