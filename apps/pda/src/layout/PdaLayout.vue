<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const active = computed(() => route.path)

function handleChange(path: string | number) {
  router.push(String(path))
}
</script>

<template>
  <div class="pda-shell">
    <div class="pda-shell-content">
      <router-view />
    </div>

    <van-tabbar class="pda-tabbar" :model-value="active" @change="handleChange" route>
      <van-tabbar-item name="/home" icon="home">主页</van-tabbar-item>
      <van-tabbar-item name="/task" icon="todo-list-o">任务</van-tabbar-item>
      <van-tabbar-item name="/scan" icon="scan">扫码</van-tabbar-item>
      <van-tabbar-item name="/exception" icon="warning-o">异常</van-tabbar-item>
      <van-tabbar-item name="/mine" icon="manager-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.pda-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--pda-bg);
}

.pda-shell-content {
  flex: 1;
  padding-bottom: calc(var(--pda-tabbar-height) + env(safe-area-inset-bottom));
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
}

.pda-tabbar {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 -4px 18px rgba(15, 23, 42, 0.05);
}
</style>
