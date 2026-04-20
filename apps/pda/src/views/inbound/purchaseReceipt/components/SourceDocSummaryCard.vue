<script setup lang="ts">
import { computed } from 'vue'
import type { PurchaseReceiptSourceDocument } from '@/types/purchaseReceipt'

const props = defineProps<{
  sourceDoc: PurchaseReceiptSourceDocument | null
  totalLines: number
  receivedLineCount: number
  totalReceivedNow: number
}>()

const supplierText = computed(() => {
  if (!props.sourceDoc) {
    return '--'
  }

  const segments = [props.sourceDoc.supplierCode, props.sourceDoc.supplierName].filter(Boolean)
  if (segments.length > 0) {
    return segments.join(' / ')
  }

  return props.sourceDoc.supplierId ?? '--'
})
</script>

<template>
  <section v-if="sourceDoc" class="bg-gray-50 p-4 text-sm text-gray-700 border-y border-gray-200">
    <div class="font-semibold">
      单据:
      <span class="ml-1 font-mono text-gray-900 break-all">{{ sourceDoc.sourceDocNo }}</span>
    </div>
    <div class="mt-2 leading-5">
      供方:
      <span class="ml-1 text-gray-900 whitespace-normal break-words">{{ supplierText }}</span>
    </div>
  </section>
</template>
