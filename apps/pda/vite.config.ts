import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Vite configuration
export default defineConfig({
  plugins: [vue()],
  //base: '/pda/',
  base: './',
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