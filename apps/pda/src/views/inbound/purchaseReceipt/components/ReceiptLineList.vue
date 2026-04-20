<script setup lang="ts">
import type { PurchaseReceiptEntryLine } from '@/types/purchaseReceipt'

defineProps<{
  lines: PurchaseReceiptEntryLine[]
  locationId: string
  activeLineId?: string
}>()

const emit = defineEmits<{
  (event: 'select-line', lineId: string): void
  (event: 'edit-line', lineId: string): void
  (event: 'edit-batch', lineId: string): void
  (event: 'edit-location', lineId: string): void
  (event: 'view-lpn-detail', lineId: string): void
}>()

function toDisplaySku(line: PurchaseReceiptEntryLine): string {
  return line.skuCode ?? line.productCode ?? line.productId
}

function progressClass(line: PurchaseReceiptEntryLine): string {
  if (line.totalReceivedQuantity === 0) {
    return 'text-gray-400'
  }

  if (line.totalReceivedQuantity < line.expectedQuantity) {
    return 'text-orange-500'
  }

  if (line.totalReceivedQuantity === line.expectedQuantity) {
    return 'text-green-500'
  }

  return 'text-red-500 font-extrabold animate-pulse'
}

function displayUom(line: PurchaseReceiptEntryLine): string {
  return line.uom?.trim() || ''
}
</script>

<template>
  <section>
    <van-empty v-if="lines.length === 0" description="当前单据没有可收货明细" class="mt-10" />

    <article
      v-for="line in lines"
      :key="line.sourceDetailId ?? line.productId"
      class="bg-white m-3 p-4 rounded-lg shadow-sm border border-gray-100"
      @click="emit('select-line', line.sourceDetailId ?? line.productId)"
    >
      <div class="text-sm text-gray-800 font-semibold break-all">
        {{ toDisplaySku(line) }}
        <span class="ml-2">{{ line.productName || '未命名物料' }}</span>
      </div>
      <div class="text-xs text-gray-600 mt-1 break-all">
        规格: {{ line.productCode || line.skuCode || '--' }}
      </div>

      <div class="border-b border-gray-100 my-4"></div>

      <div
        role="button"
        class="w-full py-5 rounded bg-gray-50 text-center active:bg-gray-200 transition-colors"
        @click.stop="emit('edit-line', line.sourceDetailId ?? line.productId)"
      >
        <div class="text-4xl font-black leading-none" :class="progressClass(line)">
          {{ line.totalReceivedQuantity }} / {{ line.expectedQuantity }}
          <span v-if="displayUom(line)"> {{ displayUom(line) }}</span>
        </div>
      </div>

      <div class="border-b border-gray-100 my-4"></div>

      <div class="flex items-end text-sm mt-4 gap-2">
        <div class="flex-1 min-w-0 flex flex-wrap gap-2">
          <div
            role="button"
            class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded break-all"
            @click.stop="emit('edit-batch', line.sourceDetailId ?? line.productId)"
          >
            批次: {{ line.batchNo || '点击录入' }}
          </div>

          <div
            role="button"
            class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded break-all"
            @click.stop="emit('edit-location', line.sourceDetailId ?? line.productId)"
          >
            库位: {{ locationId || '点击录入' }}
          </div>
        </div>

        <button
          type="button"
          class="shrink-0 px-1 py-1 text-xs text-sky-500 active:text-slate-500"
          @click.stop="emit('view-lpn-detail', line.sourceDetailId ?? line.productId)"
        >
          查看已收明细 >
        </button>
      </div>
    </article>
  </section>
</template>
