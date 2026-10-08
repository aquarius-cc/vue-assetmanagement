<!--
@file 资产详情路由容器，作为子路由视图的包装组件
@component AssetDetails
@usedBy
  - router/index.ts: 资产详情路由组件
@dependsOn
  - vue-router (useRoute)
-->
<template>
  <div class="asset-details">
    <div class="details-content">
      <!-- key（BF-078 需求3 二轮修正 · 方案 A″）：取本容器直接子记录名——
           grouped / :asset_code? 互换时实例必重挂（否则 Vue 同位置复用、
           setup 不重跑、返回分组页拿不到恢复快照）；孙路由（assetform 等）
           不改变 key，扁平→表单的既有复用行为保留（AssetDetails.spec b 用例锁）。 -->
      <router-view :key="childViewKey"></router-view>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

/** 直接子记录名（AssetDetails 记录之后的 matched 项）；找不到时回落 '' 保渲染 */
const childViewKey = computed(() => {
  const matched = route.matched
  const selfIdx = matched.findIndex((r) => r.name === 'AssetDetails')
  return String(matched[selfIdx + 1]?.name ?? '')
})
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
