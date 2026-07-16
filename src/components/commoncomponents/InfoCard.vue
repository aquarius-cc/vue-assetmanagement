<!--
  InfoCard.vue
  通用信息卡片组件

  @description
  数据驱动的信息卡片组件，用于展示键值对形式的信息。
  支持双列网格布局和单列文本布局两种模式。

  @features
  - 数据驱动：只需传递配置对象，无需编写模板
  - 自动格式化：支持自定义格式化函数和默认值处理
  - 条件渲染：通过 visible 属性控制显示/隐藏
  - 价格样式：支持价格字段的特殊样式
  - 两种布局：grid（双列）和 description（单列文本）

  @usage
  ```vue
  <InfoCard :config="cardConfig" />
  ```

  @example
  ```ts
  const cardConfig: InfoCardConfig = {
    title: '基本信息',
    icon: 'Document',
    fields: [
      [{ label: '编码', value: 'ABC123' }],
      [{ label: '名称', value: '测试资产' }]
    ]
  }
  ```

  @author System
  @date 2025-06-02
-->

<template>
  <el-card v-if="config.visible !== false" class="info-card" shadow="hover">
    <!-- 卡片头部：图标 + 标题 -->
    <template #header>
      <div class="section-header">
        <el-icon><component :is="iconComponent" /></el-icon>
        <span class="section-title">{{ config.title }}</span>
      </div>
    </template>

    <!-- grid 布局：双列键值对 -->
    <div v-if="config.layout !== 'description'" class="info-grid">
      <div v-for="(column, colIndex) in config.fields" :key="colIndex" class="info-column">
        <div v-for="(field, fieldIndex) in column" :key="fieldIndex" class="info-item">
          <span class="info-label">{{ field.label }}：</span>
          <span class="info-value" :class="{ price: field.isPrice }">
            {{ formatValue(field) }}
          </span>
        </div>
      </div>
    </div>

    <!-- description 布局：单列文本 -->
    <div v-else class="description-content">
      {{ formatValue(config.fields[0][0]) }}
    </div>
  </el-card>
</template>

<script lang="ts">
/**
 * 组件名称定义
 * 用于在 Vue DevTools 中识别组件
 */
export default {
  name: 'InfoCard',
}
</script>

<script lang="ts" setup>
// ===== 导入 =====
import { computed } from 'vue'
import {
  Document,
  User,
  Location,
  InfoFilled,
  Tickets,
  Stamp,
  UserFilled,
  Avatar,
} from '@element-plus/icons-vue'
import type { InfoCardConfig, InfoField } from '@/types/info-card'

// ===== 图标映射 =====
/**
 * 图标名称到组件的映射
 * 用于动态渲染头部图标
 */
const iconMap = {
  Document,
  User,
  Location,
  InfoFilled,
  Tickets,
  Stamp,
  UserFilled,
  Avatar,
} as const

// ===== Props 定义 =====
interface Props {
  /**
   * 卡片配置对象
   * 包含标题、图标、字段等配置信息
   */
  config: InfoCardConfig
}

const props = defineProps<Props>()

// ===== 计算属性 =====
/**
 * 获取图标组件
 * 根据配置中的 icon 名称返回对应的图标组件
 * 默认使用 Document 图标
 */
const iconComponent = computed(() => iconMap[props.config.icon] || Document)

// ===== 工具函数 =====
/**
 * 格式化字段值
 *
 * @description
 * 按以下优先级处理字段值：
 * 1. 如果有自定义 formatter，使用 formatter 处理
 * 2. 如果值为空（null/undefined/''），使用 defaultValue 或 '无'
 * 3. 否则直接转为字符串
 *
 * @param field - 字段配置对象
 * @returns 格式化后的显示文本
 */
const formatValue = (field: InfoField): string => {
  // 优先使用自定义格式化函数
  if (field.formatter) {
    return field.formatter(field.value)
  }

  // 处理空值情况
  if (field.value === null || field.value === undefined || field.value === '') {
    return field.defaultValue ?? '无'
  }

  // 默认转为字符串
  return String(field.value)
}
</script>

<style lang="scss" scoped>
// ===== 卡片容器 =====
.info-card {
  margin-bottom: 20px;
}

// ===== 头部样式 =====
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;

  .el-icon {
    font-size: 18px;
    color: var(--el-color-primary);
  }

  .section-title {
    font-weight: 600;
    color: var(--text-primary);
  }
}

// ===== grid 布局样式 =====
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.info-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color-lightest);
}

.info-label {
  min-width: 120px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  color: var(--text-regular);
  word-break: break-word;

  // 价格特殊样式
  &.price {
    font-weight: 500;
    color: var(--color-warning-light);
  }
}

// ===== description 布局样式 =====
.description-content {
  padding: 16px;
  background-color: var(--card-background-light);
  border-radius: 8px;
  line-height: 1.6;
  color: var(--text-regular);
  word-break: break-word;
}
</style>
