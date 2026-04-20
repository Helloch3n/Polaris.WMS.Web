<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const MiscOutboundOrderForm = defineAsyncComponent(() => import('./components/MiscOutboundOrderForm.vue') as unknown as Promise<any>)
</script>

<template>
  <MiscOutboundOrderForm mode="create" />
</template>
