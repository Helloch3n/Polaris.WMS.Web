<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

function logout() {
  authStore.clearAuth()
  router.replace('/login')
}
</script>

<template>
  <div class="pda-page">
    <van-nav-bar title="我的" fixed placeholder />

    <div class="pda-card profile-card">
      <div class="profile-head">
        <van-icon name="manager-o" size="22" />
        <div>
          <div class="pda-section-title">{{ authStore.userName || '未登录用户' }}</div>
          <div class="pda-subtext">仓储移动作业终端</div>
        </div>
      </div>
    </div>

    <div class="pda-card">
      <van-cell-group inset>
        <van-cell title="当前账号" :value="authStore.userName || '-'" />
        <van-cell title="环境" value="PDA" />
        <van-cell title="版本" value="v0.0.1" />
      </van-cell-group>
      <div class="action-wrap">
        <van-button block type="danger" icon="revoke" @click="logout">退出登录</van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-wrap {
  margin-top: 12px;
}
</style>
