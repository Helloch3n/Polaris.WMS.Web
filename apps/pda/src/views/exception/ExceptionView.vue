<template>
  <div class="pda-page">
    <van-nav-bar title="异常上报" fixed placeholder />
    <div class="pda-card exception-overview">
      <div class="pda-section-title">异常处理入口</div>
      <div class="pda-subtext">请选择异常类型并提交现场信息</div>
      <div class="pda-subtext tip">建议优先提交影响作业中断的异常</div>
    </div>

    <div class="pda-card exception-card">
      <van-cell-group inset>
        <van-cell title="破损上报" label="上报包装破损、货损" icon="warning-o" is-link>
          <template #value><van-tag type="danger" plain>高优先级</van-tag></template>
        </van-cell>
        <van-cell title="短拣上报" label="上报缺货与短拣异常" icon="close" is-link>
          <template #value><van-tag type="warning" plain>处理中</van-tag></template>
        </van-cell>
        <van-cell title="库位异常" label="上报库位占用与冲突" icon="location-o" is-link>
          <template #value><van-tag type="primary" plain>待分配</van-tag></template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped>
.exception-overview {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.tip {
  margin-top: 6px;
}

.exception-card {
  padding: 10px;
}
</style>
