<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCheckbox, NForm, NFormItem, NIcon, NInput, useMessage } from 'naive-ui'
import { HelpCircleOutline, LockClosedOutline, PersonOutline } from '@vicons/ionicons5'
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
    <div class="login-brand-panel">
      <div class="brand-motion-layer" aria-hidden="true">
        <span class="data-grid grid-a" />
        <span class="data-grid grid-b" />
        <span class="geo-outline outline-a" />
        <span class="geo-outline outline-b" />
        <span class="data-node node-a" />
        <span class="data-node node-b" />
        <span class="data-node node-c" />
        <span class="polar-halo halo-a" />
        <span class="polar-halo halo-b" />
        <span class="orbit-ring" />
        <span class="orbit-dot dot-a" />
        <span class="orbit-dot dot-b" />
        <span class="star-line line-a" />
        <span class="star-line line-b" />
      </div>

      <div class="brand-content">
        <div class="brand-header">
          <img class="brand-logo" src="/polaris-favicon.svg" alt="Polaris" />
          <div>
            <div class="brand-name">Polaris WMS</div>
            <div class="brand-tagline">Internal Operations Platform</div>
          </div>
        </div>
        <p class="brand-subline">WAREHOUSE EXECUTION SYSTEM</p>
        <h1 class="brand-title">Simple · Stable · Efficient</h1>
      </div>
    </div>

    <div class="login-seam" aria-hidden="true" />

    <div class="login-form-panel">
      <div class="login-panel-stack">
        <div class="login-panel-meta">
          <div class="meta-left">
            <button class="meta-btn active" type="button">CN</button>
            <span class="meta-split">/</span>
            <button class="meta-btn" type="button">EN</button>
          </div>
          <div class="meta-right">
            <button class="meta-btn" type="button">
              <n-icon size="13" aria-hidden="true">
                <HelpCircleOutline />
              </n-icon>
              帮助中心
            </button>
            <span class="meta-version">v2.6.0</span>
          </div>
        </div>

        <div class="login-card">
          <div class="login-card-header">
            <img class="login-logo" src="/polaris-favicon.svg" alt="Polaris" />
            <h2 class="title">账号登录</h2>
          </div>

          <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" autocomplete="off">
            <n-form-item label="账号" path="username">
              <n-input
                class="login-input"
                :value="form.username"
                placeholder="请输入账号"
                :input-props="{ autocomplete: 'off' }"
                @update:value="(value) => (form.username = value)"
              >
                <template #prefix>
                  <n-icon size="16" class="login-input-icon" aria-hidden="true">
                    <PersonOutline />
                  </n-icon>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item label="密码" path="password">
              <n-input
                class="login-input"
                :value="form.password"
                placeholder="请输入密码"
                type="password"
                :input-props="{ autocomplete: 'new-password' }"
                show-password-on="click"
                @update:value="(value) => (form.password = value)"
                @keyup.enter="onLogin"
              >
                <template #prefix>
                  <n-icon size="16" class="login-input-icon" aria-hidden="true">
                    <LockClosedOutline />
                  </n-icon>
                </template>
              </n-input>
            </n-form-item>

            <n-form-item class="remember-item">
              <n-checkbox :checked="rememberPassword" @update:checked="(value) => { rememberPassword = value }">记住密码</n-checkbox>
            </n-form-item>

            <n-button type="primary" class="login-btn" :loading="loading" @click="onLogin">
              登录
            </n-button>
          </n-form>

          <div class="login-footer">© {{ new Date().getFullYear() }} Polaris WMS · Internal Use Only</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-shell {
  min-height: 100vh;
  position: relative;
  display: flex;
  overflow: hidden;
  background:
    radial-gradient(1200px 520px at -10% -20%, rgba(99, 102, 241, 0.14), transparent 60%),
    radial-gradient(1100px 520px at 110% 0%, rgba(56, 189, 248, 0.1), transparent 60%),
    #f5f7fb;
}

.login-brand-panel {
  flex: 0 0 58%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(145deg, #1e3a8a 0%, #2563eb 54%, #4f46e5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #eef4ff;
}

.login-seam {
  position: absolute;
  top: -10%;
  bottom: -10%;
  left: calc(58% - 44px);
  width: 120px;
  pointer-events: none;
  background:
    linear-gradient(140deg, rgba(37, 99, 235, 0.24) 0%, rgba(37, 99, 235, 0.08) 42%, rgba(255, 255, 255, 0) 100%);
  transform: skewX(-10deg);
  filter: blur(0.5px);
  z-index: 2;
}

.brand-motion-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.data-grid {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(238, 244, 255, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(238, 244, 255, 0.12) 1px, transparent 1px);
  background-size: 40px 40px;
}

.grid-a {
  transform: perspective(540px) rotateX(56deg) translateY(24%);
  transform-origin: center bottom;
  animation: gridDriftA 18s linear infinite;
}

.grid-b {
  opacity: 0.16;
  background-size: 64px 64px;
  transform: perspective(540px) rotateX(56deg) translateY(30%);
  animation: gridDriftB 24s linear infinite;
}

.geo-outline {
  position: absolute;
  border: 1px solid rgba(238, 244, 255, 0.18);
  border-radius: 16px;
  opacity: 0.36;
}

.outline-a {
  width: 220px;
  height: 120px;
  left: 14%;
  top: 22%;
  transform: rotate(-8deg);
}

.outline-b {
  width: 200px;
  height: 110px;
  right: 12%;
  bottom: 20%;
  transform: rotate(10deg);
}

.data-node {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0 0 6px rgba(191, 219, 254, 0.16), 0 0 14px rgba(255, 255, 255, 0.6);
  animation: nodePulse 4s ease-in-out infinite;
}

.node-a {
  top: 28%;
  left: 30%;
}

.node-b {
  top: 58%;
  right: 24%;
  animation-delay: 1.2s;
}

.node-c {
  bottom: 24%;
  left: 42%;
  animation-delay: 2.1s;
}

.login-brand-panel::before,
.login-brand-panel::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.login-brand-panel::before {
  width: 420px;
  height: 420px;
  right: -160px;
  top: -160px;
  background: rgba(255, 255, 255, 0.08);
  animation: haloPulse 8s ease-in-out infinite;
}

.login-brand-panel::after {
  width: 380px;
  height: 380px;
  left: -150px;
  bottom: -170px;
  background: rgba(248, 250, 255, 0.12);
  animation: haloPulse 10s ease-in-out infinite reverse;
}

.polar-halo {
  position: absolute;
  border-radius: 50%;
  filter: blur(1px);
  opacity: 0.4;
}

.halo-a {
  width: 220px;
  height: 220px;
  top: 20%;
  left: 18%;
  background: radial-gradient(circle at 35% 35%, rgba(191, 219, 254, 0.48), rgba(191, 219, 254, 0));
  animation: floatHaloA 11s ease-in-out infinite;
}

.halo-b {
  width: 200px;
  height: 200px;
  bottom: 14%;
  right: 16%;
  background: radial-gradient(circle at 35% 35%, rgba(196, 181, 253, 0.45), rgba(196, 181, 253, 0));
  animation: floatHaloB 12s ease-in-out infinite;
}

.orbit-ring {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  border: 1px solid rgba(238, 244, 255, 0.2);
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  animation: spinRing 24s linear infinite;
}

.orbit-dot {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.75);
}

.dot-a {
  left: calc(50% + 246px);
  top: 50%;
  animation: orbitDotA 12s linear infinite;
}

.dot-b {
  left: calc(50% - 210px);
  top: calc(50% + 120px);
  animation: orbitDotB 16s linear infinite;
}

.star-line {
  position: absolute;
  width: 52%;
  height: 1px;
  left: -6%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.55) 52%, transparent 100%);
  opacity: 0;
}

.line-a {
  top: 32%;
  transform: rotate(-10deg);
  animation: starSweep 8s ease-in-out infinite;
}

.line-b {
  top: 66%;
  transform: rotate(8deg);
  animation: starSweep 9s ease-in-out infinite 2s;
}

.brand-content {
  width: min(540px, 84%);
  position: relative;
  z-index: 1;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 26px;
}

.brand-logo {
  width: 44px;
  height: 44px;
}

.brand-name {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.brand-tagline {
  font-size: 12px;
  letter-spacing: 0.04em;
  color: rgba(238, 244, 255, 0.78);
  text-transform: uppercase;
}

.brand-title {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.22em;
  color: rgba(238, 244, 255, 0.72);
  text-transform: uppercase;
}

.brand-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.35;
  font-weight: 700;
  letter-spacing: 0.04em;
  max-width: 460px;
}

.login-form-panel {
  flex: 0 0 42%;
  background:
    radial-gradient(640px 300px at 0% 0%, rgba(37, 99, 235, 0.06), transparent 70%),
    #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  position: relative;
  z-index: 3;
}

.login-panel-stack {
  width: min(440px, 100%);
}

.login-panel-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding: 0 2px;
}

.meta-left,
.meta-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-btn {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.meta-btn:hover,
.meta-btn.active {
  color: #2563eb;
}

.meta-split,
.meta-version {
  color: #94a3b8;
  font-size: 12px;
}

.login-card {
  width: 100%;
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e6edf7;
  border-radius: 20px;
  padding: 30px 28px 24px;
  box-shadow:
    0 24px 50px rgba(15, 23, 42, 0.09),
    0 6px 18px rgba(15, 23, 42, 0.06);
}

.login-card::before {
  content: '';
  position: absolute;
  width: 180px;
  height: 180px;
  right: -60px;
  top: -60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.16), rgba(59, 130, 246, 0));
  pointer-events: none;
}

.login-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.login-logo {
  width: 36px;
  height: 36px;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.remember-item {
  margin-top: 2px;
}

:deep(.login-input .n-input-wrapper) {
  border-radius: 12px;
  border: 1px solid #dbe5f3;
  transition: border-color 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease;
}

:deep(.login-input .n-input__input-el) {
  font-size: 14px;
}

:deep(.login-input .n-input__prefix) {
  margin-right: 6px;
}

.login-input-icon {
  color: #94a3b8;
  transition: color 0.2s ease;
}

:deep(.login-input.n-input--focus .n-input-wrapper) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 0 14px rgba(59, 130, 246, 0.12);
  animation: inputBreath 1.8s ease-in-out infinite;
}

:deep(.login-input.n-input--focus .login-input-icon) {
  color: #2563eb;
}

.login-btn {
  width: 100%;
  height: 42px;
  border-radius: 12px;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid rgba(37, 99, 235, 0.3);
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 56%, #4f46e5 100%) !important;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.login-footer {
  margin-top: 18px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

@keyframes haloPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.62;
  }
  50% {
    transform: scale(1.07);
    opacity: 0.85;
  }
}

@keyframes floatHaloA {
  0%,
  100% { transform: translate(0, 0); }
  50% { transform: translate(14px, -12px); }
}

@keyframes floatHaloB {
  0%,
  100% { transform: translate(0, 0); }
  50% { transform: translate(-12px, 16px); }
}

@keyframes gridDriftA {
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 32px, 32px 0; }
}

@keyframes gridDriftB {
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 48px, -48px 0; }
}

@keyframes nodePulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes spinRing {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes orbitDotA {
  from { transform: rotate(0deg) translateX(-246px) rotate(0deg); }
  to { transform: rotate(360deg) translateX(-246px) rotate(-360deg); }
}

@keyframes orbitDotB {
  from { transform: rotate(0deg) translateX(210px) rotate(0deg); }
  to { transform: rotate(-360deg) translateX(210px) rotate(360deg); }
}

@keyframes starSweep {
  0%,
  100% {
    opacity: 0;
    transform: translateX(-6%) scaleX(0.88) rotate(var(--line-rotate, 0deg));
  }
  40%,
  60% {
    opacity: 0.78;
    transform: translateX(18%) scaleX(1) rotate(var(--line-rotate, 0deg));
  }
}

@keyframes inputBreath {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 0 12px rgba(59, 130, 246, 0.1);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18), 0 0 16px rgba(59, 130, 246, 0.16);
  }
}

.line-a {
  --line-rotate: -10deg;
}

.line-b {
  --line-rotate: 8deg;
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
