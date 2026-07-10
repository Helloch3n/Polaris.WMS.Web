<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NDialogProvider, NMessageProvider, NNotificationProvider, darkTheme } from 'naive-ui'
import { zhCN, dateZhCN } from 'naive-ui'
import { useSettingsStore } from './stores/settings'
import { useBarcodeScanner } from './composables/useBarcodeScanner'
import { createWmsThemeOverrides, getWmsCssVariables } from './theme/wmsTheme'

const settingsStore = useSettingsStore()
useBarcodeScanner()

const currentTheme = computed(() => {
  return settingsStore.theme === 'dark' ? darkTheme : null
})

const themeOverrides = computed(() => createWmsThemeOverrides(settingsStore.theme))
const appThemeVars = computed(() => getWmsCssVariables(settingsStore.theme))
</script>

<template>
  <div class="wms-app-shell" :style="appThemeVars">
    <n-config-provider
      :theme="currentTheme"
      :theme-overrides="themeOverrides"
      :locale="zhCN"
      :date-locale="dateZhCN"
    >
      <n-message-provider>
        <n-dialog-provider>
          <n-notification-provider>
            <RouterView />
          </n-notification-provider>
        </n-dialog-provider>
      </n-message-provider>
    </n-config-provider>
  </div>
</template>

<style scoped>
.wms-app-shell {
  height: 100%;
}
</style>
