<script setup lang="ts">
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import { getInventoryList } from '@/api/wms/inventory'
import type { InventoryDto } from '@/api/wms/inventory'

const searchValue = ref('')
const loading = ref(false)
const queried = ref(false)
const list = ref<InventoryDto[]>([])
const containerPopupVisible = ref(false)
const locationPopupVisible = ref(false)
const selectedContainerCode = ref('')
const selectedLocationCode = ref('')

const resultCount = computed(() => list.value.length)

const selectedContainerItems = computed(() => {
  const containerCode = selectedContainerCode.value.trim()
  if (!containerCode) {
    return []
  }
  return list.value.filter((item) => (item.containerCode || item.containerNo || '').trim() === containerCode)
})

const selectedLocationItems = computed(() => {
  const locationCode = selectedLocationCode.value.trim()
  if (!locationCode) {
    return []
  }
  return list.value.filter((item) => (item.locationCode || '').trim() === locationCode)
})

const selectedContainerTotalQuantity = computed(() =>
  selectedContainerItems.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
)

const selectedLocationTotalQuantity = computed(() =>
  selectedLocationItems.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
)

function formatQuantity(value: unknown) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return '-'
  return numberValue.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function simulateScan() {
  searchValue.value = searchValue.value.trim() || 'A-01-01'
}

function openContainerDetail(item: InventoryDto) {
  const containerCode = String(item.containerCode || item.containerNo || '').trim()
  if (!containerCode) {
    showToast('当前记录缺少容器编码')
    return
  }
  selectedContainerCode.value = containerCode
  containerPopupVisible.value = true
}

function openLocationDetail(item: InventoryDto) {
  const locationCode = String(item.locationCode || '').trim()
  if (!locationCode) {
    showToast('当前记录缺少库位编码')
    return
  }
  selectedLocationCode.value = locationCode
  locationPopupVisible.value = true
}

async function onSearch() {
  const keyword = searchValue.value.trim()
  if (!keyword) {
    showToast('请先扫描或输入查询关键字')
    return
  }

  loading.value = true
  queried.value = true
  try {
    const res = await getInventoryList({
      maxResultCount: 50,
      skipCount: 0,
      containerCode: keyword,
      containerNo: keyword,
      productCode: keyword,
      locationCode: keyword,
      batchNo: keyword,
    })
    list.value = res.items ?? []
  } catch (error: any) {
    console.error(error)
    showToast(error?.message || '库存查询失败')
    list.value = []
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50 pb-safe">
    <div class="bg-slate-800 pt-8 pb-4 px-4 shrink-0 rounded-b-3xl shadow-sm">
      <div class="text-white font-extrabold text-2xl mb-4 tracking-wider">库存查询</div>
      <div class="flex space-x-2">
        <van-field
          v-model="searchValue"
          clearable
          placeholder="扫描库位、盘具或物料条码"
          class="!bg-white/10 !text-white !rounded-xl custom-search flex-1"
          left-icon="scan"
          @keyup.enter="onSearch"
        />
        <van-button round class="!bg-white !text-slate-800 !border-none !px-4 shrink-0" @click="simulateScan">模拟扫码</van-button>
      </div>
      <div class="mt-3">
        <van-button block round class="!bg-cyan-500 !text-white !border-none" :loading="loading" @click="onSearch">开始查询</van-button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 mt-2">
      <div class="text-xs font-bold text-gray-400 uppercase">查询结果 ({{ resultCount }})</div>

      <van-loading v-if="loading" class="!block !mx-auto !mt-8" size="24px">加载中...</van-loading>
      <van-empty v-else-if="queried && resultCount === 0" description="未查询到库存记录" class="mt-8" />
      
      <div v-for="item in list" :key="item.id" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-start mb-2">
          <div class="text-lg font-black text-slate-800">{{ item.productName || '-' }}</div>
          <div class="text-right">
            <div class="text-xl font-black text-blue-600">{{ formatQuantity(item.quantity) }}</div>
            <div class="text-xs text-slate-400 mt-1">{{ item.unit || '-' }}</div>
          </div>
        </div>
        <div class="text-sm text-gray-500 flex items-center mt-1">
          <van-icon name="apps-o" class="mr-1" /> 物料编码: <span class="font-mono text-gray-800 ml-2">{{ item.productCode || '-' }}</span>
        </div>
        <div class="text-sm text-gray-500 flex items-center mt-3">
          <van-icon name="location-o" class="mr-1" /> 库位: <span class="font-mono font-bold text-gray-800 ml-2">{{ item.locationCode || '-' }}</span>
        </div>
        <div class="text-sm text-gray-500 flex items-center mt-1">
          <van-icon name="coupon-o" class="mr-1" /> 容器: <span class="font-mono text-gray-800 ml-2">{{ item.containerCode || item.containerNo || '-' }}</span>
        </div>
        <div class="text-sm text-gray-500 flex items-center mt-1">
          <van-icon name="flag-o" class="mr-1" /> 批次: <span class="font-mono text-gray-800 ml-2">{{ item.batchNo || '-' }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 mt-4 text-center">
          <div class="bg-slate-50 rounded-lg py-2">
            <div class="text-xs text-slate-400">实际数量</div>
            <div class="text-sm font-black text-slate-800">{{ formatQuantity(item.quantity) }}</div>
          </div>
          <div class="bg-emerald-50 rounded-lg py-2">
            <div class="text-xs text-emerald-500">可用数量</div>
            <div class="text-sm font-black text-emerald-700">{{ formatQuantity(item.availableQuantity) }}</div>
          </div>
          <div class="bg-amber-50 rounded-lg py-2">
            <div class="text-xs text-amber-500">锁定数量</div>
            <div class="text-sm font-black text-amber-700">{{ formatQuantity(item.lockedQuantity) }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-4">
          <van-button plain round size="small" class="!border-slate-300 !text-slate-700" @click="openLocationDetail(item)">库位明细</van-button>
          <van-button plain round size="small" class="!border-cyan-300 !text-cyan-700" @click="openContainerDetail(item)">容器明细</van-button>
        </div>
      </div>
    </div>

    <van-popup
      v-model:show="containerPopupVisible"
      position="bottom"
      round
      destroy-on-close
      :style="{ height: '72%' }"
    >
      <div class="h-full flex flex-col bg-white">
        <div class="px-4 py-3 border-b border-gray-100 shrink-0">
          <div class="text-base font-black text-slate-800">容器明细</div>
          <div class="text-xs text-slate-500 mt-1">基于当前查询结果汇总 · {{ selectedContainerCode || '--' }}</div>
        </div>

        <div class="px-4 py-3 grid grid-cols-2 gap-3 shrink-0">
          <div class="rounded-xl bg-cyan-50 p-3 text-center">
            <div class="text-xs text-cyan-500">SKU 数</div>
            <div class="mt-2 text-lg font-black text-cyan-700">{{ selectedContainerItems.length }}</div>
          </div>
          <div class="rounded-xl bg-slate-50 p-3 text-center">
            <div class="text-xs text-slate-400">容器总量</div>
            <div class="mt-2 text-lg font-black text-slate-800">{{ formatQuantity(selectedContainerTotalQuantity) }}</div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          <van-empty v-if="selectedContainerItems.length === 0" description="当前查询结果中没有该容器明细" />

          <div v-for="item in selectedContainerItems" :key="item.id" class="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div class="text-sm font-black text-slate-800">{{ item.productCode || '-' }} <span class="ml-2">{{ item.productName || '-' }}</span></div>
            <div class="mt-2 text-xs text-slate-500">库位: <span class="font-mono text-slate-800">{{ item.locationCode || '-' }}</span></div>
            <div class="mt-1 text-xs text-slate-500">批次: <span class="font-mono text-slate-800">{{ item.batchNo || '-' }}</span></div>
            <div class="mt-3 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-lg bg-white py-2">
                <div class="text-[11px] text-slate-400">实际</div>
                <div class="text-xs font-black text-slate-800">{{ formatQuantity(item.quantity) }}</div>
              </div>
              <div class="rounded-lg bg-emerald-50 py-2">
                <div class="text-[11px] text-emerald-500">可用</div>
                <div class="text-xs font-black text-emerald-700">{{ formatQuantity(item.availableQuantity) }}</div>
              </div>
              <div class="rounded-lg bg-amber-50 py-2">
                <div class="text-[11px] text-amber-500">锁定</div>
                <div class="text-xs font-black text-amber-700">{{ formatQuantity(item.lockedQuantity) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <van-popup
      v-model:show="locationPopupVisible"
      position="bottom"
      round
      destroy-on-close
      :style="{ height: '72%' }"
    >
      <div class="h-full flex flex-col bg-white">
        <div class="px-4 py-3 border-b border-gray-100 shrink-0">
          <div class="text-base font-black text-slate-800">库位明细</div>
          <div class="text-xs text-slate-500 mt-1">基于当前查询结果汇总 · {{ selectedLocationCode || '--' }}</div>
        </div>

        <div class="px-4 py-3 grid grid-cols-2 gap-3 shrink-0">
          <div class="rounded-xl bg-indigo-50 p-3 text-center">
            <div class="text-xs text-indigo-500">库存行数</div>
            <div class="mt-2 text-lg font-black text-indigo-700">{{ selectedLocationItems.length }}</div>
          </div>
          <div class="rounded-xl bg-slate-50 p-3 text-center">
            <div class="text-xs text-slate-400">库位总量</div>
            <div class="mt-2 text-lg font-black text-slate-800">{{ formatQuantity(selectedLocationTotalQuantity) }}</div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          <van-empty v-if="selectedLocationItems.length === 0" description="当前查询结果中没有该库位明细" />

          <div v-for="item in selectedLocationItems" :key="item.id" class="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div class="text-sm font-black text-slate-800">{{ item.productCode || '-' }} <span class="ml-2">{{ item.productName || '-' }}</span></div>
            <div class="mt-2 text-xs text-slate-500">容器: <span class="font-mono text-slate-800">{{ item.containerCode || item.containerNo || '-' }}</span></div>
            <div class="mt-1 text-xs text-slate-500">批次: <span class="font-mono text-slate-800">{{ item.batchNo || '-' }}</span></div>
            <div class="mt-3 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-lg bg-white py-2">
                <div class="text-[11px] text-slate-400">实际</div>
                <div class="text-xs font-black text-slate-800">{{ formatQuantity(item.quantity) }}</div>
              </div>
              <div class="rounded-lg bg-emerald-50 py-2">
                <div class="text-[11px] text-emerald-500">可用</div>
                <div class="text-xs font-black text-emerald-700">{{ formatQuantity(item.availableQuantity) }}</div>
              </div>
              <div class="rounded-lg bg-amber-50 py-2">
                <div class="text-[11px] text-amber-500">锁定</div>
                <div class="text-xs font-black text-amber-700">{{ formatQuantity(item.lockedQuantity) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
:deep(.custom-search .van-field__control) { color: white; font-weight: bold; }
:deep(.custom-search .van-field__control::placeholder) { color: #cbd5e1; }
:deep(.custom-search .van-icon) { color: #fff; font-size: 20px; }
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 12px); }
</style>