<!--
@file 应用侧边导航栏，提供菜单导航和权限控制
@component AsideMenu
@usedBy
  - views/MainView.vue: 主布局页面侧边栏
@dependsOn
  - stores/appStore: 侧边栏折叠状态
  - composables/usePermission: 菜单权限控制
  - components/DarkModeToggle: 暗色模式切换
  - components/NotificationBell: 通知铃铛
-->
<template>
  <div class="container">
    <el-row class="tac">
      <el-col :span="24">
        <!--
          侧边栏折叠功能：
          - collapse 属性绑定 appStore.sidebarCollapsed 状态
          - 折叠时仅显示图标，展开时显示图标+文字
          - 折叠/展开状态持久化到 localStorage（由 appStore.toggleSidebar 管理）
        -->
        <el-menu
          :default-active="currentRoute"
          class="el-menu-vertical"
          :collapse="appStore.sidebarCollapsed"
          @select="handleSelect"
          :unique-opened="false"
        >
          <el-menu-item index="/main">
            <template #title>
              <el-icon><Location /></el-icon>
              <span>首页</span>
            </template>
          </el-menu-item>

          <el-sub-menu index="asset">
            <template #title>
              <el-icon><Grid /></el-icon>
              <span>资产管理</span>
            </template>
            <el-menu-item index="/main/assetdetails">资产详情</el-menu-item>
            <el-menu-item index="/main/assetform">资产录入</el-menu-item>
            <el-menu-item index="/main/outassetdetails">资产出库</el-menu-item>
            <el-menu-item index="/main/recycleassetdetails">资产回收</el-menu-item>
            <el-menu-item index="/main/brokenassetdetails">损坏资产</el-menu-item>
            <el-menu-item index="/main/lostassetdetails">遗失资产</el-menu-item>
            <el-menu-item index="/main/foundassetdetails">找回资产</el-menu-item>
            <el-menu-item index="/main/repairassetdetails">维修记录</el-menu-item>
            <el-menu-item index="/main/damagedassetdetails" v-if="canApproveDamaged"
              >资产待报废</el-menu-item
            >
            <el-menu-item index="/main/wasteassetdetails">已报废资产</el-menu-item>
            <el-menu-item index="/main/unregisteredassetdetails" v-if="canHandleUnregistered"
              >未登记资产</el-menu-item
            >
            <el-menu-item index="/main/harddisksndetails">硬盘序列号</el-menu-item>
            <el-menu-item index="/main/assettypedetails" v-if="canManageSystem"
              >资产分类</el-menu-item
            >
          </el-sub-menu>

          <el-menu-item index="/main/contractdetails" v-if="canManageSystem">
            <el-icon><Notebook /></el-icon>
            <span>合同管理</span>
          </el-menu-item>

          <el-menu-item index="/main/storagedetails" v-if="canManageSystem">
            <el-icon><HomeFilled /></el-icon>
            <span>仓库管理</span>
          </el-menu-item>

          <el-sub-menu index="employee" v-if="canManageSystem">
            <template #title>
              <el-icon><UserFilled /></el-icon>
              <span>员工信息</span>
            </template>
            <el-menu-item index="/main/departmentmanagement">通讯录管理</el-menu-item>
            <el-menu-item index="/main/userdetails">员工管理</el-menu-item>
            <el-menu-item index="/main/departmentdetails">部门管理</el-menu-item>
            <el-menu-item index="/main/roledetails">角色管理</el-menu-item>
            <el-menu-item index="/main/authusermanage">账号管理</el-menu-item>
          </el-sub-menu>

          <!-- 操作日志：与合同管理、仓库管理、员工信息同级 -->
          <el-menu-item index="/main/operationlogdetails">
            <el-icon><Document /></el-icon>
            <span>资产类操作日志</span>
          </el-menu-item>
          <el-menu-item index="/main/auditlogdetails" v-if="canViewAuditLog">
            <el-icon><Document /></el-icon>
            <span>其它操作日志</span>
          </el-menu-item>

          <el-menu-item index="/main/notifications">
            <el-icon><Bell /></el-icon>
            <span>通知中心</span>
          </el-menu-item>

          <!-- 暗色模式切换按钮 -->
          <DarkModeToggle class="dark-mode-toggle" :compact="appStore.sidebarCollapsed" />

          <!-- P1-8 通知铃铛 -->
          <NotificationBell class="notification-bell" />

          <!-- 折叠/展开按钮 -->
          <div class="collapse-toggle" @click="appStore.toggleSidebar">
            <el-icon>
              <ArrowLeft v-if="!appStore.sidebarCollapsed" />
              <ArrowRight v-else />
            </el-icon>
            <span v-if="!appStore.sidebarCollapsed" class="collapse-text">收起菜单</span>
          </div>
        </el-menu>
      </el-col>
    </el-row>
  </div>
</template>
<script lang="ts" setup>
import {
  Grid,
  HomeFilled,
  Location,
  Notebook,
  UserFilled,
  ArrowLeft,
  ArrowRight,
  Document,
  Bell,
} from '@element-plus/icons-vue'
import { useRouter, useRoute, onBeforeRouteUpdate } from 'vue-router'
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { usePermission } from '@/composables/usePermission'
import DarkModeToggle from '@/components/DarkModeToggle.vue'
import NotificationBell from '@/components/commoncomponents/NotificationBell.vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const { hasPermission } = usePermission()

// 基于细粒度权限码的菜单可见性判断
const canManageSystem = computed(() => hasPermission('system_config:manage'))
const canApproveDamaged = computed(() => hasPermission('damaged:approve'))
const canHandleUnregistered = computed(() => hasPermission('unregistered:approve'))
const canViewAuditLog = computed(() => hasPermission('auditlog:read'))

const currentRoute = ref(route.path)

onBeforeRouteUpdate((to) => {
  currentRoute.value = to.path
})

const handleSelect = (path: string) => {
  router.push(path).catch((err) => {
    if (!err.message.includes('NavigationDuplicated')) {
      console.error('菜单跳转失败:', err)
    }
  })
}
</script>
<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;
@use '@/assets/styles/global-scroll.scss' as *;

.container {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  border-right: 1px solid $border-color;
  background: var(--gradient-background);
  overflow-y: auto;
  overflow-x: hidden;

  .tac {
    outline: none;
  }
}

:deep(.el-menu) {
  border-right: none;
  background: transparent;
}

.container :deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
  color: $text-primary;
  transition: all 0.3s ease;
  border-radius: 8px;
  margin: 4px 8px;

  &:hover {
    background-color: rgba($primary-color, 0.08);
    color: $primary-color;
  }

  .el-icon {
    margin-right: 8px;
    font-size: 18px;
  }
}

.container :deep(.el-menu-item.is-active) {
  background-color: rgba($primary-color, 0.12);
  color: $primary-color;
  font-weight: 600;
  border-right: 3px solid $primary-color;
  border-radius: 0 8px 8px 0;
  margin-right: 0;
}

.container :deep(.el-sub-menu .el-menu-item.is-active) {
  background-color: rgba($primary-color, 0.08);
  color: $primary-color;
  font-weight: 500;
  border-radius: 0 8px 8px 0;
}

:deep(.el-menu-item .el-icon + span) {
  white-space: nowrap;
  font-size: 14px;
}

.container :deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
  color: $text-primary;
  border-radius: 8px;
  margin: 4px 8px;

  &:hover {
    background-color: $background-color;
  }
}

// 暗色模式切换按钮样式
.dark-mode-toggle {
  margin: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
  }
}

// 折叠/展开按钮样式
.collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  margin: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: $text-secondary;
  transition: all 0.3s ease;
  border-top: 1px solid $border-color;

  &:hover {
    background-color: rgba($primary-color, 0.08);
    color: $primary-color;
  }

  .el-icon {
    font-size: 18px;
  }

  .collapse-text {
    font-size: 13px;
    white-space: nowrap;
  }
}
</style>
