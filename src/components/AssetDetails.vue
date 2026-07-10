<template>
  <div class="asset-details">
    <div class="details-content">
      <router-view></router-view>
    </div>
  </div>
</template>
<script lang="ts" setup>
// 这个组件现在只作为容器，不需要其他逻辑
</script>
<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.asset-details {
  width: 100%;
  height: 100%;
  position: relative;
  background: $background-color;
  box-sizing: border-box;

  .details-content {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
  }
}
</style>
