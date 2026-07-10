<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import {
  NButton,
  NCollapse,
  NCollapseItem,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NPagination,
  NSelect,
  NSpin,
  NTable,
  NTag,
  useMessage
} from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'

import BaseCrudPage from '../../../components/BaseCrudPage.vue'
import TableColumnManager from '../../../components/TableColumnManager.vue'
import { useColumnConfig } from '../../../composables/useColumnConfig'
import { withResizable } from '../../../utils/table'
import { compareSortValue } from '../../../utils/tableColumn'
import { get, getList } from '../../../api/system/auditLog'
import type { AuditLogDetailDto, AuditLogDto } from '../../../api/system/auditLog'

type RowItem = AuditLogDto

const message = useMessage()
const loading = ref(false)
const rows = ref<RowItem[]>([])
const dateRange = ref<[number, number] | null>(null)
const pagination = ref<PaginationProps>({ page: 1, pageSize: 10, itemCount: 0 })

// 查询参数
const searchQuery = ref({
  hasException: null as any,
  includeGetRequests: false as any
})

// 详情抽屉控制
const drawerVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<AuditLogDetailDto | null>(null)

// 格式化时间函数
function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const pad = (num: number) => num.toString().padStart(2, '0')
    const year = d.getFullYear()
    const month = pad(d.getMonth() + 1)
    const date = pad(d.getDate())
    const hours = pad(d.getHours())
    const minutes = pad(d.getMinutes())
    const seconds = pad(d.getSeconds())
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`
  } catch {
    return dateStr
  }
}

// 翻译实体类型名称
function translateEntityName(fullName: string) {
  if (!fullName) return ''
  const parts = fullName.split('.')
  const className = parts[parts.length - 1]
  const mapping: Record<string, string> = {
    PurchaseOrder: '采购收货单',
    PurchaseOrderDetail: '采购收货单明细',
    AdvancedShippingNotice: '到货通知单',
    Product: '物料信息',
    Supplier: '供应商信息',
    Warehouse: '仓库主数据',
    Zone: '库区信息',
    Location: '库位信息',
    Container: '容器信息',
    TransferOrder: '调拨单',
    TransferOrderDetail: '调拨单明细',
    CycleCountOrder: '盘点单',
    CycleCountOrderDetail: '盘点单明细',
    Inventory: '库存记录'
  }
  return mapping[className || ''] || className || ''
}

function getChangeTypeText(type: number) {
  switch (type) {
    case 0: return '新增'
    case 1: return '修改'
    case 2: return '删除'
    default: return '未知'
  }
}

function getChangeTypeTag(type: number) {
  switch (type) {
    case 0: return 'success'
    case 1: return 'warning'
    case 2: return 'error'
    default: return 'default'
  }
}

const { showColumnConfig, columnSettings, loadColumnSettings, handleVisibleChange, createDraggableTitle } = useColumnConfig({
  storageKey: 'operation-log-column-settings-v1',
  preferredKeys: ['module', 'action', 'userName', 'clientIpAddress', 'executionTime', 'executionDuration', 'hasException', 'actions'],
  resolveTitle: (key) => {
    switch (key) {
      case 'module': return '模块'
      case 'action': return '动作'
      case 'userName': return '操作人'
      case 'clientIpAddress': return '客户端IP'
      case 'executionTime': return '时间'
      case 'executionDuration': return '耗时'
      case 'hasException': return '结果'
      case 'actions': return '操作'
      default: return key
    }
  }
})

const columnMap: Record<string, DataTableColumns<RowItem>[number]> = {
  module: { title: createDraggableTitle('module', '模块'), key: 'module', minWidth: 120, sorter: (a, b) => compareSortValue(a.module, b.module) },
  action: { title: createDraggableTitle('action', '动作'), key: 'action', minWidth: 160, sorter: (a, b) => compareSortValue(a.action, b.action) },
  userName: { title: createDraggableTitle('userName', '操作人'), key: 'userName', minWidth: 120, sorter: (a, b) => compareSortValue(a.userName, b.userName) },
  clientIpAddress: { title: createDraggableTitle('clientIpAddress', '客户端IP'), key: 'clientIpAddress', minWidth: 120, sorter: (a, b) => compareSortValue(a.clientIpAddress, b.clientIpAddress) },
  executionTime: {
    title: createDraggableTitle('executionTime', '时间'),
    key: 'executionTime',
    minWidth: 170,
    sorter: (a, b) => compareSortValue(a.executionTime, b.executionTime),
    render: (row) => formatDate(row.executionTime)
  },
  executionDuration: {
    title: createDraggableTitle('executionDuration', '耗时'),
    key: 'executionDuration',
    minWidth: 100,
    sorter: (a, b) => compareSortValue(a.executionDuration, b.executionDuration),
    render: (row) => `${row.executionDuration} ms`
  },
  hasException: {
    title: createDraggableTitle('hasException', '结果'),
    key: 'hasException',
    minWidth: 90,
    render: (row) => h(
      NTag,
      { type: row.hasException ? 'error' : 'success', size: 'small', bordered: false },
      { default: () => (row.hasException ? '失败' : '成功') }
    )
  },
  actions: {
    title: '操作',
    key: 'actions',
    minWidth: 80,
    fixed: 'right',
    render: (row) => h(
      NButton,
      { type: 'primary', size: 'tiny', secondary: true, onClick: () => handleShowDetail(row.id) },
      { default: () => '详情' }
    )
  }
}

const columns = computed<DataTableColumns<RowItem>>(() =>
  withResizable(
    columnSettings.value
      .filter((item) => item.visible)
      .map((item) => columnMap[item.key])
      .filter((item): item is DataTableColumns<RowItem>[number] => Boolean(item))
  )
)

function handleColumnConfigShowChange(value: boolean) { showColumnConfig.value = value }
function handleColumnVisibleChange(key: string, visible: boolean) { if (!handleVisibleChange(key, visible)) message.warning('至少保留一个展示字段') }
function handleQuery() { pagination.value.page = 1; loadData() }

function handleReset() {
  handleResetFilters()
  pagination.value.page = 1
  loadData()
}

function handleResetFilters() {
  dateRange.value = null
  searchQuery.value.hasException = null
  searchQuery.value.includeGetRequests = false as any
}

function handlePageChange(page: number) { pagination.value.page = page; loadData() }
function handlePageSizeChange(size: number) { pagination.value.pageSize = size; pagination.value.page = 1; loadData() }

async function loadData() {
  loading.value = true
  try {
    const page = pagination.value.page ?? 1
    const pageSize = pagination.value.pageSize ?? 10
    const skipCount = (page - 1) * pageSize

    let startTime: string | undefined
    let endTime: string | undefined
    if (dateRange.value) {
      startTime = new Date(dateRange.value[0]).toISOString()
      endTime = new Date(dateRange.value[1]).toISOString()
    }

    const data = await getList({
      hasException: searchQuery.value.hasException !== null ? searchQuery.value.hasException : undefined,
      includeGetRequests: searchQuery.value.includeGetRequests,
      startTime,
      endTime,
      skipCount,
      maxResultCount: pageSize,
      sorting: 'executionTime desc'
    })

    rows.value = data.items
    pagination.value.itemCount = data.totalCount
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载操作日志失败')
  } finally {
    loading.value = false
  }
}

async function handleShowDetail(id: string) {
  drawerVisible.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    const data = await get(id)
    detailData.value = data
  } catch (error) {
    message.error(error instanceof Error ? error.message : '获取日志明细失败')
    drawerVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => { loadColumnSettings(); loadData() })
</script>

<template>
  <BaseCrudPage>
    <template #search>
      <n-form inline class="crud-search-form" :show-feedback="false">
        <n-form-item>
          <n-date-picker v-model:value="dateRange" type="datetimerange" clearable style="width: 300px" />
        </n-form-item>
        <n-form-item>
          <n-select
            v-model:value="searchQuery.hasException"
            placeholder="执行结果"
            clearable
            style="width: 140px"
            :options="([
              { label: '成功', value: false },
              { label: '失败', value: true }
            ] as any)"
          />
        </n-form-item>
        <n-form-item>
          <n-select
            v-model:value="searchQuery.includeGetRequests"
            placeholder="查询类接口"
            style="width: 150px"
            :options="([
              { label: '隐藏查询接口', value: false },
              { label: '显示查询接口', value: true }
            ] as any)"
          />
        </n-form-item>
        <n-form-item class="crud-page-spacer" />
        <n-form-item><n-button type="primary" :loading="loading" @click="handleQuery">查询</n-button></n-form-item>
        <n-form-item><n-button @click="handleReset">重置</n-button></n-form-item>
      </n-form>
    </template>
    <template #actions-left><div class="crud-action-main"><n-button @click="loadData">刷新</n-button></div></template>
    <template #actions-right><div class="crud-action-tools"><TableColumnManager :show="showColumnConfig" :settings="columnSettings" @update:show="handleColumnConfigShowChange" @visible-change="handleColumnVisibleChange" /></div></template>
    <template #data>
      <n-data-table class="crud-table-flat" :loading="loading" :columns="columns" :data="rows" :bordered="false" />
    </template>
    <template #pager-right>
      <n-pagination :page="pagination.page" :page-size="pagination.pageSize" :item-count="pagination.itemCount" :page-sizes="[10, 20, 50, 100]" show-size-picker @update:page="(page) => { pagination.page = page; handlePageChange(page) }" @update:page-size="(size) => { pagination.pageSize = size; handlePageSizeChange(size) }" />
    </template>
  </BaseCrudPage>

  <!-- 操作日志详情抽屉 -->
  <n-drawer :show="drawerVisible" :width="750" placement="right" @update:show="(value) => (drawerVisible = value)">
    <n-drawer-content title="操作日志详情" closable>
      <div v-if="detailLoading" style="padding: 40px; text-align: center;">
        <n-spin size="large" />
      </div>
      <div v-else-if="detailData">
        <n-divider title-placement="left">基本信息</n-divider>
        <n-descriptions bordered :column="2" label-placement="left" label-style="width: 110px;">
          <n-descriptions-item label="操作模块">{{ detailData.module }}</n-descriptions-item>
          <n-descriptions-item label="操作动作">{{ detailData.action }}</n-descriptions-item>
          <n-descriptions-item label="操作人员">{{ detailData.userName }}</n-descriptions-item>
          <n-descriptions-item label="客户端IP">{{ detailData.clientIpAddress }}</n-descriptions-item>
          <n-descriptions-item label="操作时间">{{ formatDate(detailData.executionTime) }}</n-descriptions-item>
          <n-descriptions-item label="耗时时长">{{ detailData.executionDuration }} ms</n-descriptions-item>
          <n-descriptions-item label="HTTP 方法">
            <n-tag type="info" size="small" :bordered="false">{{ detailData.httpMethod }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="返回状态">
            <n-tag :type="detailData.hasException ? 'error' : 'success'" size="small" :bordered="false">
              {{ detailData.httpStatusCode || 200 }}
            </n-tag>
          </n-descriptions-item>
        </n-descriptions>

        <n-divider title-placement="left">接口路径</n-divider>
        <n-descriptions bordered :column="1" label-placement="left" label-style="width: 110px;">
          <n-descriptions-item label="请求 URL">
            <span class="text-mono" style="font-size: 13px; word-break: break-all;">{{ detailData.url }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="浏览器 Agent">
            <span style="font-size: 12px; color: var(--n-text-color-3);">{{ detailData.browserInfo }}</span>
          </n-descriptions-item>
        </n-descriptions>

        <div v-if="detailData.hasException && detailData.exceptions" style="margin-top: 24px;">
          <n-divider title-placement="left">异常堆栈</n-divider>
          <pre class="exception-pre" style="padding: 16px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 250px; margin-bottom: 20px;">{{ detailData.exceptions }}</pre>
        </div>

        <div style="margin-top: 24px;">
          <n-divider title-placement="left">数据级变更记录 (Data Diff)</n-divider>
          <div v-if="!detailData.entityChanges || detailData.entityChanges.length === 0" class="empty-entity-changes" style="text-align: center; padding: 24px; border: 1px dashed var(--n-border-color); border-radius: 8px; margin-bottom: 20px;">
            本次操作未引发数据库实体级属性变化
          </div>
          <n-collapse v-else default-expanded-names="0">
            <n-collapse-item
              v-for="(ec, index) in detailData.entityChanges"
              :key="index"
              :title="`${translateEntityName(ec.entityTypeFullName)} (主键: ${ec.entityId})`"
              :name="index.toString()"
            >
              <template #header-extra>
                <n-tag :type="getChangeTypeTag(ec.changeType)" size="small" :bordered="false">
                  {{ getChangeTypeText(ec.changeType) }}
                </n-tag>
              </template>
              <div style="padding: 8px 0;">
                <n-table size="small" :single-line="false">
                  <thead>
                    <tr>
                      <th style="width: 160px;">修改属性/字段</th>
                      <th>原值 (Original)</th>
                      <th>新值 (New)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(pc, pIndex) in ec.propertyChanges" :key="pIndex">
                      <td style="font-weight: 500; word-break: break-all;">{{ pc.propertyName }}</td>
                      <td style="color: #ef4444; text-decoration: line-through; word-break: break-all; font-family: monospace;">
                        {{ pc.originalValue || '(Null/空)' }}
                      </td>
                      <td style="color: #10b981; word-break: break-all; font-family: monospace;">
                        {{ pc.newValue || '(Null/空)' }}
                      </td>
                    </tr>
                    <tr v-if="ec.propertyChanges.length === 0">
                      <td colspan="3" style="text-align: center; color: #64748b; font-style: italic;">
                        无具体字段属性发生变化（可能仅影响主键关联关系）
                      </td>
                    </tr>
                  </tbody>
                </n-table>
              </div>
            </n-collapse-item>
          </n-collapse>
        </div>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

