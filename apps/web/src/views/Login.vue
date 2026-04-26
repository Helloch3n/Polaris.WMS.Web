<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCheckbox, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const rememberPassword = ref(false)

const REMEMBER_FLAG_KEY = 'web_login_remember_flag'
const REMEMBER_USERNAME_KEY = 'web_login_remember_username'
const REMEMBER_PASSWORD_KEY = 'web_login_remember_password'

const form = reactive({ username: '', password: '' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: ['input', 'blur'] }],
  password: [{ required: true, message: '请输入密码', trigger: ['input', 'blur'] }],
}

async function onLogin() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await authStore.login(form.username, form.password)

    if (rememberPassword.value) {
      localStorage.setItem(REMEMBER_FLAG_KEY, '1')
      localStorage.setItem(REMEMBER_USERNAME_KEY, form.username)
      localStorage.setItem(REMEMBER_PASSWORD_KEY, form.password)
    } else {
      localStorage.removeItem(REMEMBER_FLAG_KEY)
      localStorage.removeItem(REMEMBER_USERNAME_KEY)
      localStorage.removeItem(REMEMBER_PASSWORD_KEY)
    }

    await router.push('/')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '登录失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const rememberFlag = localStorage.getItem(REMEMBER_FLAG_KEY) === '1'
  const savedUsername = localStorage.getItem(REMEMBER_USERNAME_KEY) ?? ''
  const savedPassword = localStorage.getItem(REMEMBER_PASSWORD_KEY) ?? ''

  if (rememberFlag && savedUsername && savedPassword) {
    form.username = savedUsername
    form.password = savedPassword
    rememberPassword.value = true
    return
  }

  rememberPassword.value = false
  await nextTick()
  form.username = ''
  form.password = ''
})
</script>

<template>
  <div class="login-shell">
    <!-- 左侧品牌区 -->
    <div class="login-brand-panel">
      <div class="brand-bg-layer" aria-hidden="true">
        <span class="bg-grid" />
        <span class="bg-glow glow-a" />
        <span class="bg-glow glow-b" />
        <span class="polar-star" />
      </div>

      <div class="brand-content">
        <svg class="brand-logo-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M24 7.5C24.8 19.5,30 22.5,36.8 24C30 25.5,24.8 30,24 40.5C23.2 30,18 25.5,11.2 24C18 22.5,23.2 19.5,24 7.5Z" fill="white" fill-opacity="0.95" />
        </svg>
        <h1 class="brand-name">极星仓储</h1>
        <p class="brand-slogan">简洁 · 稳定 · 高效</p>
      </div>
    </div>

    <!-- 右侧登录区 -->
    <div class="login-form-panel">
      <div class="login-card">
        <div class="login-card-header">
          <h2 class="title">欢迎登录</h2>
          <p class="subtitle">极星仓储管理系统</p>
        </div>

        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" autocomplete="off">
          <n-form-item label="账号" path="username">
            <n-input
              :value="form.username"
              placeholder="请输入账号"
              :input-props="{ autocomplete: 'off' }"
              @update:value="(value) => (form.username = value)"
            />
          </n-form-item>

          <n-form-item label="密码" path="password">
            <n-input
              :value="form.password"
              placeholder="请输入密码"
              type="password"
              :input-props="{ autocomplete: 'new-password' }"
              show-password-on="click"
              @update:value="(value) => (form.password = value)"
              @keyup.enter="onLogin"
            />
          </n-form-item>

          <n-form-item class="remember-item">
            <n-checkbox :checked="rememberPassword" @update:checked="(value) => { rememberPassword = value }">记住密码</n-checkbox>
          </n-form-item>

          <n-button type="primary" class="login-btn" :loading="loading" @click="onLogin">
            登 录
          </n-button>
        </n-form>

        <div class="login-footer">© {{ new Date().getFullYear() }} 极星仓储 · 仅限内部使用</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: flex;
  overflow: hidden;
  background: #f5f7fb;
}

/* ===== 左侧品牌面板 ===== */
.login-brand-panel {
  flex: 0 0 50%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(155deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.brand-bg-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-grid {
  position: absolute;
  inset: 0;
  opacity: 0.08;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px);
  background-size: 48px 48px;
}

.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
}

.glow-a {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -80px;
  background: rgba(96, 165, 250, 0.25);
}

.glow-b {
  width: 300px;
  height: 300px;
  bottom: -60px;
  left: -40px;
  background: rgba(147, 197, 253, 0.2);
}

.polar-star {
  position: absolute;
  top: 15%;
  right: 20%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.6);
  animation: starTwinkle 3s ease-in-out infinite;
}

.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.brand-logo-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 28px;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
  animation: logoBreath 5s ease-in-out infinite;
}

.brand-name {
  margin: 0;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 4px;
  line-height: 1.3;
}

.brand-slogan {
  margin: 12px 0 0;
  font-size: 15px;
  letter-spacing: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 400;
}

/* ===== 右侧登录面板 ===== */
.login-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #ffffff;
}

.login-card {
  width: 380px;
  max-width: 100%;
}

.login-card-header {
  margin-bottom: 28px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.subtitle {
  margin: 6px 0 0;
  font-size: 14px;
  color: #94a3b8;
}

.remember-item {
  margin-top: 2px;
}

.login-btn {
  width: 100%;
  height: 42px;
  border-radius: 10px;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 4px;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
  color: #cbd5e1;
  font-size: 12px;
}

@keyframes starTwinkle {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

@keyframes logoBreath {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

@media (max-width: 1200px) {
  .login-brand-panel {
    flex-basis: 52%;
  }

  .login-seam {
    left: calc(52% - 40px);
  }

  .brand-title {
    font-size: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-brand-panel::before,
  .login-brand-panel::after,
  .data-grid,
  .data-node,
  .polar-halo,
  .orbit-ring,
  .orbit-dot,
  .star-line,
  .login-input.n-input--focus .n-input-wrapper {
    animation: none !important;
  }
}

@media (max-width: 980px) {
  .login-shell {
    flex-direction: column;
  }

  .login-seam {
    display: none;
  }

  .login-brand-panel,
  .login-form-panel {
    flex: none;
    width: 100%;
  }

  .login-brand-panel {
    padding: 40px 24px;
  }

  .login-form-panel {
    padding: 24px;
  }

  .login-panel-meta {
    margin-bottom: 8px;
  }
}

@media (max-width: 640px) {
  .brand-content {
    width: 100%;
  }

  .brand-title {
    font-size: 24px;
  }

  .login-card {
    border-radius: 16px;
    padding: 24px 20px 18px;
  }

  .login-panel-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
