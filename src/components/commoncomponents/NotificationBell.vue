<!--
@file 通知铃铛组件，显示未读通知数量并支持标记已读
@component NotificationBell.vue
@description 通知铃铛组件，显示未读通知数量并支持标记已读
@usedBy
  - components/AsideMenu.vue: 侧边栏通知入口
@dependsOn
  - composables/useNotification: 通知数据管理和WebSocket连接
  - utils/navigation: 安全路由跳转
-->
<template>
  <div class="notification-bell" ref="bellRef">
    <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" @click="togglePanel">
      <el-icon :size="20" class="bell-icon" :class="{ 'is-connected': isConnected }">
        <Bell />
      </el-icon>
    </el-badge>

    <!-- 通知面板 -->
    <transition name="panel-fade">
      <div v-if="showPanel" class="notification-panel">
        <div class="panel-header">
          <span class="panel-title">通知</span>
          <div class="panel-actions">
            <el-button
              link
              type="primary"
              size="small"
              :loading="isMarkingAll"
              :disabled="isMarkingAll"
              @click="handleMarkAllRead"
              v-if="unreadCount > 0"
            >
              全部已读
            </el-button>
            <el-button link type="info" size="small" @click="showPanel = false">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>

        <div class="panel-body" v-loading="isLoading">
          <!-- [修复] 加载失败提示 -->
          <div v-if="fetchError" class="error-state">
            <el-empty description="通知加载失败" :image-size="60">
              <el-button type="primary" size="small" @click="() => fetchNotifications()"
                >重试</el-button
              >
            </el-empty>
          </div>
          <div v-else-if="notifications.length === 0" class="empty-state">
            <el-empty description="暂无通知" :image-size="60" />
          </div>

          <div v-else class="notification-list">
            <div
              v-for="n in notifications"
              :key="n.id"
              class="notification-item"
              :class="{ unread: !n.is_read, [`priority-${n.priority}`]: true }"
              @click="handleClick(n)"
            >
              <div class="item-header">
                <el-tag :type="getTagType(n.type)" size="small">{{ getTypeLabel(n.type) }}</el-tag>
                <span class="item-time">{{ formatTime(n.created_at) }}</span>
              </div>
              <div class="item-title">{{ n.title }}</div>
              <div class="item-message">{{ n.message }}</div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { safeNavigate } from '@/utils/navigation'
import { Bell, Close } from '@element-plus/icons-vue'
import { useNotification, type Notification } from '@/composables/useNotification'

const {
  notifications,
  unreadCount,
  isConnected,
  isLoading,
  isMarkingAll, // [修复] 新增：防重复点击
  fetchError, // [修复] 新增：加载失败状态
  markAsRead,
  markAllAsRead,
  fetchNotifications,
} = useNotification()

const showPanel = ref(false)

function togglePanel() {
  showPanel.value = !showPanel.value
  if (showPanel.value) {
    fetchNotifications()
  }
}

function handleMarkAllRead() {
  markAllAsRead()
}

function handleClick(n: Notification) {
  markAsRead(n.id)
  if (n.related_url) {
    showPanel.value = false
    safeNavigate(n.related_url)
  }
}

function getTagType(type: string) {
  const map: Record<string, string> = {
    approval: 'warning',
    status_change: 'primary',
    system: 'info',
  }
  return (map[type] || 'info') as 'warning' | 'primary' | 'info'
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    approval: '审批',
    status_change: '状态',
    system: '系统',
  }
  return map[type] || type
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.notification-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.bell-icon {
  cursor: pointer;
  transition: color 0.2s;
}

.bell-icon.is-connected {
  color: var(--el-color-success);
}

.bell-icon:not(.is-connected) {
  color: var(--el-text-color-secondary);
}

.notification-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 380px;
  max-height: 500px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.panel-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.panel-body {
  max-height: 400px;
  overflow-y: auto;
}

.empty-state {
  padding: 20px;
}

.notification-list {
  padding: 4px 0;
}

.notification-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notification-item:hover {
  background: var(--el-fill-color-light);
}

.notification-item.unread {
  background: var(--el-fill-color-blank);
}

.notification-item.priority-high {
  border-left: 3px solid var(--el-color-danger);
}

.notification-item.priority-medium {
  border-left: 3px solid var(--el-color-warning);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.item-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.item-message {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
