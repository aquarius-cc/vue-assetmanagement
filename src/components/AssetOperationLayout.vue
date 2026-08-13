<!--
@file 资产操作通用布局，提供表单/操作按钮/资产信息等插槽结构
@component AssetOperationLayout.vue
@usedBy
  - views/FoundAssetView.vue: 找到资产操作页
  - views/LostAssetView.vue: 丢失资产操作页
  - views/RecycleAssetView.vue: 回收资产操作页
  - views/RepairAssetView.vue: 维修资产操作页
  - views/ScrapAssetView.vue: 报废资产操作页
  - views/UnregisteredAssetView.vue: 未登记资产操作页
  - views/DamagedAssetView.vue: 损坏资产操作页
  - views/HarddiskSNView.vue: 硬盘序列号操作页
  - views/StorageView.vue: 仓库操作页
  - views/AssetView.vue: 资产操作页
@dependsOn
  - vue-router: 路由跳转
  - element-plus: 组件库
  - composables/useAssetOperationForm: 资产操作表单逻辑
  - api/Asset: 资产数据接口
  - api/recycleAsset: 回收资产数据接口
  - api/repairAsset: 维修资产数据接口
  - api/scrapAsset: 报废资产数据接口
  - api/unregisteredAsset: 未登记资产数据接口
  - api/damagedAsset: 损坏资产数据接口
  - api/harddiskSN: 硬盘序列号数据接口
  - api/storage: 仓库数据接口
-->

<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><component :is="icon" /></el-icon>
          <span>{{ title }}</span>
        </div>
      </template>

      <!-- 缺少资产编码 -->
      <el-result
        v-if="!assetCode"
        icon="warning"
        title="缺少资产编码"
        sub-title="请通过正确的方式访问此页面"
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>

      <!-- 加载状态 -->
      <div v-else-if="loading" v-loading="true" class="loading-container" />

      <!-- [修复] 加载失败状态：优先于"资产不存在"展示 -->
      <el-result
        v-else-if="fetchError"
        icon="error"
        title="加载失败"
        sub-title="资产信息加载失败，请检查网络后重试"
      >
        <template #extra>
          <el-button type="primary" @click="handleRetry">重试</el-button>
          <el-button @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>

      <!-- 资产信息 + 表单 -->
      <template v-else-if="asset">
        <!-- 资产信息（默认插槽或具名插槽） -->
        <slot name="asset-info" :asset="asset">
          <el-descriptions :column="2" border class="asset-info">
            <el-descriptions-item label="资产编码">{{ asset.asset_code }}</el-descriptions-item>
            <el-descriptions-item label="资产名称">{{ asset.asset_name }}</el-descriptions-item>
            <el-descriptions-item label="资产规格">{{
              asset.asset_specification || '-'
            }}</el-descriptions-item>
            <el-descriptions-item label="当前状态">{{
              asset.asset_current_status
            }}</el-descriptions-item>
          </el-descriptions>
        </slot>

        <el-divider />

        <!-- 表单插槽 -->
        <slot name="form" />

        <!-- 操作按钮插槽 -->
        <slot name="actions" />
      </template>

      <!-- 资产不存在 -->
      <el-result v-else icon="error" title="资产不存在" sub-title="未找到该资产信息">
        <template #extra>
          <el-button type="primary" @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { AssetDetail } from '@/types/asset'
import type { Component } from 'vue'

interface Props {
  /** 页面标题 */
  title: string
  /** 图标组件 */
  icon: Component
  /** 资产编码 */
  assetCode: string | null | undefined
  /** 加载状态 */
  loading: boolean
  /** 资产详情 */
  asset: AssetDetail | null
  /** [修复] 资产信息加载失败状态，为 true 时优先显示加载失败 UI */
  fetchError?: boolean
}

// defineProps 改为带默认值的 defineProps
//Vue 3 的 defineProps 和 withDefaults 是编译器宏，不需要赋值给变量即可让模板访问 props。
withDefaults(defineProps<Props>(), {
  fetchError: false, // [修复] 默认 false，向后兼容未传值的 6 个视图
})

const router = useRouter()

// 新增重试事件
const emit = defineEmits<{
  /** [修复] 用户点击重试时触发，由调用方重新调用 fetchAsset */
  (e: 'retry'): void
}>()

function handleRetry() {
  emit('retry')
}
</script>

<style scoped>
.asset-operation-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.operation-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.loading-container {
  min-height: 200px;
}

.asset-info {
  margin-bottom: 20px;
}
</style>
