<script lang="ts">
export default {
  name: 'SupplierForm',
}
</script>

<script setup lang="ts">
import { NFormItem, NGrid, NGridItem, NInput } from 'naive-ui'
import type { CreateUpdateSupplierDto } from '../../../api/masterData/supplier'

// defineProps<{
//   modelValue: CreateUpdateSupplierDto
// }>()

// defineEmits<{
//   'update:modelValue': [value: CreateUpdateSupplierDto]
// }>()

const model = defineModel<CreateUpdateSupplierDto>({ required: true })
</script>

<template>
  <n-grid :cols="24" :x-gap="16" :y-gap="12">
    <n-grid-item :span="12">
      <n-form-item label="编号" path="code" required>
        <n-input :value="model.code" @update:value="(value) => (model.code = value)" />
      </n-form-item>
    </n-grid-item>
    <n-grid-item :span="12">
      <n-form-item label="名称" path="name" required>
        <n-input :value="model.name" @update:value="(value) => (model.name = value)" />
      </n-form-item>
    </n-grid-item>

    <n-grid-item :span="12">
      <n-form-item label="联系人" path="contactPerson" required>
        <n-input :value="model.contactPerson" @update:value="(value) => (model.contactPerson = value)" />
      </n-form-item>
    </n-grid-item>
    <n-grid-item :span="12">
      <n-form-item label="电话" path="mobile" required>
        <n-input :value="model.mobile" @update:value="(value) => (model.mobile = value)" />
      </n-form-item>
    </n-grid-item>

    <n-grid-item :span="12">
      <n-form-item label="邮箱" path="email" required>
        <n-input :value="model.email" @update:value="(value) => (model.email = value)" />
      </n-form-item>
    </n-grid-item>
    <n-grid-item :span="12">
      <n-form-item label="地址" path="address" required>
        <n-input :value="model.address" @update:value="(value) => (model.address = value)" />
      </n-form-item>
    </n-grid-item>

    <n-grid-item :span="24">
      <n-form-item label="详细地址">
        <n-input :value="model.address" type="textarea" :rows="2" @update:value="(value) => (model.address = value)" />
      </n-form-item>
    </n-grid-item>
  </n-grid>
</template>