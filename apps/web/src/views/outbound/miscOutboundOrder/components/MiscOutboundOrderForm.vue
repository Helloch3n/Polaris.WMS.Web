<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const MiscOutboundOrderFormImpl = defineAsyncComponent(() => import('../../miscOutboundOrders/components/MiscOutboundOrderForm.vue') as unknown as Promise<any>)
</script>

<template>
  <MiscOutboundOrderFormImpl v-bind="$attrs" />
</template>