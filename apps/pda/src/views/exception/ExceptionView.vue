<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import { createExceptionReport, ExceptionType } from '@/api/wms/exception'

type ExceptionFormState = {
  exceptionType: string
  orderNo: string
  containerCode: string
  locationCode: string
  description: string
}

const submitting = ref(false)
const route = useRoute()
const exceptionTypeOptions = [
  { label: '破损', value: ExceptionType.Damage },
  { label: '短拣', value: ExceptionType.ShortPick },
  { label: '库位异常', value: ExceptionType.LocationIssue },
  { label: '其他', value: ExceptionType.Other },
]

const form = reactive<ExceptionFormState>({
  exceptionType: ExceptionType.Damage,
  orderNo: '',
  containerCode: '',
  locationCode: '',
  description: '',
})

function resetForm() {
  form.exceptionType = ExceptionType.Damage
  form.orderNo = ''
  form.containerCode = ''
  form.locationCode = ''
  form.description = ''
}

function applyQueryPrefill() {
  const query = route.query
  const type = typeof query.type === 'string' ? query.type.trim() : ''
  const orderNo = typeof query.orderNo === 'string' ? query.orderNo.trim() : ''
  const containerCode = typeof query.containerCode === 'string' ? query.containerCode.trim() : ''
  const locationCode = typeof query.locationCode === 'string' ? query.locationCode.trim() : ''
  const description = typeof query.description === 'string' ? query.description.trim() : ''

  if (type) {
    form.exceptionType = type
  }
  if (orderNo) {
    form.orderNo = orderNo
  }
  if (containerCode) {
    form.containerCode = containerCode
  }
  if (locationCode) {
    form.locationCode = locationCode
  }
  if (description) {
    form.description = description
  }
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }
  if (!String(form.exceptionType || '').trim()) {
    showToast('请选择异常类型')
    return
  }
  if (!String(form.description || '').trim()) {
    showToast('请填写异常说明')
    return
  }

  submitting.value = true
  try {
    await createExceptionReport({
      exceptionType: form.exceptionType,
      orderNo: String(form.orderNo || '').trim() || null,
      containerCode: String(form.containerCode || '').trim() || null,
      locationCode: String(form.locationCode || '').trim() || null,
      description: String(form.description || '').trim(),
    })
    showSuccessToast('异常上报成功')
    resetForm()
  } catch (error: any) {
    console.error(error)
    showFailToast(error?.message || '异常上报失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  applyQueryPrefill()
})
</script>

<template>
  <div class="pda-page">
    <van-nav-bar title="异常上报" fixed placeholder />
    <div class="pda-card exception-overview">
      <div class="pda-section-title">现场异常上报</div>
      <div class="pda-subtext">优先上报影响收货、上架、搬运、拣货中断的异常。</div>
      <div class="pda-subtext tip">提交后请保持现场标识清晰，便于后续处理。</div>
    </div>

    <div class="pda-card exception-card">
      <div class="exception-type-grid">
        <div
          v-for="item in exceptionTypeOptions"
          :key="item.value"
          class="exception-type-item"
          :class="{ active: form.exceptionType === item.value }"
          @click="form.exceptionType = item.value"
        >
          {{ item.label }}
        </div>
      </div>

      <van-field v-model="form.orderNo" label="关联单号" placeholder="可选，填写单号" clearable />
      <van-field v-model="form.containerCode" label="容器编码" placeholder="可选，填写容器编码" clearable />
      <van-field v-model="form.locationCode" label="库位编码" placeholder="可选，填写库位编码" clearable />
      <van-field
        v-model="form.description"
        label="异常说明"
        type="textarea"
        rows="4"
        maxlength="200"
        show-word-limit
        placeholder="请简要描述现场异常情况"
      />

      <van-button block round class="!mt-6 !bg-red-500 !text-white !border-none" :loading="submitting" @click="handleSubmit">
        提交异常上报
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.exception-overview {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.tip {
  margin-top: 6px;
}

.exception-card {
  padding: 16px;
}

.exception-type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.exception-type-item {
  padding: 12px 10px;
  border-radius: 14px;
  text-align: center;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.exception-type-item.active {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fca5a5;
}
</style>
