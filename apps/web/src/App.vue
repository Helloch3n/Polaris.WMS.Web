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
    primaryColor: '#4f46e5',
    primaryColorHover: '#6366f1',
    primaryColorPressed: '#4338ca',
    primaryColorSuppl: '#818cf8',
    borderRadius: '12px',
    borderRadiusSmall: '8px',
    fontSize: '14px',
    fontSizeMedium: '14px',
    boxShadow1: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
    boxShadow2: '0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
    boxShadow3: '0 10px 40px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
  },
  Button: {
    borderRadiusMedium: '10px',
    borderRadiusSmall: '8px',
    borderRadiusTiny: '6px',
    heightMedium: '36px',
    heightSmall: '30px',
    paddingMedium: '0 18px',
  },
  Card: {
    borderRadius: '16px',
    paddingMedium: '20px',
    borderColor: 'transparent',
  },
  Input: {
    borderRadius: '10px',
    heightMedium: '36px',
  },
  DataTable: {
    borderRadius: '12px',
    thFontWeight: '600',
    thTextColor: '#64748b',
    thColor: '#f8fafc',
  },
  Tag: {
    borderRadius: '8px',
    heightMedium: '26px',
  },
  Dialog: {
    borderRadius: '16px',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '10px',
        heightMedium: '36px',
      },
    },
  },
  Pagination: {
    itemBorderRadius: '8px',
  },
  Menu: {
    borderRadius: '8px',
    itemHeight: '40px',
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
