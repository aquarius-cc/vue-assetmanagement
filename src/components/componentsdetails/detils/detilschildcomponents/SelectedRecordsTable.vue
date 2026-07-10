<!--
  SelectedRecordsTable.vue
  已选回收记录表格（支持删除）
-->
<template>
  <div v-if="records.length > 0" class="selected-records">
    <div class="records-header">
      <h3 class="section-title">已选回收记录（{{ records.length }} 条）</h3>
      <el-button link type="danger" size="small" @click="$emit('clear')">
        清空全部
      </el-button>
    </div>
    <el-table :data="records" size="small" style="width: 100%">
      <el-table-column prop="recycle_asset" label="资产编码" width="160" />
      <el-table-column prop="outasset_name" label="资产名称" />
      <el-table-column prop="outasset_manager_name" label="使用人" width="100" />
      <el-table-column prop="department_name" label="部门" width="120" />
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ $index }">
          <el-button link type="danger" size="small" @click="$emit('remove', $index)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script lang="ts" setup>
export interface SelectedRecord {
  recordcode: string
  recycle_asset: string
  outasset_name: string
  outasset_manager_name: string
  manager_jobcode: string
  department_name: string
  outasset_number: number
}

defineProps<{
  records: SelectedRecord[]
}>()

defineEmits<{
  remove: [index: number]
  clear: []
}>()
</script>

<style scoped>
.selected-records {
  margin-bottom: 16px;
  padding: 12px;
  background-color: var(--background-color);
  border-radius: 8px;
  border: 1px solid var(--border-color-light);
}
.records-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.section-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  padding: 12px 16px;
  background: var(--gradient-card-highlight);
  border-left: 4px solid var(--color-primary-light);
  border-radius: 4px;
}
</style>
