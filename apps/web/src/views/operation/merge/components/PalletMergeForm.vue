<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, h } from 'vue'
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NDataTable,
  NModal,
  NAlert,
  NTag,
  NDescriptions,
  NDescriptionsItem,
  useMessage,
} from 'naive-ui'
import BaseCrudPage from '../../../../components/BaseCrudPage.vue'

const headerLabelStyle = {
  width: '120px',
}

const headerContentStyle = {
  minWidth: '220px',
}

import * as warehouseApi from '../../../../api/masterData/warehouse'
import * as locationApi from '../../../../api/masterData/location'
import * as accountAliasApi from '../../../../api/masterData/accountAlias'
import * as containerApi from '../../../../api/masterData/container'
import * as inventoryApi from '../../../../api/masterData/inventory'
import * as palletMergeApi from '../../../../api/palletMerge/palletMerge'
import * as usersApi from '../../../../api/identity/users'
import request from '../../../../utils/request'
import { useAuthStore } from '../../../../stores/auth'

const props = defineProps<{
  mode: 'create' | 'edit'
  initialType?: 'split' | 'merge'
}>()

const emit = defineEmits<{
  (e: 'submit', data: palletMergeApi.CreatePalletMergeDto): void
  (e: 'cancel'): void
}>()

const message = useMessage()
const saving = ref(false)

// 下拉列表选项
const warehouses = ref<any[]>([])
const accountAliases = ref<any[]>([])
const locations = ref<any[]>([])

// 表单基本数据
const formModel = reactive({
  warehouseId: null as string | null,
  accountAliasId: null as string | null,
  mergeType: props.initialType === 'merge' ? 1 : 0, // 0 = Split, 1 = Merge
})

// 明细行数据定义
interface BeforeRow {
  inventoryId: string
  containerId: string
  containerCode: string
  locationId: string
  locationCode: string
  productId: string
  productCode: string
  productName: string
  qty: number
  unit: string
  weight: number
  batchNo: string
  sn: string
  craftVersion?: string | null
  layerIndex: number
}

interface AfterRow {
  id: string // 临时前台Id
  containerId: string
  containerCode: string
  locationId: string
  locationCode: string
  qty: number
  weight: number
  batchNo: string
  sn: string
  craftVersion?: string | null
  layerIndex: number
}

const beforeRows = ref<BeforeRow[]>([])
const afterRows = ref<AfterRow[]>([])

// 弹窗状态管理
const showInventoryModal = ref(false)
const showContainerModal = ref(false)
const activeAfterRowId = ref<string | null>(null) // 用于标识哪个After行正在选择载具

// 搜索模态框内部搜索条件与结果
const searchInventoryQuery = reactive({
  containerCode: '',
  productCode: '',
})
const searchInventoryRows = ref<any[]>([])
const searchInventoryLoading = ref(false)
const searchInventoryCheckedKeys = ref<string[]>([])

const searchContainerQuery = reactive({
  containerCode: '',
})
const searchContainerRows = ref<any[]>([])
const searchContainerLoading = ref(false)

// 监控仓库变更以清除明细和刷新库位
watch(
  () => formModel.warehouseId,
  async (newVal) => {
    beforeRows.value = []
    afterRows.value = []
    locations.value = []
    if (newVal) {
      await loadLocations(newVal)
    }
  }
)

// 监控业务类型变更以重置明细
watch(
  () => formModel.mergeType,
  () => {
    beforeRows.value = []
    afterRows.value = []
  }
)

// 监控 Before 数量以动态更新 Merge 下的 After 行数量
watch(
  () => beforeRows.value,
  (newVal) => {
    if (formModel.mergeType === 1) { // Merge
      const totalBeforeQty = newVal.reduce((sum, item) => sum + item.qty, 0)
      const totalBeforeWeight = newVal.reduce((sum, item) => sum + item.weight, 0)
      
      if (afterRows.value.length === 0) {
        afterRows.value.push({
          id: 'merge-target',
          containerId: '',
          containerCode: '',
          locationId: '',
          locationCode: '',
          qty: totalBeforeQty,
          weight: totalBeforeWeight,
          batchNo: newVal[0]?.batchNo || '',
          sn: newVal[0]?.sn || '',
          craftVersion: newVal[0]?.craftVersion || '',
          layerIndex: 0
        })
      } else if (afterRows.value[0]) {
        afterRows.value[0].qty = totalBeforeQty
        afterRows.value[0].weight = totalBeforeWeight
        const firstNewVal = newVal[0]
        if (firstNewVal) {
          if (!afterRows.value[0].batchNo) afterRows.value[0].batchNo = firstNewVal.batchNo
          if (!afterRows.value[0].sn) afterRows.value[0].sn = firstNewVal.sn
          if (!afterRows.value[0].craftVersion) afterRows.value[0].craftVersion = firstNewVal.craftVersion
        }
      }
    }
  },
  { deep: true }
)

// 数量守恒校验与展示数据
const beforeTotalQty = computed(() => {
  return beforeRows.value.reduce((sum, r) => sum + r.qty, 0)
})

const afterTotalQty = computed(() => {
  return afterRows.value.reduce((sum, r) => sum + r.qty, 0)
})

const qtyDifference = computed(() => {
  return beforeTotalQty.value - afterTotalQty.value
})

const isQtyConserved = computed(() => {
  return Math.abs(qtyDifference.value) < 0.0001
})

// 加载仓库
async function loadWarehouses() {
  try {
    const res = await warehouseApi.getList({ maxResultCount: 1000 })
    warehouses.value = (res.items || []).map((w: any) => ({
      label: w.name,
      value: w.id,
      id: w.id,
      code: w.code
    }))
    
    // 获取当前用户ID
    let currentUserId = ''
    try {
      const appConfig = await request.get<{ currentUser?: { id?: string } }>('/api/abp/application-configuration')
      currentUserId = appConfig.data?.currentUser?.id ?? ''
    } catch {
      currentUserId = ''
    }

    if (!currentUserId) {
      const authStore = useAuthStore()
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

    // 如果有默认仓库，自动带入
    if (currentUserId) {
      const warehouseIds = await warehouseApi.getWarehousesByUser(currentUserId)
      const defaultWhId = warehouseIds?.[0]
      if (defaultWhId) {
        const exists = warehouses.value.some(w => w.id === defaultWhId)
        if (exists) {
          formModel.warehouseId = defaultWhId
        }
      }
    }
  } catch (err: any) {
    message.error('加载仓库数据失败')
  }
}

// 加载库位
async function loadLocations(warehouseId: string) {
  try {
    const res = await locationApi.getLocationByWarehouseId(warehouseId)
    locations.value = (res.items || []).map((l: any) => ({
      label: l.code,
      value: l.id,
      code: l.code
    }))
  } catch (err: any) {
    message.error('加载库位数据失败')
  }
}

// 加载账户别名
async function loadAccountAliases() {
  try {
    const res = await accountAliasApi.getList({ maxResultCount: 1000 })
    accountAliases.value = (res.items || []).map((a: any) => ({
      label: `${a.alias} (${a.description})`,
      value: a.id
    }))
  } catch (err: any) {
    message.error('加载账户别名失败')
  }
}

// 弹框搜索源库存
async function searchInventory() {
  if (!formModel.warehouseId) {
    message.warning('请先选择仓库')
    return
  }
  searchInventoryLoading.value = true
  try {
    const selectedWh = warehouses.value.find(w => w.id === formModel.warehouseId)
    const params: inventoryApi.GetInventoryListParams = {
      maxResultCount: 100,
      skipCount: 0,
      warehouseCode: selectedWh?.code || undefined,
      containerCode: searchInventoryQuery.containerCode || undefined,
    }
    const res = await inventoryApi.getList(params)
    
    // 如果输入了物料编码，前端过滤或匹配
    let items = res.items || []
    if (searchInventoryQuery.productCode?.trim()) {
      const code = searchInventoryQuery.productCode.trim().toLowerCase()
      items = items.filter(x => x.productCode?.toLowerCase().includes(code))
    }
    
    searchInventoryRows.value = items
  } catch (err: any) {
    message.error('搜索库存记录失败')
  } finally {
    searchInventoryLoading.value = false
  }
}

// 打开选择库存弹窗
function openInventoryModal() {
  if (!formModel.warehouseId) {
    message.warning('请选择所属仓库后再添加库存')
    return
  }
  searchInventoryQuery.containerCode = ''
  searchInventoryQuery.productCode = ''
  searchInventoryRows.value = []
  searchInventoryCheckedKeys.value = []
  showInventoryModal.value = true

  // 默认带出库存数据
  searchInventory()
}

// 确认选择库存
function confirmSelectInventory() {
  const selectedItems = searchInventoryRows.value.filter(x => 
    searchInventoryCheckedKeys.value.includes(x.id)
  )

  if (selectedItems.length === 0) {
    message.warning('请选择至少一行库存数据')
    return
  }

  // 如果是分拆模式，只能选 1 行
  if (formModel.mergeType === 0 && selectedItems.length > 1) {
    message.warning('分拆模式只能选择 1 行源库存！')
    return
  }

  // 如果是合盘模式，选中的库存必须是同一种物料（ProductId 必须一致）
  if (formModel.mergeType === 1) {
    const productIds = selectedItems.map(x => x.productId)
    const distinctProductIds = Array.from(new Set(productIds))
    if (distinctProductIds.length > 1) {
      message.error('合盘操作的前后物料（Product）必须完全一致，请选择相同物料的库存行！')
      return
    }
  }

  // 映射并加入 beforeRows
  selectedItems.forEach(item => {
    const isExist = beforeRows.value.some(x => x.inventoryId === item.id)
    if (!isExist) {
      beforeRows.value.push({
        inventoryId: item.id,
        containerId: item.containerId,
        containerCode: item.containerNo || item.containerCode || '-',
        locationId: item.locationId,
        locationCode: item.locationCode || '-',
        productId: item.productId,
        productCode: item.productCode || '-',
        productName: item.productName || '-',
        qty: item.availableQuantity, // 导入时使用可用数量
        unit: item.unit || 'm',
        weight: item.weight || 0,
        batchNo: item.batchNo || '',
        sn: item.sn || item.SN || '',
        craftVersion: item.craftVersion,
        layerIndex: item.layerIndex || 0
      })
    }
  })

  showInventoryModal.value = false
}

// 删除源库存行
function removeBeforeRow(index: number) {
  beforeRows.value.splice(index, 1)
}

// 弹窗搜索目标载具
async function searchContainer() {
  searchContainerLoading.value = true
  try {
    const res = await containerApi.getList({
      maxResultCount: 100,
      skipCount: 0,
      filter: searchContainerQuery.containerCode || undefined
    })
    // 过滤出空闲、不在锁定状态的载具
    searchContainerRows.value = (res.items || []).filter(c => !c.isLocked)
  } catch (err: any) {
    message.error('查询载具失败')
  } finally {
    searchContainerLoading.value = false
  }
}

// 打开选择载具弹窗
function openContainerModal(afterRowId: string) {
  activeAfterRowId.value = afterRowId
  searchContainerQuery.containerCode = ''
  searchContainerRows.value = []
  showContainerModal.value = true
}

// 确认选择目标载具
function confirmSelectContainer(container: any) {
  if (!activeAfterRowId.value) return
  
  const targetRow = afterRows.value.find(x => x.id === activeAfterRowId.value)
  if (targetRow) {
    targetRow.containerId = container.id
    targetRow.containerCode = container.containerCode
    // 自动带入载具当前所在的库位（若有）
    if (container.currentLocationId && container.currentLocationCode) {
      targetRow.locationId = container.currentLocationId
      targetRow.locationCode = container.currentLocationCode
    }
  }
  
  showContainerModal.value = false
  activeAfterRowId.value = null
}

// 新增拆分目标行（仅分拆模式）
function addAfterRow() {
  const source = beforeRows.value[0]
  if (!source) {
    message.warning('请先选择分拆前的源库存')
    return
  }
  afterRows.value.push({
    id: `split-target-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    containerId: '',
    containerCode: '',
    locationId: '',
    locationCode: '',
    qty: 0,
    weight: 0,
    batchNo: source.batchNo,
    sn: '',
    craftVersion: source.craftVersion,
    layerIndex: 0
  })
}

// 移除拆分目标行
function removeAfterRow(index: number) {
  afterRows.value.splice(index, 1)
}

// 统一库位下拉选择更新
function handleLocationUpdate(row: AfterRow, locationId: string) {
  const matched = locations.value.find(l => l.value === locationId)
  if (matched) {
    row.locationId = locationId
    row.locationCode = matched.code
  }
}

// 提交表单
async function handleSubmit() {
  if (!formModel.warehouseId) {
    message.error('请选择单据所属仓库')
    return
  }
  if (!formModel.accountAliasId) {
    message.error('请选择账目别名')
    return
  }

  if (beforeRows.value.length === 0) {
    message.error('必须选择调整前源库存！')
    return
  }

  if (afterRows.value.length === 0) {
    message.error('必须添加调整后的目标行！')
    return
  }

  // 1. 强验证数量守恒
  if (!isQtyConserved.value) {
    message.error(`数量不守恒！分拆合盘前总数：${beforeTotalQty.value}，分拆合盘后总数：${afterTotalQty.value}，差值：${qtyDifference.value}`)
    return
  }

  // 2. 强验证目标载具和库位必填
  for (let i = 0; i < afterRows.value.length; i++) {
    const r = afterRows.value[i]
    if (!r) continue
    if (!r.containerId) {
      message.error(`调整后第 ${i + 1} 行目标盘号未选择！`)
      return
    }
    if (!r.locationId) {
      message.error(`调整后第 ${i + 1} 行目标库位未选择！`)
      return
    }
    if (!r.sn?.trim()) {
      message.error(`调整后第 ${i + 1} 行SN号未输入！`)
      return
    }
    if (r.qty <= 0) {
      message.error(`调整后第 ${i + 1} 行数量必须大于 0！`)
      return
    }
  }

  // 3. 分拆/合盘特殊校验
  if (formModel.mergeType === 0) { // Split
    if (beforeRows.value.length !== 1) {
      message.error('分拆模式下，分拆前只允许有 1 行库存！')
      return
    }
    if (afterRows.value.length <= 1) {
      message.error('分拆模式下，分拆后目标行数必须大于 1！')
      return
    }
  } else { // Merge
    if (beforeRows.value.length <= 1) {
      message.error('合盘模式下，合盘前源库存行数必须大于 1！')
      return
    }
    if (afterRows.value.length !== 1) {
      message.error('合盘模式下，合并后目标只允许有 1 行！')
      return
    }
  }

  // 4. 物料一致性强校验
  const sourceProduct = beforeRows.value[0]
  if (!sourceProduct) {
    message.error('未找到源物料库存！')
    return
  }
  
  // 组装 DTO
  const details: palletMergeApi.CreatePalletMergeDetailDto[] = []

  // 加入 Before 详情
  beforeRows.value.forEach(r => {
    if (!r) return
    details.push({
      direction: 0, // Before
      containerId: r.containerId,
      containerCode: r.containerCode,
      inventoryId: r.inventoryId,
      productId: r.productId,
      productCode: r.productCode,
      productName: r.productName,
      qty: r.qty,
      unit: r.unit,
      weight: r.weight,
      batchNo: r.batchNo,
      sn: r.sn,
      craftVersion: r.craftVersion,
      locationId: r.locationId,
      locationCode: r.locationCode,
      layerIndex: r.layerIndex
    })
  })

  // 加入 After 详情
  afterRows.value.forEach(r => {
    if (!r) return
    details.push({
      direction: 1, // After
      containerId: r.containerId,
      containerCode: r.containerCode,
      inventoryId: null, // 执行时由后端生成回填
      productId: sourceProduct.productId,
      productCode: sourceProduct.productCode,
      productName: sourceProduct.productName,
      qty: r.qty,
      unit: sourceProduct.unit,
      weight: r.weight,
      batchNo: r.batchNo,
      sn: r.sn?.trim(),
      craftVersion: r.craftVersion,
      locationId: r.locationId,
      locationCode: r.locationCode,
      layerIndex: r.layerIndex
    })
  })

  const payload: palletMergeApi.CreatePalletMergeDto = {
    warehouseId: formModel.warehouseId,
    accountAliasId: formModel.accountAliasId,
    mergeType: formModel.mergeType as palletMergeApi.PalletMergeType,
    details
  }

  saving.value = true
  try {
    emit('submit', payload)
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  emit('cancel')
}

const beforeColumns = computed(() => [
  { title: '盘号', key: 'containerCode' },
  { title: '库位', key: 'locationCode' },
  { title: '物料编码', key: 'productCode' },
  { title: '物料名称', key: 'productName', minWidth: 200 },
  { title: '数量', key: 'qty', render: (row: any) => `${row.qty} ${row.unit}` },
  { title: '批次号', key: 'batchNo' },
  { title: 'SN号', key: 'sn' },
  { title: '工艺版本', key: 'craftVersion', render: (row: any) => row.craftVersion || '-' },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    align: 'center' as const,
    render: (_: any, index: number) => h(
      NButton,
      { size: 'small', type: 'error', text: true, onClick: () => removeBeforeRow(index) },
      { default: () => '删除' }
    )
  }
])

const searchInventoryColumns = computed(() => [
  { type: 'selection' as const, multiple: formModel.mergeType === 1 },
  { title: '盘号', key: 'containerNo' },
  { title: '库位', key: 'locationCode' },
  { title: '物料编码', key: 'productCode' },
  { title: '物料名称', key: 'productName', minWidth: 200 },
  { title: '批次号', key: 'batchNo' },
  { title: 'SN号', key: 'sn' },
  { title: '可用数量', key: 'availableQuantity', render: (row: any) => `${row.availableQuantity} ${row.unit}` },
  { title: '工艺版本', key: 'craftVersion', render: (row: any) => row.craftVersion || '-' }
])

const searchContainerColumns = computed(() => [
  { title: '盘号', key: 'containerCode' },
  { title: '盘具名称', key: 'name' },
  { title: '库位', key: 'currentLocationCode', render: (row: any) => row.currentLocationCode || '在途/空闲' },
  {
    title: '选择',
    key: 'select',
    width: 80,
    align: 'center' as const,
    render: (row: any) => h(
      NButton,
      { size: 'small', type: 'primary', onClick: () => confirmSelectContainer(row) },
      { default: () => '选择' }
    )
  }
])

onMounted(() => {
  loadWarehouses()
  loadAccountAliases()
})
</script>

<template>
  <BaseCrudPage :search-collapsible="false">
      <template #search>
        <div class="detail-header-wrap">
          <div class="header-action-bar">
            <n-button @click="handleCancel">返回列表</n-button>
            <n-button type="primary" :loading="saving" @click="handleSubmit">保存</n-button>
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
            <n-descriptions-item label="单据号">
              自动生成
            </n-descriptions-item>
            <n-descriptions-item label="单据状态">
              <n-tag size="small" type="default">草稿</n-tag>
            </n-descriptions-item>
            <n-descriptions-item>
              <template #label><span style="color: #d03050; margin-right: 4px;">*</span>业务类型</template>
              <n-select
                v-model:value="formModel.mergeType"
                placeholder="请选择类型"
                :disabled="props.mode === 'edit' || !!props.initialType"
                :options="[
                  { label: '分拆', value: 0 },
                  { label: '合盘', value: 1 }
                ]"
              />
            </n-descriptions-item>
            <n-descriptions-item>
              <template #label><span style="color: #d03050; margin-right: 4px;">*</span>所属仓库</template>
              <n-select
                v-model:value="formModel.warehouseId"
                placeholder="请选择仓库"
                :options="warehouses"
                clearable
                filterable
              />
            </n-descriptions-item>
            <n-descriptions-item>
              <template #label><span style="color: #d03050; margin-right: 4px;">*</span>账户别名</template>
              <n-select
                v-model:value="formModel.accountAliasId"
                placeholder="请选择账户别名"
                :options="accountAliases"
                clearable
                filterable
              />
            </n-descriptions-item>
            <n-descriptions-item label="创建时间">
              -
            </n-descriptions-item>
          </n-descriptions>
        </div>
      </template>

      <template #data>
        <div style="display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 4px;">
          <!-- 调整前源库存 Card -->
          <n-card class="form-card" size="medium">
            <template #header>
              <div class="card-header-flex">
                <span>调整前源库存</span>
                <n-button type="primary" secondary @click="openInventoryModal">
                  选择源库存
                </n-button>
              </div>
            </template>
            
            <n-data-table
              :columns="beforeColumns"
              :data="beforeRows"
              :bordered="false"
              empty-text="点击上方按钮选择要进行分拆或合盘的在库物料"
            />
          </n-card>

          <!-- 数量守恒提示 Banner -->
          <div v-if="beforeRows.length > 0" class="qty-warning-banner">
            <n-alert :type="isQtyConserved ? 'success' : 'warning'" :show-icon="true" :bordered="false">
              <div class="qty-banner-text">
                <span>分拆合盘前总数：<strong>{{ beforeTotalQty }}</strong></span>
                <span style="margin-left: 24px;">分配目标后总数：<strong>{{ afterTotalQty }}</strong></span>
                <span style="margin-left: 24px;">
                  分配差额：
                  <n-tag :type="isQtyConserved ? 'success' : 'error'" size="small">
                    {{ qtyDifference === 0 ? '守恒' : qtyDifference }}
                  </n-tag>
                </span>
              </div>
            </n-alert>
          </div>

          <!-- 调整后目标行 Card -->
          <n-card class="form-card" size="medium">
            <template #header>
              <div class="card-header-flex">
                <span>调整后目标行</span>
                <n-button v-if="formModel.mergeType === 0" type="primary" secondary @click="addAfterRow">
                  新增
                </n-button>
              </div>
            </template>
            
            <table class="pallet-table">
              <thead>
                <tr>
                  <th style="width: 140px;">目标盘号 <span class="required-star">*</span></th>
                  <th style="width: 160px;">目标库位 <span class="required-star">*</span></th>
                  <th style="width: 120px;">数量 <span class="required-star">*</span></th>
                  <th style="width: 150px;">SN号 <span class="required-star">*</span></th>
                  <th style="width: 140px;">批次号</th>
                  <th style="width: 120px;">重量</th>
                  <th style="width: 120px;">工艺版本</th>
                  <th v-if="formModel.mergeType === 0" style="width: 80px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in afterRows" :key="row.id">
                  <td>
                    <div class="container-picker-wrapper">
                      <n-input
                        :value="row.containerCode"
                        readonly
                        placeholder="选择盘号"
                        size="small"
                        @click="openContainerModal(row.id)"
                      />
                    </div>
                  </td>
                  <td>
                    <n-select
                      :value="row.locationId"
                      placeholder="选择库位"
                      size="small"
                      :options="locations"
                      filterable
                      @update:value="(val) => handleLocationUpdate(row, val)"
                    />
                  </td>
                  <td>
                    <n-input-number
                      v-model:value="row.qty"
                      :min="0.0001"
                      :precision="4"
                      size="small"
                      :disabled="formModel.mergeType === 1"
                    />
                  </td>
                  <td>
                    <n-input v-model:value="row.sn" placeholder="输入SN号" size="small" />
                  </td>
                  <td>
                    <n-input v-model:value="row.batchNo" placeholder="输入批次号" size="small" />
                  </td>
                  <td>
                    <n-input-number v-model:value="row.weight" :min="0" :precision="4" size="small" />
                  </td>
                  <td>
                    <n-input v-model:value="row.craftVersion" placeholder="工艺版本" size="small" />
                  </td>
                  <td v-if="formModel.mergeType === 0" style="text-align: center;">
                    <n-button type="error" text size="small" @click="removeAfterRow(index)">
                      删除
                    </n-button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="afterRows.length === 0" class="table-empty-placeholder">
              分拆模式下，请点击上方按钮添加目标行；合盘模式下，选择源库存后将自动生成单条目标汇总行。
            </div>
          </n-card>
        </div>
      </template>
    </BaseCrudPage>

    <!-- 选择库存 Modal -->
    <n-modal
      v-model:show="showInventoryModal"
      preset="card"
      title="选择源库存物料"
      style="width: 80%; max-width: 1000px;"
      size="medium"
    >
      <n-space vertical :size="16">
        <n-form inline label-placement="left" :show-feedback="false">
          <n-form-item label="盘号">
            <n-input v-model:value="searchInventoryQuery.containerCode" placeholder="输入盘号模糊搜索" />
          </n-form-item>
          <n-form-item label="物料编码">
            <n-input v-model:value="searchInventoryQuery.productCode" placeholder="输入物料编码" />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="searchInventory">查询</n-button>
          </n-form-item>
        </n-form>
        
        <n-data-table
          :loading="searchInventoryLoading"
          :columns="searchInventoryColumns"
          :data="searchInventoryRows"
          :row-key="(row) => row.id"
          v-model:checked-row-keys="searchInventoryCheckedKeys"
          max-height="350"
        />
        
        <n-space justify="end">
          <n-button @click="showInventoryModal = false">取消</n-button>
          <n-button type="primary" @click="confirmSelectInventory">确认选择</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <!-- 选择目标载具 Modal -->
    <n-modal
      v-model:show="showContainerModal"
      preset="card"
      title="选择目标盘具"
      style="width: 50%; max-width: 600px;"
      size="medium"
    >
      <n-space vertical :size="16">
        <n-form inline label-placement="left" :show-feedback="false">
          <n-form-item label="盘号">
            <n-input v-model:value="searchContainerQuery.containerCode" placeholder="输入盘号模糊搜索" />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="searchContainer">查询</n-button>
          </n-form-item>
        </n-form>
        
        <n-data-table
          :loading="searchContainerLoading"
          :columns="searchContainerColumns"
          :data="searchContainerRows"
          max-height="300"
        />
      </n-space>
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

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.qty-warning-banner {
  border-radius: 4px;
  overflow: hidden;
}

.qty-banner-text {
  font-size: 14px;
}

.qty-banner-text strong {
  font-weight: 600;
  font-size: 15px;
}

.pallet-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.pallet-table th {
  padding: 8px 12px;
  background-color: #f8fafc;
  color: #334155;
  font-weight: 500;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
}

.pallet-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}

.required-star {
  color: #ef4444;
  margin-left: 2px;
}

.table-empty-placeholder {
  text-align: center;
  padding: 32px;
  color: #94a3b8;
  font-size: 14px;
  background-color: #f8fafc;
  border-radius: 4px;
  margin-top: 12px;
  border: 1px dashed #cbd5e1;
}

/* 覆写 BaseCrudPage 的 flex 撑满高度，防止卡片内的表格高度塌陷 */
:deep(.slot-data .n-data-table) {
  flex: none !important;
  height: auto !important;
}
:deep(.slot-data .n-data-table .n-data-table-wrapper) {
  flex: none !important;
  height: auto !important;
  overflow: visible !important;
}
:deep(.slot-data .n-data-table .n-data-table-base-table) {
  height: auto !important;
}
</style>
