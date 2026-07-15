<template>
  <el-card class="child-list-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span class="card-title">子分类列表（{{ children.length }}）</span>
        <div class="card-actions">
          <el-button type="success" size="small" @click="$emit('add-child')">
            <el-icon><Plus /></el-icon> 新增
          </el-button>
          <el-button type="warning" size="small" @click="$emit('batch-import')">
            <el-icon><Upload /></el-icon> 批量导入
          </el-button>
          <el-button
            type="danger"
            size="small"
            :disabled="selectedRows.length === 0"
            @click="$emit('batch-delete', selectedRows)"
          >
            <el-icon><Delete /></el-icon> 批量删除 ({{ selectedRows.length }})
          </el-button>
        </div>
      </div>
    </template>

    <el-table
      :data="children"
      v-loading="loading"
      row-key="recordcode"
      border
      stripe
      size="small"
      @selection-change="handleSelectionChange"
      :header-cell-style="{ background: 'var(--table-header-bg, #f5f7fa)' }"
    >
      <el-table-column type="selection" width="45" align="center" />
      <el-table-column prop="type_code" label="类型编码" width="150" align="center" />
      <el-table-column prop="type_name" label="类型名称" min-width="150" show-overflow-tooltip />
      <el-table-column prop="level" label="层级" width="70" align="center" />
      <el-table-column prop="type_description" label="描述" min-width="180" show-overflow-tooltip />
      <el-table-column prop="sort_order" label="排序" width="70" align="center" />
      <el-table-column label="操作" width="130" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="$emit('edit', row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="$emit('delete', row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Upload, Delete } from '@element-plus/icons-vue'
import type { AssetType } from '@/utils/AssetType'

defineProps<{
  children: AssetType[]
  loading?: boolean
}>()

defineEmits<{
  (e: 'add-child'): void
  (e: 'batch-import'): void
  (e: 'batch-delete', rows: AssetType[]): void
  (e: 'edit', row: AssetType): void
  (e: 'delete', row: AssetType): void
}>()

const selectedRows = ref<AssetType[]>([])

const handleSelectionChange = (rows: AssetType[]) => {
  selectedRows.value = rows
}
</script>

<style lang="scss" scoped>
.child-list-card {
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
