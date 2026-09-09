<!--
@file 主布局页面，包含侧边栏菜单和内容区域
@component MainView
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - components/AsideMenu: 侧边导航菜单
  - stores/app: 应用全局状态（侧边栏折叠等）
-->
<template>
  <div class="common-layout">
    <el-container class="common-container">
      <!-- 移动端菜单触发按钮 -->
      <div v-if="isMobile" class="mobile-menu-trigger" @click="drawerOpen = true">
        <el-icon :size="20"><Menu /></el-icon>
      </div>

      <!-- 桌面端侧边栏：<960px 隐藏，改用抽屉承载菜单 -->
      <el-aside v-if="!isMobile" class="common-aside" :width="asideWidth">
        <AsideMenu />
      </el-aside>
      <el-container>
        <el-main class="common-main">
          <!-- 轻页头：仅直接子页面显示（Dashboard 与详情/表单页自带页头，不重复） -->
          <div v-if="showPageHeader" class="page-header">
            <h2 class="page-title">{{ pageTitle }}</h2>
          </div>
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

    <!-- 移动端抽屉导航：<960px 时承载 AsideMenu -->
    <el-drawer
      v-model="drawerOpen"
      direction="ltr"
      size="200px"
      :with-header="false"
      class="mobile-drawer"
    >
      <AsideMenu />
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
import AsideMenu from '@/components/AsideMenu.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Menu } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const appStore = useAppStore()

// 移动端抽屉状态：<960px 时桌面侧边栏隐藏，菜单移入抽屉
const isMobile = ref(false)
const drawerOpen = ref(false)
const MOBILE_BREAKPOINT = '(max-width: 960px)'
let mediaQuery: MediaQueryList | undefined

const updateMobileState = (e?: MediaQueryListEvent) => {
  isMobile.value = e ? e.matches : !!mediaQuery?.matches
  if (!isMobile.value) drawerOpen.value = false
}

onMounted(() => {
  mediaQuery = window.matchMedia(MOBILE_BREAKPOINT)
  updateMobileState()
  mediaQuery.addEventListener('change', updateMobileState)
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', updateMobileState)
})

// 路由切换后自动关闭抽屉
watch(
  () => route.path,
  () => {
    drawerOpen.value = false
  },
)

// 侧边栏宽度：折叠时 64px（仅图标），展开时 200px（图标+文字）
// Element Plus el-menu 折叠后宽度固定为 64px
const asideWidth = computed(() => (appStore.sidebarCollapsed ? '64px' : '200px'))

// 轻页头标题与显示条件：仅带 meta.showPageHeader 标记的列表页显示
// Dashboard 自带欢迎栏、NotificationList 自带页头、详情/表单页自带 child-page-header，均不重复显示
const showPageHeader = computed(() => {
  if (route.name === 'Dashboard' || route.name === 'NotificationList') return false
  const leaf = route.matched[route.matched.length - 1]
  if (leaf?.meta?.showPageHeader) return true
  // 可选参数默认子路由（如 /main/assetdetails 命中 :asset_code? 空值）：列表态显示页头
  if (leaf?.name === 'AssetContentDetails' && !route.params.asset_code) {
    return !!route.meta.showPageHeader
  }
  return false
})
const pageTitle = computed(() => {
  if (!showPageHeader.value) return ''
  // 可选参数默认子路由（如 /main/assetdetails 命中的 AssetContentDetails 列表态）：取父级列表页标题
  const leaf = route.matched[route.matched.length - 1]
  if (leaf?.name === 'AssetContentDetails' && !route.params.asset_code) {
    return (route.matched[1]?.meta?.title as string) || ''
  }
  return (route.meta.title as string) || ''
})

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

/* 移动端菜单触发按钮：左上角悬浮 */
.mobile-menu-trigger {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--card-background);
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 0.85;
  }
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

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 0 4px 12px;
    border-bottom: 1px solid var(--border-color-light);

    .page-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
    }
  }
}
</style>
