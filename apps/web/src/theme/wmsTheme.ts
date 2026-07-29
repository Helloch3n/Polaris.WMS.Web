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
      app: '#f8fafc',
      sider: '#f8fafc',
      header: '#f8fafc',
      panel: '#f8fafc',
      panelMuted: '#f8fafc',
      elevated: '#ffffff',
      tableHeader: '#f8fafc',
      hover: 'rgba(15, 23, 42, 0.055)',
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
      progress: '#0369a1',
      success: '#047857',
      error: '#c2410c',
      cancelled: '#64748b',
    },
    statusSurface: {
      draft: '#f1f5f9',
      pending: '#fff7ed',
      progress: '#e0f2fe',
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
      app: '#050505',
      sider: '#050505',
      header: '#050505',
      panel: '#050505',
      panelMuted: '#050505',
      elevated: '#171717',
      tableHeader: '#050505',
      hover: 'rgba(255, 255, 255, 0.06)',
    },
    border: {
      subtle: '#202020',
      default: '#303030',
      strong: '#4a4a4a',
    },
    text: {
      primary: '#f5f5f5',
      secondary: '#c7c7c7',
      muted: '#8c8c8c',
      inverse: '#050505',
    },
    brand: {
      primary: '#2f8f7a',
      hover: '#3ca58d',
      pressed: '#236b5a',
      subtle: 'rgba(47, 143, 122, 0.18)',
    },
    status: {
      draft: '#b0b0b0',
      pending: '#f8b85c',
      progress: '#8bb8ff',
      success: '#86efac',
      error: '#fb9273',
      cancelled: '#a3a3a3',
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
      system: '#d4d4d4',
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
      itemTextColorHover: token.text.primary,
      itemTextColorPressed: token.text.primary,
      itemTextColorActive: token.text.primary,
      itemColor: 'transparent',
      itemColorHover: token.surface.hover,
      itemColorPressed: token.surface.hover,
      itemColorActive: token.surface.hover,
      itemBorder: `1px solid ${token.border.subtle}`,
      itemBorderHover: `1px solid ${token.border.default}`,
      itemBorderPressed: `1px solid ${token.border.strong}`,
      itemBorderActive: '1px solid transparent',
      buttonColor: token.surface.elevated,
      buttonColorHover: token.surface.hover,
      buttonIconColor: token.text.muted,
      buttonIconColorHover: token.text.primary,
      buttonIconColorPressed: token.text.primary,
    },
    Menu: {
      borderRadius: '6px',
      itemHeight: '32px',
      itemBorderRadius: '6px',
      itemTextColor: token.text.secondary,
      itemTextColorHover: token.text.primary,
      itemTextColorActive: token.text.primary,
      itemTextColorActiveHover: token.text.primary,
      itemTextColorChildActive: token.text.primary,
      itemTextColorChildActiveHover: token.text.primary,
      itemIconColor: token.text.muted,
      itemIconColorHover: token.text.primary,
      itemIconColorActive: token.text.primary,
      itemIconColorActiveHover: token.text.primary,
      itemColorHover: token.surface.hover,
      itemColorActive: token.surface.hover,
      itemColorActiveHover: token.surface.hover,
      arrowColor: token.text.muted,
      arrowColorHover: token.text.secondary,
      arrowColorActive: token.text.primary,
      groupTextColor: token.text.muted,
    },
  }
}

/** Stable objects avoid rebuilding all Naive UI theme variables on every switch. */
export const wmsThemeOverrides: Record<WmsThemeMode, GlobalThemeOverrides> = {
  light: createWmsThemeOverrides('light'),
  dark: createWmsThemeOverrides('dark'),
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
