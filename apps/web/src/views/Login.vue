<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCheckbox, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import PolarisLogo from '../components/PolarisLogo.vue'
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
    <div class="login-brand-panel text-white">
      <div
        aria-hidden="true"
        class="brand-halo brand-halo-primary"
      />

      <div
        aria-hidden="true"
        class="brand-halo brand-halo-secondary"
      />

      <div class="brand-content">
        <PolarisLogo class="brand-logo-icon" />
        <h1 class="brand-name">极星仓储</h1>
      </div>
    </div>

    <!-- 右侧登录区 -->
    <div class="login-form-panel">
      <div class="login-card">
        <div class="login-card-header">
          <h2 class="login-title text-2xl font-extrabold">欢迎登录</h2>
        </div>

        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" autocomplete="off" class="space-y-1">
          <n-form-item label="账号" path="username">
            <div class="login-field-shell">
              <n-input
                :value="form.username"
                size="large"
                class="login-input"
                placeholder="请输入账号"
                :input-props="{ autocomplete: 'off' }"
                @update:value="(value) => (form.username = value)"
              />
            </div>
          </n-form-item>

          <n-form-item label="密码" path="password">
            <div class="login-field-shell">
              <n-input
                :value="form.password"
                size="large"
                class="login-input"
                placeholder="请输入密码"
                type="password"
                :input-props="{ autocomplete: 'new-password' }"
                show-password-on="click"
                @update:value="(value) => (form.password = value)"
                @keyup.enter="onLogin"
              />
            </div>
          </n-form-item>

          <n-form-item class="remember-item">
            <n-checkbox :checked="rememberPassword" @update:checked="(value) => { rememberPassword = value }">记住密码</n-checkbox>
          </n-form-item>

          <n-button type="primary" class="login-btn" :loading="loading" @click="onLogin">
            登 录
          </n-button>
        </n-form>

        <div class="login-footer">© {{ new Date().getFullYear() }} 极星仓储</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-shell {
  --login-page-bg: #f5f7fb;
  --login-form-bg-start: #f8fafc;
  --login-form-bg-end: #ffffff;
  --login-card-bg: rgba(255, 255, 255, 0.92);
  --login-card-border: rgba(148, 163, 184, 0.14);
  --login-card-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  --login-field-bg: #f8fafc;
  --login-field-focus-bg: #ffffff;
  --login-field-border: #e2e8f0;
  --login-title: #0f172a;
  --login-footer: #cbd5e1;
  --login-brand-start: #0f2f78;
  --login-brand-middle: #1550c9;
  --login-brand-end: #3b82f6;
  min-height: 100vh;
  display: flex;
  overflow: hidden;
  background: var(--login-page-bg);
}

:global(:root[data-theme='dark'] .login-shell) {
  --login-page-bg: #000000;
  --login-form-bg-start: #050505;
  --login-form-bg-end: #0b0b0b;
  --login-card-bg: rgba(13, 13, 13, 0.94);
  --login-card-border: rgba(255, 255, 255, 0.1);
  --login-card-shadow: 0 28px 72px rgba(0, 0, 0, 0.42);
  --login-field-bg: #111111;
  --login-field-focus-bg: #171717;
  --login-field-border: #303030;
  --login-title: #f5f5f5;
  --login-footer: #666666;
  --login-brand-start: #030303;
  --login-brand-middle: #090909;
  --login-brand-end: #111111;
}

.login-brand-panel {
  flex: 0 0 50%;
  min-width: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background:
    radial-gradient(circle at 44% 34%, rgba(255, 255, 255, 0.16), transparent 0 24%),
    linear-gradient(145deg, var(--login-brand-start) 0%, var(--login-brand-middle) 48%, var(--login-brand-end) 100%);
}

.brand-halo {
  position: absolute;
  border-radius: 9999px;
  filter: blur(60px);
  pointer-events: none;
}

.brand-halo-primary {
  width: 320px;
  height: 320px;
  top: 8%;
  left: 18%;
  background: rgba(255, 255, 255, 0.08);
}

.brand-halo-secondary {
  width: 260px;
  height: 260px;
  right: 10%;
  bottom: 12%;
  background: rgba(56, 189, 248, 0.16);
}

.brand-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.brand-logo-icon {
  width: 136px;
  height: 102px;
  color: #ffffff;
  filter: drop-shadow(0 18px 44px rgba(15, 23, 42, 0.2));
}

.brand-name {
  margin: 20px 0 0;
  font-size: 3rem;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #ffffff;
}

/* ===== 右侧登录面板 ===== */
.login-form-panel {
  flex: 0 0 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: linear-gradient(180deg, var(--login-form-bg-start) 0%, var(--login-form-bg-end) 100%);
}

.login-card {
  width: 440px;
  max-width: 100%;
  padding: 40px 36px 28px;
  border-radius: 28px;
  background: var(--login-card-bg);
  box-shadow: var(--login-card-shadow);
  border: 1px solid var(--login-card-border);
  backdrop-filter: blur(14px);
}

.login-card-header {
  margin-bottom: 26px;
}

.login-title {
  color: var(--login-title);
}

.remember-item {
  margin-top: 2px;
}

.login-field-shell {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: var(--login-field-bg);
  transition: background-color 0.2s ease;
}

.login-field-shell::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--login-field-border);
  border-radius: inherit;
  pointer-events: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-field-shell:focus-within {
  background: var(--login-field-focus-bg);
}

.login-field-shell:focus-within::after {
  border-color: #93c5fd;
  box-shadow: 0 0 0 1px rgba(147, 197, 253, 0.3);
}

.login-btn {
  width: 100%;
  height: 48px !important;
  border-radius: 16px !important;
  padding: 0 18px !important;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.16);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  --n-height: 48px;
  --n-padding: 0 18px;
  --n-border-radius: 16px;
  --n-font-size: 15px;
  --n-border: none;
  --n-border-hover: none;
  --n-border-pressed: none;
  --n-border-focus: none;
  --n-border-disabled: none;
}

.login-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.22);
}

:deep(.n-form-item-label__asterisk) {
  display: none !important;
}

:deep(.login-field-shell .n-input) {
  width: 100%;
}

:deep(.login-input .n-input-wrapper) {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  display: flex;
  align-items: center;
  min-height: 52px;
  padding-left: 14px;
  padding-right: 14px;
}

:deep(.login-input .n-input__input) {
  height: 52px;
  display: flex;
  align-items: center;
}

:deep(.login-input .n-input__input-el) {
  height: auto !important;
  line-height: 1.5 !important;
}

:deep(.login-input .n-input__border),
:deep(.login-input .n-input__state-border) {
  display: none !important;
}

:deep(.login-input .n-input__input-el),
:deep(.login-input .n-input__placeholder) {
  font-size: 15px;
}

:deep(.login-btn .n-button__content) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.3em;
  font-weight: 600;
}

:deep(.login-btn .n-button__border),
:deep(.login-btn .n-button__state-border) {
  display: none !important;
}

.login-footer {
  margin-top: 26px;
  text-align: center;
  color: var(--login-footer);
  font-size: 12px;
}

@media (max-width: 1200px) {
  .login-brand-panel {
    flex-basis: 50%;
    padding: 32px;
  }

  .login-form-panel {
    flex-basis: 50%;
    padding: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-input.n-input--focus .n-input-wrapper {
    animation: none !important;
  }
}

@media (max-width: 980px) {
  .login-shell {
    flex-direction: column;
  }

  .login-brand-panel,
  .login-form-panel {
    flex: none;
    width: 100%;
  }

  .login-brand-panel {
    min-height: 42vh;
    padding: 40px 24px;
  }

  .login-form-panel {
    padding: 24px;
  }

  .brand-logo-icon {
    width: 120px;
    height: 90px;
  }

  .brand-name {
    margin-top: 18px;
    font-size: 2.25rem;
  }

}

@media (max-width: 640px) {
  .login-card {
    width: 100%;
    border-radius: 22px;
    padding: 28px 20px 20px;
  }
}
</style>
