<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const orderId = computed(() => String(route.params.id ?? ''))
const MiscOutboundOrderForm = defineAsyncComponent(() => import('./components/MiscOutboundOrderForm.vue') as unknown as Promise<any>)
</script>

<template>
  <MiscOutboundOrderForm mode="edit" :order-id="orderId" />
</template>
