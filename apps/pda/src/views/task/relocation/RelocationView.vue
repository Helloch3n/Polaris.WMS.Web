<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import { getMovableContainerByCode, relocateContainer } from '@/api/wms/container'
import type { MovableContainerDto } from '@/api/wms/container'

const router = useRouter()

const containerCode = ref('')
const targetLocationCode = ref('')
const loading = ref(false)
const submitting = ref(false)
const containerDetail = ref<MovableContainerDto | null>(null)

function goBack() {
  router.push('/home')
}

// 扫描容器获取详情
async function handleScanContainer() {
  const code = containerCode.value.trim()
  if (!code) return

  loading.value = true
  containerDetail.value = null
  try {
    const detail = await getMovableContainerByCode(code)
    containerDetail.value = detail
    showSuccessToast('获取载具详情成功')
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '未找到该容器或容器已被锁定')
  } finally {
    loading.value = false
  }
}

// 点击虚拟扫码按钮（方便在浏览器中调试，自动填入测试数据）
function triggerContainerScan() {
  containerCode.value = 'C001' // 调试占位符
  handleScanContainer()
}

function triggerLocationScan() {
  targetLocationCode.value = 'L-01-01' // 调试占位符
}

async function handleRelocate() {
  const code = containerCode.value.trim()
  const loc = targetLocationCode.value.trim()

  if (!code || !containerDetail.value) {
    showToast('请先扫描有效的载具编号')
    return
  }
  if (!loc) {
    showToast('请先扫描目标库位')
    return
  }

  submitting.value = true
  showToast({ message: '提交理货中...', type: 'loading', duration: 0 })
  try {
    await relocateContainer({
      containerCode: code,
      targetLocationCode: loc
    })
    showSuccessToast('理货移位成功')
    
    // 成功后重置页面状态以方便下一次扫描
    containerCode.value = ''
    targetLocationCode.value = ''
    containerDetail.value = null
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '理货移位失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="goBack">
      <template #title>
        <span class="text-white font-bold tracking-wide">理货作业 (即席移库)</span>
      </template>
    </van-nav-bar>

    <div class="flex-1 p-4 space-y-4 overflow-y-auto pb-32">
      <!-- 步骤 1：扫描载具 -->
      <section class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div class="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Step 1: Scan Container / 扫描载具</div>
        <div class="flex items-center space-x-2">
          <van-field
            v-model="containerCode"
            clearable
            placeholder="扫描或输入载具编号"
            class="flex-1 !bg-gray-100 !rounded-xl !p-2"
            @keyup.enter="handleScanContainer"
          />
          <van-button
            type="primary"
            class="!h-10 !rounded-xl"
            icon="scan"
            @click="triggerContainerScan"
          />
        </div>
      </section>

      <!-- 载具详情展示 -->
      <section v-if="containerDetail" class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div class="text-xs text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100 pb-2">Container Details / 载具现状</div>
        
        <div class="flex justify-between text-sm">
          <span class="text-slate-500">当前位置:</span>
          <span class="font-mono font-black text-slate-800">{{ containerDetail.currentLocationCode || '暂存区/无库位' }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-slate-500">盘具类型:</span>
          <span class="font-bold text-slate-700">{{ containerDetail.containerType }}</span>
        </div>

        <div class="border-t border-dashed border-gray-100 my-2 pt-2">
          <div class="text-xs text-slate-500 font-bold mb-2">载具内物料:</div>
          <div v-if="containerDetail.inventories.length === 0" class="text-xs text-slate-400 italic">空载具</div>
          <div v-else class="space-y-2">
            <div
              v-for="inv in containerDetail.inventories"
              :key="inv.inventoryId"
              class="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100 text-xs flex flex-col space-y-1"
            >
              <div class="font-bold text-slate-800 font-mono flex justify-between">
                <span>{{ inv.productCode }}</span>
                <span class="text-slate-500">数量: {{ inv.quantity }} {{ inv.uom }}</span>
              </div>
              <div class="text-slate-500">{{ inv.productName }}</div>
              <div class="text-slate-400">批次: {{ inv.batchNo || '--' }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 步骤 2：扫描目标库位 -->
      <section v-if="containerDetail" class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div class="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Step 2: Target Location / 扫描目标库位</div>
        <div class="flex items-center space-x-2">
          <van-field
            v-model="targetLocationCode"
            clearable
            placeholder="扫描或输入目标库位"
            class="flex-1 !bg-gray-100 !rounded-xl !p-2"
          />
          <van-button
            type="primary"
            class="!h-10 !rounded-xl"
            icon="scan"
            @click="triggerLocationScan"
          />
        </div>

        <div v-if="targetLocationCode" class="mt-3 bg-green-50 border border-green-100 p-2.5 rounded-xl text-green-700 font-bold text-xs flex items-center justify-center">
          <van-icon name="checked" class="mr-1" />
          目标位置 [{{ targetLocationCode }}] 已选择
        </div>
      </section>
    </div>

    <!-- 底部操作按钮 -->
    <footer v-if="containerDetail" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 pb-safe z-30 shadow-lg">
      <van-button
        block
        round
        type="primary"
        size="large"
        class="!bg-slate-800 active:!bg-slate-700 !border-none font-bold text-lg !h-14"
        :loading="submitting"
        :disabled="!targetLocationCode || submitting"
        @click="handleRelocate"
      >
        CONFIRM RELOCATION / 确定理货移位
      </van-button>
    </footer>
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

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
</style>
