<script lang="ts">
export default { name: 'LocationBatchDialog' }

export type LocationBatchDialogExpose = {
  open: (zId: string, whId: string) => void
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
  NSpace,
  useMessage,
} from 'naive-ui'

import { batchCreate } from '../../../../api/masterData/location'

const emit = defineEmits<{ success: [] }>()

const visible = ref(false)
const zoneId = ref('')
const warehouseId = ref('')
const message = useMessage()

const form = reactive({
  aislePrefix: 'A',
  rackCount: 1,
  levelCount: 1,
})

function open(zId: string, whId: string) {
  zoneId.value = zId
  warehouseId.value = whId
  form.aislePrefix = 'A'
  form.rackCount = 1
  form.levelCount = 1
  visible.value = true
}

async function onSubmit() {
  await batchCreate({
    zoneId: zoneId.value,
    warehouseId: warehouseId.value,
    aislePrefix: form.aislePrefix,
    rackCount: form.rackCount,
    levelCount: form.levelCount,
  })
  message.success('批量创建成功')
  visible.value = false
  emit('success')
}

defineExpose({ open })
</script>

<template>
  <n-modal v-model:show="visible">
    <n-card title="批量创建库位" style="width: 500px" closable @close="visible = false">
      <n-form :model="form" label-placement="left" label-width="100">
        <n-form-item label="巷道前缀">
          <n-input v-model:value="form.aislePrefix" placeholder="濡? A" />
        </n-form-item>
        <n-form-item label="货架数量">
          <n-input-number v-model:value="form.rackCount" :min="1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="层数">
          <n-input-number v-model:value="form.levelCount" :min="1" style="width: 100%" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space justify="end">
          <n-button @click="visible = false">取消</n-button>
          <n-button type="primary" @click="onSubmit">确</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
