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
          <svg class="brand-warehouse" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="polaris-gem-bg" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#1D4ED8" />
                <stop offset="0.55" stop-color="#5B6CFF" />
                <stop offset="1" stop-color="#8B5CF6" />
              </linearGradient>
              <linearGradient id="polaris-gem-star" x1="7" y1="6" x2="17" y2="18" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#F8FAFF" />
                <stop offset="1" stop-color="#DDE7FF" />
              </linearGradient>
              <linearGradient id="polaris-gem-trail" x1="16" y1="2" x2="7" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#ffffff" stop-opacity="0.9" />
                <stop offset="1" stop-color="#c7d2fe" stop-opacity="0" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="24" height="24" rx="6.8" fill="url(#polaris-gem-bg)" />
            <path d="M12 4.9L13.9 10.1L19.1 12L13.9 13.9L12 19.1L10.1 13.9L4.9 12L10.1 10.1L12 4.9Z" fill="url(#polaris-gem-star)" />
            <path class="warehouse-scan" d="M8.4 12H15.6" stroke="#EEF2FF" stroke-width="1" stroke-linecap="round" />
            <circle class="warehouse-beacon" cx="16.7" cy="7.5" r="1" fill="#EAF0FF" />
            <circle class="warehouse-beacon-ring" cx="16.7" cy="7.5" r="1" stroke="#C7D2FE" stroke-width="0.85" fill="none" />
            <g class="star-fall-group">
              <path class="star-trail" d="M16.8 4.4L12.8 8.8" stroke="url(#polaris-gem-trail)" stroke-width="1" stroke-linecap="round" />
              <circle class="star-fall" cx="16.8" cy="4.4" r="0.85" fill="#ffffff" />
            </g>
          </svg>
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
  background: #3b82f6;
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
  background: #3b82f6;
}

.remember-dot-inactive {
  border: 1px solid #475569;
}

.remember-text {
  font-size: 15px;
  line-height: 1;
}

.logo-icon {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 28%;
  background: linear-gradient(145deg, rgba(129, 140, 248, 0.2), rgba(99, 102, 241, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  isolation: isolate;
}

.logo-icon::before,
.logo-icon::after {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 26%;
  border: 1px solid rgba(129, 140, 248, 0.4);
  transform: scale(0.84);
  opacity: 0;
  pointer-events: none;
  z-index: 0;
}

.logo-icon::before {
  animation: logo-ripple 3s ease-out infinite;
}

.logo-icon::after {
  animation: logo-ripple 3s ease-out 1.5s infinite;
}

.brand-warehouse {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.28));
  transform-origin: center;
  animation: warehouse-float 4.2s ease-in-out infinite;
  width: 100%;
  height: 100%;
}

.warehouse-scan {
  animation: warehouse-scan-move 2.4s ease-in-out infinite;
}

.warehouse-beacon {
  animation: warehouse-beacon-pulse 2.2s ease-in-out infinite;
}

.warehouse-beacon-ring {
  animation: warehouse-ring-pulse 2.2s ease-out infinite;
}

.star-fall-group {
  transform-origin: center;
}

.star-fall {
  animation: star-fall-drop 2.8s ease-in-out infinite;
}

.star-trail {
  animation: star-fall-trail 2.8s ease-in-out infinite;
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
  background: linear-gradient(90deg, #2563eb, #256cf3);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.4);
}

:deep(.login-submit.van-button .van-button__text) {
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 8px;
}

:deep(.login-submit.van-button:active) {
  background: linear-gradient(90deg, #1d4ed8, #1f5fe3);
}

/* checkbox styles removed — using text-only remember control */

@keyframes logo-ripple {
  0% {
    transform: scale(0.82);
    opacity: 0;
  }

  20% {
    opacity: 0.52;
  }

  72% {
    opacity: 0.12;
  }

  100% {
    transform: scale(1.38);
    opacity: 0;
  }
}

@keyframes warehouse-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-1px);
  }
}

@keyframes warehouse-scan-move {
  0%,
  20% {
    opacity: 0;
    transform: translateY(-0.5px);
  }

  50% {
    opacity: 0.92;
    transform: translateY(5px);
  }

  100% {
    opacity: 0;
    transform: translateY(9px);
  }
}

@keyframes warehouse-beacon-pulse {
  0%,
  100% {
    opacity: 0.72;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}

@keyframes warehouse-ring-pulse {
  0% {
    opacity: 0.6;
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(1.85);
  }
}

@keyframes star-fall-drop {
  0% {
    transform: translate(0, 0) scale(0.7);
    opacity: 0;
  }

  15% {
    opacity: 1;
  }

  55% {
    transform: translate(-3.7px, 4px) scale(1.05);
    opacity: 0.95;
  }

  100% {
    transform: translate(-5px, 5.8px) scale(0.72);
    opacity: 0;
  }
}

@keyframes star-fall-trail {
  0% {
    opacity: 0;
  }

  18% {
    opacity: 0.62;
  }

  55% {
    opacity: 0.25;
  }

  100% {
    opacity: 0;
  }
}

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