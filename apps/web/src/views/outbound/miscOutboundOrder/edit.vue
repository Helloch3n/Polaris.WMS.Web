<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const MiscOutboundOrderEditImpl = defineAsyncComponent(() => import('../miscOutboundOrders/edit.vue') as unknown as Promise<any>)
</script>

<template>
  <MiscOutboundOrderEditImpl />
</template>