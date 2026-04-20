<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const orderId = computed(() => String(route.params.id ?? ''))
const MiscInboundOrderForm = defineAsyncComponent(() => import('./components/MiscInboundOrderForm.vue') as unknown as Promise<any>)
</script>

<template>
  <MiscInboundOrderForm mode="edit" :order-id="orderId" />
</template>
