<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Header（固定） -->
    <header class="fixed top-0 left-0 right-0 z-30 bg-slate-800 text-white p-4 flex justify-between items-center h-16">
      <div class="flex items-center space-x-3">
        <div class="text-lg font-bold">Polaris WMS</div>
      </div>
      <div class="flex items-center space-x-3">
        <span class="w-3 h-3 rounded-full bg-green-400 inline-block" aria-hidden="true"></span>
        <span class="text-sm">Online</span>
        <van-icon name="battery" class="ml-2" />
      </div>
    </header>

    <!-- 内容区（距顶部和底部留空） -->
    <main class="flex-1 p-4 space-y-5 overflow-y-auto mt-16 pb-28">
      <!-- 智能待办卡片 -->
      <section>
        <div class="rounded-xl shadow-2xl p-4 text-white bg-gradient-to-r from-orange-500 to-red-500">
          <div class="flex flex-col">
            <div class="text-2xl font-bold">🚨 紧急出库搬运</div>
            <div class="text-sm opacity-90 mt-2">
              单号 #OUT-992，包含 2 个托盘，请立即从 A-01 移至出货月台。
            </div>
            <div class="mt-4">
              <van-button block round class="bg-white text-red-500 font-semibold" @click="handleContinue">
                立即继续该任务
              </van-button>
            </div>
          </div>
        </div>
      </section>

      <!-- 入库业务域 -->
      <section>
        <div class="text-sm text-gray-500 font-bold mb-2">INBOUND OPERATIONS / 入库作业</div>
        <van-grid column-num="2" gutter="16">
          <van-grid-item icon="logistics" class="rounded-lg shadow-sm bg-white p-4">
            <div class="text-sm">收货接收</div>
          </van-grid-item>

          <van-grid-item icon="down" class="rounded-lg shadow-sm bg-white p-4">
            <template #badge>
              <van-badge content="12" color="#ff4d4f" />
            </template>
            <div class="text-sm">上架作业</div>
          </van-grid-item>
        </van-grid>
      </section>

      <!-- 库内业务域 -->
      <section>
        <div class="text-sm text-gray-500 font-bold mb-2">INTERNAL OPERATIONS / 库内作业</div>
        <van-grid column-num="2" gutter="16">
          <van-grid-item icon="exchange" class="rounded-lg bg-white p-4">
            <div class="border-2 border-green-500 rounded-md p-3 text-green-600 font-semibold">
              <div class="text-sm">搬运任务</div>
            </div>
          </van-grid-item>

          <van-grid-item icon="completed" class="rounded-lg shadow-sm bg-white p-4">
            <div class="text-sm">盘点作业</div>
          </van-grid-item>
        </van-grid>
      </section>
    </main>

    <!-- 底部导航（固定） -->
    <footer class="fixed bottom-0 left-0 right-0 z-40">
      <van-tabbar
        v-model="activeTab"
        class="shadow-lg"
        :style="{
          '--van-tabbar-background': '#0f172a',
          '--van-tabbar-color': '#9ca3af',
          '--van-tabbar-active-color': '#ffffff'
        }"
      >
        <van-tabbar-item icon="wap-home">工作台</van-tabbar-item>
        <van-tabbar-item icon="apps-o">库存</van-tabbar-item>
        <van-tabbar-item icon="bell" dot>消息</van-tabbar-item>
        <van-tabbar-item icon="user-o">我的</van-tabbar-item>
      </van-tabbar>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref(0)

function handleContinue() {
  // 占位回调：实际逻辑应触发路由或跳转到任务详情
  activeTab.value = 0
}
</script>

<style scoped>
.van-tabbar__item--active {
  font-weight: 700;
  color: #ffffff !important;
}
.van-grid-item {
  padding: 0.75rem !important;
}
</style>
