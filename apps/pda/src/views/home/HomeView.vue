<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

type UrgentTask = {
  id: string
  title: string
  subtitle: string
  route: string
  tone: 'red' | 'orange'
}

type WorkbenchAction = {
  label: string
  subLabel: string
  icon: string
  route: string
  colorClass: string
  badge?: string
}

const urgentTasks: UrgentTask[] = [
  {
    id: 'putaway-urgent',
    title: '上架任务待处理 #PT-20260426-01',
    subtitle: '暂存区 A-01 -> 立库 A-01-01',
    route: '/task/putaway',
    tone: 'orange',
  },
  {
    id: 'pick-urgent',
    title: '拣货任务待处理 #PK-20260426-03',
    subtitle: '成品区 B-02 -> 出货月台',
    route: '/task/pick',
    tone: 'red',
  },
]

const workbenchActions: WorkbenchAction[] = [
  {
    label: '收货接收',
    subLabel: 'Receipt',
    icon: 'logistics',
    route: '/inbound/purchase-receipt/create',
    colorClass: 'bg-blue-50 text-blue-500',
  },
  {
    label: '上架作业',
    subLabel: 'Putaway',
    icon: 'upgrade',
    route: '/task/putaway',
    colorClass: 'bg-orange-50 text-orange-500',
    badge: '待办',
  },
  {
    label: '任务大厅',
    subLabel: 'Task Hall',
    icon: 'exchange',
    route: '/task',
    colorClass: 'bg-green-50 text-green-500',
  },
  {
    label: '拣货作业',
    subLabel: 'Picking',
    icon: 'cart-o',
    route: '/task/pick',
    colorClass: 'bg-purple-50 text-purple-500',
  },
  {
    label: '盘点作业',
    subLabel: 'Cycle Count',
    icon: 'completed',
    route: '/task/cycle-count',
    colorClass: 'bg-emerald-50 text-emerald-500',
  },
  {
    label: '计划盘点',
    subLabel: 'Stocktake',
    icon: 'certificate',
    route: '/task/stocktake',
    colorClass: 'bg-amber-50 text-amber-500',
  },
  {
    label: '移库作业',
    subLabel: 'Transfer Task',
    icon: 'exchange',
    route: '/task/transfer',
    colorClass: 'bg-indigo-50 text-indigo-500',
  },
  {
    label: '理货作业',
    subLabel: 'Relocation',
    icon: 'points',
    route: '/task/relocation',
    colorClass: 'bg-teal-50 text-teal-500',
  },
  {
    label: '库存查询',
    subLabel: 'Inventory',
    icon: 'search',
    route: '/inventory',
    colorClass: 'bg-slate-100 text-slate-600',
  },
  {
    label: '异常上报',
    subLabel: 'Exception',
    icon: 'warning-o',
    route: '/exception-report',
    colorClass: 'bg-rose-50 text-rose-500',
  },
  {
    label: '其他收货',
    subLabel: 'Misc Inbound',
    icon: 'tosend',
    route: '/inbound/misc-inbound',
    colorClass: 'bg-cyan-50 text-cyan-600',
  },
  {
    label: '其他发货',
    subLabel: 'Misc Outbound',
    icon: 'records-o',
    route: '/outbound/misc-outbound',
    colorClass: 'bg-sky-50 text-sky-600',
  },
  {
    label: '组盘拆托',
    subLabel: 'LPN Bind/Unbind',
    icon: 'cluster-o',
    route: '/task/container-binding',
    colorClass: 'bg-amber-50 text-amber-600',
  }
]

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
            <div class="text-xl font-extrabold tracking-wider">{{ authStore.userName || '操作员' }}</div>
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
        v-for="task in urgentTasks"
        :key="task.id"
        class="bg-white rounded-2xl p-4 shadow-md flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
        :class="task.tone === 'red' ? 'border-l-[6px] border-red-500' : 'border-l-[6px] border-orange-500'"
        @click="navigateTo(task.route)"
      >
        <div>
          <div class="font-bold text-xs flex items-center tracking-wide mb-1.5" :class="task.tone === 'red' ? 'text-red-500' : 'text-orange-500'">
            <span class="w-2 h-2 rounded-full animate-pulse mr-1.5" :class="task.tone === 'red' ? 'bg-red-500' : 'bg-orange-500'"></span> 紧急待办
          </div>
          <div class="text-slate-800 font-black text-lg">{{ task.title }}</div>
          <div class="text-slate-500 text-xs mt-1 font-medium">{{ task.subtitle }}</div>
        </div>
        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" :class="task.tone === 'red' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'">
          <van-icon name="arrow" size="18" class="font-bold" />
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-3 px-1">
          <div class="text-sm font-extrabold text-slate-700 tracking-wide">业务大厅 Operations</div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="action in workbenchActions"
            :key="action.label"
            class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center active:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer relative"
            @click="navigateTo(action.route)"
          >
            <div v-if="action.badge" class="absolute top-3 right-3 bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm border-2 border-white">{{ action.badge }}</div>
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner" :class="action.colorClass"><van-icon :name="action.icon" size="28" /></div>
            <span class="text-slate-800 font-extrabold text-[15px]">{{ action.label }}</span>
            <span class="text-slate-400 text-[11px] mt-1 font-bold tracking-wider uppercase">{{ action.subLabel }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>