<script setup lang="ts">
import { NConfigProvider, NDialogProvider, NMessageProvider, NNotificationProvider } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import { zhCN, dateZhCN } from 'naive-ui'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontFamilyMono:
      "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
    primaryColor: '#2563eb',
    primaryColorHover: '#3b82f6',
    primaryColorPressed: '#1d4ed8',
    primaryColorSuppl: '#60a5fa',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontSize: '14px',
    fontSizeMedium: '14px',
    boxShadow1: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
    boxShadow2: '0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
    boxShadow3: '0 10px 40px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
  },
  Button: {
    borderRadiusMedium: '6px',
    borderRadiusSmall: '5px',
    borderRadiusTiny: '4px',
    heightMedium: '30px',
    heightSmall: '26px',
    paddingMedium: '0 14px',
  },
  Card: {
    borderRadius: '10px',
    paddingMedium: '12px 14px',
    borderColor: 'transparent',
  },
  Input: {
    borderRadius: '6px',
    heightMedium: '30px',
  },
  DataTable: {
    borderRadius: '8px',
    thFontWeight: '600',
    thTextColor: '#475569',
    thColor: '#f8fafc',
  },
  Tag: {
    borderRadius: '6px',
    heightMedium: '24px',
  },
  Dialog: {
    borderRadius: '10px',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '6px',
        heightMedium: '30px',
      },
    },
  },
  Pagination: {
    itemBorderRadius: '6px',
  },
  Menu: {
    borderRadius: '6px',
    itemHeight: '38px',
  },
}
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <RouterView />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
