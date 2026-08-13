<!--
@file 仪表盘最近操作列表，展示最近出入库/回收记录
@component DashboardRecentList.vue
@props
  - title: 列表标题
  - items: 列表数据
  - nameKey: 显示的名称字段
  - operatorKey: 显示的操作人字段
  - dateKey: 显示的时间戳字段
  - emptyText: 空列表提示文本
@usedBy
  - components/DashboardPage.vue: 仪表盘最近记录卡片
@dependsOn
  - utils/Format: 日期时间格式化
  - composables/usePermission: 权限判断方法
  - stores/auth: 用户权限状态
  - stores/app: 应用状态
  - stores/auth: 用户权限状态
@template
  - 列表标题
  - 列表数据
  - 显示的名称字段
  - 显示的操作人字段
  - 显示的时间戳字段
  - 空列表提示文本
  - 权限判断方法
  - 用户权限状态
  - 应用状态
  - 用户权限状态
  - 日期时间格式化
-->
<template>
  <div class="recent-list">
    <h4>{{ title }}</h4>
    <div class="list-item" v-for="item in items" :key="item.id">
      <div class="item-info">
        <span class="item-name">{{ getFieldValue(item, nameKey) }}</span>
        <span class="item-operator">{{ getFieldValue(item, operatorKey) }}</span>
      </div>
      <span class="item-date">{{ formatDateTime(getFieldValue(item, dateKey) || undefined) }}</span>
    </div>
    <div v-if="items.length === 0" class="empty-state">{{ emptyText }}</div>
  </div>
</template>

<script lang="ts" setup generic="T extends { id: PropertyKey }">
import { formatDateTime } from '@/utils/Format'

const _props = withDefaults(
  defineProps<{
    title: string
    items: T[]
    nameKey: keyof T & string
    operatorKey: keyof T & string
    dateKey: { [K in keyof T]: T[K] extends string ? K : never }[keyof T] & string
    emptyText?: string
  }>(),
  {
    emptyText: '暂无记录',
  },
)

/** 安全提取字段值,null/undefined 转为空字符串 */
const getFieldValue = (item: T, key: keyof T & string): string => {
  const val = item[key]
  if (val === null || val === undefined) return ''
  return String(val)
}
</script>

<style lang="scss" scoped>
.recent-list {
  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    opacity: 0.9;
    font-weight: 500;
  }

  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-radius: 4px;
    border-bottom: 1px solid var(--overlay-white-medium);
    font-size: 13px;
    transition: background 0.2s ease;

    &:hover {
      background: var(--overlay-white-subtle);
    }

    &:last-child {
      border-bottom: none;
    }

    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .item-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .item-operator {
        font-size: 12px;
        opacity: 0.8;
      }
    }

    .item-date {
      opacity: 0.8;
      margin-left: 12px;
      font-size: 12px;
    }
  }

  .empty-state {
    text-align: center;
    padding: 20px;
    opacity: 0.6;
    font-size: 13px;
  }

  @media (max-width: 767px) {
    .list-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;

      .item-info {
        width: 100%;
      }

      .item-date {
        margin-left: 0;
        font-size: 11px;
      }
    }
  }
}
</style>
