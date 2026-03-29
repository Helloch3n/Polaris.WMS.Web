<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const TransferOrderForm = defineAsyncComponent(() => import('./components/TransferOrderForm.vue') as unknown as Promise<any>)
</script>

<template>
  <TransferOrderForm mode="create" />
</template>
