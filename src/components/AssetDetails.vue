<!--
@file 资产详情路由容器，作为子路由视图的包装组件
@component AssetDetails
@usedBy
  - router/index.ts: 资产详情路由组件
@dependsOn
  - (无外部依赖，纯容器组件)
-->
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
.asset-details {
  width: 100%;
  // App 壳式布局：作为 .common-main 的 flex 子项撑满剩余高度，向内传递 flex 链
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--background-color);
  box-sizing: border-box;
  overflow: hidden;

  .details-content {
    width: 100%;
    // 纵向 flex：内页（list-container）flex:1 撑满、bottom-buttons 贴底
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    box-sizing: border-box;
  }
}
</style>
