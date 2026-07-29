<script setup lang="ts">
import { useRoute } from 'vue-router'
import PurchaseReturnForm from './components/PurchaseReturnForm.vue'
const route = useRoute()
</script>
<template><PurchaseReturnForm mode="edit" :order-id="String(route.params.id)" /></template>
