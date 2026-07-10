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
