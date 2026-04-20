<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

// Track active tab based on current route
const route = useRoute()
const active = ref('/')

watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/') active.value = '/'
    else if (newPath.includes('/inventory')) active.value = '/inventory'
    else if (newPath.includes('/task')) active.value = '/task'
    else if (newPath.includes('/mine')) active.value = '/mine'
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex flex-col h-screen bg-[var(--pda-bg)] overflow-hidden">
    <div class="flex-1 overflow-y-auto relative">
      <router-view v-slot="{ Component }">
        <transition name="van-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>

    <van-tabbar 
      v-show="!$route.meta.hideTabbar" 
      route 
      class="custom-tabbar shrink-0"
    >
      <van-tabbar-item replace to="/home" icon="wap-home-o">工作台</van-tabbar-item>
      <van-tabbar-item replace to="/inventory" icon="search">库存</van-tabbar-item>
      <van-tabbar-item replace to="/task" icon="todo-list-o" dot>任务</van-tabbar-item>
      <van-tabbar-item replace to="/mine" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.custom-tabbar {
  --van-tabbar-background: #ffffff;
  --van-tabbar-item-text-color: #64748b;
  --van-tabbar-item-active-color: #4f46e5;
  --van-tabbar-item-active-background: transparent;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 18px rgba(15, 23, 42, 0.06);
  padding-bottom: env(safe-area-inset-bottom, 8px);
}
</style>