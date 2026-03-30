<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { showConfirmDialog, showToast } from 'vant'

const router = useRouter()
const authStore = useAuthStore()

// 🚀 修复点：使用 async/await 分离【点击取消】和【执行跳转】的逻辑
const handleLogout = async () => {
  try {
    // 1. 等待用户确认
    await showConfirmDialog({
      title: '退出登录',
      message: '确定要退出当前工作账号吗？',
      confirmButtonColor: '#ef4444'
    })
    
    // 2. 确认后执行清理
    authStore.logout()
    showToast('已安全退出')
    
    // 3. 使用路由 Name 确保绝对命中，且不留下后退历史
    router.replace({ name: 'Login' })
    
  } catch (error) {
    // 用户点击了取消，什么都不做
    if (error !== 'cancel') {
      console.error('退出系统发生异常:', error)
    }
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-[#F3F4F6]">
    <div class="bg-slate-800 px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-md flex items-center space-x-5 shrink-0">
      <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-inner">
        <van-icon name="user-o" size="32" color="white" />
      </div>
      <div>
        <div class="text-white font-extrabold text-2xl tracking-wider">{{ authStore.user?.username || 'Admin' }}</div>
        <div class="text-slate-400 text-sm font-medium mt-1">系统管理员 · 仓库主区</div>
      </div>
    </div>

    <div class="flex-1 p-4 mt-4 space-y-4">
      <van-cell-group inset class="!bg-white shadow-sm border border-gray-100 !rounded-2xl overflow-hidden custom-cell-group">
        <van-cell title="设备绑定" value="PDA-009" icon="desktop-o" />
        <van-cell title="当前仓库" value="上海一号总仓" icon="shop-o" />
        <van-cell title="网络状态" value="在线 (Ping 24ms)" icon="aim" />
      </van-cell-group>

      <van-cell-group inset class="!bg-white shadow-sm border border-gray-100 !rounded-2xl overflow-hidden custom-cell-group">
        <van-cell title="检查更新" value="V 1.0.2" icon="upgrade" is-link />
        <van-cell title="操作手册" icon="description" is-link />
      </van-cell-group>

      <div class="pt-6">
        <van-button block round class="!bg-red-50 !text-red-600 !border-none font-bold text-lg active:scale-95 transition-transform" @click="handleLogout">
          退出系统
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.custom-cell-group .van-cell) { padding: 18px 16px; font-size: 15px; }
:deep(.custom-cell-group .van-cell__title) { font-weight: bold; color: #374151; }
:deep(.custom-cell-group .van-icon) { font-size: 20px; margin-right: 8px; color: #64748b; }
</style>