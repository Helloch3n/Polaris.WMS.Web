<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="home-view">
    <h2>主页</h2>
    <p>请选择要进入的功能：</p>

    <div class="grid">
      <!-- 执行搬运任务：主要入口 -->
      <div class="card" @click="go('/task')" role="button" tabindex="0" aria-label="执行搬运任务">
        <div class="icon"><van-icon name="logistics" size="36" /></div>
        <div class="label">执行搬运任务</div>
      </div>

      <!-- 其他功能入口（保留） -->
      <div class="card" @click="go('/scan')" role="button" tabindex="0" aria-label="扫码">
        <div class="icon"><van-icon name="scan" size="36" /></div>
        <div class="label">扫码</div>
      </div>

      <div class="card" @click="go('/exception')" role="button" tabindex="0" aria-label="异常">
        <div class="icon"><van-icon name="warning" size="36" /></div>
        <div class="label">异常</div>
      </div>

      <div class="card" @click="go('/mine')" role="button" tabindex="0" aria-label="我的">
        <div class="icon"><van-icon name="user" size="36" /></div>
        <div class="label">我的</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  padding: 20px;
  max-width: 640px;
  margin: 0 auto;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 12px;
}
.card {
  background: #fff;
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 14px rgba(16,24,40,0.04);
  cursor: pointer;
  user-select: none;
  transition: transform .12s ease, box-shadow .12s ease;
}
.card:active { transform: translateY(1px); }
.card:focus { outline: 2px solid rgba(37,99,235,0.18); }
.icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 8px;
}
.card svg { width: 56px; height: 56px; }
.label {
  font-size: 13px;
  color: #0f172a;
}

@media (max-width: 520px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}

</style>
