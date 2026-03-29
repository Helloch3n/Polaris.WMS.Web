<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const transferId = computed(() => String(route.params.id ?? ''))
const TransferOrderForm = defineAsyncComponent(() => import('./components/TransferOrderForm.vue') as unknown as Promise<any>)
</script>

<template>
  <TransferOrderForm mode="edit" :transfer-id="transferId" />
</template>
