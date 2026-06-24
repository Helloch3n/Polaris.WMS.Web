<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const MiscOutboundOrderIndexImpl = defineAsyncComponent(() => import('../miscOutboundOrders/index.vue') as unknown as Promise<any>)
</script>

<template>
  <MiscOutboundOrderIndexImpl />
</template>