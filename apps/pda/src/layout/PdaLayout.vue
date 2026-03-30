<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const active = ref('/pda')

// 同步路由状态到底导
watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/pda') active.value = '/pda'
    else if (newPath.includes('/inventory')) active.value = '/pda/inventory'
    else if (newPath.includes('/task')) active.value = '/pda/task'
    else if (newPath.includes('/mine')) active.value = '/pda/mine'
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50 overflow-hidden">
    <div class="flex-1 overflow-y-auto relative">
      <router-view v-slot="{ Component }">
        <transition name="van-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>

    <van-tabbar 
      v-show="!$route.meta.hideTabbar" 
      v-model="active" 
      route 
      class="custom-tabbar shrink-0"
    >
      <van-tabbar-item to="/pda" icon="wap-home-o">工作台</van-tabbar-item>
      <van-tabbar-item to="/pda/inventory" icon="apps-o">库存</van-tabbar-item>
      <van-tabbar-item to="/pda/task" icon="todo-list-o" dot>任务</van-tabbar-item>
      <van-tabbar-item to="/pda/mine" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
/* 极深色底导风格 */
.custom-tabbar {
  --van-tabbar-background: #0f172a; /* slate-900 */
  --van-tabbar-item-text-color: #9ca3af;
  --van-tabbar-item-active-color: #ffffff;
  --van-tabbar-item-active-background: transparent;
  padding-bottom: env(safe-area-inset-bottom, 8px);
}
</style>
