<script lang="ts">
export default {
  name: 'ProductionReceiptModal',
}
</script>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules, SelectOption } from 'naive-ui'

import * as inventoryApi from '../../../api/masterData/inventory'
import { getList as getReelList, type GetReelListParams } from '../../../api/masterData/reel'
import { getList as getLocationList, type GetLocationListParams } from '../../../api/masterData/location'
import { getProductList, type GetProductListParams } from '../../../api/masterData/product'

type FormModel = {
  sourceWo: string
  batchNo: string
  reelId: string | null
  locationId: string | null
  productId: string | null
  quantity: number | null
  weight: number | null
}

const emit = defineEmits<{
  success: []
}>()

const visible = ref(false)
const loading = ref(false)
const formRef = ref<FormInst | null>(null)
const message = useMessage()

const form = reactive<FormModel>({
  sourceWo: '',
  batchNo: '',
  reelId: null,
  locationId: null,
  productId: null,
  quantity: null,
  weight: null,
})

const rules = computed<FormRules>(() => ({
  sourceWo: [{ required: true, message: '请输入来源工单', trigger: ['input', 'blur'] }],
  batchNo: [{ required: true, message: '请输入批次号', trigger: ['input', 'blur'] }],
  reelId: [{ required: true, message: '请选择线盘', trigger: ['change', 'blur'] }],
  locationId: [{ required: true, message: '请选择目标库位', trigger: ['change', 'blur'] }],
  productId: [{ required: true, message: '请选择物料', trigger: ['change', 'blur'] }],
  quantity: [{ required: true, type: 'number', message: '请输入长度', trigger: ['input', 'blur'] }],
  weight: [{ required: true, type: 'number', message: '请输入净重', trigger: ['input', 'blur'] }],
}))

function getDefaultBatchNo() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `BATCH-${yyyy}${mm}${dd}`
}

function resetForm() {
  form.sourceWo = ''
  form.batchNo = getDefaultBatchNo()
  form.reelId = null
  form.locationId = null
  form.productId = null
  form.quantity = null
  form.weight = null
}

function open() {
  resetForm()
  visible.value = true
  loadReelOptions()
  loadLocationOptions()
  loadProductOptions()
}

defineExpose({ open })

const reelOptions = ref<SelectOption[]>([])
const reelLoading = ref(false)

async function loadReelOptions(keyword?: string) {
  reelLoading.value = true
  try {
    const params: GetReelListParams = {
      maxResultCount: 20,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    }
    const data = await getReelList(params)
    const items = data.items ?? []
    const filtered = items.filter((item) => (item.status ?? 0) === 0)
    reelOptions.value = filtered.map((item) => ({
      label: item.reelNo,
      value: item.id ?? item.reelNo,
    }))
  } finally {
    reelLoading.value = false
  }
}

function handleReelSearch(keyword: string) {
  loadReelOptions(keyword)
}

const locationOptions = ref<SelectOption[]>([])
const locationLoading = ref(false)

async function loadLocationOptions(keyword?: string) {
  locationLoading.value = true
  try {
    const params: GetLocationListParams = {
      maxResultCount: 20,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    }
    const data = await getLocationList(params)
    const items = data.items ?? []
    locationOptions.value = items.map((item) => ({
      label: item.code,
      value: item.id ?? item.code,
    }))
  } finally {
    locationLoading.value = false
  }
}

function handleLocationSearch(keyword: string) {
  loadLocationOptions(keyword)
}

const productOptions = ref<SelectOption[]>([])
const productLoading = ref(false)

async function loadProductOptions(keyword?: string) {
  productLoading.value = true
  try {
    const params: GetProductListParams = {
      maxResultCount: 20,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    }
    const data = await getProductList(params)
    const items = data.items ?? []
    productOptions.value = items.map((item) => ({
      label: `${item.code} ${item.name}`,
      value: item.id ?? item.code,
    }))
  } finally {
    productLoading.value = false
  }
}

function handleProductSearch(keyword: string) {
  loadProductOptions(keyword)
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const payload: inventoryApi.ProductionReceiveInput = {
      reelId: String(form.reelId ?? ''),
      productId: String(form.productId ?? ''),
      quantity: Number(form.quantity ?? 0),
      weight: Number(form.weight ?? 0),
      batchNo: form.batchNo,
      sourceWo: form.sourceWo,
      locationId: form.locationId ? String(form.locationId) : undefined,
    }

    await inventoryApi.productionReceive(payload)
    message.success('入库成功')
    visible.value = false
    emit('success')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '入库失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <n-modal :show="visible" preset="card" title="生产完工入库" style="width: 760px" @update:show="(value) => (visible = value)">
    <n-form ref="formRef" :model="form" :rules="rules" label-width="140">
      <n-form-item label="来源工单" path="sourceWo">
        <n-input :value="form.sourceWo" placeholder="请输入来源工单" @update:value="(value) => (form.sourceWo = value)" />
      </n-form-item>

      <n-form-item label="批次号" path="batchNo">
        <n-input :value="form.batchNo" placeholder="例 BATCH-yyyymmdd" @update:value="(value) => (form.batchNo = value)" />
      </n-form-item>

      <n-form-item label="线盘" path="reelId">
        <n-select
          :value="form.reelId"
          filterable
          remote
          :loading="reelLoading"
          placeholder="搜索线盘（仅空闲）"
          :options="reelOptions"
          @update:value="(value) => (form.reelId = value)"
          @search="handleReelSearch"
        />
      </n-form-item>

      <n-form-item label="目标库位" path="locationId">
        <n-select
          :value="form.locationId"
          filterable
          remote
          :loading="locationLoading"
          placeholder="搜索库位"
          :options="locationOptions"
          @update:value="(value) => (form.locationId = value)"
          @search="handleLocationSearch"
        />
      </n-form-item>

      <n-form-item label="物料" path="productId">
        <n-select
          :value="form.productId"
          filterable
          remote
          :loading="productLoading"
          placeholder="搜索物料"
          :options="productOptions"
          @update:value="(value) => (form.productId = value)"
          @search="handleProductSearch"
        />
      </n-form-item>

      <n-form-item label="长度（米）" path="quantity">
        <n-input-number :value="form.quantity" :min="0" :step="1" placeholder="请输入长度" @update:value="(value) => (form.quantity = value)" />
      </n-form-item>

      <n-form-item label="净重（kg）" path="weight">
        <n-input-number :value="form.weight" :min="0" :step="0.1" placeholder="请输入净重" @update:value="(value) => (form.weight = value)" />
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="modal-actions">
        <n-button @click="visible = false">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleSubmit">入库</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>