<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.replace('/dashboard')
}
</script>

<template>
  <div class="forbidden-page">
    <h2>403</h2>
    <p>无权限访问</p>
    <button class="back-btn" @click="goHome">返回首页</button>
  </div>
</template>

<style scoped>
.forbidden-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #334155;
}

.back-btn {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 6px 12px;
  background: #fff;
  cursor: pointer;
}
</style>
