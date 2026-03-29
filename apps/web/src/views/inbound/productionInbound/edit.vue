<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const inboundId = computed(() => String(route.params.orderId ?? ''))
const ProductionInboundForm = defineAsyncComponent(() => import('./components/ProductionInboundForm.vue') as unknown as Promise<any>)
</script>

<template>
  <ProductionInboundForm mode="edit" :inbound-id="inboundId" />
</template>
