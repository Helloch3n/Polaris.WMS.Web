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
  <div class="min-h-screen flex flex-col bg-transparent">
    <!-- Header: 自定义 Tailwind 头部 -->
    <header class="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
      <div class="text-lg font-bold">Polaris WMS</div>
      <div class="flex items-center space-x-3 text-sm">
        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" aria-hidden="true"></span>
        <span>Online</span>
        <van-icon name="battery-full" size="18" />
      </div>
    </header>

    <!-- 中间滚动区 -->
    <div class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-[560px] w-full mx-auto">
        <router-view />
      </div>
    </div>

    <!-- 底部 Tabbar -->
    <van-tabbar
      v-show="!$route.meta.hideTabbar"
      class="w-full"
      :model-value="active"
      @change="handleChange"
      route
      :style="{
        '--van-tabbar-background': '#0f172a',
        '--van-tabbar-item-active-color': '#ffffff',
        '--van-tabbar-item-text-color': '#9ca3af'
      }"
    >
      <van-tabbar-item name="/pda" icon="wap-home-o">工作台</van-tabbar-item>
      <van-tabbar-item name="/pda/inventory" icon="apps-o">库存</van-tabbar-item>
      <van-tabbar-item name="/pda/alerts" icon="bell" dot>消息</van-tabbar-item>
      <van-tabbar-item name="/pda/mine" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
/* 覆盖 van-tabbar 的部分变量以达成极深色主题 */
.van-tabbar {
  --van-tabbar-background: #0f172a;
}

/* 保证布局中间区域在小屏幕有安全间距 */
.van-tabbar,
.van-tabbar__item {
  color: var(--van-tabbar-item-text-color, #9ca3af);
}

</style>
