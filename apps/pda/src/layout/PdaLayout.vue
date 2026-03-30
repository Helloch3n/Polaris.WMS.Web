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
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
      <div class="font-bold text-lg">Polaris WMS</div>
      <div class="flex items-center">
        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" aria-hidden="true"></span>
        <span class="text-sm mr-2">Online</span>
        <van-icon name="battery-full" size="18" class="ml-2" />
      </div>
    </div>

    <!-- Main content -->
    <div class="flex-1 overflow-y-auto relative">
      <div class="max-w-[560px] w-full mx-auto h-full">
        <router-view />
      </div>
    </div>

    <!-- Footer Tabbar -->
    <van-tabbar
      v-show="!$route.meta.hideTabbar"
      v-model="active"
      route
      class="w-full"
      :style="{
        '--van-tabbar-background': '#0f172a',
        '--van-tabbar-item-text-color': '#9ca3af',
        '--van-tabbar-item-active-color': '#ffffff'
      }"
    >
      <van-tabbar-item name="/pda" icon="wap-home-o">工作台</van-tabbar-item>
      <van-tabbar-item name="/pda/inventory" icon="apps-o">库存</van-tabbar-item>
      <van-tabbar-item name="/pda/scan" icon="bell" dot>消息</van-tabbar-item>
      <van-tabbar-item name="/pda/mine" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
:deep(.van-tabbar) {
  --van-tabbar-background: #0f172a;
}

:deep(.van-tabbar), :deep(.van-tabbar__item) {
  color: var(--van-tabbar-item-text-color, #9ca3af);
}

</style>
