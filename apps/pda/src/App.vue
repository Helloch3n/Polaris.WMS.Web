<script setup lang="ts">
const themeVars = {
  primaryColor: '#4f46e5',
  successColor: '#10b981',
  warningColor: '#f59e0b',
  dangerColor: '#ef4444',
  textColor: '#0f172a',
  background: '#f5f7fb',
  activeColor: '#4338ca',
}
</script>

<template>
  <van-config-provider :theme-vars="themeVars">
    <router-view />
  </van-config-provider>
</template>
