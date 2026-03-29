<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { loginByPassword } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const rememberPassword = ref(false)
const passwordVisible = ref(false)

const REMEMBER_USERNAME_KEY = 'pda_login_remember_username'
const REMEMBER_PASSWORD_KEY = 'pda_login_remember_password'

const form = reactive({
  username: '',
  password: '',
})

let viewportListener: (() => void) | null = null

function updateKeyboardOffset() {
  const vv = window.visualViewport
  if (!vv) {
    document.documentElement.style.setProperty('--pda-keyboard-offset', '0px')
    return
  }

  const overlap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
  const offset = Math.max(0, overlap - 12)
  document.documentElement.style.setProperty('--pda-keyboard-offset', `${offset}px`)
}

function bindViewportListener() {
  const vv = window.visualViewport
  if (!vv) return

  const onViewportChange = () => updateKeyboardOffset()
  vv.addEventListener('resize', onViewportChange)
  vv.addEventListener('scroll', onViewportChange)
  updateKeyboardOffset()

  viewportListener = () => {
    vv.removeEventListener('resize', onViewportChange)
    vv.removeEventListener('scroll', onViewportChange)
  }
}

async function handleSubmit() {
  if (!form.username.trim() || !form.password.trim()) {
    return
  }

  loading.value = true
  try {
    const data = await loginByPassword({
      username: form.username.trim(),
      password: form.password,
    })

    if (!data?.access_token) {
      throw new Error('登录失败：未获取到 access_token')
    }

    authStore.setAuth({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userName: form.username.trim(),
    })

    if (rememberPassword.value) {
      localStorage.setItem(REMEMBER_USERNAME_KEY, form.username.trim())
      localStorage.setItem(REMEMBER_PASSWORD_KEY, form.password)
    } else {
      localStorage.removeItem(REMEMBER_USERNAME_KEY)
      localStorage.removeItem(REMEMBER_PASSWORD_KEY)
    }

    showSuccessToast('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/task'
    await router.replace(redirect)
  } catch (error) {
    showFailToast(error instanceof Error ? error.message : '登录失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.body.classList.add('pda-login-immersive')
  bindViewportListener()

  const savedUsername = localStorage.getItem(REMEMBER_USERNAME_KEY) ?? ''
  const savedPassword = localStorage.getItem(REMEMBER_PASSWORD_KEY) ?? ''
  if (savedUsername && savedPassword) {
    form.username = savedUsername
    form.password = savedPassword
    rememberPassword.value = true
  }
})

onUnmounted(() => {
  document.body.classList.remove('pda-login-immersive')
  viewportListener?.()
  viewportListener = null
  document.documentElement.style.setProperty('--pda-keyboard-offset', '0px')
})
</script>

<template>
  <div class="login-page">
    <div class="pda-card login-card">
      <div class="login-head">
        <h3 class="login-title">Polaris WMS PDA</h3>
        <div class="pda-subtext">仓储移动作业终端登录</div>
      </div>
      <van-form @submit="handleSubmit">
        <van-cell-group inset>
          <van-field v-model="form.username" name="username" label="账号" placeholder="请输入账号" clearable />
          <van-field
            v-model="form.password"
            :type="passwordVisible ? 'text' : 'password'"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :right-icon="passwordVisible ? 'eye-o' : 'closed-eye'"
            @click-right-icon="passwordVisible = !passwordVisible"
            clearable
          />
        </van-cell-group>
        <div class="remember-wrap">
          <van-checkbox v-model="rememberPassword">记住密码</van-checkbox>
        </div>
        <div class="login-action">
          <van-button block type="primary" native-type="submit" :loading="loading">登录</van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  width: 100%;
  min-height: 100dvh;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #f3f6fb 0%, #eaf0fb 100%);
  overflow: hidden;
}

.login-title {
  margin: 0;
  text-align: center;
}

.login-card {
  width: min(420px, 92vw);
  border-radius: 18px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12);
  transform: translateY(calc(-1 * var(--pda-keyboard-offset, 0px)));
  transition: transform 0.2s ease;
  padding: 16px;
}

.login-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.login-action {
  padding: 14px 6px 4px;
}

.remember-wrap {
  padding: 10px 8px 0;
}

:global(body.pda-login-immersive) {
  margin: 0;
  overflow: hidden;
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}
</style>
