<!--
@file 批量导入格式引导卡片，展示必填列说明和示例数据
@component BatchImportGuideCard
@usedBy
  - detils/AssetBatchImport.vue: 资产批量导入
  - detils/AssetTypeBatchImport.vue: 资产类型批量导入
  - detils/ContractBatchImport.vue: 合同批量导入
  - detils/OutAssetBatchImport.vue: 出库批量导入
  - detils/StorageBatchImport.vue: 仓库批量导入
  - detils/UnregisteredAssetBatchImport.vue: 未登记资产批量导入
  - detils/UserBatchImport.vue: 用户批量导入
@dependsOn
  - (无外部依赖，纯展示组件)
-->
<template>
  <div class="import-guide-card">
    <div class="guide-header">
      <el-icon><InfoFilled /></el-icon>
      <span>导入格式参考</span>
    </div>
    <div class="guide-content">
      <!-- 表头说明 -->
      <div class="guide-section">
        <div class="section-title">必填列说明</div>
        <el-table :data="headerExamples" border size="small" style="width: 100%">
          <el-table-column prop="headerName" label="Excel 表头（中文）" width="160" />
          <el-table-column prop="field" label="对应字段" width="180" />
          <el-table-column prop="required" label="必填" width="80">
            <template #default="{ row }">
              <el-tag :type="row.required ? 'danger' : 'info'" size="small">
                {{ row.required ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="example" label="示例值" />
          <el-table-column prop="remark" label="备注" />
        </el-table>
      </div>
      <!-- 示例数据 -->
      <div class="guide-section">
        <div class="section-title">示例数据</div>
        <el-table :data="exampleRows" border size="small" style="width: 100%">
          <el-table-column
            v-for="col in exampleColumns"
            :key="col.prop"
            :prop="col.prop"
            :label="col.label"
            min-width="120"
          />
        </el-table>
      </div>
      <!-- 注意事项 -->
      <div v-if="notices && notices.length > 0" class="guide-section">
        <div class="section-title">注意事项</div>
        <ul class="notice-list">
          <li v-for="(notice, idx) in notices" :key="idx">{{ notice }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { InfoFilled } from '@element-plus/icons-vue'
import type { HeaderExample, ExampleColumn } from '@/utils/batchImportHelpers'

defineProps<{
  headerExamples: HeaderExample[]
  exampleRows: Record<string, unknown>[]
  exampleColumns: ExampleColumn[]
  notices?: string[]
}>()
</script>

<style scoped>
.import-guide-card {
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  margin: 16px 0;
  overflow: hidden;
}
.guide-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}
.guide-content {
  padding: 16px;
}
.guide-section {
  margin-bottom: 16px;
}
.guide-section:last-child {
  margin-bottom: 0;
}
.section-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}
.notice-list {
  padding-left: 20px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.notice-list li {
  margin-bottom: 4px;
}
</style>
