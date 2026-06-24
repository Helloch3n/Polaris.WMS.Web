<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import PalletMergeForm from './components/PalletMergeForm.vue'
import * as palletMergeApi from '../../../api/palletMerge/palletMerge'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const initialType = computed<'split' | 'merge'>(() => {
  const t = route.query.type
  if (t === 'split' || t === 'merge') {
    return t
  }
  return 'split'
})

async function handleSubmit(data: palletMergeApi.CreatePalletMergeDto) {
  try {
    const created = await palletMergeApi.create(data)
    message.success('创建分拆合盘单成功')
    router.push({ name: 'PalletMergeDetail', params: { id: created.id } })
  } catch (err: any) {
    message.error(err?.message || '创建分拆合盘单失败')
  }
}

function handleCancel() {
  router.push({ name: 'PalletMergeManagement' })
}
</script>

<template>
  <PalletMergeForm
    mode="create"
    :initial-type="initialType"
    @submit="handleSubmit"
    @cancel="handleCancel"
  />
</template>
