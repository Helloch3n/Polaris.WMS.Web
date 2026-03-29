<script lang="ts">
export default {
  name: 'CreateReceiptModal',
}
</script>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  NButton,
  NCard,
  NDynamicInput,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  useMessage,
} from 'naive-ui'
import type { FormRules, SelectOption } from 'naive-ui'

import * as receiptApi from '../../../../api/inbound/receipt'
import { getProductList } from '../../../../api/masterData/product'
import { getList as getReelList } from '../../../../api/masterData/reel'
import { getList as getWarehouseList } from '../../../../api/masterData/warehouse'

interface DetailRow {
  productId: string | null
  productName: string
  unit: string
  planQuantity: number | null
  batchNo: string
  sourceWo: string
  reelId: string | null
  reelNo: string
  sn: string
  craftVersion: string
  layerIndex: number | null
  toWarehouseId: string | null
}

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}>()

const message = useMessage()

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const submitting = ref(false)

const form = reactive({
  billNo: '',
  type: 0,
  sourceBillNo: '',
  warehouseId: null as string | null,
})

const typeOptions: SelectOption[] = [
  { label: '生产入库', value: 0 },
  { label: '采购入库', value: 1 },
  { label: '其他', value: 2 },
]

const headerRules: FormRules = {
  type: [{ required: true, message: '请选择单据类型', trigger: ['blur', 'change'] }],
  warehouseId: [{ required: true, message: '请选择仓库', trigger: ['blur', 'change'] }],
}

const details = ref<DetailRow[]>([])

function createDetail(): DetailRow {
  return {
    productId: null,
    productName: '',
    unit: '',
    planQuantity: 1,
    batchNo: '',
    sourceWo: '',
    reelId: null,
    reelNo: '',
    sn: '',
    craftVersion: '',
    layerIndex: 1,
    toWarehouseId: form.warehouseId,
  }
}

const productOptions = ref<Array<SelectOption & { name?: string; unit?: string }>>([])
const productLoading = ref(false)

const reelOptions = ref<Array<SelectOption & { reelNo?: string }>>([])
const reelLoading = ref(false)

const warehouseOptions = ref<Array<SelectOption & { code?: string; name?: string }>>([])
const warehouseLoading = ref(false)

async function loadWarehouses(keyword?: string) {
  warehouseLoading.value = true
  try {
    const data = await getWarehouseList({
      maxResultCount: 200,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    })
    const items = data.items ?? []
    warehouseOptions.value = items.map((item) => ({
      label: `${item.code} ${item.name}`,
      value: item.id ?? item.code,
      code: item.code,
      name: item.name,
    }))
    if (!form.warehouseId && warehouseOptions.value.length > 0) {
      const main = warehouseOptions.value.find(
        (option) => option.code?.toLowerCase().includes('main') || option.name?.includes('主仓'),
      )
      const fallback = warehouseOptions.value[0]?.value
      form.warehouseId = (main?.value ?? fallback ?? null) as string
    }
  } finally {
    warehouseLoading.value = false
  }
}

function handleWarehouseSearch(keyword: string) {
  loadWarehouses(keyword)
}

async function loadProducts(keyword?: string) {
  productLoading.value = true
  try {
    const data = await getProductList({
      maxResultCount: 20,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    })
    const items = data.items ?? []
    productOptions.value = items.map((item) => ({
      label: `${item.code} ${item.name}`,
      value: item.id,
      name: item.name,
      unit: item.unit,
    }))
  } finally {
    productLoading.value = false
  }
}

async function loadReels(keyword?: string) {
  reelLoading.value = true
  try {
    const data = await getReelList({
      maxResultCount: 20,
      skipCount: 0,
      filter: keyword?.trim() || undefined,
    })
    const items = data.items ?? []
    reelOptions.value = items.map((item) => ({
      label: item.reelNo,
      value: item.id ?? item.reelNo,
      reelNo: item.reelNo,
    }))
  } finally {
    reelLoading.value = false
  }
}

function handleProductSearch(keyword: string) {
  loadProducts(keyword)
}

function handleReelSearch(keyword: string) {
  loadReels(keyword)
}

function handleProductChange(value: string | null, row: DetailRow) {
  const selected = productOptions.value.find((option) => option.value === value)
  row.productName = selected?.name ?? ''
  row.unit = selected?.unit ?? ''
  row.productId = value
}

function handleReelChange(value: string | null, row: DetailRow) {
  const selected = reelOptions.value.find((option) => option.value === value)
  row.reelNo = selected?.reelNo ?? ''
  row.reelId = value
}

function handleToWarehouseChange(value: string | null, row: DetailRow) {
  row.toWarehouseId = value
  const reelNo = row.reelNo?.trim()
  if (!reelNo || !value) return

  const sameReelRows = details.value.filter((d) => (d.reelNo ?? '').trim() === reelNo)
  const conflict = sameReelRows.find(
    (d) => d !== row && d.toWarehouseId && String(d.toWarehouseId) !== String(value),
  )

  if (conflict) {
    message.error(`盘号 ${reelNo} 的目标仓库必须一致`)
    row.toWarehouseId = conflict.toWarehouseId ?? value
  }
}

function resetForm() {
  form.billNo = ''
  form.type = 0
  form.sourceBillNo = ''
  form.warehouseId = null
  details.value = [createDetail()]
}

function close() {
  emit('update:show', false)
}

async function handleSubmit() {
  if (form.type === null || form.type === undefined || !form.warehouseId) {
    message.error('请完善单捤信息')
    return
  }
  if (details.value.length === 0) {
    message.error('请至少添加一行明细')
    return
  }

  for (const row of details.value) {
    if (!row.productId) {
      message.error('明细中在未选择产品的')
      return
    }
    if (!row.productName?.trim()) {
      message.error('明细中在未塆产品名称的')
      return
    }
    if (!row.unit?.trim()) {
      message.error('明细中在未塆单位的')
      return
    }
    if (!row.planQuantity || row.planQuantity <= 0) {
      message.error('明细中在划数量不正确的')
      return
    }
    if (!row.batchNo?.trim()) {
      message.error('明细中存在未填写批号的数据')
      return
    }
    if (!row.sourceWo?.trim()) {
      message.error('明细中在未塆来源工单的')
      return
    }
    if (!row.reelId) {
      message.error('明细中在未选择线盘的')
      return
    }
    if (!row.reelNo?.trim()) {
      message.error('明细中存在未填写线盘号的数据')
      return
    }
    if (!row.sn?.trim()) {
      message.error('明细中在未塆 SN/条码 的')
      return
    }
    if (!row.craftVersion?.trim()) {
      message.error('明细中在未塆工艺版本的')
      return
    }
    if (!row.layerIndex || row.layerIndex <= 0) {
      message.error('明细中在层级不正确的')
      return
    }
    if (!row.toWarehouseId) {
      message.error('明细中在未选择盠仓库的')
      return
    }

    // 同盘号目标仓库一致性校验
    const reelNo = row.reelNo?.trim()
    if (reelNo) {
      const sameReelRows = details.value.filter((d) => (d.reelNo ?? '').trim() === reelNo)
      if (sameReelRows.length > 1) {
        const firstWarehouseId = sameReelRows[0]?.toWarehouseId
        const hasMismatch = sameReelRows.some(
          (d) => String(d.toWarehouseId ?? '') !== String(firstWarehouseId ?? ''),
        )
        if (hasMismatch) {
          message.error(`盘号 ${reelNo} 的目标仓库不一致，请保持一致`)
          return
        }
      }
    }
  }

  const payload = {
    billNo: form.billNo?.trim() || undefined,
    type: form.type,
    sourceBillNo: form.sourceBillNo?.trim() || undefined,
    warehouseId: form.warehouseId,
    details: details.value.map((row) => ({
      productId: row.productId ?? undefined,
      productName: row.productName || undefined,
      unit: row.unit || undefined,
      planQuantity: row.planQuantity ?? undefined,
      reelId: row.reelId ?? undefined,
      reelNo: row.reelNo || undefined,
      batchNo: row.batchNo?.trim() || undefined,
      sourceWo: row.sourceWo?.trim() || undefined,
      sn: row.sn?.trim() || undefined,
      craftVersion: row.craftVersion?.trim() || undefined,
      layerIndex: row.layerIndex ?? 1,
      toWarehouseId: row.toWarehouseId ?? undefined,
    })),
  } as receiptApi.CreateReceiptDto

  submitting.value = true
  try {
    await receiptApi.create(payload)
    message.success('创建成功')
    emit('success')
    close()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => visible.value,
  (value) => {
    if (value) {
      resetForm()
      loadWarehouses()
      loadProducts()
      loadReels()
    }
  },
)

watch(
  () => form.warehouseId,
  (value) => {
    if (!value) return
    for (const row of details.value) {
      row.toWarehouseId = value
    }
  },
)
</script>

<template>
  <n-modal :show="visible" preset="card" title="新增入库单" style="width: 100vw; height: 100vh;" @update:show="(value) => (visible = value)">
    <n-form :model="form" :rules="headerRules" label-width="100">
      <n-space vertical :size="16">
        <n-card size="small" title="单据信息" :bordered="false">
          <n-space :size="16" align="center" wrap>
            <n-form-item label="单据号">
              <div class="form-text">系统臊生成</div>
            </n-form-item>
            <n-form-item label="单据类型" path="type">
              <n-select :value="form.type" :options="typeOptions" style="width: 180px" @update:value="(value) => (form.type = value)" />
            </n-form-item>
            <n-form-item label="来源单号">
              <n-input :value="form.sourceBillNo" placeholder="来源单号" style="width: 220px" @update:value="(value) => (form.sourceBillNo = value)" />
            </n-form-item>
            <n-form-item label="仓库" path="warehouseId">
              <n-select
                :value="form.warehouseId"
                :options="warehouseOptions"
                :loading="warehouseLoading"
                placeholder="请选择仓库"
                style="width: 220px"
                @update:value="(value) => (form.warehouseId = value)"
              />
            </n-form-item>
          </n-space>
        </n-card>

        <n-card size="small" title="明细" :bordered="false">
          <n-dynamic-input v-model="details" :on-create="createDetail">
            <template #default="{ value }">
              <div class="detail-row">
                <div class="detail-field">
                  <div class="detail-label required">产品</div>
                  <n-select
                    :value="value.productId"
                    filterable
                    remote
                    :loading="productLoading"
                    :options="productOptions"
                    placeholder="选择产品"
                    @search="handleProductSearch"
                    @update:value="(val) => { value.productId = val; handleProductChange(val, value) }"
                  />
                </div>

                <div class="detail-field">
                  <div class="detail-label required">单位</div>
                  <n-input :value="value.unit" placeholder="单位" @update:value="(val) => (value.unit = val)" />
                </div>

                <div class="detail-field">
                  <div class="detail-label required">计划数量</div>
                  <n-input-number :value="value.planQuantity" :min="0" placeholder="计划数量" @update:value="(val) => (value.planQuantity = val ?? 0)" />
                </div>

                <div class="detail-field">
                  <div class="detail-label required">批次号</div>
                  <n-input :value="value.batchNo" placeholder="批" @update:value="(val) => (value.batchNo = val)" />
                </div>

                <div class="detail-field">
                  <div class="detail-label required">来源工单</div>
                  <n-input :value="value.sourceWo" placeholder="来源工单" @update:value="(val) => (value.sourceWo = val)" />
                </div>

                <div class="detail-field">
                  <div class="detail-label required">线盘</div>
                  <n-select
                    :value="value.reelId"
                    filterable
                    remote
                    :loading="reelLoading"
                    :options="reelOptions"
                    placeholder="指定线盘"
                    @search="handleReelSearch"
                    @update:value="(val) => { value.reelId = val; handleReelChange(val, value) }"
                  />
                </div>

                <div class="detail-field">
                  <div class="detail-label required">SN/条码</div>
                  <n-input :value="value.sn" placeholder="请输入或扫描" @update:value="(val) => (value.sn = val)" />
                </div>

                <div class="detail-field">
                  <div class="detail-label required">工艺版本</div>
                  <n-input :value="value.craftVersion" placeholder="可选" @update:value="(val) => (value.craftVersion = val)" />
                </div>

                <div class="detail-field">
                  <div class="detail-label required">层级</div>
                  <n-input-number :value="value.layerIndex" :min="1" placeholder="层级" @update:value="(val) => (value.layerIndex = val ?? 1)" />
                </div>

                <div class="detail-field">
                  <div class="detail-label required">盠仓库</div>
                  <n-select
                    :value="value.toWarehouseId"
                    filterable
                    remote
                    clearable
                    :loading="warehouseLoading"
                    :options="warehouseOptions"
                    placeholder="瑕嗙洊澶磋〃仓库"
                    @search="handleWarehouseSearch"
                    @update:value="(val) => { value.toWarehouseId = val; handleToWarehouseChange(val, value) }"
                  />
                </div>
              </div>
            </template>
          </n-dynamic-input>
        </n-card>
      </n-space>
    </n-form>

    <template #footer>
      <div class="actions">
        <n-button @click="close">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">提交</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.detail-row {
  display: grid;
  grid-template-columns: repeat(10, minmax(120px, 1fr));
  gap: 12px;
  align-items: start;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-label {
  color: #64748b;
  font-size: 12px;
}

.detail-label.required::before {
  content: '*';
  color: #d03050;
  margin-right: 4px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-text {
  color: #64748b;
  font-size: 14px;
}
</style>
