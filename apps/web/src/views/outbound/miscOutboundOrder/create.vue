<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const MiscOutboundOrderCreateImpl = defineAsyncComponent(() => import('../miscOutboundOrders/create.vue') as unknown as Promise<any>)
</script>

<template>
  <MiscOutboundOrderCreateImpl />
</template>