<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NProgress,
  NSelect,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, InputInst, SelectOption } from 'naive-ui'

import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'
import * as receiptApi from '../../../api/inbound/receipt'
import { getList as getContainerList } from '../../../api/masterData/container'
import { getList, getWithDetails } from '../../../api/masterData/warehouse'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const receiptId = computed(() => route.params.id as string)
const receipt = ref<receiptApi.Receipt | null>(null)
const details = ref<ReceiptDetailRow[]>([])
const loading = ref(false)

type ReceiptDetailRow = receiptApi.ReceiptDetail & {
  id?: string
  containerNo?: string
  productName?: string
  planQuantity?: number
  actualQuantity?: number
  isReceived?: boolean
  sn?: string
  craftVersion?: string
  layerIndex?: number
  weight?: number
  status?: receiptApi.InventoryStatus
  toWarehouseId?: string
  batchNo?: string
  locationCode?: string
}

const scanCode = ref('')
const scanInputRef = ref<InputInst | null>(null)
const defaultLocationId = ref<string | null>(null)
const defaultWarehouseId = ref<string | null>(null)

const locationOptions = ref<SelectOption[]>([])
const locationLoading = ref(false)

const warehouseOptions = ref<SelectOption[]>([])
const warehouseLoading = ref(false)

async function loadWarehouseOptions(keyword?: string) {
  warehouseLoading.value = true
  try {
    const data = await getList({
      maxResultCount: 200,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    })
    const items = data.items ?? []
    warehouseOptions.value = items.map((item) => ({
      label: `${item.code} ${item.name}`,
      value: item.id ?? item.code,
    }))
  } finally {
    warehouseLoading.value = false
  }
}

function handleWarehouseSearch(keyword: string) {
  loadWarehouseOptions(keyword)
}

function handleLocationSearch(keyword: string) {
  loadLocationOptions(keyword)
}

function handleDefaultWarehouseChange(value: string | null) {
  defaultWarehouseId.value = value
  defaultLocationId.value = null
  executeForm.locationId = ''
  loadLocationOptions()
}

async function loadLocationOptions(keyword?: string) {
  if (!defaultWarehouseId.value) {
    locationOptions.value = []
    defaultLocationId.value = null
    return
  }

  locationLoading.value = true
  try {
    const data = await getWithDetails(defaultWarehouseId.value)
    const locations =
      (data.zones ?? []).flatMap((z) => z.locations ?? []) ?? []

    const filter = keyword?.trim()
    const filtered = filter
      ? locations.filter((l) => (l.code ?? '').includes(filter))
      : locations

    locationOptions.value = filtered.map((item) => ({
      label: item.code,
      value: item.id ?? item.code,
    }))

    if (!defaultLocationId.value && locationOptions.value.length > 0) {
      defaultLocationId.value = String(locationOptions.value[0]?.value ?? '')
    }
  } finally {
    locationLoading.value = false
  }
}

watch(
  () => defaultWarehouseId.value,
  async () => {
    defaultLocationId.value = null
    executeForm.locationId = ''
    await loadLocationOptions()
  },
)

/* ---------- 鍗曟嵁鐘舵€?---------- */
function resolveStatus(raw?: number | string) {
  if (raw === 0 || raw === 'Draft') return '草稿'
  if (raw === 1 || raw === 'InProgress' || raw === 'Receiving') return '执行中'
  if (raw === 2 || raw === 'Completed') return '已完成'
  if (raw === 3 || raw === 'Cancelled') return '已取消'
  return '草稿'
}

function getStatusTagType(label: string) {
  if (label === '草稿') return 'default'
  if (label === '执行中') return 'warning'
  if (label === '已完成') return 'success'
  if (label === '已取消') return 'error'
  return 'default'
}

/* ---------- 进度统 ---------- */
const totalCount = computed(() => details.value.length)
const receivedCount = computed(() => details.value.filter((d) => d.isReceived).length)
const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((receivedCount.value / totalCount.value) * 100)
})

/* ---------- 数据加载 ---------- */
async function refreshData() {
  if (!receiptId.value) return
  loading.value = true
  try {
    const data = await receiptApi.get(receiptId.value)
    receipt.value = data
    details.value = data.details ?? []
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

/* ---------- 扏执 ---------- */
async function handleScanContainer() {
  const code = scanCode.value.trim()
  if (!code) {
    message.warning('请先输入/扫描托盘号或线盘号')
    scanInputRef.value?.focus()
    return
  }
  if (!defaultWarehouseId.value) {
    message.warning('请选择仓库')
    return
  }
  if (!defaultLocationId.value) {
    message.warning('请择默入库库位')
    return
  }

  try {
    const containerData = await getContainerList({ filter: code, maxResultCount: 10 })
    const targetContainer = (containerData.items ?? []).find((r) => r.containerCode === code)

    if (!targetContainer || !targetContainer.id) {
      throw new Error(`有到编号为 ${code} 的线盘信息`)
    }

    const locationOption = locationOptions.value.find(
      (option) => String(option.value) === String(defaultLocationId.value),
    )
    const targetDetail = details.value.find((d) => (d.containerNo ?? '') === code)
    if (!targetDetail) {
      message.error('有到应明细，无法执入库')
      scanInputRef.value?.select()
      return
    }

    if (targetDetail.isReceived) {
      message.warning('该明细已完成收货，无重执')
      scanInputRef.value?.select()
      return
    }

    // 校验工艺版本
    const craftVersion = (targetDetail.craftVersion ?? '').trim()
    if (!craftVersion) {
      message.error('该明细缺少工艺版本，无法按盘收货，请使用单条收货并填写工艺版本')
      scanInputRef.value?.select()
      return
    }

    // 鐢?planQuantity 作为要提交的实收数量，校验不?<= 0
    const submitQty = Number(targetDetail.planQuantity ?? 0)
    if (!Number.isFinite(submitQty) || submitQty <= 0) {
      message.error('该明细的计划数量必须大于 0，无法执行收货')
      scanInputRef.value?.select()
      return
    }

    // 赋实收数量（前展示甼
    targetDetail.actualQuantity = submitQty

    // 校验同一载具(线盘)上的明细库位昐?
    const sameContainerDetails = details.value.filter(
      (d) => (d.containerNo ?? '') === code && d.isReceived && d.locationId,
    )
    if (sameContainerDetails.length > 0) {
      const first = sameContainerDetails[0]!
      const existingLocationId = first.locationId
      if (existingLocationId && String(existingLocationId) !== String(defaultLocationId.value)) {
        message.error(
          `同一线盘 ${code} 已有明细入库到库位 ${first.locationCode ?? existingLocationId}，请保持一致`,
        )
        scanInputRef.value?.select()
        return
      }
    }

    targetDetail.locationId = String(defaultLocationId.value)
    targetDetail.locationCode = String(locationOption?.label ?? targetDetail.locationCode ?? '')

    await receiptApi.execute({
      receiptId: receiptId.value,
      detailId: String(targetDetail.id ?? ''),
      actualQuantity: submitQty,
      locationId: String(defaultLocationId.value),
      craftVersion,
    })

    message.success('执ɹ')
    scanCode.value = ''
    await refreshData()
    scanInputRef.value?.focus()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '执ʧ')
    scanInputRef.value?.select()
  }
}

/* ---------- 单ջ ---------- */
const modalVisible = ref(false)
const submitting = ref(false)
const currentRow = ref<ReceiptDetailRow | null>(null)

const formRef = ref<FormInst | null>(null)

const executeForm = reactive<receiptApi.ExecuteReceiptInput>({
  receiptId: '',
  detailId: '',
  actualQuantity: 0,
  locationId: '',
  sn: '',
  batchNo: '',
  craftVersion: '',
  status: receiptApi.InventoryStatus.Good,
  weight: undefined,
})

function normalizeExecuteStatus(
  status?: receiptApi.InventoryStatus,
): receiptApi.ExecuteReceiptInput['status'] | undefined {
  if (status === 'Good' || status === 'Quarantine' || status === 'Scrap') {
    return status
  }
  return undefined
}

const rules: FormRules = {
  actualQuantity: [
    { required: true, type: 'number', message: '请输入实收数量', trigger: ['input', 'blur'] },
    {
      trigger: ['input', 'blur'],
      validator: (_rule, value) => {
        const qty = Number(value ?? 0)
        if (!Number.isFinite(qty) || qty <= 0) {
          return new Error('实收数量必须大于 0')
        }
        return true
      },
    },
  ],
  locationId: [{ required: true, message: '请选择上架库位', trigger: ['change', 'blur'] }],
  craftVersion: [{ required: true, message: '请输入工艺版本', trigger: ['input', 'blur'] }],
}

const modalWarehouseId = ref<string | null>(null)

const modalLocationOptions = ref<SelectOption[]>([])
const modalLocationLoading = ref(false)

async function loadModalLocationOptions(keyword?: string) {
  if (!modalWarehouseId.value) {
    modalLocationOptions.value = []
    executeForm.locationId = ''
    return
  }

  modalLocationLoading.value = true
  try {
    const data = await getWithDetails(modalWarehouseId.value)
    const locations = (data.zones ?? []).flatMap((z) => z.locations ?? []) ?? []
    const filter = keyword?.trim()
    const filtered = filter
      ? locations.filter((l) => (l.code ?? '').includes(filter))
      : locations

    modalLocationOptions.value = filtered.map((item) => ({
      label: item.code,
      value: item.id ?? item.code,
    }))
  } finally {
    modalLocationLoading.value = false
  }
}

function handleModalWarehouseChange(value: string | null) {
  modalWarehouseId.value = value
  executeForm.locationId = ''
  loadModalLocationOptions()
}

function handleModalLocationSearch(keyword: string) {
  loadModalLocationOptions(keyword)
}

function handleExecuteLocationChange(value: string | null) {
  executeForm.locationId = String(value ?? '')
}

function handleExecuteStatusChange(value: receiptApi.InventoryStatus) {
  executeForm.status = normalizeExecuteStatus(value) ?? receiptApi.InventoryStatus.Good
}

function handleExecuteSingle(row: ReceiptDetailRow) {
  if (row.isReceived) return
  // 移除头表仓库校验
  currentRow.value = row

  executeForm.receiptId = receiptId.value
  executeForm.detailId = String(row.id ?? '')
  // 默带入上方选中的库位，但可在弹窗里单独俔
  executeForm.locationId = String(defaultLocationId.value ?? row.locationId ?? '')
  executeForm.sn = row.sn ?? ''
  executeForm.batchNo = row.batchNo ?? ''
  executeForm.craftVersion = row.craftVersion ?? ''
  // 实收数量默等于计划数量
  executeForm.actualQuantity = Number(row.planQuantity ?? 0)
  executeForm.status = normalizeExecuteStatus(row.status) ?? receiptApi.InventoryStatus.Good
  executeForm.weight = row.weight ?? undefined
  modalWarehouseId.value = row.toWarehouseId ?? defaultWarehouseId.value ?? null
  loadModalLocationOptions()

  modalVisible.value = true
}

async function handleConfirmExecute() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  const qty = executeForm.actualQuantity
  if (qty === null || qty === undefined || !Number.isFinite(qty) || qty <= 0) {
    message.error('实收数量必须大于 0')
    return
  }

  // 校验同一载具库位一致性
  const row = currentRow.value
  if (row) {
    const containerNo = row.containerNo ?? ''
    if (containerNo) {
      const sameContainerDetails = details.value.filter(
        (d) =>
          (d.containerNo ?? '') === containerNo &&
          d.id !== row.id &&
          d.isReceived &&
          d.locationId,
      )
      if (sameContainerDetails.length > 0) {
        const first = sameContainerDetails[0]!
        const existingLocationId = first.locationId
        if (
          existingLocationId &&
          String(existingLocationId) !== String(executeForm.locationId)
        ) {
          message.error(
            `同一线盘 ${containerNo} 已有明细入库到库位 ${first.locationCode ?? existingLocationId}，请保持一致`,
          )
          return
        }
      }
    }
  }

  submitting.value = true
  try {
    await receiptApi.execute({
      receiptId: executeForm.receiptId,
      detailId: executeForm.detailId,
      actualQuantity: executeForm.actualQuantity,
      locationId: String(executeForm.locationId ?? ''),
      sn: executeForm.sn?.trim() || undefined,
      batchNo: executeForm.batchNo?.trim() || undefined,
      craftVersion: executeForm.craftVersion.trim(),
      status: executeForm.status,
      weight: executeForm.weight,
    })
    message.success('收货成功')
    modalVisible.value = false
    await refreshData()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '收货失败')
  } finally {
    submitting.value = false
  }
}

/* ---------- 表格 ---------- */
const {
  showColumnConfig,
  columnSettings,
  loadColumnSettings,
  handleVisibleChange,
  createDraggableTitle,
} = useColumnConfig({
  storageKey: 'receipt-detail-column-settings-v1',
  preferredKeys: ['isReceived', 'containerNo', 'productName', 'planQuantity', 'actualQuantity', 'locationCode'],
  resolveTitle: (key) => {
    if (key === 'isReceived') return '状态'
    if (key === 'containerNo') return '线盘号'
    if (key === 'productName') return '产品'
    if (key === 'planQuantity') return '计划数量'
    if (key === 'actualQuantity') return '实收数量'
    if (key === 'locationCode') return '库位'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<ReceiptDetailRow>[number]> = {
  isReceived: {
    title: createDraggableTitle('isReceived', '状态'),
    key: 'isReceived',
    width: 100,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.isReceived, b.isReceived),
    render: (row) =>
      h(
        NTag,
        { type: row.isReceived ? 'success' : 'warning', size: 'small' },
        { default: () => (row.isReceived ? '已完成' : '待收货') },
      ),
  },
  containerNo: {
    title: createDraggableTitle('containerNo', '线盘号'),
    key: 'containerNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.containerNo, b.containerNo),
  },
  productName: {
    title: createDraggableTitle('productName', '产品'),
    key: 'productName',
    minWidth: 200,
    sorter: (a, b) => compareSortValue(a.productName, b.productName),
  },
  planQuantity: {
    title: createDraggableTitle('planQuantity', '计划数量'),
    key: 'planQuantity',
    width: 120,
    sorter: (a, b) => compareSortValue(a.planQuantity, b.planQuantity),
  },
  actualQuantity: {
    title: createDraggableTitle('actualQuantity', '实收数量'),
    key: 'actualQuantity',
    width: 120,
    sorter: (a, b) => compareSortValue(a.actualQuantity, b.actualQuantity),
    render: (row) => (row.actualQuantity ?? 0),
  },
  locationCode: {
    title: createDraggableTitle('locationCode', '库位'),
    key: 'locationCode',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.locationCode, b.locationCode),
    render: (row) => row.locationCode ?? '-',
  },
}

const columns = computed<DataTableColumns<ReceiptDetailRow>>(() => withResizable([
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<ReceiptDetailRow>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 140,
    align: 'center',
    render: (row) =>
      row.isReceived
        ? h(NButton, { size: 'small', disabled: true }, { default: () => '已完成' })
        : h(
            NButton,
            { size: 'small', type: 'primary', onClick: () => handleExecuteSingle(row) },
            { default: () => '收货' },
          ),
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

function goBack() {
  router.push({ name: 'ReceiptList' })
}

onMounted(async () => {
  loadColumnSettings()
  await refreshData()
  await loadWarehouseOptions()
  await loadLocationOptions()
  scanInputRef.value?.focus()
})
</script>

<template>
  <div class="page">
    <!-- Header -->
    <n-card :bordered="false">
      <div class="header">
        <div class="header-left">
          <n-descriptions :column="3" label-placement="left" bordered>
            <n-descriptions-item label="单据号">
              {{ receipt?.billNo ?? '-' }}
            </n-descriptions-item>
            <n-descriptions-item label="供应商">
              {{ receipt?.supplierName ?? '-' }}
            </n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag :type="getStatusTagType(resolveStatus(receipt?.status))" size="small">
                {{ resolveStatus(receipt?.status) }}
              </n-tag>
            </n-descriptions-item>
          </n-descriptions>
        </div>

        <div class="header-right">
          <div class="progress-text">
            已收 {{ receivedCount }} / {{ totalCount }}
          </div>
          <n-progress type="line" :percentage="progressPercent" />
        </div>
      </div>
    </n-card>

    <!-- Scanner Bar -->
    <n-card :bordered="false">
      <div class="scanner-bar">
        <n-input
          ref="scanInputRef"
          :value="scanCode"
          size="large"
          placeholder="请扫描托盘号/线盘号（Enter 执行）"
          @update:value="(value) => (scanCode = value)"
          @keydown.enter="handleScanContainer"
        />
        <n-select
          :value="defaultWarehouseId"
          filterable
          remote
          clearable
          :loading="warehouseLoading"
          :options="warehouseOptions"
          placeholder="仓库"
          style="width: 220px"
          @search="handleWarehouseSearch"
          @update:value="(value) => { defaultWarehouseId = value; handleDefaultWarehouseChange(value) }"
        />
        <n-select
          :value="defaultLocationId"
          filterable
          remote
          clearable
          :loading="locationLoading"
          :options="locationOptions"
          placeholder="默入库库位"
          style="width: 280px"
          @search="handleLocationSearch"
          @update:value="(value) => (defaultLocationId = value)"
        />
        <n-button @click="goBack">返回列表</n-button>
      </div>
    </n-card>

    <!-- Table -->
    <n-card :bordered="false">
      <div class="table-toolbar">
        <TableColumnManager
          :show="showColumnConfig"
          :settings="columnSettings"
          @update:show="handleColumnConfigShowChange"
          @visible-change="handleColumnVisibleChange"
        />
      </div>
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="details" :bordered="false" />
    </n-card>

    <!-- Modal -->
    <n-modal :show="modalVisible" preset="card" title="单条收货" style="width: 640px" @update:show="(value) => (modalVisible = value)">
      <n-form ref="formRef" :model="executeForm" :rules="rules" label-width="120">
        <n-form-item label="仓库">
          <n-select
            :value="modalWarehouseId"
            filterable
            remote
            clearable
            :loading="warehouseLoading"
            :options="warehouseOptions"
            placeholder="选择仓库"
            @search="handleWarehouseSearch"
            @update:value="(value) => { modalWarehouseId = value; handleModalWarehouseChange(value) }"
          />
        </n-form-item>

        <n-form-item label="实收数量" path="actualQuantity">
          <n-input-number :value="executeForm.actualQuantity" :min="1" :step="1" placeholder="必须大于0" @update:value="(value) => (executeForm.actualQuantity = value ?? 0)" />
        </n-form-item>

        <n-form-item label="实收重量">
          <n-input-number :value="executeForm.weight" :min="0" :step="0.1" @update:value="(value) => (executeForm.weight = value ?? undefined)" />
        </n-form-item>

        <n-form-item label="上架库位" path="locationId">
          <n-select
            :value="executeForm.locationId"
            filterable
            remote
            clearable
            :loading="modalLocationLoading"
            :options="modalLocationOptions"
            placeholder="搜索库位"
            @search="handleModalLocationSearch"
            @update:value="handleExecuteLocationChange"
          />
        </n-form-item>

        <n-form-item label="SN/条码">
          <n-input :value="executeForm.sn" placeholder="可选" @update:value="(value) => (executeForm.sn = value)" />
        </n-form-item>

        <n-form-item label="批">
          <n-input :value="executeForm.batchNo" placeholder="可选" @update:value="(value) => (executeForm.batchNo = value)" />
        </n-form-item>

        <n-form-item label="工艺版本" path="craftVersion">
          <n-input :value="executeForm.craftVersion" placeholder="必填" @update:value="(value) => (executeForm.craftVersion = value)" />
        </n-form-item>

        <n-form-item label="库存状态">
          <n-select
            :value="executeForm.status"
            :options="[
              { label: '良品', value: receiptApi.InventoryStatus.Good },
              { label: '隔离', value: receiptApi.InventoryStatus.Quarantine },
              { label: '报废', value: receiptApi.InventoryStatus.Scrap },
            ]"
            @update:value="handleExecuteStatusChange"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="modal-actions">
          <n-button @click="modalVisible = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleConfirmExecute">确认</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  flex: 1;
}

.header-right {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-text {
  font-weight: 600;
}

.scanner-bar {
  display: grid;
  grid-template-columns: 1fr 220px 280px auto;
  gap: 8px;
  align-items: center;
}

.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>