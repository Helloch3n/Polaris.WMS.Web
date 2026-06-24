<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import { getMovableContainerByCode, bindInventory, unbindInventory } from '@/api/wms/container'
import type { MovableContainerDto, InventoryBriefDto } from '@/api/wms/container'
import { getProductList } from '@/api/wms/product'
import type { ProductDto } from '@/api/wms/product'

const router = useRouter()

// 状态管理
const containerCode = ref('')
const containerDetail = ref<MovableContainerDto | null>(null)
const loading = ref(false)

// 库位绑定（当空容器/未上架容器时强制要求）
const inputLocationCode = ref('')

// 绑定表单
const bindForm = ref({
  productId: '',
  productCode: '',
  productName: '',
  qty: 1,
  batchNo: '',
  sn: '',
  unit: 'PCS',
  weight: 0,
  craftVersion: ''
})

// 交互及 UI 状态
const isSubmitting = ref(false)
const showProductSelector = ref(false)
const productSearchQuery = ref('')
const productList = ref<ProductDto[]>([])
const productLoading = ref(false)

// 解绑/拆盘状态
const showUnbindPopup = ref(false)
const activeUnbindItem = ref<InventoryBriefDto | null>(null)
const unbindQty = ref(1)

function goBack() {
  router.push('/home')
}

// 扫描/查询载具
async function handleScanContainer() {
  const code = containerCode.value.trim()
  if (!code) {
    showToast('请先输入或扫描容器编号')
    return
  }

  loading.value = true
  containerDetail.value = null
  inputLocationCode.value = ''
  resetBindForm()
  
  try {
    const detail = await getMovableContainerByCode(code)
    containerDetail.value = detail
    if (detail.currentLocationCode) {
      inputLocationCode.value = detail.currentLocationCode
    }
    showSuccessToast('载具加载成功')
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '加载失败，未找到该载具或已被锁定')
  } finally {
    loading.value = false
  }
}

// 计算是否必须填当前库位
const isLocationRequired = computed(() => {
  if (!containerDetail.value) return false
  // 如果容器没有绑定物理库位 (currentLocationCode 为空)，或者现存物料数为0，需要设定/修改库位
  return !containerDetail.value.currentLocationCode || containerDetail.value.inventories.length === 0
})

// 检索物料
async function searchProducts() {
  productLoading.value = true
  try {
    const res = await getProductList({
      filter: productSearchQuery.value,
      maxResultCount: 20,
      skipCount: 0
    })
    productList.value = res.items || []
  } catch (error: any) {
    console.error(error)
    showFailToast('获取产品列表失败')
  } finally {
    productLoading.value = false
  }
}

function openProductSelector() {
  showProductSelector.value = true
  productSearchQuery.value = ''
  productList.value = []
  searchProducts()
}

function selectProduct(prod: ProductDto) {
  bindForm.value.productId = prod.id
  bindForm.value.productCode = prod.code
  bindForm.value.productName = prod.name
  bindForm.value.unit = prod.unit || 'PCS'
  showProductSelector.value = false
}

function resetBindForm() {
  bindForm.value = {
    productId: '',
    productCode: '',
    productName: '',
    qty: 1,
    batchNo: '',
    sn: '',
    unit: 'PCS',
    weight: 0,
    craftVersion: ''
  }
}

// 提交组盘绑定
async function handleBind() {
  if (!containerDetail.value) {
    showToast('请先扫描有效的容器')
    return
  }
  if (isLocationRequired.value && !inputLocationCode.value.trim()) {
    showToast('当前为空白容器，必须扫描或输入当前库位')
    return
  }
  if (!bindForm.value.productId) {
    showToast('请先选择需要绑定的物料')
    return
  }
  if (bindForm.value.qty <= 0) {
    showToast('绑定数量必须大于 0')
    return
  }

  isSubmitting.value = true
  showToast({ message: '提交组盘绑定中...', type: 'loading', duration: 0 })

  try {
    await bindInventory({
      containerCode: containerDetail.value.containerCode,
      locationCode: isLocationRequired.value ? inputLocationCode.value.trim() : undefined,
      productId: bindForm.value.productId,
      productCode: bindForm.value.productCode,
      productName: bindForm.value.productName,
      qty: bindForm.value.qty,
      batchNo: bindForm.value.batchNo || undefined,
      sn: bindForm.value.sn || undefined,
      unit: bindForm.value.unit || undefined,
      weight: bindForm.value.weight || undefined,
      craftVersion: bindForm.value.craftVersion || undefined
    })

    showSuccessToast('组盘绑定成功')
    resetBindForm()
    // 重新获取刷新最新的容器状态
    const code = containerDetail.value.containerCode
    containerDetail.value = await getMovableContainerByCode(code)
    if (containerDetail.value.currentLocationCode) {
      inputLocationCode.value = containerDetail.value.currentLocationCode
    }
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '组盘绑定失败')
  } finally {
    isSubmitting.value = false
  }
}

// 开始解绑
function startUnbind(item: InventoryBriefDto) {
  activeUnbindItem.value = item
  unbindQty.value = item.quantity
  showUnbindPopup.value = true
}

// 确认解绑
async function confirmUnbind() {
  if (!containerDetail.value || !activeUnbindItem.value) return
  if (unbindQty.value <= 0 || unbindQty.value > activeUnbindItem.value.quantity) {
    showToast('请输入合法的拆盘解绑数量')
    return
  }

  showUnbindPopup.value = false
  isSubmitting.value = true
  showToast({ message: '提交拆解解绑中...', type: 'loading', duration: 0 })

  try {
    await unbindInventory({
      containerCode: containerDetail.value.containerCode,
      inventoryId: activeUnbindItem.value.inventoryId,
      qty: unbindQty.value
    })

    showSuccessToast('拆盘解绑成功')
    // 重新获取刷新容器状态
    const code = containerDetail.value.containerCode
    containerDetail.value = await getMovableContainerByCode(code)
    if (containerDetail.value.currentLocationCode) {
      inputLocationCode.value = containerDetail.value.currentLocationCode
    }
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '拆托解绑失败')
  } finally {
    isSubmitting.value = false
    activeUnbindItem.value = null
  }
}

// 模拟测试预填数据函数
function triggerContainerScan(code: string) {
  containerCode.value = code
  handleScanContainer()
}

function triggerLocationScan() {
  inputLocationCode.value = 'L-01-01'
}

function prefillProductSimulation() {
  bindForm.value.productId = 'b1b6eb0a-9d62-4467-bc18-2ad9938f32c5'
  bindForm.value.productCode = 'P-SCREW-01'
  bindForm.value.productName = '内六角不锈钢螺丝 M6*20'
  bindForm.value.qty = 500
  bindForm.value.batchNo = 'LOT-20260604'
  bindForm.value.unit = 'PCS'
}
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Navbar -->
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="goBack">
      <template #title>
        <span class="text-white font-black tracking-wide">容器组盘拆托</span>
      </template>
    </van-nav-bar>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
      <!-- 容器扫描区 -->
      <section class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div class="flex justify-between items-center mb-3">
          <span class="text-xs text-slate-500 font-extrabold uppercase tracking-wide">Step 1: Scan Container / 扫描载具</span>
          <!-- 快捷模拟按钮 -->
          <div class="flex space-x-1">
            <van-button size="mini" type="warning" plain class="!rounded-md" @click="triggerContainerScan('C001')">模拟 C001</van-button>
            <van-button size="mini" type="warning" plain class="!rounded-md" @click="triggerContainerScan('C002')">模拟 C002</van-button>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <van-field
            v-model="containerCode"
            clearable
            placeholder="扫描或输入载具/容器 LPN 编码"
            class="flex-1 !bg-gray-100 !rounded-xl !p-2.5 font-bold"
            @keyup.enter="handleScanContainer"
          />
          <van-button
            type="primary"
            class="!h-11 !rounded-xl !px-4"
            icon="scan"
            @click="handleScanContainer"
          />
        </div>
      </section>

      <!-- 载具当前状态 & 库存列表 -->
      <section v-if="containerDetail" class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div class="flex justify-between items-center border-b border-gray-100 pb-3">
          <span class="text-xs text-slate-500 font-extrabold uppercase tracking-wide">Current Status / 载具现状</span>
          <van-tag type="primary" size="medium" class="!px-2.5 !py-1 !rounded-md font-bold">{{ containerDetail.containerType }}</van-tag>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="bg-slate-50 p-3 rounded-xl">
            <div class="text-xs text-slate-400 font-medium">载具编号</div>
            <div class="font-mono font-black text-slate-800 mt-1 text-base">{{ containerDetail.containerCode }}</div>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl">
            <div class="text-xs text-slate-400 font-medium">当前物理库位</div>
            <div class="font-mono font-black text-slate-800 mt-1 text-base">{{ containerDetail.currentLocationCode || '暂存区/未上架' }}</div>
          </div>
        </div>

        <!-- 联动物理库位设定 -->
        <div v-if="isLocationRequired" class="bg-amber-50 border border-amber-100 p-3 rounded-xl space-y-2.5">
          <div class="text-xs text-amber-700 font-extrabold flex items-center">
            <van-icon name="warning-o" class="mr-1" size="14"/> 空白闲置容器，绑定货物前必须指定放置的库位
          </div>
          <div class="flex items-center space-x-2">
            <van-field
              v-model="inputLocationCode"
              clearable
              placeholder="请扫描或输入当前物理库位编码"
              class="flex-1 !bg-white !rounded-lg !p-1.5 font-mono text-sm"
            />
            <van-button
              type="warning"
              size="small"
              class="!rounded-lg"
              icon="scan"
              @click="triggerLocationScan"
            />
          </div>
        </div>

        <!-- 载具挂载的库存明细 -->
        <div>
          <div class="text-xs text-slate-500 font-extrabold mb-2.5">载具中现有库存挂载 ({{ containerDetail.inventories.length }} 行)</div>
          
          <div v-if="containerDetail.inventories.length === 0" class="text-center py-6 text-slate-400 italic text-sm">
            <van-icon name="info-o" size="20" class="block mx-auto mb-1 text-slate-300" />
            当前为空载具，可进行货物组装绑定
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="inv in containerDetail.inventories"
              :key="inv.inventoryId"
              class="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs flex flex-col space-y-2"
            >
              <div class="flex justify-between items-start">
                <div class="font-bold text-slate-800 font-mono text-sm leading-tight">{{ inv.productCode }}</div>
                <div class="text-right">
                  <div class="text-base font-black text-blue-600">{{ inv.quantity }} <span class="text-xs text-slate-400 font-medium ml-0.5">{{ inv.uom }}</span></div>
                </div>
              </div>
              <div class="text-slate-600 text-xs font-semibold">{{ inv.productName }}</div>
              
              <div class="flex justify-between items-center text-[11px] text-slate-400">
                <span>批次: <strong class="text-slate-600 font-bold font-mono">{{ inv.batchNo || '--' }}</strong></span>
                <van-button
                  type="danger"
                  size="mini"
                  plain
                  class="!rounded-md !px-3 font-bold"
                  icon="cross"
                  @click="startUnbind(inv)"
                >
                  拆盘/解绑
                </van-button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 组盘绑定操作面板 -->
      <section v-if="containerDetail" class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div class="flex justify-between items-center border-b border-gray-100 pb-3">
          <span class="text-xs text-slate-500 font-extrabold uppercase tracking-wide">Step 2: Bind Inventory / 组盘绑定新物料</span>
          <!-- 模拟快捷物料 -->
          <van-button size="mini" type="warning" plain class="!rounded-md" @click="prefillProductSimulation">快捷物料螺丝</van-button>
        </div>

        <!-- 选择物料 -->
        <div class="space-y-1">
          <label class="text-xs text-slate-500 font-bold">物料商品 (Product) *</label>
          <div class="flex items-center space-x-2">
            <van-field
              :model-value="bindForm.productCode ? `${bindForm.productCode} | ${bindForm.productName}` : ''"
              readonly
              clickable
              placeholder="点击选择需要绑定的物料"
              class="flex-1 !bg-gray-50 !rounded-xl !p-2.5 font-bold"
              @click="openProductSelector"
            />
            <van-button
              type="primary"
              class="!h-11 !rounded-xl !px-3.5"
              icon="search"
              @click="openProductSelector"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <!-- 数量 -->
          <div class="space-y-1">
            <label class="text-xs text-slate-500 font-bold">绑定数量 (Qty) *</label>
            <van-field
              v-model.number="bindForm.qty"
              type="digit"
              placeholder="请输入绑定数量"
              class="!bg-gray-50 !rounded-xl !p-2.5 font-bold"
            />
          </div>
          <!-- 批次号 -->
          <div class="space-y-1">
            <label class="text-xs text-slate-500 font-bold">批次号 (Batch No) *</label>
            <van-field
              v-model="bindForm.batchNo"
              placeholder="如 LOT20260604"
              class="!bg-gray-50 !rounded-xl !p-2.5 font-mono"
            />
          </div>
        </div>

        <!-- 展开高级选项 -->
        <van-collapse :border="false" class="custom-collapse">
          <van-collapse-item title="更多可选信息 (序列号/重量/工艺)" name="more">
            <div class="space-y-4 pt-2">
              <div class="space-y-1">
                <label class="text-xs text-slate-500 font-bold">序列号 (SN)</label>
                <van-field
                  v-model="bindForm.sn"
                  placeholder="SN 序列号(非必填)"
                  class="!bg-gray-50 !rounded-xl !p-2"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs text-slate-500 font-bold">重量 (Weight)</label>
                  <van-field
                    v-model.number="bindForm.weight"
                    type="number"
                    placeholder="容器内重量(kg)"
                    class="!bg-gray-50 !rounded-xl !p-2"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-slate-500 font-bold">工艺版本</label>
                  <van-field
                    v-model="bindForm.craftVersion"
                    placeholder="工艺版本号"
                    class="!bg-gray-50 !rounded-xl !p-2"
                  />
                </div>
              </div>
            </div>
          </van-collapse-item>
        </van-collapse>

        <van-button
          block
          round
          type="primary"
          class="!bg-blue-600 active:!bg-blue-700 !border-none font-bold text-base !h-12 mt-2 shadow-md"
          :loading="isSubmitting"
          @click="handleBind"
        >
          BIND TO CONTAINER / 绑定货物至载具
        </van-button>
      </section>
    </div>

    <!-- 物料查询选择弹出层 (FullScreen Selector) -->
    <van-popup
      v-model:show="showProductSelector"
      position="right"
      :style="{ width: '100%', height: '100%' }"
      destroy-on-close
    >
      <div class="h-screen flex flex-col bg-gray-50">
        <van-nav-bar title="选择物料" left-arrow @click-left="showProductSelector = false" />
        
        <div class="p-3 shrink-0 bg-white shadow-sm flex items-center space-x-2">
          <van-field
            v-model="productSearchQuery"
            clearable
            placeholder="输入物料名称、编码筛选"
            class="flex-1 !bg-gray-100 !rounded-xl !p-2"
            left-icon="search"
            @keyup.enter="searchProducts"
          />
          <van-button type="primary" size="small" class="!rounded-xl !px-4" @click="searchProducts">搜索</van-button>
        </div>

        <!-- 物料列表 -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <van-loading v-if="productLoading" class="!block !mx-auto !mt-10" size="24px">正在获取物料库...</van-loading>
          <van-empty v-else-if="productList.length === 0" description="未检索到符合条件的物料记录" />

          <div
            v-for="prod in productList"
            :key="prod.id"
            class="bg-white p-4 rounded-xl border border-gray-100 active:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            @click="selectProduct(prod)"
          >
            <div class="text-sm font-black text-slate-800 mb-1 flex justify-between">
              <span>{{ prod.code }}</span>
              <van-tag type="warning" size="medium" plain class="font-bold">{{ prod.unit }}</van-tag>
            </div>
            <div class="text-xs text-slate-600 leading-normal">{{ prod.name }}</div>
            <div class="text-[11px] text-slate-400 mt-2 flex items-center">
              <van-icon name="info-o" class="mr-1" />
              <span>批次管理: {{ prod.isBatchManagementEnabled ? '开启' : '关闭' }}</span>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 拆托/解绑数量录入弹窗 -->
    <van-popup
      v-model:show="showUnbindPopup"
      position="bottom"
      round
      class="pb-safe"
      :style="{ maxHeight: '50%' }"
    >
      <div v-if="activeUnbindItem" class="p-5 space-y-4">
        <div class="flex justify-between items-center border-b border-gray-100 pb-3">
          <span class="font-black text-slate-800 text-base">拆盘/解绑数量确认</span>
          <van-icon name="cross" size="20" @click="showUnbindPopup = false" class="text-slate-400" />
        </div>

        <div class="bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs space-y-1 text-rose-700 font-bold">
          <div>物料: {{ activeUnbindItem.productCode }} ({{ activeUnbindItem.productName }})</div>
          <div>当前挂载总量: {{ activeUnbindItem.quantity }} {{ activeUnbindItem.uom }}</div>
          <div>批次: {{ activeUnbindItem.batchNo || '--' }}</div>
        </div>

        <div class="space-y-1">
          <label class="text-xs text-slate-500 font-bold">要解绑/扣减的数量</label>
          <div class="flex items-center space-x-3">
            <van-field
              v-model.number="unbindQty"
              type="digit"
              placeholder="输入解绑数量"
              class="flex-1 !bg-gray-100 !rounded-xl !p-2.5 font-bold"
            />
            <van-button
              type="default"
              size="small"
              class="!rounded-lg"
              @click="unbindQty = activeUnbindItem.quantity"
            >
              全部解绑
            </van-button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-2">
          <van-button block round class="!border-gray-300 !text-slate-700" @click="showUnbindPopup = false">取消</van-button>
          <van-button
            block
            round
            type="danger"
            class="!bg-red-600 active:!bg-red-700 !border-none font-bold"
            :loading="isSubmitting"
            @click="confirmUnbind"
          >
            确认解绑
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.custom-nav-bar {
  --van-nav-bar-background: #1e293b;
  --van-nav-bar-icon-color: #ffffff;
  --van-nav-bar-text-color: #ffffff;
}

:deep(.van-nav-bar::after) {
  display: none;
}

.custom-collapse {
  --van-collapse-item-content-padding: 0;
  --van-collapse-item-content-background: transparent;
}

:deep(.van-collapse-item__title) {
  padding: 8px 4px;
  background-color: transparent;
  font-size: 12px;
  font-weight: bold;
  color: #64748b;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
</style>
