import type { GlobalThemeOverrides } from 'naive-ui'

export type WmsThemeMode = 'light' | 'dark'

export type WmsThemeTokens = {
  surface: {
    app: string
    sider: string
    header: string
    panel: string
    panelMuted: string
    elevated: string
    tableHeader: string
    hover: string
  }
  border: {
    subtle: string
    default: string
    strong: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    inverse: string
  }
  brand: {
    primary: string
    hover: string
    pressed: string
    subtle: string
  }
  status: {
    draft: string
    pending: string
    progress: string
    success: string
    error: string
    cancelled: string
  }
  statusSurface: {
    draft: string
    pending: string
    progress: string
    success: string
    error: string
    cancelled: string
  }
  operation: {
    inbound: string
    outbound: string
    internal: string
    inventory: string
    system: string
  }
  shadow: {
    panel: string
    elevated: string
  }
}

const fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
const fontFamilyMono = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace"

export const wmsThemeTokens: Record<WmsThemeMode, WmsThemeTokens> = {
  light: {
    surface: {
      app: '#f4f7fb',
      sider: '#f8fafc',
      header: '#ffffff',
      panel: '#ffffff',
      panelMuted: '#f8fafc',
      elevated: '#ffffff',
      tableHeader: '#f8fafc',
      hover: 'rgba(37, 99, 235, 0.05)',
    },
    border: {
      subtle: '#eef2f7',
      default: '#dbe3ef',
      strong: '#b8c4d6',
    },
    text: {
      primary: '#102033',
      secondary: '#475569',
      muted: '#7b8da3',
      inverse: '#ffffff',
    },
    brand: {
      primary: '#1f5eff',
      hover: '#386fff',
      pressed: '#1747c9',
      subtle: '#eef4ff',
    },
    status: {
      draft: '#64748b',
      pending: '#c77700',
      progress: '#1f5eff',
      success: '#047857',
      error: '#c2410c',
      cancelled: '#64748b',
    },
    statusSurface: {
      draft: '#f1f5f9',
      pending: '#fff7ed',
      progress: '#eef4ff',
      success: '#ecfdf5',
      error: '#fff1ed',
      cancelled: '#f1f5f9',
    },
    operation: {
      inbound: '#0f766e',
      outbound: '#7c3aed',
      internal: '#2563eb',
      inventory: '#0891b2',
      system: '#64748b',
    },
    shadow: {
      panel: '0 1px 2px rgba(15, 23, 42, 0.04)',
      elevated: '0 8px 24px rgba(15, 23, 42, 0.08)',
    },
  },
  dark: {
    surface: {
      app: '#0b1220',
      sider: '#101827',
      header: '#111b2c',
      panel: '#152033',
      panelMuted: '#101827',
      elevated: '#1b2940',
      tableHeader: '#101827',
      hover: 'rgba(96, 165, 250, 0.1)',
    },
    border: {
      subtle: '#22314a',
      default: '#2f405c',
      strong: '#52627a',
    },
    text: {
      primary: '#f3f7fb',
      secondary: '#c4d0de',
      muted: '#8ea0b6',
      inverse: '#0b1220',
    },
    brand: {
      primary: '#67a1ff',
      hover: '#8bb8ff',
      pressed: '#3f7dea',
      subtle: 'rgba(96, 165, 250, 0.16)',
    },
    status: {
      draft: '#a8b3c2',
      pending: '#f8b85c',
      progress: '#8bb8ff',
      success: '#86efac',
      error: '#fb9273',
      cancelled: '#94a3b8',
    },
    statusSurface: {
      draft: 'rgba(148, 163, 184, 0.16)',
      pending: 'rgba(251, 146, 60, 0.16)',
      progress: 'rgba(96, 165, 250, 0.18)',
      success: 'rgba(34, 197, 94, 0.16)',
      error: 'rgba(248, 113, 113, 0.16)',
      cancelled: 'rgba(148, 163, 184, 0.14)',
    },
    operation: {
      inbound: '#5eead4',
      outbound: '#c4b5fd',
      internal: '#93c5fd',
      inventory: '#67e8f9',
      system: '#cbd5e1',
    },
    shadow: {
      panel: 'none',
      elevated: '0 12px 34px rgba(0, 0, 0, 0.38)',
    },
  },
}

export function getWmsThemeTokens(mode: WmsThemeMode) {
  return wmsThemeTokens[mode]
}

export function createWmsThemeOverrides(mode: WmsThemeMode): GlobalThemeOverrides {
  const token = getWmsThemeTokens(mode)
  return {
    common: {
      fontFamily,
      fontFamilyMono,
      primaryColor: token.brand.primary,
      primaryColorHover: token.brand.hover,
      primaryColorPressed: token.brand.pressed,
      primaryColorSuppl: token.brand.subtle,
      borderRadius: '6px',
      borderRadiusSmall: '4px',
      fontSize: '14px',
      fontSizeMedium: '14px',
      bodyColor: token.surface.app,
      cardColor: token.surface.panel,
      modalColor: token.surface.elevated,
      popoverColor: token.surface.elevated,
      tableColor: token.surface.panel,
      inputColor: token.surface.panel,
      borderColor: token.border.default,
      textColorBase: token.text.primary,
      textColor1: token.text.primary,
      textColor2: token.text.secondary,
      textColor3: token.text.muted,
      boxShadow1: token.shadow.panel,
      boxShadow2: token.shadow.elevated,
      boxShadow3: token.shadow.elevated,
    },
    Layout: {
      headerColor: token.surface.header,
      siderColor: token.surface.sider,
      color: token.surface.app,
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
      borderRadius: '8px',
      paddingMedium: '12px 14px',
      color: token.surface.panel,
      borderColor: token.border.subtle,
    },
    Input: {
      borderRadius: '6px',
      heightMedium: '30px',
    },
    DataTable: {
      borderRadius: '0px',
      thFontWeight: '600',
      thTextColor: token.text.secondary,
      thColor: token.surface.tableHeader,
      tdColor: token.surface.panel,
      borderColor: token.border.subtle,
    },
    Tag: {
      borderRadius: '4px',
      heightMedium: '24px',
    },
    Dialog: {
      borderRadius: '8px',
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
      itemBorderRadius: '5px',
      itemSizeMedium: '26px',
      itemPaddingMedium: '0 7px',
      itemTextColor: token.text.secondary,
      itemTextColorHover: token.brand.primary,
      itemTextColorPressed: token.brand.pressed,
      itemTextColorActive: token.brand.primary,
      itemColor: 'transparent',
      itemColorHover: token.brand.subtle,
      itemColorPressed: token.brand.subtle,
      itemColorActive: token.brand.subtle,
      itemBorder: `1px solid ${token.border.subtle}`,
      itemBorderHover: `1px solid ${token.brand.primary}`,
      itemBorderPressed: `1px solid ${token.brand.pressed}`,
      itemBorderActive: `1px solid ${token.brand.primary}`,
      buttonColor: token.surface.elevated,
      buttonColorHover: token.brand.subtle,
      buttonIconColor: token.text.muted,
      buttonIconColorHover: token.brand.primary,
      buttonIconColorPressed: token.brand.pressed,
    },
    Menu: {
      borderRadius: '6px',
      itemHeight: '32px',
      itemBorderRadius: '6px',
      itemTextColor: token.text.secondary,
      itemTextColorHover: token.text.primary,
      itemTextColorActive: token.brand.primary,
      itemTextColorActiveHover: token.brand.primary,
      itemTextColorChildActive: token.brand.primary,
      itemTextColorChildActiveHover: token.brand.primary,
      itemIconColor: token.text.muted,
      itemIconColorHover: token.text.primary,
      itemIconColorActive: token.brand.primary,
      itemIconColorActiveHover: token.brand.primary,
      itemColorHover: token.brand.subtle,
      itemColorActive: token.brand.subtle,
      itemColorActiveHover: token.brand.subtle,
      arrowColor: token.text.muted,
      arrowColorHover: token.text.secondary,
      arrowColorActive: token.brand.primary,
      groupTextColor: token.text.muted,
    },
  }
}

export function getWmsCssVariables(mode: WmsThemeMode): Record<string, string> {
  const token = getWmsThemeTokens(mode)
  return {
    '--wms-surface-app': token.surface.app,
    '--wms-surface-sider': token.surface.sider,
    '--wms-surface-header': token.surface.header,
    '--wms-surface-panel': token.surface.panel,
    '--wms-surface-muted': token.surface.panelMuted,
    '--wms-surface-elevated': token.surface.elevated,
    '--wms-surface-table-header': token.surface.tableHeader,
    '--wms-surface-hover': token.surface.hover,
    '--wms-border-subtle': token.border.subtle,
    '--wms-border': token.border.default,
    '--wms-border-strong': token.border.strong,
    '--wms-text-primary': token.text.primary,
    '--wms-text-secondary': token.text.secondary,
    '--wms-text-muted': token.text.muted,
    '--wms-text-inverse': token.text.inverse,
    '--wms-brand': token.brand.primary,
    '--wms-brand-hover': token.brand.hover,
    '--wms-brand-pressed': token.brand.pressed,
    '--wms-brand-subtle': token.brand.subtle,
    '--wms-status-draft': token.status.draft,
    '--wms-status-pending': token.status.pending,
    '--wms-status-progress': token.status.progress,
    '--wms-status-success': token.status.success,
    '--wms-status-error': token.status.error,
    '--wms-status-cancelled': token.status.cancelled,
    '--wms-status-draft-bg': token.statusSurface.draft,
    '--wms-status-pending-bg': token.statusSurface.pending,
    '--wms-status-progress-bg': token.statusSurface.progress,
    '--wms-status-success-bg': token.statusSurface.success,
    '--wms-status-error-bg': token.statusSurface.error,
    '--wms-status-cancelled-bg': token.statusSurface.cancelled,
    '--wms-op-inbound': token.operation.inbound,
    '--wms-op-outbound': token.operation.outbound,
    '--wms-op-internal': token.operation.internal,
    '--wms-op-inventory': token.operation.inventory,
    '--wms-op-system': token.operation.system,
    '--wms-shadow-panel': token.shadow.panel,
    '--wms-shadow-elevated': token.shadow.elevated,
  }
}
