<template>
  <div>
    <BaseCrudPage>
      <template #search>
        <n-form inline class="crud-search-form">
          <n-form-item label="波次单号">
            <n-input
              :value="searchForm.waveNo"
              placeholder="请输入波次号"
              clearable
              style="width: 200px"
              @update:value="(value) => (searchForm.waveNo = value)"
              @keyup.enter="loadWaves"
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
            <n-button type="primary" :loading="loading" @click="loadWaves">查询</n-button>
          </n-form-item>
          <n-form-item>
            <n-button @click="resetSearch">重置</n-button>
          </n-form-item>
        </n-form>
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
        <n-data-table class="crud-table-flat" :columns="columns" :data="waves" :bordered="false" :loading="loading" />
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

    <!-- Details Drawer -->
    <n-drawer :show="drawerVisible" placement="right" :width="750" @update:show="(value) => (drawerVisible = value)">
      <n-drawer-content title="波次单详情" closable>
        <n-descriptions label-placement="left" bordered :column="2" style="margin-bottom: 20px" size="small">
          <n-descriptions-item label="波次单号">{{ currentWave?.waveNo }}</n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="currentWave ? getStatusTagType(currentWave.status) : 'default'">
              {{ currentWave ? getStatusLabel(currentWave.status) : '-' }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="创建时间">{{ formatDateTime(currentWave?.creationTime) }}</n-descriptions-item>
          <n-descriptions-item label="备注" :span="2">{{ currentWave?.remark || '-' }}</n-descriptions-item>
        </n-descriptions>

        <n-divider title-placement="left">包含的发货单明细</n-divider>
        <n-data-table
          :columns="detailItemColumns"
          :data="currentWave?.lines || []"
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
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, PaginationProps, SelectOption } from 'naive-ui'
import * as waveApi from '../../../api/outbound/wave'
import * as pickListApi from '../../../api/outbound/pickList'
import * as locationApi from '../../../api/masterData/location'
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

const waves = ref<waveApi.WaveOrderDto[]>([])
const loading = ref(false)

const searchForm = reactive({
  waveNo: '',
  status: null as number | null,
})

const drawerVisible = ref(false)
const pickListVisible = ref(false)

const currentWave = ref<waveApi.WaveOrderDto | null>(null)
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
        NTag,
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
  ...columnSettings.value
    .filter((item) => item.visible)
    .map((item) => columnMap[item.key])
    .filter((item): item is DataTableColumns<waveApi.WaveOrderDto>[number] => Boolean(item)),
  {
    title: '操作',
    key: 'actions',
    width: 220,
    align: 'center',
    render: (row) => [
      h(NButton, { size: 'small', type: 'info', quaternary: true, onClick: () => openDrawer(row) }, { default: () => '详情' }),
      row.status === waveApi.WaveOrderStatus.Created
        ? h(NButton, { size: 'small', type: 'primary', quaternary: true, onClick: () => openPickListCreate(row) }, { default: () => '生成拣货单' })
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

const detailItemColumns: DataTableColumns<waveApi.WaveOrderLineDto> = [
  { title: '发货单号', key: 'salesShipmentNo', minWidth: 150 },
  { title: '客户', key: 'customerName', minWidth: 150, render: (row) => `${row.customerName} (${row.customerCode})` },
  { title: '产品编码', key: 'productCode', minWidth: 130 },
  { title: '产品名称', key: 'productName', minWidth: 160 },
  { title: '数量', key: 'qty', width: 100, align: 'right' },
]

async function openDrawer(row: waveApi.WaveOrderDto) {
  loading.value = true
  try {
    const wave = await waveApi.get(row.id)
    currentWave.value = wave
    drawerVisible.value = true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载详情失败')
  } finally {
    loading.value = false
  }
}

function openPickListCreate(row: waveApi.WaveOrderDto) {
  currentWave.value = row
  pickListForm.targetLocationCode = ''
  pickListForm.remark = ''
  locationOptions.value = []
  pickListVisible.value = true
}

async function handleLocationSearch(query: string) {
  if (!query) return
  locationLoading.value = true
  try {
    const res = await locationApi.getLocationByWarehouseId('') // Query all
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
})
</script>

<style scoped>
</style>