<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { confirmPickTask } from '../../api/pickTask'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const code = ref('')

const routeTaskId = computed(() => {
  const taskId = route.query.taskId
  return typeof taskId === 'string' ? taskId : ''
})

async function submitCode() {
  const taskId = code.value.trim() || routeTaskId.value
  if (!taskId) {
    showFailToast('请先输入或扫描任务ID')
    return
  }

  loading.value = true
  try {
    await confirmPickTask(taskId)
    showSuccessToast(`任务确认成功：${taskId}`)
    code.value = ''
    router.replace('/task')
  } catch (error) {
    const message = error instanceof Error ? error.message : '任务确认失败'
    showFailToast(`确认失败（${taskId}）：${message}`)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="pda-page">
    <van-nav-bar title="扫码执行" fixed placeholder />

    <div class="pda-card scan-intro">
      <div class="scan-head">
        <van-icon name="scan" size="20" />
        <span class="pda-section-title">任务扫码确认</span>
      </div>
      <div class="pda-subtext" v-if="routeTaskId">当前任务：{{ routeTaskId }}</div>
      <div class="pda-subtext" v-else>请扫描任务ID，或手工录入后确认</div>
    </div>

    <div class="pda-card">
      <van-field v-model="code" label="任务ID" placeholder="请扫码或手工输入任务ID" clearable />
      <div class="action-wrap">
        <van-button icon="success" type="primary" block :loading="loading" @click="submitCode">确认任务</van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-intro {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.scan-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.action-wrap {
  margin-top: 12px;
}
</style>
