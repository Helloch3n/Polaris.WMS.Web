import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

// Vite configuration
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
  ],
  base: '/pda/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://localhost:44327', // 后端 API 地址
        changeOrigin: true,
        secure: false
      }
    }
  }
})