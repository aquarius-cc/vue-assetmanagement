<script setup lang="ts">
/**
 * 暗色模式切换组件
 * 使用 useDarkMode composable 驱动暗色模式切换
 * 符合 F13 规范：必须使用 useDark + CSS 变量驱动
 */
import { useDarkMode } from '@/composables/useDarkMode'
import { Sunny, Moon } from '@element-plus/icons-vue'

const { isDark, toggleDark } = useDarkMode()
</script>

<template>
  <div class="dark-mode-toggle" @click="toggleDark" :title="isDark ? '切换到亮色模式' : '切换到暗色模式'">
    <el-icon class="toggle-icon">
      <Sunny v-if="isDark" />
      <Moon v-else />
    </el-icon>
    <span class="toggle-text" v-if="!$attrs.compact">
      {{ isDark ? '亮色模式' : '暗色模式' }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
/* 使用 CSS 变量驱动样式，符合 F13 规范 */
.dark-mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary);
  background-color: var(--background-color-light);
  border: 1px solid var(--border-color);
  
  &:hover {
    background-color: var(--opacity-primary-light);
    color: var(--color-primary);
    border-color: var(--color-primary);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.toggle-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
  
  .dark-mode-toggle:hover & {
    transform: rotate(15deg);
  }
}

.toggle-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

/* 暗色模式下的特殊样式 */
html.dark .dark-mode-toggle {
  background-color: var(--background-color-light);
  border-color: var(--border-color);
  
  &:hover {
    background-color: var(--opacity-primary-light);
    border-color: var(--color-primary);
  }
}
</style>