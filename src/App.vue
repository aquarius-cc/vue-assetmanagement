<!--
@file 应用根组件，挂载路由视图并初始化暗色模式
@component App
@usedBy
  - main.ts: 应用入口
@dependsOn
  - components/LoginDialog: 登录弹窗
  - components/DarkModeToggle: 暗色模式切换
  - composables/useDarkMode: 暗色模式逻辑
-->
<script setup lang="ts">
import { useDarkMode } from '@/composables/useDarkMode'
import './styles/variables.css'

// 初始化暗色模式
useDarkMode()
</script>

<template>
  <router-view></router-view>
</template>

<style scoped></style>
