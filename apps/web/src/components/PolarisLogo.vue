<template>
  <span aria-hidden="true" class="polaris-logo" />
</template>

<style scoped>
.polaris-logo {
  display: inline-block;
  flex-shrink: 0;
  background-color: currentColor;
  -webkit-mask-image: url('../assets/polaris-logo.svg');
  mask-image: url('../assets/polaris-logo.svg');
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  mask-size: contain;
}
</style>
