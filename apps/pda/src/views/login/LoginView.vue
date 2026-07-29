<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { showToast } from 'vant'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('admin')
const password = ref('123456')
const loading = ref(false)
const rememberPassword = ref(false)
const showPassword = ref(false)

const REMEMBER_KEY = 'pda_login_remember_password'
const CREDENTIAL_KEY = 'pda_login_credentials'

onMounted(() => {
  rememberPassword.value = localStorage.getItem(REMEMBER_KEY) === '1'
  if (!rememberPassword.value) return
  const saved = localStorage.getItem(CREDENTIAL_KEY)
  if (!saved) return

  try {
    const parsed = JSON.parse(saved) as { username?: unknown; password?: unknown }
    if (typeof parsed.username === 'string') {
      username.value = parsed.username
    }
    if (typeof parsed.password === 'string') {
      password.value = parsed.password
    }
  } catch {
    localStorage.removeItem(CREDENTIAL_KEY)
  }
})

function handleRememberChange(value: boolean) {
  rememberPassword.value = value
  localStorage.setItem(REMEMBER_KEY, value ? '1' : '0')
  if (!value) {
    localStorage.removeItem(CREDENTIAL_KEY)
  }
}

function handleRememberToggle() {
  handleRememberChange(!rememberPassword.value)
}

function togglePasswordVisible() {
  showPassword.value = !showPassword.value
}

function persistCredentialIfNeeded() {
  localStorage.setItem(REMEMBER_KEY, rememberPassword.value ? '1' : '0')
  if (!rememberPassword.value) {
    localStorage.removeItem(CREDENTIAL_KEY)
    return
  }

  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify({
    username: username.value,
    password: password.value,
  }))
}

async function handleLogin() {
  if (!username.value || !password.value) {
    showToast('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const success = await authStore.login(username.value, password.value)
    if (success) {
      persistCredentialIfNeeded()
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
  <div class="login-page">
    <div class="login-glow login-glow-blue"></div>
    <div class="login-glow login-glow-emerald"></div>

    <div class="login-panel">
      <div class="login-header">
        <div class="logo-icon" aria-hidden="true">
          <span class="brand-logo-mark" />
        </div>
        <h1 class="login-title">Polaris WMS</h1>
        <p class="login-subtitle">INDUSTRIAL PDA TERMINAL</p>
      </div>

      <div class="login-form">
        <div class="input-shell">
          <van-field
            v-model="username"
            clearable
            left-icon="user-o"
            placeholder="员工工号 / Username"
            class="custom-login-field"
          />
        </div>

        <div class="input-shell">
          <van-field
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            clearable
            left-icon="lock"
            :right-icon="showPassword ? 'eye-o' : 'closed-eye'"
            placeholder="登录密码 / Password"
            class="custom-login-field"
            @click-right-icon="togglePasswordVisible"
          />
        </div>

        <div class="remember-row">
          <button
            type="button"
            class="remember-toggle"
            @click="handleRememberToggle"
            :aria-pressed="rememberPassword"
          >
            <span v-if="rememberPassword" class="remember-dot remember-dot-active" />
            <span v-else class="remember-dot remember-dot-inactive" />
            <span class="remember-text">记住密码</span>
          </button>
        </div>

        <van-button
          block
          round
          :loading="loading"
          class="login-submit"
          @click="handleLogin"
        >
          登 录 系 统
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  padding: 24px;
  background: radial-gradient(circle at 52% -18%, #15306f 0%, #0a1c4b 38%, #07153b 100%);
}

.login-glow {
  position: absolute;
  width: 288px;
  height: 288px;
  border-radius: 9999px;
  filter: blur(56px);
  opacity: 0.2;
  pointer-events: none;
}

.login-glow-blue {
  top: -84px;
  right: -84px;
  background: var(--color-primary-hover);
}

.login-glow-emerald {
  top: 180px;
  left: -84px;
  background: #10b981;
}

.login-panel {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-title {
  margin: 0;
  color: #ffffff;
  font-size: 44px;
  font-weight: 800;
  letter-spacing: 1.4px;
}

.login-subtitle {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 15px;
  letter-spacing: 2.8px;
}

.login-form {
  display: grid;
  gap: 18px;
}

.input-shell {
  background: rgba(30, 41, 59, 0.82);
  border: 1px solid rgba(71, 85, 105, 0.55);
  border-radius: 16px;
  padding: 8px 10px;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.4);
}

.remember-row {
  display: flex;
  align-items: center;
}

.remember-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: #cbd5e1;
  padding: 2px 0;
}

.remember-dot {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  display: inline-block;
}

.remember-dot-active {
  background: var(--color-primary);
}

.remember-dot-inactive {
  border: 1px solid #475569;
}

.remember-text {
  font-size: 15px;
  line-height: 1;
}

.logo-icon {
  width: 96px;
  height: 72px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-logo-mark {
  width: 100%;
  height: 100%;
  display: block;
  background: #f8fafc;
  filter: drop-shadow(0 12px 28px rgba(15, 23, 42, 0.28));
  -webkit-mask: url('/polaris-favicon.svg') center / contain no-repeat;
  mask: url('/polaris-favicon.svg') center / contain no-repeat;
}

:deep(.custom-login-field .van-field__control) {
  color: white !important;
  font-size: 16px;
}

:deep(.custom-login-field) {
  --van-cell-background: transparent;
  padding: 0;
}

:deep(.custom-login-field .van-field__left-icon),
:deep(.custom-login-field .van-field__right-icon) {
  color: #94a3b8 !important;
}

:deep(.custom-login-field .van-field__control::placeholder) {
  color: #64748b;
}
:deep(.custom-login-field .van-icon) {
  color: #94a3b8 !important;
  font-size: 20px;
}

:deep(.login-submit.van-button) {
  height: 56px;
  margin-top: 12px;
  border: none;
  border-radius: 9999px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.36);
}

:deep(.login-submit.van-button .van-button__text) {
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 8px;
}

:deep(.login-submit.van-button:active) {
  background: linear-gradient(90deg, var(--color-primary-pressed), var(--color-primary));
}

/* checkbox styles removed — using text-only remember control */

@media (max-width: 360px) {
  .login-page {
    padding: 16px;
  }

  .login-title {
    font-size: 38px;
  }

  .login-subtitle {
    letter-spacing: 2px;
  }

  :deep(.login-submit.van-button .van-button__text) {
    font-size: 24px;
    letter-spacing: 6px;
  }
}
</style>
