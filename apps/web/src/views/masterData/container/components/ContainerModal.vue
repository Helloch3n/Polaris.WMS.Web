<script lang="ts">
export default {
  name: 'ContainerModal',
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

import { ContainerType, create, update, type CreateUpdateContainerDto } from '../../../../api/masterData/container'
import { getList, type GetLocationListParams } from '../../../../api/masterData/location'

type ContainerRow = {
  id?: string
  containerCode?: string
  name?: string
  size?: string
  containerType?: ContainerType | string | number
  selfWeight?: number
  currentLocationId?: string
  currentLocationCode?: string
  currentZoneId?: string
  currentZoneCode?: string
  currentWarehouseId?: string
  currentWarehouseCode?: string
  status?: number | string
  isLocked?: boolean
}

type ContainerFormModel = {
  containerCode: string
  name: string
  size: string
  containerType: ContainerType | number | null
  selfWeight: number | null
  currentLocationId: string | null
}

const emit = defineEmits<{
  success: []
}>()

const visible = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const loading = ref(false)
const message = useMessage()
const formRef = ref<FormInst | null>(null)

const form = reactive<ContainerFormModel>({
  containerCode: '',
  name: '',
  size: '',
  containerType: ContainerType.Turnover,
  selfWeight: null,
  currentLocationId: null,
})

const rules = computed<FormRules>(() => ({
  containerCode: [{ required: true, message: '请输入盘号', trigger: ['input', 'blur'] }],
  name: [{ required: true, message: '请输入名称', trigger: ['input', 'blur'] }],
  containerType: [{ required: true, type: 'number', message: '请选择盘具类型', trigger: ['change', 'blur'] }],
  selfWeight: [{ required: true, type: 'number', message: '请输入皮重', trigger: ['input', 'blur'] }],
  currentLocationId: [
    {
      trigger: ['change', 'blur'],
      validator: (_rule, value) => {
        if (mode.value === 'create' && !value) {
          return new Error('请选择初始位置')
        }
        return true
      },
    },
  ],
}))

const locationOptions = ref<SelectOption[]>([])
const locationLoading = ref(false)
const containerTypeOptions: SelectOption[] = [
  { label: '周转盘', value: ContainerType.Turnover },
  { label: '成品盘', value: ContainerType.FinishedGoods },
  { label: '虚拟盘', value: ContainerType.Virtual },
]

function normalizeContainerType(raw: unknown): ContainerType {
  if (raw === ContainerType.FinishedGoods || raw === 'FinishedGoods' || raw === '1' || raw === 1) return ContainerType.FinishedGoods
  if (raw === ContainerType.Virtual || raw === 'Virtual' || raw === '2' || raw === 2) return ContainerType.Virtual
  return ContainerType.Turnover
}

async function resetForm() {
  form.containerCode = ''
  form.name = ''
  form.size = ''
  form.containerType = ContainerType.Turnover
  form.selfWeight = null
  form.currentLocationId = null
  locationOptions.value = []
}

async function loadLocationOptions(keyword?: string) {
  locationLoading.value = true
  try {
    const params: GetLocationListParams = {
      maxResultCount: 20,
      skipCount: 0,
      locationCode: keyword?.trim() || undefined,
    }
    const data = await getList(params)
    const items = data.items ?? []
    locationOptions.value = items.map((item) => ({
      label: item.code,
      value: item.id ?? item.code,
    }))
  } finally {
    locationLoading.value = false
  }
}

function open(row?: ContainerRow) {
  if (row?.id) {
    mode.value = 'edit'
    editingId.value = row.id
    form.containerCode = row.containerCode ?? ''
    form.name = row.name ?? ''
    form.size = row.size ?? ''
    form.containerType = normalizeContainerType(row.containerType)
    form.selfWeight = typeof row.selfWeight === 'number' ? row.selfWeight : null
    form.currentLocationId = row.currentLocationId ?? null
  } else {
    mode.value = 'create'
    editingId.value = null
    resetForm()
    loadLocationOptions()
  }
  visible.value = true
}

function handleLocationSearch(keyword: string) {
  loadLocationOptions(keyword)
}

function handleContainerTypeChange(value: string | number | null) {
  if (typeof value === 'number') {
    form.containerType = value
    return
  }
  form.containerType = ContainerType.Turnover
}

function handleCurrentLocationChange(value: string | number | null) {
  if (typeof value === 'string') {
    form.currentLocationId = value
    return
  }
  form.currentLocationId = null
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const payload: CreateUpdateContainerDto = {
      containerCode: form.containerCode.trim(),
      name: form.name,
      size: form.size || undefined,
      containerType: form.containerType ?? ContainerType.Turnover,
      selfWeight: form.selfWeight ?? 0,
      currentLocationId: form.currentLocationId ?? undefined,
    }

    if (mode.value === 'edit') {
      if (!editingId.value) {
        message.error('缺少 id，无法编辑')
        return
      }
      await update(editingId.value, payload)
      message.success('更新成功')
    } else {
      await create(payload)
      message.success('创建成功')
    }

    visible.value = false
    emit('success')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '提交失败')
  } finally {
    loading.value = false
  }
}

defineExpose({ open })

const title = computed(() => (mode.value === 'create' ? '新建线盘' : '编辑线盘'))
const showLocation = computed(() => mode.value === 'create')
</script>

<template>
  <n-modal :show="visible" preset="card" :title="title" style="width: 720px" @update:show="(value) => { visible = value }">
    <n-form ref="formRef" :model="form" :rules="rules" label-width="110">
      <n-form-item label="盘号" path="containerCode">
        <n-input
          :value="form.containerCode"
          placeholder="请输入盘号"
          @update:value="(value) => { form.containerCode = value }"
        />
      </n-form-item>

      <n-form-item label="名称" path="name">
        <n-input :value="form.name" @update:value="(value) => { form.name = value }" />
      </n-form-item>

      <n-form-item label="规格">
        <n-input :value="form.size" placeholder="请输入规格" @update:value="(value) => { form.size = value }" />
      </n-form-item>

      <n-form-item label="盘具类型" path="containerType">
        <n-select
          :value="form.containerType"
          :options="containerTypeOptions"
          placeholder="请选择盘具类型"
          @update:value="handleContainerTypeChange"
        />
      </n-form-item>

      <n-form-item label="皮重(kg)" path="selfWeight">
        <n-input-number :value="form.selfWeight" :min="0" @update:value="(value) => { form.selfWeight = value }" />
      </n-form-item>

      <n-form-item v-if="showLocation" label="初始位置">
        <n-select
          :value="form.currentLocationId"
          filterable
          remote
          :loading="locationLoading"
          placeholder="搜索库位"
          :options="locationOptions"
          @update:value="handleCurrentLocationChange"
          @search="handleLocationSearch"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="modal-actions">
        <n-button @click="visible = false">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleSubmit">保存</n-button>
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