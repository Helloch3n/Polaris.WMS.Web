<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NCheckbox,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputGroup,
  NModal,
  NProgress,
  NSelect,
  NSpin,
  NTag,
  NText,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as transferApi from '../../../api/transfer/transfer'
import * as containerApi from '../../../api/masterData/container'
import * as locationApi from '../../../api/masterData/location'
import * as warehouseApi from '../../../api/masterData/warehouse'
import * as usersApi from '../../../api/identity/users'
import * as organizationUnitsApi from '../../../api/identity/organizationUnits'
import request from '../../../utils/request'
import { useAuthStore } from '../../../stores/auth'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

const props = defineProps<{
  transferId?: string
  mode: 'view' | 'edit' | 'create'
}>()

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const approving = ref(false)
const transfer = ref<transferApi.TransferDto | null>(null)
const movableVisible = ref(false)
const movableLoading = ref(false)
const locationVisible = ref(false)
const locationLoading = ref(false)
const warehouseLoading = ref(false)
const departmentLoading = ref(false)
const checkedMovableContainerIds = ref<string[]>([])
const movableContainers = ref<containerApi.MovableContainerDto[]>([])
const warehouses = ref<warehouseApi.WarehouseDto[]>([])
const allowedSourceWarehouseIds = ref<string[]>([])
const departments = ref<Array<{ id: string; displayName: string; code?: string }>>([])
const allowedSourceDepartmentIds = ref<string[]>([])
const detailDraftRows = ref<transferApi.TransferDetailDto[]>([])
const locationRows = ref<locationApi.LocationDto[]>([])
const activeDetailRowId = ref('')
const checkedDetailRowIds = ref<string[]>([])

const locationQuery = reactive({
  keyword: '',
})

const createForm = reactive({
  sourceDepartmentId: '',
  sourceDepartmentName: '',
  sourceWarehouseId: '',
  sourceWarehouseCode: '',
  targetWarehouseId: '',
  targetWarehouseCode: '',
})

const contextWarehouseId = computed(() => authStore.currentWarehouseId.trim())
const isSourceWarehouseLockedByContext = computed(() => props.mode === 'create' && Boolean(contextWarehouseId.value))
const contextDepartmentId = computed(() => authStore.currentDepartmentId.trim())
const isSourceDepartmentLockedByContext = computed(() => props.mode === 'create' && Boolean(contextDepartmentId.value))
const isSourceWarehouseReadonly = computed(() => props.mode === 'edit' || isSourceWarehouseLockedByContext.value)
const isSourceDepartmentReadonly = computed(() => props.mode === 'edit' || isSourceDepartmentLockedByContext.value)

const movableQuery = reactive({
  keyword: '',
})

const headerLabelStyle = {
  width: '120px',
}

const headerContentStyle = {
  minWidth: '220px',
}

function formatDateTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizeStatusValue(status: transferApi.TransferOrderStatus) {
  if (typeof status === 'string') {
    if (status === 'Draft' || status === '0') return transferApi.TransferOrderStatus.Draft
    if (status === 'Approved' || status === '1') return transferApi.TransferOrderStatus.Approved
    if (status === 'InProgress' || status === '2') return transferApi.TransferOrderStatus.InProgress
    if (status === 'Completed' || status === '3') return transferApi.TransferOrderStatus.Completed
    if (status === 'Cancelled' || status === '4') return transferApi.TransferOrderStatus.Cancelled
  }
  if (typeof status === 'number') return status
  return null
}

function resolveStatusLabel(status: transferApi.TransferOrderStatus) {
  const value = normalizeStatusValue(status)
  if (value === transferApi.TransferOrderStatus.Draft) return '草稿'
  if (value === transferApi.TransferOrderStatus.Approved) return '已审核'
  if (value === transferApi.TransferOrderStatus.InProgress) return '作业中'
  if (value === transferApi.TransferOrderStatus.Completed) return '已完成'
  if (value === transferApi.TransferOrderStatus.Cancelled) return '已取消'
  return '-'
}

function getStatusTagType(status: transferApi.TransferOrderStatus) {
  const value = normalizeStatusValue(status)
  if (value === transferApi.TransferOrderStatus.Draft) return 'default'
  if (value === transferApi.TransferOrderStatus.Approved) return 'info'
  if (value === transferApi.TransferOrderStatus.InProgress) return 'warning'
  if (value === transferApi.TransferOrderStatus.Completed) return 'success'
  if (value === transferApi.TransferOrderStatus.Cancelled) return 'error'
  return 'default'
}

function getDetailIdentity(row: transferApi.TransferDetailDto) {
  return `${row.containerId || ''}::${row.inventoryId || ''}`
}

const detailRows = computed<transferApi.TransferDetailDto[]>(() => detailDraftRows.value)
const completedCount = computed(() => detailRows.value.filter((item) => item.isCompleted).length)
const detailTotalCount = computed(() => detailRows.value.length)
const progressPercentage = computed(() => {
  const total = detailTotalCount.value
  if (total <= 0) return 0
  return Math.round((completedCount.value / total) * 100)
})

const warehouseOptions = computed(() => warehouses.value.map((item) => ({
  label: item.code ? `${item.code}${item.name ? ` - ${item.name}` : ''}` : (item.name || '-'),
  value: item.id,
})))

const sourceWarehouseOptions = computed(() => {
  if (props.mode !== 'create') return warehouseOptions.value
  if (contextWarehouseId.value) {
    return warehouseOptions.value.filter((item) => String(item.value) === contextWarehouseId.value)
  }
  const allowedSet = new Set(allowedSourceWarehouseIds.value.map((id) => String(id)))
  return warehouseOptions.value.filter((item) => allowedSet.has(String(item.value)))
})

const departmentOptions = computed(() => departments.value.map((item) => ({
  label: item.code ? `${item.code}${item.displayName ? ` - ${item.displayName}` : ''}` : (item.displayName || '-'),
  value: item.id,
})))

const sourceDepartmentOptions = computed(() => {
  if (props.mode !== 'create') return departmentOptions.value
  if (contextDepartmentId.value) {
    return departmentOptions.value.filter((item) => String(item.value) === contextDepartmentId.value)
  }
  const allowedSet = new Set(allowedSourceDepartmentIds.value.map((id) => String(id)))
  return departmentOptions.value.filter((item) => allowedSet.has(String(item.value)))
})

const selectedSourceWarehouseId = computed(() => {
  if (props.mode === 'create') return createForm.sourceWarehouseId
  return transfer.value?.sourceWarehouseId ?? ''
})

const selectedTargetWarehouseId = computed(() => {
  if (props.mode === 'create') return createForm.targetWarehouseId
  return transfer.value?.targetWarehouseId ?? ''
})

const selectedSourceWarehouseCode = computed(() => {
  if (props.mode === 'create') return createForm.sourceWarehouseCode
  return transfer.value?.sourceWarehouseCode ?? ''
})

const selectedSourceDepartmentId = computed(() => {
  if (props.mode === 'create') return createForm.sourceDepartmentId
  return transfer.value?.sourceDepartmentId ?? transfer.value?.departmentId ?? ''
})

const selectedSourceDepartmentName = computed(() => {
  if (props.mode === 'create') return createForm.sourceDepartmentName
  return transfer.value?.sourceDepartmentName ?? transfer.value?.departmentName ?? ''
})

const selectedTargetWarehouseCode = computed(() => {
  if (props.mode === 'create') return createForm.targetWarehouseCode
  return transfer.value?.targetWarehouseCode ?? ''
})

type MovableFlatRow = {
  id: string
  containerId: string
  containerNo: string
  containerType: string
  currentLocationCode: string
  productCode: string
  productName: string
  craftVersion: string
  batchNo: string
  quantity: number
  uom: string
}

const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'transfer-order-detail-column-settings-v1',
  preferredKeys: [
    'containerCode',
    'productCode',
    'productName',
    'craftVersion',
    'qty',
    'sourceWarehouseCode',
    'sourceLocationCode',
    'targetWarehouseCode',
    'targetLocationCode',
    'isCompleted',
  ],
  resolveTitle: (key) => {
    if (key === 'containerCode') return '盘号'
    if (key === 'productCode') return '物料编码'
    if (key === 'productName') return '物料名称'
    if (key === 'craftVersion') return '工艺版本'
    if (key === 'qty') return '调拨数量'
    if (key === 'sourceWarehouseCode') return '来源仓库'
    if (key === 'sourceLocationCode') return '来源库位'
    if (key === 'targetWarehouseCode') return '目标仓库'
    if (key === 'targetLocationCode') return '目标库位'
    if (key === 'isCompleted') return '执行状态'
    return key
  },
})

const detailColumnMap: Record<string, DataTableColumns<transferApi.TransferDetailDto>[number]> = {
  containerCode: {
    title: createDraggableTitle('containerCode', '盘号'),
    key: 'containerCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.containerCode, b.containerCode),
    render: (row) => row.containerCode || '-',
  },
  productCode: {
    title: createDraggableTitle('productCode', '物料编码'),
    key: 'productCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.productCode, b.productCode),
    render: (row) => row.productCode || '-',
  },
  productName: {
    title: createDraggableTitle('productName', '物料名称'),
    key: 'productName',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.productName, b.productName),
    render: (row) => row.productName || '-',
  },
  craftVersion: {
    title: createDraggableTitle('craftVersion', '工艺版本'),
    key: 'craftVersion',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.craftVersion, b.craftVersion),
    render: (row) => row.craftVersion || '-',
  },
  qty: {
    title: createDraggableTitle('qty', '调拨数量'),
    key: 'qty',
    width: 120,
    align: 'right',
    sorter: (a, b) => compareSortValue(a.qty, b.qty),
    render: (row) => String(row.qty ?? '-'),
  },
  sourceWarehouseCode: {
    title: createDraggableTitle('sourceWarehouseCode', '来源仓库'),
    key: 'sourceWarehouseCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.sourceWarehouseCode, b.sourceWarehouseCode),
    render: (row) => row.sourceWarehouseCode || '-',
  },
  sourceLocationCode: {
    title: createDraggableTitle('sourceLocationCode', '来源库位'),
    key: 'sourceLocationCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.sourceLocationCode, b.sourceLocationCode),
    render: (row) => row.sourceLocationCode || '-',
  },
  targetWarehouseCode: {
    title: createDraggableTitle('targetWarehouseCode', '目标仓库'),
    key: 'targetWarehouseCode',
    minWidth: 140,
    sorter: (a, b) => compareSortValue(a.targetWarehouseCode, b.targetWarehouseCode),
    render: (row) => row.targetWarehouseCode || '-',
  },
  targetLocationCode: {
    title: createDraggableTitle('targetLocationCode', '目标库位'),
    key: 'targetLocationCode',
    minWidth: 240,
    sorter: (a, b) => compareSortValue(a.targetLocationCode, b.targetLocationCode),
    render: (row) => {
      if (props.mode === 'view') return row.targetLocationCode || '-'
      return h(NInputGroup, { class: 'target-location-picker' }, [
        h(NInput, {
          class: 'target-location-picker__input',
          size: 'small',
          value: row.targetLocationCode || '',
          placeholder: '请选择目标库位',
          readonly: true,
          onClick: () => handleOpenLocationModal(row),
        }),
        h(
          NButton,
          {
            class: 'target-location-picker__trigger',
            size: 'small',
            type: 'primary',
            tertiary: true,
            onClick: () => handleOpenLocationModal(row),
          },
          { default: () => '⋯' },
        ),
      ])
    },
  },
  isCompleted: {
    title: createDraggableTitle('isCompleted', '执行状态'),
    key: 'isCompleted',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isCompleted, b.isCompleted),
    render: (row) => h(NTag, { size: 'small', type: row.isCompleted ? 'success' : 'warning' }, { default: () => (row.isCompleted ? '已完成' : '未完成') }),
  },
}

const detailColumns = computed<DataTableColumns<transferApi.TransferDetailDto>>(() => {
  const baseColumns = columnSettings.value
    .filter((item) => item.visible)
    .map((item) => detailColumnMap[item.key])
    .filter((item): item is DataTableColumns<transferApi.TransferDetailDto>[number] => Boolean(item))

  const withBaseResizable = withResizable(baseColumns)
  if (props.mode === 'view') {
    return withBaseResizable
  }

  return [
    {
      type: 'selection',
      width: 48,
    },
    ...withBaseResizable,
  ]
})

function cloneDetailRow(row: transferApi.TransferDetailDto): transferApi.TransferDetailDto {
  return {
    ...row,
    sourceWarehouseId: row.sourceWarehouseId ?? null,
    targetWarehouseId: row.targetWarehouseId ?? null,
  }
}

function normalizeGuid(value: string | null | undefined): string {
  const text = String(value ?? '').trim()
  const guidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
  if (guidPattern.test(text)) {
    return text
  }
  return '00000000-0000-0000-0000-000000000000'
}

function buildWarehouseMap() {
  return new Map(warehouses.value.map((item) => [item.id, item]))
}

function applySourceWarehouseSelection(id: string) {
  const warehouseMap = buildWarehouseMap()
  const selected = warehouseMap.get(id)
  const nextCode = selected?.code ?? ''

  if (props.mode === 'create') {
    createForm.sourceWarehouseId = id
    createForm.sourceWarehouseCode = nextCode
  } else if (transfer.value) {
    transfer.value = {
      ...transfer.value,
      sourceWarehouseId: id || null,
      sourceWarehouseCode: nextCode,
    }
  }

  detailDraftRows.value = detailDraftRows.value.map((item) => ({
    ...item,
    sourceWarehouseId: id || undefined,
    sourceWarehouseCode: nextCode,
  }))
}

function buildDepartmentMap() {
  return new Map(departments.value.map((item) => [item.id, item]))
}

function applySourceDepartmentSelection(id: string) {
  const departmentMap = buildDepartmentMap()
  const selected = departmentMap.get(id)
  const nextName = selected?.displayName ?? ''

  if (props.mode === 'create') {
    createForm.sourceDepartmentId = id
    createForm.sourceDepartmentName = nextName
  } else if (transfer.value) {
    transfer.value = {
      ...transfer.value,
      sourceDepartmentId: id || null,
      sourceDepartmentName: nextName,
      departmentId: id || null,
      departmentName: nextName,
    }
  }
}

function applyTargetWarehouseSelection(id: string, clearLocations: boolean) {
  const warehouseMap = buildWarehouseMap()
  const selected = warehouseMap.get(id)
  const nextCode = selected?.code ?? ''

  if (props.mode === 'create') {
    createForm.targetWarehouseId = id
    createForm.targetWarehouseCode = nextCode
  } else if (transfer.value) {
    transfer.value = {
      ...transfer.value,
      targetWarehouseId: id || null,
      targetWarehouseCode: nextCode,
    }
  }

  detailDraftRows.value = detailDraftRows.value.map((item) => ({
    ...item,
    targetWarehouseId: id || undefined,
    targetWarehouseCode: nextCode,
    targetLocationId: clearLocations ? '' : item.targetLocationId,
    targetLocationCode: clearLocations ? '' : item.targetLocationCode,
  }))
}

function confirmSourceWarehouseChange(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    dialog.warning({
      title: '确认变更来源仓库',
      content: '修改来源仓库会清空明细行，是否继续？',
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => finish(true),
      onNegativeClick: () => finish(false),
      onClose: () => finish(false),
    })
  })
}

function resolveMovableContainerType(raw: unknown) {
  if (raw === containerApi.ContainerType.Turnover || raw === 'Turnover' || raw === '0' || raw === 0) return '周转盘'
  if (raw === containerApi.ContainerType.FinishedGoods || raw === 'FinishedGoods' || raw === '1' || raw === 1) return '成品盘'
  if (raw === containerApi.ContainerType.Virtual || raw === 'Virtual' || raw === '2' || raw === 2) return '虚拟盘'
  return '-'
}

const movableRows = computed<MovableFlatRow[]>(() => {
  const keyword = movableQuery.keyword.trim().toLowerCase()
  const flattened = movableContainers.value.flatMap<MovableFlatRow>((container) => {
    const inventories = container.inventories ?? []
    if (inventories.length === 0) {
      return [{
        id: `${container.containerId}-empty`,
        containerId: container.containerId,
        containerNo: container.containerNo,
        containerType: resolveMovableContainerType(container.containerType),
        currentLocationCode: container.currentLocationCode,
        productCode: '',
        productName: '',
        craftVersion: '',
        batchNo: '',
        quantity: 0,
        uom: '',
      }]
    }

    return inventories.map((inventory) => ({
      id: `${container.containerId}-${inventory.inventoryId}`,
      containerId: container.containerId,
      containerNo: container.containerNo,
      containerType: resolveMovableContainerType(container.containerType),
      currentLocationCode: container.currentLocationCode,
      productCode: inventory.productCode,
      productName: inventory.productName,
      craftVersion: inventory.craftVersion ?? '',
      batchNo: inventory.batchNo,
      quantity: Number(inventory.quantity ?? 0),
      uom: inventory.uom,
    }))
  })

  return flattened.filter((row) => {
    if (!keyword) return true
    return [
      row.containerNo,
      row.containerType,
      row.currentLocationCode,
      row.productCode,
      row.productName,
      row.craftVersion,
      row.batchNo,
    ].some((item) => (item ?? '').toLowerCase().includes(keyword))
  })
})

const containerGroupMeta = computed(() => {
  const map = new Map<string, { start: number; rowSpan: number }>()
  movableRows.value.forEach((row, index) => {
    const current = map.get(row.containerId)
    if (!current) {
      map.set(row.containerId, { start: index, rowSpan: 1 })
    } else {
      current.rowSpan += 1
    }
  })
  return map
})

const selectedContainerRows = computed<containerApi.MovableContainerDto[]>(() => {
  const keySet = new Set(checkedMovableContainerIds.value)
  return movableContainers.value.filter((item) => keySet.has(item.containerId))
})

function isGroupStart(row: MovableFlatRow, rowIndex: number) {
  const group = containerGroupMeta.value.get(row.containerId)
  return Boolean(group && group.start === rowIndex)
}

function getContainerRowSpan(containerId: string) {
  const group = containerGroupMeta.value.get(containerId)
  return group?.rowSpan ?? 1
}

function containerColRowSpan(row: MovableFlatRow, rowIndex: number) {
  if (isGroupStart(row, rowIndex)) return getContainerRowSpan(row.containerId)
  return 0
}

function isGroupEnd(row: MovableFlatRow, rowIndex: number) {
  const group = containerGroupMeta.value.get(row.containerId)
  if (!group) return false
  return rowIndex === group.start + group.rowSpan - 1
}

function getMovableRowClass(row: MovableFlatRow, rowIndex: number) {
  const classes: string[] = []
  if (isGroupStart(row, rowIndex)) classes.push('movable-group-start')
  else classes.push('movable-group-inner')
  if (isGroupEnd(row, rowIndex)) classes.push('movable-group-end')
  return classes.join(' ')
}

function toggleContainerChecked(containerId: string, checked: boolean) {
  if (checked) {
    if (!checkedMovableContainerIds.value.includes(containerId)) {
      checkedMovableContainerIds.value = [...checkedMovableContainerIds.value, containerId]
    }
    return
  }
  checkedMovableContainerIds.value = checkedMovableContainerIds.value.filter((id) => id !== containerId)
}

const movableColumns = computed<DataTableColumns<MovableFlatRow>>(() => [
  {
    title: '',
    key: 'checkbox',
    width: 50,
    align: 'center',
    rowSpan: containerColRowSpan,
    render: (row) =>
      h(NCheckbox, {
        checked: checkedMovableContainerIds.value.includes(row.containerId),
        'onUpdate:checked': (value: boolean) => toggleContainerChecked(row.containerId, value),
      }),
  },
  {
    title: '盘号',
    key: 'containerNo',
    minWidth: 140,
    rowSpan: containerColRowSpan,
    render: (row) => row.containerNo || '-',
  },
  {
    title: '盘具类型',
    key: 'containerType',
    width: 100,
    rowSpan: containerColRowSpan,
    render: (row) => row.containerType || '-',
  },
  {
    title: '当前库位',
    key: 'currentLocationCode',
    minWidth: 140,
    rowSpan: containerColRowSpan,
    render: (row) => row.currentLocationCode || '-',
  },
  {
    title: '物料编码',
    key: 'productCode',
    minWidth: 140,
    render: (row) => row.productCode || '-',
  },
  {
    title: '物料名称',
    key: 'productName',
    minWidth: 160,
    render: (row) => row.productName || '-',
  },
  {
    title: '工艺版本',
    key: 'craftVersion',
    minWidth: 120,
    render: (row) => row.craftVersion || '-',
  },
  {
    title: '批次号',
    key: 'batchNo',
    minWidth: 120,
    render: (row) => row.batchNo || '-',
  },
  {
    title: '数量',
    key: 'quantity',
    width: 90,
    align: 'right',
    rowSpan: (_row, _idx) => 1,
    render: (row) => String(row.quantity ?? 0),
  },
  {
    title: '单位',
    key: 'uom',
    width: 70,
    render: (row) => row.uom || '-',
  },
])

async function loadDetail() {
  if (props.mode === 'create') {
    transfer.value = null
    return
  }
  if (!props.transferId) {
    transfer.value = null
    return
  }
  loading.value = true
  try {
    const data = await transferApi.get(props.transferId)
    transfer.value = data
    detailDraftRows.value = (data.details ?? []).map(cloneDetailRow)
  } catch (e) {
    transfer.value = null
    detailDraftRows.value = []
    message.error(e instanceof Error ? e.message : '加载详情失败')
  } finally {
    loading.value = false
  }
}

async function loadMovableContainers() {
  const sourceWarehouseId = selectedSourceWarehouseId.value
  if (!sourceWarehouseId) {
    movableContainers.value = []
    return
  }
  movableLoading.value = true
  try {
    const data = await containerApi.getMovableContainers(sourceWarehouseId)
    movableContainers.value = data ?? []
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载可调拨库存失败')
  } finally {
    movableLoading.value = false
  }
}

async function loadWarehouses() {
  if (props.mode === 'view') return
  warehouseLoading.value = true
  try {
    let currentUserId = ''
    try {
      const appConfig = await request.get<{ currentUser?: { id?: string } }>('/api/abp/application-configuration')
      currentUserId = appConfig.data?.currentUser?.id ?? ''
    } catch {
      currentUserId = ''
    }

    if (!currentUserId) {
      const username = authStore.user?.username?.trim().toLowerCase()
      if (username) {
        try {
          const userPage = await usersApi.getList({
            skipCount: 0,
            maxResultCount: 20,
            filter: username,
          })
          const matchedUser = (userPage.items ?? []).find((item) => (item.userName ?? '').trim().toLowerCase() === username)
          currentUserId = matchedUser?.id ?? ''
        } catch {
          currentUserId = ''
        }
      }
    }

    const data = await warehouseApi.getList({ maxResultCount: 1000, skipCount: 0 })
    warehouses.value = data.items ?? []

    if (props.mode === 'create') {
      if (contextWarehouseId.value) {
        allowedSourceWarehouseIds.value = []
        applySourceWarehouseSelection(contextWarehouseId.value)
      } else {
        if (currentUserId) {
          const warehouseIds = await warehouseApi.getWarehousesByUser(currentUserId)
          allowedSourceWarehouseIds.value = (warehouseIds ?? []).map((id) => String(id))
        } else {
          allowedSourceWarehouseIds.value = []
        }

        const allowedSet = new Set(allowedSourceWarehouseIds.value)
        if (createForm.sourceWarehouseId && !allowedSet.has(createForm.sourceWarehouseId)) {
          applySourceWarehouseSelection('')
        }
      }
    }
  } catch (e) {
    warehouses.value = []
    allowedSourceWarehouseIds.value = []
    message.error(e instanceof Error ? e.message : '加载仓库数据失败')
  } finally {
    warehouseLoading.value = false
  }
}

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

async function loadDepartments() {
  if (props.mode === 'view') return
  departmentLoading.value = true
  try {
    let currentUserId = ''
    try {
      const appConfig = await request.get<{ currentUser?: { id?: string } }>('/api/abp/application-configuration')
      currentUserId = appConfig.data?.currentUser?.id ?? ''
    } catch {
      currentUserId = ''
    }

    if (!currentUserId) {
      const username = authStore.user?.username?.trim().toLowerCase()
      if (username) {
        try {
          const userPage = await usersApi.getList({
            skipCount: 0,
            maxResultCount: 20,
            filter: username,
          })
          const matchedUser = (userPage.items ?? []).find((item) => (item.userName ?? '').trim().toLowerCase() === username)
          currentUserId = matchedUser?.id ?? ''
        } catch {
          currentUserId = ''
        }
      }
    }

    const treeResult = await organizationUnitsApi.getTree()
    departments.value = flattenDepartments(treeResult.items ?? [])

    if (props.mode === 'create') {
      if (contextDepartmentId.value) {
        allowedSourceDepartmentIds.value = []
        applySourceDepartmentSelection(contextDepartmentId.value)
      } else {
        if (currentUserId) {
          const allowedIds: string[] = []
          for (const department of departments.value) {
            try {
              const users = await organizationUnitsApi.getUsers(department.id)
              const exists = users.some((item) => (item.id ?? '').trim().toLowerCase() === currentUserId.trim().toLowerCase())
              if (exists) {
                allowedIds.push(department.id)
              }
            } catch {
              // Ignore department membership read failures for partial availability.
            }
          }
          allowedSourceDepartmentIds.value = allowedIds
        } else {
          allowedSourceDepartmentIds.value = []
        }

        const allowedSet = new Set(allowedSourceDepartmentIds.value)
        if (createForm.sourceDepartmentId && !allowedSet.has(createForm.sourceDepartmentId)) {
          applySourceDepartmentSelection('')
        }
      }
    }
  } catch (e) {
    departments.value = []
    allowedSourceDepartmentIds.value = []
    message.error(e instanceof Error ? e.message : '加载部门数据失败')
  } finally {
    departmentLoading.value = false
  }
}

async function loadTargetLocations() {
  if (!selectedTargetWarehouseId.value) {
    locationRows.value = []
    return
  }
  locationLoading.value = true
  try {
    const data = await locationApi.getLocationByWarehouseId(selectedTargetWarehouseId.value)
    const items = data.items ?? []
    const keyword = locationQuery.keyword.trim().toLowerCase()
    locationRows.value = keyword
      ? items.filter((item) => (item.code ?? '').toLowerCase().includes(keyword))
      : items
  } catch (e) {
    locationRows.value = []
    message.error(e instanceof Error ? e.message : '加载目标库位失败')
  } finally {
    locationLoading.value = false
  }
}

async function handleOpenLocationModal(row: transferApi.TransferDetailDto) {
  if (!selectedTargetWarehouseId.value) {
    message.warning('请先选择目标仓库')
    return
  }
  activeDetailRowId.value = row.id
  locationQuery.keyword = ''
  locationVisible.value = true
  await loadTargetLocations()
}

function handleLocationReset() {
  locationQuery.keyword = ''
  loadTargetLocations()
}

function handlePickLocation(location: locationApi.LocationDto) {
  if (!activeDetailRowId.value) return
  const activeRow = detailDraftRows.value.find((item) => item.id === activeDetailRowId.value)
  if (!activeRow?.containerId) return
  detailDraftRows.value = detailDraftRows.value.map((item) => {
    if (item.containerId !== activeRow.containerId) return item
    return {
      ...item,
      targetLocationId: location.id,
      targetLocationCode: location.code,
    }
  })
  locationVisible.value = false
}

async function handleSourceWarehouseChange(value: string | null) {
  const id = value ?? ''
  const currentId = selectedSourceWarehouseId.value
  if (id === currentId) return

  if (props.mode === 'edit') {
    message.warning('编辑状态下来源仓库不允许修改')
    return
  }

  if (props.mode === 'create' && contextWarehouseId.value) {
    if (id !== contextWarehouseId.value) {
      applySourceWarehouseSelection(contextWarehouseId.value)
      message.warning('已选择当前作业仓库，来源仓库不允许修改')
      return
    }
  }

  if (props.mode === 'create' && id) {
    const allowedSet = new Set(allowedSourceWarehouseIds.value.map((item) => String(item)))
    if (!allowedSet.has(id)) {
      message.warning('来源仓库仅可选择当前用户所属仓库')
      return
    }
  }

  if (currentId && detailDraftRows.value.length > 0) {
    const confirmed = await confirmSourceWarehouseChange()
    if (!confirmed) return
    detailDraftRows.value = []
  }

  applySourceWarehouseSelection(id)
}

function handleSourceDepartmentChange(value: string | null) {
  const id = value ?? ''
  const currentId = selectedSourceDepartmentId.value
  if (id === currentId) return

  if (props.mode === 'edit') {
    message.warning('编辑状态下来源部门不允许修改')
    return
  }

  if (props.mode === 'create' && contextDepartmentId.value) {
    if (id !== contextDepartmentId.value) {
      applySourceDepartmentSelection(contextDepartmentId.value)
      message.warning('已选择当前作业部门，来源部门不允许修改')
      return
    }
  }

  if (props.mode === 'create' && id) {
    const allowedSet = new Set(allowedSourceDepartmentIds.value.map((item) => String(item)))
    if (!allowedSet.has(id)) {
      message.warning('来源部门仅可选择当前用户所属部门')
      return
    }
  }

  applySourceDepartmentSelection(id)
}

function handleTargetWarehouseChange(value: string | null) {
  const id = value ?? ''
  const currentId = selectedTargetWarehouseId.value
  if (id === currentId) return
  applyTargetWarehouseSelection(id, true)
}

function handleDeleteSelectedDetails() {
  if (checkedDetailRowIds.value.length === 0) {
    message.warning('请先选择要删除的明细行')
    return
  }

  const selectedSet = new Set(checkedDetailRowIds.value)
  const selectedContainerIdSet = new Set(
    detailDraftRows.value
      .filter((item) => selectedSet.has(item.id))
      .map((item) => item.containerId)
      .filter((containerId) => Boolean(containerId)),
  )

  if (selectedContainerIdSet.size === 0) {
    message.warning('未找到可删除的明细')
    return
  }

  const beforeCount = detailDraftRows.value.length
  detailDraftRows.value = detailDraftRows.value.filter((item) => !selectedContainerIdSet.has(item.containerId))
  const removedCount = beforeCount - detailDraftRows.value.length
  checkedDetailRowIds.value = []

  if (removedCount > 0) {
    message.success(`已删除 ${removedCount} 行明细`)
  }
}

function handleDetailCheckedRowKeysUpdate(keys: Array<string | number>) {
  checkedDetailRowIds.value = keys.map((key) => String(key))
}

async function handleOpenMovableModal() {
  if (!selectedSourceWarehouseId.value) {
    message.warning('请先选择来源仓库')
    return
  }
  movableVisible.value = true
  movableQuery.keyword = ''
  checkedMovableContainerIds.value = []
  await loadMovableContainers()
}

function handleCloseMovableModal() {
  movableVisible.value = false
}

function handleMovableQuery() {
  checkedMovableContainerIds.value = checkedMovableContainerIds.value.filter((containerId) =>
    movableRows.value.some((row) => row.containerId === containerId),
  )
}

function handleMovableReset() {
  movableQuery.keyword = ''
  checkedMovableContainerIds.value = []
}

function handleConfirmAddMovable() {
  if (selectedContainerRows.value.length === 0) {
    message.warning('请至少选择一个盘具')
    return
  }

  const mappedRows = selectedContainerRows.value.flatMap<transferApi.TransferDetailDto>((container) => {
    const inventories = container.inventories ?? []
    return inventories.map((inventory) => ({
      id: `local-${container.containerId}-${inventory.inventoryId}`,
      containerId: container.containerId,
      containerCode: container.containerNo,
      inventoryId: inventory.inventoryId,
      productId: inventory.productId,
      productCode: inventory.productCode,
      productName: inventory.productName,
      craftVersion: inventory.craftVersion ?? '',
      qty: Number(inventory.quantity ?? 0),
      sourceLocationId: container.currentLocationId,
      sourceLocationCode: container.currentLocationCode,
      targetLocationId: '',
      targetLocationCode: '',
      sourceWarehouseId: selectedSourceWarehouseId.value || undefined,
      sourceWarehouseCode: selectedSourceWarehouseCode.value,
      targetWarehouseId: selectedTargetWarehouseId.value || undefined,
      targetWarehouseCode: selectedTargetWarehouseCode.value,
      isCompleted: false,
    }))
  })

  if (mappedRows.length === 0) {
    message.warning('所选盘具暂无可映射的库存明细')
    return
  }

  const exists = new Set(detailRows.value.map(getDetailIdentity))
  const rowsToAdd = mappedRows.filter((row) => !exists.has(getDetailIdentity(row)))

  if (rowsToAdd.length === 0) {
    message.info('所选数据已存在于明细中')
    movableVisible.value = false
    return
  }

  detailDraftRows.value = [...detailDraftRows.value, ...rowsToAdd]
  message.success(`已新增 ${rowsToAdd.length} 行调拨明细`)
  movableVisible.value = false
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleBack() {
  router.push({ name: 'TransferOrderList' })
}

async function handleApproveAndExecute() {
  if (props.mode !== 'edit') return
  const id = props.transferId?.trim()
  if (!id) {
    message.warning('缺少调拨单ID，无法审核')
    return
  }

  const saved = await saveEditTransfer(false)
  if (!saved) {
    return
  }

  approving.value = true
  try {
    await transferApi.approveAndExecute(id)
    message.success('审核成功，已开始执行')
    await loadDetail()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '审核失败')
  } finally {
    approving.value = false
  }
}

async function handleSaveCreate() {
  if (props.mode !== 'create') return

  const sourceDepartmentId = contextDepartmentId.value || createForm.sourceDepartmentId.trim()
  const sourceWarehouseId = contextWarehouseId.value || createForm.sourceWarehouseId.trim()
  const targetWarehouseId = createForm.targetWarehouseId.trim()
  const details = detailDraftRows.value

  if (contextDepartmentId.value && createForm.sourceDepartmentId !== contextDepartmentId.value) {
    applySourceDepartmentSelection(contextDepartmentId.value)
  }
  if (contextWarehouseId.value && createForm.sourceWarehouseId !== contextWarehouseId.value) {
    applySourceWarehouseSelection(contextWarehouseId.value)
  }

  if (!sourceDepartmentId) {
    message.warning('请选择来源部门')
    return
  }
  if (!contextDepartmentId.value) {
    const allowedDepartmentSet = new Set(allowedSourceDepartmentIds.value.map((id) => String(id)))
    if (!allowedDepartmentSet.has(sourceDepartmentId)) {
      message.warning('来源部门仅可选择当前用户所属部门')
      return
    }
  }

  if (!sourceWarehouseId) {
    message.warning('请选择来源仓库')
    return
  }
  if (!contextWarehouseId.value) {
    const allowedSet = new Set(allowedSourceWarehouseIds.value.map((id) => String(id)))
    if (!allowedSet.has(sourceWarehouseId)) {
      message.warning('来源仓库仅可选择当前用户所属仓库')
      return
    }
  }
  if (!targetWarehouseId) {
    message.warning('请选择目标仓库')
    return
  }
  if (details.length === 0) {
    message.warning('请先添加调拨明细')
    return
  }

  const invalidLocation = details.find((item) => !item.targetLocationId)
  if (invalidLocation) {
    message.warning('请为每条明细选择目标库位')
    return
  }

  const payload: transferApi.CreateTransferDto = {
    sourceDepartmentId,
    sourceWarehouseId,
    targetWarehouseId,
    details: details.map((item) => ({
      containerId: item.containerId,
      inventoryId: item.inventoryId,
      productId: item.productId,
      qty: Number(item.qty ?? 0),
      sourceLocationId: item.sourceLocationId,
      targetLocationId: item.targetLocationId,
    })),
  }

  saving.value = true
  try {
    const created = await transferApi.create(payload)
    message.success(created?.orderNo ? `保存成功：${created.orderNo}` : '保存成功')
    if (created?.id) {
      router.push({ name: 'TransferOrderEdit', params: { id: created.id } })
      return
    }
    router.push({ name: 'TransferOrderList' })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleSaveEdit() {
  await saveEditTransfer(true)
}

async function saveEditTransfer(showSuccessMessage: boolean) {
  if (props.mode !== 'edit') return false
  const id = props.transferId?.trim()
  const currentTransfer = transfer.value
  if (!id || !currentTransfer) {
    message.warning('缺少调拨单ID，无法保存')
    return false
  }

  const sourceWarehouseId = selectedSourceWarehouseId.value.trim()
  const targetWarehouseId = selectedTargetWarehouseId.value.trim()
  const details = detailDraftRows.value

  if (!sourceWarehouseId) {
    message.warning('请选择来源仓库')
    return false
  }
  if (!targetWarehouseId) {
    message.warning('请选择目标仓库')
    return false
  }
  if (details.length === 0) {
    message.warning('请至少保留一条调拨明细')
    return false
  }

  const invalidLocation = details.find((item) => !item.targetLocationId)
  if (invalidLocation) {
    message.warning('请为每条明细选择目标库位')
    return false
  }

  const payload: transferApi.TransferDto = {
    ...currentTransfer,
    id,
    sourceWarehouseId,
    sourceWarehouseCode: selectedSourceWarehouseCode.value,
    targetWarehouseId,
    targetWarehouseCode: selectedTargetWarehouseCode.value,
    details: details.map((item) => ({
      ...item,
      id: normalizeGuid(item.id),
      qty: Number(item.qty ?? 0),
      sourceWarehouseId: sourceWarehouseId,
      sourceWarehouseCode: selectedSourceWarehouseCode.value,
      targetWarehouseId: targetWarehouseId,
      targetWarehouseCode: selectedTargetWarehouseCode.value,
    })),
  }

  saving.value = true
  try {
    const updated = await transferApi.update(payload)
    transfer.value = updated
    detailDraftRows.value = (updated.details ?? []).map(cloneDetailRow)
    if (showSuccessMessage) {
      message.success('保存成功')
    }
    return true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
    return false
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadColumnSettings()
  loadWarehouses()
  loadDepartments()
})

watch(
  () => [props.transferId, props.mode],
  () => {
    detailDraftRows.value = []
    checkedDetailRowIds.value = []
    loadDetail()
  },
  { immediate: true },
)

watch(
  detailRows,
  (rows) => {
    const idSet = new Set(rows.map((item) => item.id))
    checkedDetailRowIds.value = checkedDetailRowIds.value.filter((id) => idSet.has(id))
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
            <n-button v-if="props.mode !== 'create'" type="primary" :loading="loading" @click="loadDetail">刷新</n-button>
            <n-button v-if="props.mode === 'edit'" v-permission="'WMS.InternalOps.TransferOrders.Approve'"
              type="primary" secondary :loading="approving" @click="handleApproveAndExecute">审核</n-button>
            <n-button v-if="props.mode === 'edit'" v-permission="'WMS.InternalOps.TransferOrders.Update'"
              type="primary" :loading="saving" @click="handleSaveEdit">保存</n-button>
            <n-button v-if="props.mode === 'create'" type="primary" :loading="saving"
              @click="handleSaveCreate">保存</n-button>
          </div>

          <n-descriptions
            class="transfer-header-descriptions"
            bordered
            label-placement="left"
            :column="3"
            :label-style="headerLabelStyle"
            :content-style="headerContentStyle"
            style="margin-top: 10px;"
          >
            <n-descriptions-item label="调拨单号">
              {{ transfer?.orderNo || '-' }}
            </n-descriptions-item>
            <n-descriptions-item label="调拨状态">
              <n-tag size="small" :type="transfer ? getStatusTagType(transfer.status) : 'default'">
                {{ transfer ? resolveStatusLabel(transfer.status) : '-' }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="创建时间">
              {{ formatDateTime(transfer?.creationTime) }}
            </n-descriptions-item>
            <n-descriptions-item label="来源部门">
              <n-select v-if="props.mode !== 'view'" :value="selectedSourceDepartmentId || null"
                :loading="departmentLoading" :options="sourceDepartmentOptions" :disabled="isSourceDepartmentReadonly"
                :clearable="!isSourceDepartmentReadonly"
                :placeholder="isSourceDepartmentReadonly ? '来源部门已锁定' : '请选择来源部门'"
                @update:value="handleSourceDepartmentChange" />
              <template v-else>
                {{ selectedSourceDepartmentName || '-' }}
              </template>
            </n-descriptions-item>
            <n-descriptions-item label="来源仓库">
              <n-select v-if="props.mode !== 'view'" :value="selectedSourceWarehouseId || null"
                :loading="warehouseLoading" :options="sourceWarehouseOptions" :disabled="isSourceWarehouseReadonly"
                :clearable="!isSourceWarehouseReadonly"
                :placeholder="isSourceWarehouseReadonly ? '来源仓库已锁定' : '请选择来源仓库'"
                @update:value="handleSourceWarehouseChange" />
              <template v-else>
                {{ transfer?.sourceWarehouseCode || '-' }}
              </template>
            </n-descriptions-item>
            <n-descriptions-item label="目标仓库">
              <n-select v-if="props.mode !== 'view'" :value="selectedTargetWarehouseId || null"
                :loading="warehouseLoading" :options="warehouseOptions" clearable placeholder="请选择目标仓库"
                @update:value="handleTargetWarehouseChange" />
              <template v-else>
                {{ transfer?.targetWarehouseCode || '-' }}
              </template>
            </n-descriptions-item>
          </n-descriptions>

          <div v-if="props.mode === 'view'" class="detail-progress-wrap">
            <n-text class="detail-progress-label">总体进度</n-text>
            <n-progress class="detail-progress-bar" type="line" :percentage="progressPercentage" :height="14"
              :show-indicator="false" :border-radius="8" :fill-border-radius="8" status="success" />
            <n-text depth="3" class="detail-progress-meta">
              {{ progressPercentage }}%（已完成: {{ completedCount }}/{{ detailTotalCount }} 盘）
            </n-text>
          </div>
        </div>
      </template>

      <template #actions-left>
        <div class="crud-action-main">
          <n-button v-if="props.mode !== 'view'" v-permission="'WMS.InternalOps.TransferOrders.CreateDetails'"
            type="primary" secondary @click="handleOpenMovableModal">新增</n-button>
          <n-button v-if="props.mode !== 'view'" v-permission="'WMS.InternalOps.TransferOrders.DeleteDetails'"
            type="error" secondary :disabled="checkedDetailRowIds.length === 0" @click="handleDeleteSelectedDetails">
            删除
          </n-button>
        </div>
      </template>

      <template #actions-right>
        <div class="crud-action-tools">
          <TableColumnManager :show="showColumnConfig" :settings="columnSettings"
            @update:show="handleColumnConfigShowChange" @visible-change="handleColumnVisibleChange" />
        </div>
      </template>

      <template #data>
        <n-data-table class="crud-table-flat" :loading="loading" :columns="detailColumns" :data="detailRows"
          :bordered="false" :checked-row-keys="checkedDetailRowIds" :row-key="(row) => row.id"
          @update:checked-row-keys="handleDetailCheckedRowKeysUpdate">
          <template #empty>
            <n-empty description="暂无调拨明细" />
          </template>
        </n-data-table>
      </template>
    </BaseCrudPage>

    <n-modal class="movable-modal-fullscreen" :show="movableVisible" preset="card" title="新增调拨库存"
      style="width: 100vw; height: 100vh; margin: 0"
      @update:show="(value) => { if (!value) handleCloseMovableModal() }">
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input :value="movableQuery.keyword" placeholder="请输入盘号/库位/物料关键字" clearable
            @update:value="(value) => { movableQuery.keyword = value; handleMovableQuery() }" />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item>
          <n-button @click="handleMovableReset">重置</n-button>
        </n-form-item>
        <n-form-item>
          <n-text depth="3">已选 {{ selectedContainerRows.length }} 个盘具</n-text>
        </n-form-item>
      </n-form>

      <n-spin :show="movableLoading">
        <n-empty v-if="movableRows.length === 0" description="暂无可调拨盘具" />
        <n-data-table v-else class="movable-table-grid" :columns="movableColumns" :data="movableRows" :bordered="false"
          :row-key="(row) => row.id" :row-class-name="getMovableRowClass" :max-height="'calc(100vh - 280px)'"
          :single-line="false" />
      </n-spin>

      <template #footer>
        <div class="modal-footer">
          <n-button @click="handleCloseMovableModal">取消</n-button>
          <n-button type="primary" @click="handleConfirmAddMovable">确认添加</n-button>
        </div>
      </template>
    </n-modal>

    <n-modal :show="locationVisible" preset="card" title="选择目标库位" style="width: 900px"
      @update:show="(value) => { if (!value) locationVisible = false }">
      <n-form inline class="crud-search-form">
        <n-form-item>
          <n-input :value="locationQuery.keyword" placeholder="请输入库位编码" clearable
            @update:value="(value) => { locationQuery.keyword = value }" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" :loading="locationLoading" @click="loadTargetLocations">查询</n-button>
        </n-form-item>
        <n-form-item>
          <n-button @click="handleLocationReset">重置</n-button>
        </n-form-item>
      </n-form>

      <n-spin :show="locationLoading">
        <n-empty v-if="locationRows.length === 0" description="暂无可选目标库位" />
        <n-data-table v-else :columns="[
          { title: '库位编码', key: 'code', minWidth: 180, render: (row) => row.code || '-' },
          { title: '巷道', key: 'aisle', width: 100, render: (row) => row.aisle || '-' },
          { title: '货架', key: 'rack', width: 100, render: (row) => row.rack || '-' },
          { title: '层', key: 'level', width: 80, render: (row) => row.level || '-' },
          { title: '位', key: 'bin', width: 100, render: (row) => row.bin || '-' },
          { title: '操作', key: 'actions', width: 100, align: 'center', render: (row) => h(NButton, { size: 'small', type: 'primary', onClick: () => handlePickLocation(row) }, { default: () => '选择' }) },
        ]" :data="locationRows" :bordered="false" :row-key="(row) => row.id" :max-height="500" />
      </n-spin>
    </n-modal>
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.movable-modal-fullscreen {
  margin: 0;
}

.movable-modal-fullscreen :deep(.n-card) {
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  margin: 0;
  border-radius: 0;
}

.movable-modal-fullscreen :deep(.n-card__content) {
  overflow: auto;
}

.target-location-picker {
  width: 100%;
}

.target-location-picker__trigger {
  min-width: 32px;
  padding: 0 8px;
  font-size: 16px;
  line-height: 1;
}

.target-location-picker :deep(.n-input),
.target-location-picker :deep(.n-input__state-border),
.target-location-picker :deep(.n-input__border) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.target-location-picker :deep(.n-input__input-el) {
  cursor: pointer;
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

.transfer-header-descriptions :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.transfer-header-descriptions :deep(.n-descriptions-table-header) {
  width: 120px;
}
</style>
