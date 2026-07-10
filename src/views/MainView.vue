<template>
  <div class="common-layout">
    <el-container class="common-container">
      <!-- 侧边栏宽度跟随折叠状态动态变化 -->
      <el-aside class="common-aside" :width="asideWidth">
        <AsideMenu />
      </el-aside>
      <el-container>
        <!-- <el-header class="common-header">
          <HeadersMenue/> -->
        <!-- <div class="header-top">
          </div> -->
        <!-- <div class="header-bottom">
          </div> -->
        <!-- </el-header> -->
        <el-main class="common-main">
          <!-- 如果同时使用transition和keep-alive -->
          <router-view v-slot="{ Component }">
            <transition name="fade">
              <keep-alive :include="keepAliveComponents">
                <component :is="Component" />
              </keep-alive>
            </transition>
          </router-view>
          <!-- 主要内容区域可以用于其他功能 -->
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script lang="ts" setup>

import { useRoute } from 'vue-router'
import AsideMenu from '@/components/AsideMenu.vue'
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const appStore = useAppStore()

// 侧边栏宽度：折叠时 64px（仅图标），展开时 200px（图标+文字）
// Element Plus el-menu 折叠后宽度固定为 64px
const asideWidth = computed(() => appStore.sidebarCollapsed ? '64px' : '200px')

// 动态计算需要缓存的组件名称（从路由 meta 中获取）
const keepAliveComponents = computed<(string | RegExp)[]>(() => {
  // 只缓存 meta.keepAlive 为 true 的组件（需组件声明 name 选项）
  // 遍历所有匹配的路由（包括子路由），收集需要缓存的组件名称
  return route.matched
    .filter((item) => item.meta.keepAlive) // 筛选出开启缓存的路由
    .map((item) => item.meta.componentName as string | RegExp) // 提取组件名称并断言类型
    .filter(Boolean) // 过滤空值
})
</script>

<style lang="scss" scoped>
/**
 * 主布局样式
 *
 * 设计说明：
 * 1. 使用 SCSS 预处理器，与项目全局样式体系保持一致
 * 2. 采用 98vh/98vw 的视口比例，留出边距营造悬浮效果
 * 3. 侧边栏固定 200px 宽度，主内容区自适应剩余空间
 * 4. 使用 CSS 变量覆盖 Element Plus 默认样式
 *
 * 响应式考虑：
 * - 当前为桌面端优化设计
 * - 如需移动端适配，建议添加媒体查询调整布局
 */

/**
 * 根布局容器
 * 居中显示，留出视口边距
 *
 * 注意：
 * 1. 使用 calc(100vw - 16px) 替代 98vw，避免滚动条导致的水平溢出
 * 2. 使用 100dvh 替代 100vh，适配移动端动态视口高度
 * 3. 移除无效的 vertical-align 和 text-align 属性（对 block 元素无作用）
 */
.common-layout {
  margin: 8px auto;
  height: calc(100dvh - 16px);
  width: calc(100vw - 16px);
}

/**
 * 主容器
 * 包含侧边栏和主内容区
 * 添加圆角和阴影营造卡片效果
 */
.common-container {
  height: 100%;
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  background: var(--card-background);
}

/**
 * 侧边栏样式
 * 固定宽度 200px，渐变背景增加视觉层次
 * 右侧边框分隔侧边栏与主内容区
 */
.common-aside {
  /* 宽度由 :width="asideWidth" 动态控制，不再固定 */
  height: 100%;
  /* 注意：移除了 float: left，在 flex 布局的 el-container 中 float 无实际意义 */
  background: var(--gradient-background);
  border-right: 1px solid var(--border-color);
  transition: width 0.3s ease;
  overflow: hidden;
}

/**
 * 覆盖 Element Plus 的 el-main 默认样式
 * 使用 CSS 变量减小默认内边距
 */
.el-main {
  --el-main-padding: 8px;
  padding: var(--el-main-padding) !important;
}

/**
 * 主内容区样式
 * 浅灰色背景与侧边栏白色背景形成对比
 */
.common-main {
  height: 100%;
  width: 100%;
  background-color: var(--background-color);
}
</style>
