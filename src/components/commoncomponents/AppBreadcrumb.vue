<template>
  <el-breadcrumb
    v-if="showPageHeader && appStore.settings.showBreadcrumbs && appStore.breadcrumbs.length > 0"
    separator="/"
    class="app-breadcrumb"
  >
    <el-breadcrumb-item
      v-for="(crumb, i) in appStore.breadcrumbs"
      :key="crumb.name + i"
      :to="i < appStore.breadcrumbs.length - 1 && crumb.path ? crumb.path : undefined"
    >
      {{ crumb.name }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { usePageHeader } from '@/composables/usePageHeader'

const appStore = useAppStore()
// 页头显示条件复用共享 computed（唯一实现，与 MainView 一致，DR-1）
const { showPageHeader } = usePageHeader()
</script>

<style lang="scss" scoped>
.app-breadcrumb {
  // App 壳式布局（C-11）：.common-main 为 flex column，面包屑作为 flex 项不可被压缩
  flex-shrink: 0;
  margin: 0 0 8px 4px;
}
</style>
