<script setup lang="ts">
import { ref } from 'vue'

const searchValue = ref('')
const list = ref([
  { code: 'A-01-01', item: '减速机总成', batch: 'BAT-20231001', qty: 50 },
  { code: 'B-02-05', item: '铜芯线缆 50m', batch: 'BAT-20231005', qty: 120 }
])

const onSearch = () => {
  // 模拟搜索
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50 pb-safe">
    <div class="bg-slate-800 pt-8 pb-4 px-4 shrink-0 rounded-b-3xl shadow-sm">
      <div class="text-white font-extrabold text-2xl mb-4 tracking-wider">库存查询</div>
      <div class="flex space-x-2">
        <van-field
          v-model="searchValue"
          clearable
          placeholder="扫描库位、盘具或物料条码"
          class="!bg-white/10 !text-white !rounded-xl custom-search flex-1"
          left-icon="scan"
          @keyup.enter="onSearch"
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 mt-2">
      <div class="text-xs font-bold text-gray-400 uppercase">查询结果 ({{ list.length }})</div>
      
      <div v-for="(item, idx) in list" :key="idx" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-start mb-2">
          <div class="text-lg font-black text-slate-800">{{ item.item }}</div>
          <div class="text-xl font-black text-blue-600">{{ item.qty }}</div>
        </div>
        <div class="text-sm text-gray-500 flex items-center mt-3">
          <van-icon name="location-o" class="mr-1" /> 库位: <span class="font-mono font-bold text-gray-800 ml-2">{{ item.code }}</span>
        </div>
        <div class="text-sm text-gray-500 flex items-center mt-1">
          <van-icon name="flag-o" class="mr-1" /> 批次: <span class="font-mono text-gray-800 ml-2">{{ item.batch }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.custom-search .van-field__control) { color: white; font-weight: bold; }
:deep(.custom-search .van-field__control::placeholder) { color: #cbd5e1; }
:deep(.custom-search .van-icon) { color: #fff; font-size: 20px; }
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 12px); }
</style>