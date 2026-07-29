/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-app': 'var(--wms-surface-app)',
        'surface-sider': 'var(--wms-surface-sider)',
        'surface-header': 'var(--wms-surface-header)',
        'surface-panel': 'var(--wms-surface-panel)',
        'surface-muted': 'var(--wms-surface-muted)',
        'surface-elevated': 'var(--wms-surface-elevated)',
        'border-subtle': 'var(--wms-border-subtle)',
        'border-default': 'var(--wms-border)',
        'border-strong': 'var(--wms-border-strong)',
        'text-primary': 'var(--wms-text-primary)',
        'text-secondary': 'var(--wms-text-secondary)',
        'text-muted': 'var(--wms-text-muted)',
        brand: 'var(--wms-brand)',
      },
    },
  },
  plugins: [],
}
