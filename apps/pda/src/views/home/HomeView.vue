<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="p-4 space-y-5">
    <!-- 区块 A: 智能待办卡片 -->
    <section>
      <div class="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-xl shadow-lg text-white">
        <div class="font-bold text-lg">🚨 紧急出库搬运</div>
        <div class="text-sm mt-1 opacity-90">单号 #OUT-992，包含 2 个托盘，请立即从 A-01 移至出货月台。</div>
        <div>
          <van-button
            block
            round
            size="small"
            class="!mt-3 !bg-white !text-red-600 !border-none font-bold"
            @click="go('/task')"
          >
            立即继续该任务
          </van-button>
        </div>
      </div>
    </section>

    <!-- 区块 B: 入库业务域 -->
    <section>
      <div class="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Inbound Operations / 入库作业</div>
      <van-grid :column-num="2" :gutter="16" :border="false">
        <van-grid-item icon="logistics" class="grid-item">
          <div class="text-base font-medium">收货接收</div>
        </van-grid-item>

        <van-grid-item icon="down" badge="12" class="grid-item">
          <div class="text-base font-medium">上架作业</div>
        </van-grid-item>
      </van-grid>
    </section>

    <!-- 区块 C: 库内业务域 -->
    <section>
      <div class="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Internal Operations / 库内作业</div>
      <van-grid :column-num="2" :gutter="16" :border="false">
        <van-grid-item icon="exchange" class="grid-item highlight-item" @click="go('/task')">
          <div class="text-base font-medium text-green-600">搬运任务</div>
        </van-grid-item>

        <van-grid-item icon="completed" class="grid-item">
          <div class="text-base font-medium">盘点作业</div>
        </van-grid-item>
      </van-grid>
    </section>
  </div>
</template>

<style scoped>
/* 为 van-grid-item 的内部内容块添加工业风卡片样式 */
::v-deep(.grid-item .van-grid-item__content) {
  border-radius: 0.75rem;
  box-shadow: 0 6px 14px rgba(2,6,23,0.06);
  border: 1px solid #f3f4f6;
  padding: 12px 10px !important;
  background: #ffffff;
}

/* 高亮搬运任务 */
::v-deep(.highlight-item .van-grid-item__content) {
  border-width: 2px !important;
  border-color: #10b981 !important;
}

/* 提高触控面积 */
::v-deep(.van-grid-item__content) {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>
