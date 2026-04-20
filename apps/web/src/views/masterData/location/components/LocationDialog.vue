<script lang="ts">
export default { name: 'LocationDialog' }

export type LocationDialogExpose = {
  open: (params: {
    mode: 'create' | 'edit'
    zoneId?: string
    warehouseId?: string
    row?: import('../../../../api/masterData/location').LocationDto
  }) => void
}
</script>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSwitch,
  NSpace,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { create as createLocation, update as updateLocation, type LocationDto } from '../../../../api/masterData/location'
import { getList as getWarehouseList, type WarehouseDto } from '../../../../api/masterData/warehouse'
import { getList as getZoneList, type ZoneDto } from '../../../../api/masterData/zone'

const emit = defineEmits<{ success: [] }>()

const visible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const currentId = ref<string | null>(null)
const warehouseOptions = ref<WarehouseDto[]>([])
const zoneOptions = ref<ZoneDto[]>([])

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const form = reactive({
  warehouseId: '',
  zoneId: '',
  code: '',
  aisle: '',
  rack: '',
  level: '',
  bin: '',
  type: 20 as number,
  maxWeight: 0,
  maxVolume: 0,
  maxContainerCount: 1,
  allowMixedProducts: true,
  allowMixedBatches: true,
})

const rules: FormRules = {
  warehouseId: [{ required: true, message: '请选择仓库', trigger: ['change'] }],
  zoneId: [{ required: true, message: '请选择库区', trigger: ['change'] }],
  code: [{ required: true, message: '请输入库位编码', trigger: ['input', 'blur'] }],
  aisle: [{ required: true, message: '请输入巷道', trigger: ['input', 'blur'] }],
  rack: [{ required: true, message: '请输入货架', trigger: ['input', 'blur'] }],
  level: [{ required: true, message: '请输入层', trigger: ['input', 'blur'] }],
}

const typeOptions = [
  { value: 10, label: '设备库位' },
  { value: 20, label: '地堆' },
  { value: 30, label: '货架' },
]

function resetForm() {
  form.warehouseId = ''
  form.zoneId = ''
  form.code = ''
  form.aisle = ''
  form.rack = ''
  form.level = ''
  form.bin = ''
  form.type = 20
  form.maxWeight = 0
  form.maxVolume = 0
  form.maxContainerCount = 1
  form.allowMixedProducts = true
  form.allowMixedBatches = true
}

type OpenParams = {
  mode: 'create' | 'edit'
  zoneId?: string
  warehouseId?: string
  row?: LocationDto
}

function open(params: OpenParams) {
  visible.value = true
  mode.value = params.mode

  if (params.mode === 'edit' && params.row) {
    currentId.value = params.row.id ?? null
    form.code = params.row.code
    form.aisle = params.row.aisle
    form.rack = params.row.rack
    form.level = params.row.level
    form.bin = params.row.bin
    form.type = params.row.type
    form.maxWeight = params.row.maxWeight
    form.maxVolume = params.row.maxVolume
    form.maxContainerCount = params.row.maxContainerCount
    form.allowMixedProducts = params.row.allowMixedProducts
    form.allowMixedBatches = params.row.allowMixedBatches
  } else {
    currentId.value = null
    resetForm()
  }

  void setupWarehouseAndZone(params)
}

async function setupWarehouseAndZone(params: OpenParams) {
  const warehouseRes = await getWarehouseList({ skipCount: 0, maxResultCount: 200 })
  warehouseOptions.value = warehouseRes.items ?? []

  const preferredWarehouseId = params.row?.warehouseId || params.warehouseId || warehouseOptions.value[0]?.id || ''
  form.warehouseId = preferredWarehouseId

  await loadZonesByWarehouseId(form.warehouseId)

  const preferredZoneId = params.row?.zoneId || params.zoneId || zoneOptions.value[0]?.id || ''
  form.zoneId = preferredZoneId
}

async function loadZonesByWarehouseId(warehouseId: string) {
  if (!warehouseId) {
    zoneOptions.value = []
    form.zoneId = ''
    return
  }
  const selectedWarehouse = warehouseOptions.value.find((item) => item.id === warehouseId)
  const warehouseCode = selectedWarehouse?.code
  if (!warehouseCode) {
    zoneOptions.value = []
    form.zoneId = ''
    return
  }
  const zoneRes = await getZoneList({ warehouseCode, skipCount: 0, maxResultCount: 200 })
  zoneOptions.value = zoneRes.items ?? []
  if (zoneOptions.value.every((item) => item.id !== form.zoneId)) {
    form.zoneId = zoneOptions.value[0]?.id ?? ''
  }
}

async function handleWarehouseChange(value: string | null) {
  form.warehouseId = value ?? ''
  form.zoneId = ''
  await loadZonesByWarehouseId(form.warehouseId)
}

async function onSubmit() {
  await formRef.value?.validate()

  const payload = {
    zoneId: form.zoneId,
    warehouseId: form.warehouseId,
    // include warehouseCode for backend DTO
    warehouseCode: warehouseOptions.value.find((w) => w.id === form.warehouseId)?.code ?? '',
    code: form.code,
    aisle: form.aisle,
    rack: form.rack,
    level: form.level,
    bin: form.bin,
    type: form.type,
    maxWeight: form.maxWeight,
    maxVolume: form.maxVolume,
    maxContainerCount: form.maxContainerCount,
    allowMixedProducts: form.allowMixedProducts,
    allowMixedBatches: form.allowMixedBatches,
  }

  if (mode.value === 'edit' && currentId.value) {
    await updateLocation(currentId.value, payload)
    message.success('更新成功')
  } else {
    await createLocation(payload)
    message.success('创建成功')
  }

  visible.value = false
  emit('success')
}

defineExpose({ open })
</script>

<template>
  <n-modal :show="visible" @update:show="(value) => (visible = value)">
    <n-card
      :title="mode === 'create' ? '新建库位' : '编辑库位'"
      style="width: 640px"
      closable
      @close="visible = false"
    >
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="100">
        <n-form-item label="仓库" path="warehouseId">
          <n-select
            :value="form.warehouseId"
            :options="warehouseOptions.map((item) => ({ label: `${item.code} - ${item.name}`, value: item.id }))"
            placeholder="请选择仓库"
            filterable
            @update:value="handleWarehouseChange"
          />
        </n-form-item>
        <n-form-item label="库区" path="zoneId">
          <n-select
            :value="form.zoneId"
            :options="zoneOptions.map((item) => ({ label: `${item.code} - ${item.name}`, value: item.id }))"
            placeholder="请选择库区"
            filterable
            @update:value="(value) => (form.zoneId = value ?? '')"
          />
        </n-form-item>
        <n-form-item label="库位编码" path="code">
          <n-input :value="form.code" placeholder="如：A-01-01" @update:value="(value) => (form.code = value)" />
        </n-form-item>
        <n-form-item label="巷道" path="aisle">
          <n-input :value="form.aisle" placeholder="如：A" @update:value="(value) => (form.aisle = value)" />
        </n-form-item>
        <n-form-item label="货架" path="rack">
          <n-input :value="form.rack" placeholder="如：01" @update:value="(value) => (form.rack = value)" />
        </n-form-item>
        <n-form-item label="层" path="level">
          <n-input :value="form.level" placeholder="如：01" @update:value="(value) => (form.level = value)" />
        </n-form-item>
        <n-form-item label="位">
          <n-input :value="form.bin" placeholder="如：01（可选）" @update:value="(value) => (form.bin = value)" />
        </n-form-item>
        <n-form-item label="库位类型">
          <n-select :value="form.type" :options="typeOptions" @update:value="(value) => (form.type = value)" />
        </n-form-item>
        <n-form-item label="最大承重 (kg)">
          <n-input-number :value="form.maxWeight" :min="0" style="width: 100%" @update:value="(value) => (form.maxWeight = value ?? 0)" />
        </n-form-item>
        <n-form-item label="最大体积 (m³)">
          <n-input-number :value="form.maxVolume" :min="0" style="width: 100%" @update:value="(value) => (form.maxVolume = value ?? 0)" />
        </n-form-item>
        <n-form-item label="大器数">
          <n-input-number :value="form.maxContainerCount" :min="1" style="width: 100%" @update:value="(value) => (form.maxContainerCount = value ?? 1)" />
        </n-form-item>
        <n-form-item label="允混放物料">
          <n-switch :value="form.allowMixedProducts" @update:value="(value) => (form.allowMixedProducts = value)" />
        </n-form-item>
        <n-form-item label="允混放批">
          <n-switch :value="form.allowMixedBatches" @update:value="(value) => (form.allowMixedBatches = value)" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space justify="end">
          <n-button @click="visible = false">取消</n-button>
          <n-button type="primary" @click="onSubmit">确认</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
