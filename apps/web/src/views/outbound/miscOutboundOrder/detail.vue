<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const MiscOutboundOrderDetailImpl = defineAsyncComponent(() => import('../miscOutboundOrders/detail.vue') as unknown as Promise<any>)
</script>

<template>
  <MiscOutboundOrderDetailImpl />
</template>