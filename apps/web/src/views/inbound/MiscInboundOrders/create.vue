<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const MiscInboundOrderForm = defineAsyncComponent(() => import('./components/MiscInboundOrderForm.vue') as unknown as Promise<any>)
</script>

<template>
  <MiscInboundOrderForm mode="create" />
</template>
