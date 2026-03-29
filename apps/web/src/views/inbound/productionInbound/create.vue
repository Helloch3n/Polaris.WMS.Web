<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const ProductionInboundForm = defineAsyncComponent(() => import('./components/ProductionInboundForm.vue') as unknown as Promise<any>)
</script>

<template>
  <ProductionInboundForm mode="create" />
</template>
