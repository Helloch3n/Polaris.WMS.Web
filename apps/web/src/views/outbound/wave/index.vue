<template>
  <div class="outbound-list-page">
    <BaseCrudPage>
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item>
            <n-input
              :value="searchForm.waveNo"
              placeholder="请输入波次号"
              clearable
              style="width: 200px"
              @update:value="(value) => (searchForm.waveNo = value)"
              @keyup.enter="loadWaves"
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
            <n-button :loading="loading" @click="loadWaves">查询</n-button>
          </n-form-item>
          <n-form-item>
            <n-button @click="resetSearch">重置</n-button>
          </n-form-item>
        </n-form>
      </template>

      <template #actions-left>
        <div class="crud-action-main">
          <n-button v-if="canCreateWave" type="primary" @click="() => openWaveCreate()">新建波次</n-button>
          <n-button :disabled="!selectedWave" @click="viewSelectedWave">查看</n-button>
          <n-button
            type="primary"
            secondary
            :disabled="!selectedWave || selectedWave.status !== waveApi.WaveOrderStatus.Created"
            @click="createPickListForSelected"
          >
            生成拣货单
          </n-button>
          <n-button :loading="loading" @click="loadWaves">刷新</n-button>
        </div>
      </template>

      <template #actions-right>
        <div class="crud-action-tools" style="display: flex; align-items: center; gap: 12px;">
          <n-radio-group v-model:value="currentView" size="small">
            <n-radio-button value="list">列表视图</n-radio-button>
            <n-radio-button value="kanban">看板视图</n-radio-button>
          </n-radio-group>
          <TableColumnManager
            v-if="currentView === 'list'"
            :show="showColumnConfig"
            :settings="columnSettings"
            @update:show="handleColumnConfigShowChange"
            @visible-change="handleColumnVisibleChange"
          />
        </div>
      </template>

      <template #data>
        <template v-if="currentView === 'list'">
          <n-data-table
            class="crud-table-flat"
            :columns="columns"
            :data="waves"
            :bordered="false"
            :loading="loading"
            :row-key="(row) => row.id"
            :checked-row-keys="checkedWaveKeys"
            @update:checked-row-keys="(keys) => (checkedWaveKeys = keys as string[])"
          />
        </template>
        <template v-else>
          <WaveKanbanBoard
            :waves="waves"
            :loading="loading"
            @view-detail="openDrawer"
            @create-picklist="openPickListCreate"
          />
        </template>
      </template>

      <template #pager-right>
        <n-pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="(page) => { pagination.page = page; loadWaves() }"
          @update:page-size="(size) => { pagination.pageSize = size; handlePageSizeChange(size) }"
        />
      </template>
    </BaseCrudPage>

    <n-modal v-model:show="waveCreateVisible" preset="card" title="从销售配货创建波次" style="width: 680px">
      <n-form label-width="110">
        <n-form-item label="已确认配货单">
          <n-select
            v-model:value="waveCreateForm.salesAllocationOrderIds"
            multiple
            filterable
            :options="allocationOrderOptions"
            :loading="allocationOrderLoading"
            placeholder="请选择同一仓库的销售配货"
          />
        </n-form-item>
        <n-form-item label="波次仓库">
          <n-text>{{ selectedAllocationWarehouse || '选择配货单后自动确定' }}</n-text>
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="waveCreateForm.remark" type="textarea" placeholder="可选" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="waveCreateVisible = false">取消</n-button>
          <n-button
            type="primary"
            :disabled="waveCreateForm.salesAllocationOrderIds.length === 0"
            :loading="creatingWave"
            @click="submitCreateWave"
          >
            创建波次
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Create PickList Modal -->
    <n-modal :show="pickListVisible" preset="card" title="生成拣货单" style="width: 480px" @update:show="(value) => (pickListVisible = value)">
      <n-form ref="pickListFormRef" :model="pickListForm" :rules="pickListRules" label-width="100">
        <n-form-item label="波次号">
          <n-text strong>{{ currentWave?.waveNo }}</n-text>
        </n-form-item>
        <n-form-item label="出库暂存位" path="targetLocationCode">
          <n-select
            :value="pickListForm.targetLocationCode"
            :options="locationOptions"
            placeholder="搜索并选择拣货下架暂存库位"
            filterable
            remote
            :loading="locationLoading"
            :on-search="handleLocationSearch"
            @focus="() => handleLocationSearch('')"
            @update:value="(val) => (pickListForm.targetLocationCode = val)"
          />
        </n-form-item>
        <n-form-item label="备注" path="remark">
          <n-input :value="pickListForm.remark" type="textarea" placeholder="请输入备注" @update:value="(val) => (pickListForm.remark = val)" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="pickListVisible = false">取消</n-button>
          <n-button type="primary" :loading="creatingPickList" @click="submitCreatePickList">生成</n-button>
        </n-space>
      </template>
    </n-modal>

  </div>
</template>

<script setup lang="ts">
import WmsStatusTag from '../../../components/WmsStatusTag.vue'
/* eslint-disable vue/no-v-model-argument */
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpace,
NText,
  NRadioGroup,
  NRadioButton,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, PaginationProps, SelectOption } from 'naive-ui'
import * as waveApi from '../../../api/outbound/wave'
import * as allocationOrderApi from '../../../api/outbound/salesAllocationOrder'
import * as pickListApi from '../../../api/outbound/pickList'
import * as locationApi from '../../../api/masterData/location'
import * as zoneApi from '../../../api/masterData/zone'
import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import WaveKanbanBoard from './components/WaveKanbanBoard.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { usePermission } from '../../../composables/usePermission'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'

const message = useMessage()
const { hasPermission } = usePermission()
const canCreateWave = computed(() => hasPermission('WMS.OutboundOps.Waves.Create'))
const route = useRoute()
const router = useRouter()
const currentView = ref<'list' | 'kanban'>('list')

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
})

const waves = ref<waveApi.WaveOrderDto[]>([])
const loading = ref(false)

const searchForm = reactive({
  waveNo: '',
  status: null as number | null,
})

const pickListVisible = ref(false)
const waveCreateVisible = ref(false)
const allocationOrderLoading = ref(false)
const creatingWave = ref(false)
const allocationOrders = ref<allocationOrderApi.SalesAllocationOrderDto[]>([])
const waveCreateForm = reactive({
  salesAllocationOrderIds: [] as string[],
  remark: '',
})
const allocationOrderOptions = computed(() => allocationOrders.value.map((item) => ({
  value: item.id,
  label: `${item.allocationNo} · ${item.customerName} · ${item.warehouseName}`,
})))
const selectedAllocationWarehouse = computed(() => {
  const selected = allocationOrders.value.filter((item) =>
    waveCreateForm.salesAllocationOrderIds.includes(item.id))
  if (!selected.length) return ''
  const warehouses = [...new Set(selected.map((item) => `${item.warehouseName} / ${item.warehouseCode}`))]
  return warehouses.join('、')
})

const currentWave = ref<waveApi.WaveOrderDto | null>(null)
const checkedWaveKeys = ref<string[]>([])
const selectedWave = computed(() => waves.value.find((wave) => wave.id === checkedWaveKeys.value[0]))
const creatingPickList = ref(false)

const pickListFormRef = ref<FormInst | null>(null)
const pickListForm = reactive({
  targetLocationCode: '',
  remark: '',
})

const pickListRules: FormRules = {
  targetLocationCode: [{ required: true, message: '请选择或输入出库暂存位编码', trigger: ['blur', 'change'] }],
}

const statusOptions: SelectOption[] = [
  { label: '新创建', value: waveApi.WaveOrderStatus.Created },
  { label: '已释放', value: waveApi.WaveOrderStatus.Released },
  { label: '已完成', value: waveApi.WaveOrderStatus.Completed },
  { label: '已取消', value: waveApi.WaveOrderStatus.Cancelled },
]

const locationOptions = ref<SelectOption[]>([])
const locationLoading = ref(false)

function getStatusLabel(status: number) {
  switch (status) {
    case waveApi.WaveOrderStatus.Created:
      return '新创建'
    case waveApi.WaveOrderStatus.Released:
      return '已释放'
    case waveApi.WaveOrderStatus.Completed:
      return '已完成'
    case waveApi.WaveOrderStatus.Cancelled:
      return '已取消'
    default:
      return String(status)
  }
}

function getStatusTagType(status: number) {
  switch (status) {
    case waveApi.WaveOrderStatus.Created:
      return 'info'
    case waveApi.WaveOrderStatus.Released:
      return 'warning'
    case waveApi.WaveOrderStatus.Completed:
      return 'success'
    case waveApi.WaveOrderStatus.Cancelled:
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
  storageKey: 'wave-order-column-settings-v1',
  preferredKeys: ['waveNo', 'status', 'creationTime'],
  resolveTitle: (key) => {
    if (key === 'waveNo') return '波次号'
    if (key === 'status') return '状态'
    if (key === 'creationTime') return '创建时间'
    return key
  },
})

const columnMap: Record<string, DataTableColumns<waveApi.WaveOrderDto>[number]> = {
  waveNo: {
    title: createDraggableTitle('waveNo', '波次号'),
    key: 'waveNo',
    minWidth: 160,
    sorter: (a, b) => compareSortValue(a.waveNo, b.waveNo),
  },
  status: {
    title: createDraggableTitle('status', '状态'),
    key: 'status',
    width: 120,
    align: 'center',
    sorter: (a, b) => compareSortValue(a.status, b.status),
    render: (row) =>
      h(
        WmsStatusTag,
        { type: getStatusTagType(row.status), size: 'small' },
        { default: () => getStatusLabel(row.status) },
      ),
  },
  creationTime: {
    title: createDraggableTitle('creationTime', '创建时间'),
    key: 'creationTime',
    minWidth: 180,
    sorter: (a, b) => compareSortValue(a.creationTime, b.creationTime),
    render: (row) => formatDateTime(row.creationTime),
  },
}

const columns = computed<DataTableColumns<waveApi.WaveOrderDto>>(() => withResizable([
  { type: 'selection', multiple: false, fixed: 'left', width: 44 },
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<waveApi.WaveOrderDto>[number] => Boolean(item)),
]))

function handleColumnConfigShowChange(value: boolean) {
  showColumnConfig.value = value
}

function handleColumnVisibleChange(key: string, visible: boolean) {
  if (!handleVisibleChange(key, visible)) {
    message.warning('至少保留一个展示字段')
  }
}

function openDrawer(row: waveApi.WaveOrderDto) {
  router.push({ name: 'WaveDetail', params: { id: row.id } })
}

function viewSelectedWave() {
  if (selectedWave.value) openDrawer(selectedWave.value)
}

function createPickListForSelected() {
  if (selectedWave.value) openPickListCreate(selectedWave.value)
}

async function openWaveCreate(preselectedId?: string) {
  waveCreateForm.salesAllocationOrderIds = preselectedId ? [preselectedId] : []
  waveCreateForm.remark = ''
  waveCreateVisible.value = true
  allocationOrderLoading.value = true
  try {
    const result = await allocationOrderApi.getList({
      status: allocationOrderApi.SalesAllocationOrderStatus.Confirmed,
      skipCount: 0,
      maxResultCount: 200,
    })
    allocationOrders.value = result.items
    if (preselectedId && !result.items.some((item) => item.id === preselectedId)) {
      waveCreateForm.salesAllocationOrderIds = []
      message.warning('该配货单不是已确认状态，不能创建波次')
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载已确认配货单失败')
  } finally {
    allocationOrderLoading.value = false
  }
}

async function submitCreateWave() {
  const selected = allocationOrders.value.filter((item) =>
    waveCreateForm.salesAllocationOrderIds.includes(item.id))
  if (new Set(selected.map((item) => item.warehouseId)).size > 1) {
    message.warning('同一波次只能选择同一仓库的配货单')
    return
  }
  creatingWave.value = true
  try {
    await waveApi.create({
      salesAllocationOrderIds: waveCreateForm.salesAllocationOrderIds,
      remark: waveCreateForm.remark || undefined,
    })
    message.success('波次创建成功')
    waveCreateVisible.value = false
    await loadWaves()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建波次失败')
  } finally {
    creatingWave.value = false
  }
}

function openPickListCreate(row: waveApi.WaveOrderDto) {
  currentWave.value = row
  pickListForm.targetLocationCode = ''
  pickListForm.remark = ''
  locationOptions.value = []
  pickListVisible.value = true
  void handleLocationSearch('')
}

async function handleLocationSearch(query: string) {
  const warehouseId = currentWave.value?.warehouseId
  if (!warehouseId) return
  locationLoading.value = true
  try {
    const [locations, zoneResult] = await Promise.all([
      locationApi.getLocationByWarehouseId(warehouseId),
      zoneApi.getList({
        warehouseCode: currentWave.value?.warehouseCode,
        maxResultCount: 1000,
        skipCount: 0,
      }),
    ])
    const outboundZoneIds = new Set(
      zoneResult.items
        .filter(zone => zone.zoneType === zoneApi.ZoneType.Outbound)
        .map(zone => zone.id),
    )
    const keyword = query.toLowerCase()
    locationOptions.value = (locations.items ?? [])
      .filter(location => outboundZoneIds.has(location.zoneId))
      .filter(location => (location.code ?? '').toLowerCase().includes(keyword))
      .slice(0, 20)
      .map(location => ({
        label: location.code,
        value: location.code,
      }))
  } catch (e) {
    console.error(e)
  } finally {
    locationLoading.value = false
  }
}

async function submitCreatePickList() {
  try {
    await pickListFormRef.value?.validate()
  } catch {
    return
  }
  
  if (!currentWave.value) return
  
  creatingPickList.value = true
  try {
    await pickListApi.create({
      waveOrderId: currentWave.value.id,
      targetLocationCode: pickListForm.targetLocationCode,
      remark: pickListForm.remark || undefined,
    })
    message.success('生成拣货单成功')
    pickListVisible.value = false
    loadWaves()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '生成拣货单失败')
  } finally {
    creatingPickList.value = false
  }
}

async function loadWaves() {
  loading.value = true
  try {
    const page = pagination.page ?? 1
    const pageSize = pagination.pageSize ?? 10
    const result = await waveApi.getList({
      maxResultCount: pageSize,
      skipCount: (page - 1) * pageSize,
      waveNo: searchForm.waveNo || undefined,
      status: searchForm.status ?? undefined,
    })
    waves.value = result.items ?? []
    checkedWaveKeys.value = []
    pagination.itemCount = result.totalCount ?? 0
  } finally {
    loading.value = false
  }
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadWaves()
}

function resetSearch() {
  searchForm.waveNo = ''
  searchForm.status = null
  pagination.page = 1
  loadWaves()
}

onMounted(() => {
  loadColumnSettings()
  loadWaves()
  const allocationOrderId = String(route.query.allocationOrderId ?? '')
  if (allocationOrderId) openWaveCreate(allocationOrderId)
})
</script>

<style scoped>
.outbound-list-page {
  height: 100%;
  min-height: 0;
}
</style>
