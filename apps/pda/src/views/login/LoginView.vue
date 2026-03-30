<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { showToast } from 'vant'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('admin')
const password = ref('123456')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    showToast('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const success = await authStore.login(username.value, password.value)
    if (success) {
      showToast({ type: 'success', message: '登录成功' })
      const redirect = (route.query.redirect as string) || '/'
      router.replace(redirect)
    } else {
      showToast({ type: 'fail', message: '账号或密码错误' })
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 flex flex-col justify-center px-6 relative overflow-hidden">
    <div class="absolute -top-20 -right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
    <div class="absolute top-40 -left-20 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

    <div class="relative z-10 w-full max-w-sm mx-auto">
      <div class="text-center mb-10">
        <div class="w-20 h-20 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/50 mb-4">
          <van-icon name="cluster" size="48" color="white" />
        </div>
        <h1 class="text-3xl font-extrabold text-white tracking-wider">Polaris WMS</h1>
        <p class="text-slate-400 mt-2 tracking-widest text-sm">INDUSTRIAL PDA TERMINAL</p>
      </div>

      <div class="space-y-5">
        <div class="bg-slate-800 rounded-2xl p-2 border border-slate-700 shadow-inner">
          <van-field
            v-model="username"
            clearable
            left-icon="user-o"
            placeholder="员工工号 / Username"
            class="!bg-transparent !text-white custom-login-field"
          />
        </div>
        
        <div class="bg-slate-800 rounded-2xl p-2 border border-slate-700 shadow-inner">
          <van-field
            v-model="password"
            type="password"
            clearable
            left-icon="lock"
            placeholder="登录密码 / Password"
            class="!bg-transparent !text-white custom-login-field"
          />
        </div>

        <van-button
          block
          round
          :loading="loading"
          class="!bg-blue-600 !border-none !text-white font-bold text-lg !h-14 mt-8 shadow-lg shadow-blue-600/40 active:!bg-blue-700"
          @click="handleLogin"
        >
          登 录 系 统
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.custom-login-field .van-field__control) {
  color: white !important;
  font-size: 16px;
}
:deep(.custom-login-field .van-field__control::placeholder) {
  color: #64748b;
}
:deep(.custom-login-field .van-icon) {
  color: #94a3b8 !important;
  font-size: 20px;
}
</style>