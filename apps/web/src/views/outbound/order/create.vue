<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const SalesOrderForm = defineAsyncComponent(() => import('./components/SalesOrderForm.vue') as unknown as Promise<any>)
</script>

<template>
  <SalesOrderForm />
</template>
