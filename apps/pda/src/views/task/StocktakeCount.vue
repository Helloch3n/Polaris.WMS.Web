<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'

import * as stocktakeApi from '@/api/wms/stocktake'

const router = useRouter()

// 盘点单列表和当前选中的盘点单
const activePlans = ref<stocktakeApi.StocktakeOrderDto[]>([])
const selectedPlanId = ref<string>('')
const selectedPlan = computed(() => activePlans.value.find((p) => p.id === selectedPlanId.value))

// 页面加载状态
const loadingPlans = ref(false)
const submitting = ref(false)

// 扫描输入表单
const locationCode = ref('')
const containerCode = ref('')
const sn = ref('')
const productCode = ref('')
const realQty = ref<number | null>(null)
const realWeight = ref<number | null>(null)

function parseNumericField(value: string | number) {
  if (value === '') {
    return null
  }

  const parsedValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const realQtyInput = computed<string | number>({
  get: () => realQty.value ?? '',
  set: (value) => {
    realQty.value = parseNumericField(value)
  },
})

const realWeightInput = computed<string | number>({
  get: () => realWeight.value ?? '',
  set: (value) => {
    realWeight.value = parseNumericField(value)
  },
})

// 扫描历史纪录（保存在本地内存中，仅供本次操作参考，遵循盲盘原则不显示快照）
interface ScanHistoryItem {
  id: string
  locationCode: string
  containerCode: string
  productCode: string
  sn: string
  realQty: number
  time: string
}
const scanHistoryList = ref<ScanHistoryItem[]>([])

function goBack() {
  router.back()
}

// 加载执行中的盘点计划
async function loadActivePlans() {
  loadingPlans.value = true
  try {
    // 拉取“已锁定”(20) 和 “盘点中”(30) 的单据
    const resLocked = await stocktakeApi.getList({
      status: stocktakeApi.StocktakeOrderStatus.Locked,
      maxResultCount: 100,
    })
    const resInProgress = await stocktakeApi.getList({
      status: stocktakeApi.StocktakeOrderStatus.InProgress,
      maxResultCount: 100,
    })
    
    activePlans.value = [
      ...(resLocked.items ?? []),
      ...(resInProgress.items ?? []),
    ]
    
    if (activePlans.value.length > 0) {
      selectedPlanId.value = activePlans.value[0].id
    }
  } catch (error: any) {
    showFailToast(error?.message || '加载盘点计划失败')
  } finally {
    loadingPlans.value = false
  }
}

// 提交盲盘结果
async function handleSubmit() {
  if (!selectedPlanId.value) {
    showToast('请选择要盘点的盘点单')
    return
  }
  if (!locationCode.value.trim()) {
    showToast('请扫描或输入库位')
    return
  }
  if (!containerCode.value.trim()) {
    showToast('请扫描或输入容器编码')
    return
  }
  if (!sn.value.trim()) {
    showToast('请扫描或输入盘号/SN')
    return
  }
  if (!productCode.value.trim()) {
    showToast('请扫描或输入物料编码')
    return
  }
  if (realQty.value === null || realQty.value < 0) {
    showToast('请输入有效的盘点数量')
    return
  }

  submitting.value = true
  showToast({ message: '数据提交中...', type: 'loading', duration: 0 })

  try {
    const detail = await stocktakeApi.pdaSubmitCount({
      stocktakeOrderId: selectedPlanId.value,
      locationCode: locationCode.value.trim().toUpperCase(),
      containerCode: containerCode.value.trim().toUpperCase(),
      sn: sn.value.trim().toUpperCase(),
      productCode: productCode.value.trim().toUpperCase(),
      realQty: realQty.value,
      realWeight: realWeight.value ?? undefined,
    })

    showSuccessToast('盘点提交成功')

    // 记录到本地扫描历史中
    scanHistoryList.value.unshift({
      id: detail.id,
      locationCode: locationCode.value.trim().toUpperCase(),
      containerCode: containerCode.value.trim().toUpperCase(),
      productCode: productCode.value.trim().toUpperCase(),
      sn: sn.value.trim().toUpperCase(),
      realQty: realQty.value,
      time: new Date().toLocaleTimeString(),
    })

    // 清空条码与数量，库位和容器通常在同一个货位上盘多盘，保留不清除，以提高效率
    sn.value = ''
    realQty.value = null
    realWeight.value = null
  } catch (error: any) {
    showFailToast(error?.message || '提交盘点失败')
  } finally {
    submitting.value = false
  }
}

// 清除当前表单
function handleResetForm() {
  locationCode.value = ''
  containerCode.value = ''
  sn.value = ''
  productCode.value = ''
  realQty.value = null
  realWeight.value = null
}

watch(selectedPlanId, () => {
  scanHistoryList.value = []
  handleResetForm()
})

onMounted(() => {
  loadActivePlans()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- 头部 -->
    <div class="bg-slate-800 px-5 pt-8 pb-4 shrink-0 shadow-sm relative z-10">
      <div class="flex items-center text-white">
        <van-icon name="arrow-left" size="22" class="mr-3 cursor-pointer" @click="goBack" />
        <div class="font-extrabold text-2xl tracking-wider">计划盲盘登记</div>
      </div>
    </div>

    <!-- 计划选择 -->
    <div class="bg-white p-4 shadow-sm shrink-0 border-b border-gray-100">
      <div class="text-xs text-gray-400 mb-1">选择盘点计划:</div>
      <div v-if="loadingPlans" class="text-sm text-gray-500 py-1">加载盘点任务中...</div>
      <div v-else-if="activePlans.length === 0" class="text-sm text-red-500 py-1 font-bold">
        暂无待执行的盘点任务，请先在 PC 端锁定并发布盘点单。
      </div>
      <div v-else class="relative">
        <select
          v-model="selectedPlanId"
          class="w-full bg-slate-100 text-slate-800 rounded-xl px-3 py-2 text-sm font-bold border border-slate-200 outline-none appearance-none"
        >
          <option v-for="plan in activePlans" :key="plan.id" :value="plan.id">
            {{ plan.orderNo }} - {{ plan.warehouseName }}
          </option>
        </select>
        <div class="absolute right-3 top-3 pointer-events-none text-slate-500">
          <van-icon name="arrow-down" />
        </div>
      </div>
    </div>

    <!-- 盘点单未就绪提示 -->
    <div v-if="activePlans.length === 0" class="flex-1 flex flex-col justify-center items-center p-6 text-center">
      <van-icon name="warning-o" size="48" class="text-slate-300 mb-3" />
      <span class="text-gray-500 text-sm">暂无可用的盘点指令</span>
      <van-button class="mt-4" type="primary" size="small" round @click="loadActivePlans">刷新重试</van-button>
    </div>

    <!-- 扫描录入区 -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-4">
      <div class="bg-white rounded-2xl p-4 shadow-sm space-y-3 border border-gray-100">
        <div class="text-sm font-bold text-slate-800 border-b border-gray-100 pb-2 mb-2 flex items-center">
          <van-icon name="scan" class="mr-1.5 text-emerald-500 text-base" />
          实物清扫登记 (盲盘)
        </div>

        <van-field
          v-model="locationCode"
          label="源库位"
          placeholder="扫码/输入库位"
          required
          clearable
          label-width="80px"
          class="!px-0 !py-2 align-middle"
        />

        <van-field
          v-model="containerCode"
          label="载具条码"
          placeholder="扫码/输入容器"
          required
          clearable
          label-width="80px"
          class="!px-0 !py-2"
        />

        <van-field
          v-model="productCode"
          label="物料编码"
          placeholder="扫码/输入物料"
          required
          clearable
          label-width="80px"
          class="!px-0 !py-2"
        />

        <van-field
          v-model="sn"
          label="盘号/SN"
          placeholder="扫码/输入SN码"
          required
          clearable
          label-width="80px"
          class="!px-0 !py-2"
        />

        <van-field
          v-model="realQtyInput"
          label="实盘数量"
          type="number"
          placeholder="请输入清点数量 (留空)"
          required
          label-width="80px"
          class="!px-0 !py-2"
        />

        <van-field
          v-model="realWeightInput"
          label="实盘重量"
          type="number"
          placeholder="请输入清点重量 (可选)"
          label-width="80px"
          class="!px-0 !py-2"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-4">
        <van-button
          block
          round
          plain
          type="warning"
          class="font-bold border-amber-500 text-amber-500"
          @click="handleResetForm"
        >
          清空输入
        </van-button>
        <van-button
          block
          round
          type="primary"
          class="!bg-emerald-500 active:!bg-emerald-600 !border-none font-bold text-white shadow-md"
          :loading="submitting"
          @click="handleSubmit"
        >
          确认提交
        </van-button>
      </div>

      <!-- 本次扫描历史纪录 -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div class="text-sm font-bold text-slate-800 border-b border-gray-100 pb-2 mb-3 flex items-center justify-between">
          <div class="flex items-center">
            <van-icon name="clock-o" class="mr-1.5 text-indigo-500 text-base" />
            <span>本次扫描纪录</span>
          </div>
          <span class="text-xs font-normal text-gray-400">已扫 {{ scanHistoryList.length }} 件</span>
        </div>

        <div v-if="scanHistoryList.length === 0" class="text-center py-6 text-gray-400 text-xs">
          暂无已提交的历史纪录，扫描并提交后在此显示。
        </div>
        <div v-else class="space-y-3 max-h-60 overflow-y-auto">
          <div
            v-for="(item, idx) in scanHistoryList"
            :key="item.id"
            class="p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1 relative"
          >
            <div class="flex justify-between items-center text-slate-800 font-bold">
              <span>SN: {{ item.sn }}</span>
              <span class="text-emerald-600">实盘: {{ item.realQty }}</span>
            </div>
            <div class="text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>库位: {{ item.locationCode }}</span>
              <span>载具: {{ item.containerCode }}</span>
              <span>物料: {{ item.productCode }}</span>
            </div>
            <div class="text-[10px] text-gray-400 text-right mt-1">{{ item.time }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
select {
  outline: none;
}
</style>
