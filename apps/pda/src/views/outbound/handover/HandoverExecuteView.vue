<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast, showToast } from 'vant'
import {
  completeHandover,
  getHandover,
  HandoverLineStatus,
  HandoverStatus,
  markHandoverException,
  scanHandover,
  startHandover,
  type HandoverLineDto,
  type HandoverOrderDto,
} from '@/api/outbound/handover'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id ?? ''))
const order = ref<HandoverOrderDto | null>(null)
const loading = ref(false)
const scanCode = ref('')
const scanInput = ref<HTMLInputElement | null>(null)
const exceptionVisible = ref(false)
const exceptionLine = ref<HandoverLineDto | null>(null)
const exceptionType = ref('')
const exceptionRemark = ref('')
const receiverName = ref('')

const editable = computed(() => order.value != null && !([HandoverStatus.Completed, HandoverStatus.Cancelled] as number[]).includes(order.value.status))
const canComplete = computed(() => order.value?.status === HandoverStatus.InProgress
  && order.value.loadedLineCount === order.value.totalLineCount
  && order.value.exceptionLineCount === 0)

function lineLabel(status: number) {
  if (status === HandoverLineStatus.Loaded) return '已装车'
  if (status === HandoverLineStatus.Exception) return '异常'
  return '待装车'
}

function lineType(status: number) {
  if (status === HandoverLineStatus.Loaded) return 'success'
  if (status === HandoverLineStatus.Exception) return 'danger'
  return 'warning'
}

async function load() {
  loading.value = true
  try {
    order.value = await getHandover(id.value)
  } catch (error: any) {
    showFailToast(error?.message || '加载交接单失败')
  } finally {
    loading.value = false
  }
}

async function start() {
  try {
    order.value = await startHandover(id.value)
    showSuccessToast('交接已开始')
    focusScan()
  } catch (error: any) {
    showFailToast(error?.message || '开始交接失败')
  }
}

async function scan() {
  const code = scanCode.value.trim()
  if (!code) return showToast('请扫描盘号、二维码或SN')
  loading.value = true
  try {
    order.value = await scanHandover(id.value, code)
    scanCode.value = ''
    showSuccessToast('装车确认成功')
  } catch (error: any) {
    showFailToast(error?.message || '扫码交接失败')
  } finally {
    loading.value = false
    focusScan()
  }
}

function openException(line: HandoverLineDto) {
  exceptionLine.value = line
  exceptionType.value = line.exceptionType || ''
  exceptionRemark.value = line.exceptionRemark || ''
  exceptionVisible.value = true
}

async function submitException() {
  if (!exceptionLine.value || !exceptionType.value.trim() || !exceptionRemark.value.trim()) {
    return showToast('请填写异常类型和说明')
  }
  loading.value = true
  try {
    order.value = await markHandoverException(id.value, {
      lineId: exceptionLine.value.id,
      exceptionType: exceptionType.value.trim(),
      remark: exceptionRemark.value.trim(),
    })
    exceptionVisible.value = false
    showSuccessToast('异常已登记')
  } catch (error: any) {
    showFailToast(error?.message || '登记异常失败')
  } finally {
    loading.value = false
  }
}

async function finish() {
  try {
    await showConfirmDialog({
      title: '确认交接并正式出库',
      message: '此操作会立即扣减库存、更新销售订单已发数量，且不可撤销。',
      confirmButtonText: '确认出库',
      confirmButtonColor: '#ef4444',
    })
    loading.value = true
    await completeHandover(id.value, receiverName.value.trim())
    showSuccessToast('交接完成，库存已出库')
    router.replace({ name: 'PdaHandoverList' })
  } catch (error: any) {
    if (error !== 'cancel') showFailToast(error?.message || '完成交接失败')
  } finally {
    loading.value = false
  }
}

async function focusScan() {
  await nextTick()
  scanInput.value?.focus()
}

onMounted(async () => {
  await load()
  focusScan()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <van-nav-bar class="custom-nav-bar shrink-0" left-arrow @click-left="router.back()">
      <template #title><span class="text-white font-bold">交接装车</span></template>
    </van-nav-bar>

    <div v-if="order" class="flex-1 overflow-y-auto pb-36">
      <section class="bg-white p-4 border-b border-gray-100">
        <div class="flex justify-between items-start">
          <div>
            <div class="text-xs text-slate-500">交接单号</div>
            <div class="text-lg font-black font-mono text-slate-900">{{ order.handoverNo }}</div>
          </div>
          <div class="text-right text-sm text-slate-500">
            <div>进度 <b class="text-sky-600">{{ order.loadedLineCount }}/{{ order.totalLineCount }}</b></div>
            <div class="mt-1">{{ order.vehicleNo || '未维护车辆' }}</div>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <van-tag v-for="source in order.sources.filter(item => item.isActive)" :key="source.id" plain type="primary">
            {{ source.outboundReviewOrderNo }}
          </van-tag>
        </div>
      </section>

      <section v-if="editable" class="m-3 bg-slate-800 rounded-2xl p-4 shadow-md">
        <div class="text-white font-bold mb-2">扫描装车库存</div>
        <div class="flex gap-2">
          <input
            ref="scanInput"
            v-model="scanCode"
            class="min-w-0 flex-1 rounded-xl px-4 py-3 text-base outline-none"
            placeholder="盘号、二维码或SN"
            @keyup.enter="scan"
          />
          <van-button type="primary" :loading="loading" @click="scan">确认</van-button>
        </div>
        <van-button
          v-if="order.status === HandoverStatus.Created"
          block
          round
          class="mt-3 !bg-white/10 !text-white !border-white/20"
          @click="start"
        >
          开始交接
        </van-button>
      </section>

      <section class="p-3 space-y-3">
        <article
          v-for="line in order.lines"
          :key="line.id"
          class="bg-white rounded-2xl p-4 shadow-sm border-l-[6px]"
          :class="line.status === HandoverLineStatus.Loaded ? 'border-l-green-500' : line.status === HandoverLineStatus.Exception ? 'border-l-red-500' : 'border-l-amber-400'"
        >
          <div class="flex justify-between gap-3">
            <div>
              <div class="font-extrabold text-slate-800">{{ line.productCode }}</div>
              <div class="text-sm text-slate-500 mt-1">{{ line.productName }}</div>
            </div>
            <van-tag :type="lineType(line.status)">{{ lineLabel(line.status) }}</van-tag>
          </div>
          <div class="grid grid-cols-2 gap-y-2 mt-3 text-xs text-slate-500">
            <div>盘号：<b class="text-slate-800">{{ line.containerCode }}</b></div>
            <div>数量：<b class="text-slate-800">{{ line.qty }}</b></div>
            <div>SN：<b class="text-slate-800">{{ line.sn }}</b></div>
            <div>批次：<b class="text-slate-800">{{ line.batchNo }}</b></div>
          </div>
          <div v-if="line.exceptionType" class="mt-3 text-xs text-red-600 bg-red-50 rounded-lg p-2">
            {{ line.exceptionType }}：{{ line.exceptionRemark }}
          </div>
          <van-button v-if="editable" block size="small" round class="mt-3" type="danger" plain @click="openException(line)">
            登记异常
          </van-button>
        </article>
      </section>
    </div>

    <footer v-if="order" class="fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-30">
      <van-field v-model="receiverName" label="接收人" placeholder="选填" class="!p-0 mb-2" />
      <van-button block round type="danger" :disabled="!canComplete" :loading="loading" @click="finish">
        确认交接并正式出库
      </van-button>
    </footer>

    <van-popup v-model:show="exceptionVisible" position="bottom" round>
      <div class="p-5">
        <div class="text-lg font-black text-slate-800 mb-4">登记交接异常</div>
        <van-field v-model="exceptionType" label="异常类型" placeholder="未装车、包装破损等" />
        <van-field v-model="exceptionRemark" label="异常说明" type="textarea" rows="3" maxlength="1000" show-word-limit />
        <div class="grid grid-cols-2 gap-3 mt-5">
          <van-button block round @click="exceptionVisible = false">取消</van-button>
          <van-button block round type="danger" :loading="loading" @click="submitException">提交异常</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.custom-nav-bar {
  --van-nav-bar-background: #1e293b;
  --van-nav-bar-icon-color: #fff;
  --van-nav-bar-text-color: #fff;
}
</style>
