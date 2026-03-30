<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="min-h-full bg-[#F3F4F6] pb-8">
    
    <div class="bg-slate-800 px-5 pt-8 pb-10 rounded-b-[2rem] shadow-md">
      <div class="flex justify-between items-center text-white">
        <div>
          <div class="text-slate-400 text-sm font-medium mb-1 tracking-wide">Polaris WMS</div>
          <div class="text-3xl font-extrabold tracking-wider">工作台</div>
        </div>
        <div class="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
          <van-icon name="user-circle-o" size="28" color="#fff" />
        </div>
      </div>
    </div>

    <div class="px-4 -mt-6 relative z-10 space-y-4">
      
      <div 
        class="bg-white rounded-2xl p-5 shadow-sm border-l-[6px] border-red-500 flex items-center justify-between active:scale-95 transition-transform cursor-pointer"
        @click="navigateTo('/task/move/MOVE-992')"
      >
        <div>
          <div class="text-red-500 font-bold text-sm flex items-center tracking-wide mb-1">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></span> 紧急任务
          </div>
          <div class="text-slate-800 font-black text-xl">出库搬运 #OUT-992</div>
          <div class="text-slate-500 text-sm mt-1.5 font-medium">A-01 <van-icon name="arrow" class="mx-1"/> 出货月台</div>
        </div>
        <div class="bg-red-50 w-11 h-11 rounded-full flex items-center justify-center text-red-500 shrink-0">
          <van-icon name="arrow" size="20" font-weight="bold" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 pt-2">
        
        <div class="bg-white p-5 rounded-3xl shadow-sm active:scale-95 transition-transform flex flex-col items-center justify-center gap-3 cursor-pointer">
          <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 shadow-inner">
            <van-icon name="logistics" size="36" />
          </div>
          <span class="text-slate-800 font-bold text-lg">入库接收</span>
        </div>

        <div class="bg-white p-5 rounded-3xl shadow-sm active:scale-95 transition-transform flex flex-col items-center justify-center gap-3 cursor-pointer relative">
          <div class="absolute top-3 right-3 bg-red-500 text-white text-sm font-black px-2.5 py-0.5 rounded-full border-2 border-white shadow-sm">12</div>
          <div class="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 shadow-inner">
            <van-icon name="down" size="36" />
          </div>
          <span class="text-slate-800 font-bold text-lg">上架作业</span>
        </div>

        <div 
          class="col-span-2 bg-green-500 p-6 rounded-3xl shadow-lg shadow-green-200 active:scale-95 transition-transform flex items-center justify-between cursor-pointer relative overflow-hidden" 
          @click="navigateTo('/task/move/MOVE-001')"
        >
          <div class="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-20 rounded-full blur-3xl"></div>
          
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/30">
              <van-icon name="exchange" size="36" />
            </div>
            <div>
              <div class="text-white font-black text-2xl tracking-wide">搬运任务</div>
              <div class="text-green-100 text-sm mt-1 font-medium">执行库内移位与调拨</div>
            </div>
          </div>
          <van-icon name="arrow" size="24" color="white" class="opacity-90 relative z-10" />
        </div>

        <div class="bg-white p-5 rounded-3xl shadow-sm active:scale-95 transition-transform flex flex-col items-center justify-center gap-3 cursor-pointer">
          <div class="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-500 shadow-inner">
            <van-icon name="points" size="36" />
          </div>
          <span class="text-slate-800 font-bold text-lg">波次拣货</span>
        </div>

        <div class="bg-white p-5 rounded-3xl shadow-sm active:scale-95 transition-transform flex flex-col items-center justify-center gap-3 cursor-pointer" @click="navigateTo('/inventory')">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 shadow-inner">
            <van-icon name="search" size="36" />
          </div>
          <span class="text-slate-800 font-bold text-lg">库存查询</span>
        </div>

      </div>
    </div>
  </div>
</template>