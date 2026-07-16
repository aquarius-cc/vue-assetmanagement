<template>
  <el-card class="info-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span class="card-title">资产分类信息</span>
        <div class="card-actions">
          <el-button type="primary" size="small" @click="$emit('edit')">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button type="success" size="small" @click="$emit('add-child')">
            <el-icon><Plus /></el-icon> 新增子分类
          </el-button>
          <el-button type="warning" size="small" @click="$emit('batch-add-child')">
            <el-icon><Upload /></el-icon> 批量新增
          </el-button>
          <el-button type="danger" size="small" @click="$emit('delete')">
            <el-icon><Delete /></el-icon> 删除
          </el-button>
        </div>
      </div>
    </template>

    <el-descriptions :column="2" border size="small">
      <el-descriptions-item label="类型编码">{{ assetType.type_code }}</el-descriptions-item>
      <el-descriptions-item label="类型名称">{{ assetType.type_name }}</el-descriptions-item>
      <el-descriptions-item label="层级">
        <el-tag size="small">第 {{ assetType.level ?? 0 }} 层</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="排序">{{ assetType.sort_order ?? 0 }}</el-descriptions-item>
      <el-descriptions-item label="父级编码">{{
        assetType.parent_type_code || '—'
      }}</el-descriptions-item>
      <el-descriptions-item label="物化路径">{{ assetType.path || '—' }}</el-descriptions-item>
      <el-descriptions-item label="记录编码">{{ assetType.recordcode }}</el-descriptions-item>
      <el-descriptions-item label="描述" :span="2">{{
        assetType.type_description || '—'
      }}</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup lang="ts">
import { Edit, Plus, Upload, Delete } from '@element-plus/icons-vue'
import type { AssetType } from '@/utils/AssetType'

defineProps<{
  assetType: AssetType
}>()

defineEmits<{
  (e: 'edit'): void
  (e: 'add-child'): void
  (e: 'batch-add-child'): void
  (e: 'delete'): void
}>()
</script>

<style lang="scss" scoped>
.info-card {
  margin-bottom: 16px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .card-title {
      font-weight: 600;
      font-size: 15px;
      color: var(--text-primary);
    }

    .card-actions {
      display: flex;
      gap: 8px;
    }
  }
}
</style>
