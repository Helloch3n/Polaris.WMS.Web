<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="min-h-screen bg-[#F3F4F6] pb-24 font-sans">
    
    <div class="bg-slate-800 px-5 pt-8 pb-14 rounded-b-[2.5rem] shadow-lg relative z-0">
      <div class="flex justify-between items-center text-white">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-inner border-2 border-slate-600">
            <van-icon name="user-o" size="24" color="#fff" />
          </div>
          <div>
            <div class="text-xl font-extrabold tracking-wider">{{ authStore.user?.username || '操作员' }}</div>
            <div class="text-xs text-slate-300 mt-1 flex items-center font-medium">
              <span class="w-2 h-2 bg-green-400 rounded-full mr-1.5 shadow-[0_0_6px_#4ade80]"></span>
              一号总仓 · A区
            </div>
          </div>
        </div>
        <div class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md active:bg-white/20 transition-colors cursor-pointer">
          <van-icon name="scan" size="22" />
        </div>
      </div>
    </div>

    <div class="px-4 -mt-10 relative z-10 space-y-5">
      
      <div 
        class="bg-white rounded-2xl p-4 shadow-md border-l-[6px] border-red-500 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
        @click="navigateTo('/task/move/MOVE-992')"
      >
        <div>
          <div class="text-red-500 font-bold text-xs flex items-center tracking-wide mb-1.5">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1.5"></span> 紧急待办
          </div>
          <div class="text-slate-800 font-black text-lg">出库搬运 #OUT-992</div>
          <div class="text-slate-500 text-xs mt-1 font-medium">A-01 <van-icon name="arrow" class="mx-0.5 align-middle"/> 出货月台</div>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
          <van-icon name="arrow" size="18" class="font-bold" />
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-3 px-1">
          <div class="text-sm font-extrabold text-slate-700 tracking-wide">业务大厅 Operations</div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          
          <div 
            class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            @click="navigateTo('/inventory')"
          >
            <div class="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mb-3 shadow-inner">
              <van-icon name="logistics" size="28" />
            </div>
            <span class="text-slate-800 font-extrabold text-[15px]">入库接收</span>
            <span class="text-slate-400 text-[11px] mt-1 font-bold tracking-wider uppercase">Receipt</span>
          </div>

          <div 
            class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer relative"
            @click="navigateTo('/task')"
          >
            <div class="absolute top-3 right-3 bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm border-2 border-white">
              12
            </div>
            <div class="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 mb-3 shadow-inner">
              <van-icon name="down" size="28" />
            </div>
            <span class="text-slate-800 font-extrabold text-[15px]">上架作业</span>
            <span class="text-slate-400 text-[11px] mt-1 font-bold tracking-wider uppercase">Putaway</span>
          </div>

          <div 
            class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            @click="navigateTo('/task')"
          >
            <div class="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 mb-3 shadow-inner">
              <van-icon name="exchange" size="28" />
            </div>
            <span class="text-slate-800 font-extrabold text-[15px]">搬运任务</span>
            <span class="text-slate-400 text-[11px] mt-1 font-bold tracking-wider uppercase">Move Task</span>
          </div>

          <div 
            class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div class="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 mb-3 shadow-inner">
              <van-icon name="cart-o" size="28" />
            </div>
            <span class="text-slate-800 font-extrabold text-[15px]">波次拣货</span>
            <span class="text-slate-400 text-[11px] mt-1 font-bold tracking-wider uppercase">Picking</span>
          </div>

          <div 
            class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div class="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 mb-3 shadow-inner">
              <van-icon name="completed" size="28" />
            </div>
            <span class="text-slate-800 font-extrabold text-[15px]">盘点作业</span>
            <span class="text-slate-400 text-[11px] mt-1 font-bold tracking-wider uppercase">Stocktake</span>
          </div>

          <div 
            class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            @click="navigateTo('/inventory')"
          >
            <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mb-3 shadow-inner">
              <van-icon name="search" size="28" />
            </div>
            <span class="text-slate-800 font-extrabold text-[15px]">库存查询</span>
            <span class="text-slate-400 text-[11px] mt-1 font-bold tracking-wider uppercase">Inventory</span>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 所有样式和布局已由 Tailwind CSS 在 HTML 标签中精准控制 */
</style>