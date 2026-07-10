<!--
  AuditLogDetail.vue
  通用审计日志详情页面（只读）
-->
<template>
  <div class="audit-log-detail-root" v-loading="loading">
    <el-card v-if="detailData" class="detail-card">
      <template #header>
        <div class="card-header">
          <span>审计日志详情</span>
          <el-button type="primary" size="small" @click="handleBack">返回</el-button>
        </div>
      </template>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">日志ID：</span>
          <span class="value">{{ detailData.logging_id }}</span>
        </div>
        <div class="info-item">
          <span class="label">应用模块：</span>
          <el-tag size="small" type="info">{{ appLabelMapping[detailData.app_label] || detailData.app_label }}</el-tag>
        </div>
        <div class="info-item">
          <span class="label">操作类型：</span>
          <el-tag :type="auditOperationTypeTagMapping[detailData.operation_type] || 'info'" size="small">
            {{ auditOperationTypeMapping[detailData.operation_type] || detailData.operation_type }}
          </el-tag>
        </div>
        <div class="info-item">
          <span class="label">记录编码：</span>
          <span class="value">{{ detailData.record_code }}</span>
        </div>
        <div class="info-item full-width">
          <span class="label">操作描述：</span>
          <span class="value">{{ detailData.description }}</span>
        </div>
        <div class="info-item">
          <span class="label">操作人工号：</span>
          <span class="value">{{ detailData.operator_jobcode || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">操作人：</span>
          <span class="value">{{ detailData.operator_name || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">操作时间：</span>
          <span class="value">{{ detailData.operation_time }}</span>
        </div>
        <div class="info-item">
          <span class="label">IP地址：</span>
          <span class="value">{{ detailData.ip_address || '-' }}</span>
        </div>
      </div>

      <!-- 变更数据 -->
      <el-divider content-position="left">变更数据</el-divider>
      <el-row :gutter="16">
        <el-col :span="12">
          <div class="data-section">
            <h4>变更前</h4>
            <pre class="data-pre">{{ formatJson(detailData.before_data) }}</pre>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="data-section">
            <h4>变更后</h4>
            <pre class="data-pre">{{ formatJson(detailData.after_data) }}</pre>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script lang="ts">
export default { name: 'AuditLogDetail' }
</script>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auditLogAPI } from '@/api/auditLog'
import type { AuditLog } from '@/utils/AuditLog'
import { auditOperationTypeMapping, appLabelMapping, auditOperationTypeTagMapping } from '@/utils/AuditLog'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detailData = ref<AuditLog | null>(null)

const handleBack = () => {
  router.push({ name: 'AuditLogDetails' })
}

const formatJson = (data: Record<string, unknown> | null): string => {
  if (!data) return '无'
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

onMounted(async () => {
  const loggingId = route.query.logging_id as string
  if (!loggingId) {
    handleBack()
    return
  }
  loading.value = true
  try {
    detailData.value = await auditLogAPI.getAuditLogByLoggingId(loggingId)
  } catch {
    const { ElMessage } = await import('element-plus')
    ElMessage.error('加载审计日志详情失败')
    handleBack()
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.audit-log-detail-root {
  padding: 16px;

  .detail-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;

      &.full-width {
        grid-column: 1 / -1;
      }

      .label {
        color: var(--text-regular);
        font-size: 14px;
        min-width: 80px;
      }

      .value {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 500;
      }
    }
  }

  .data-section {
    h4 {
      margin: 0 0 8px;
      color: var(--text-primary);
      font-size: 14px;
    }

    .data-pre {
      background: var(--background-color);
      border-radius: 4px;
      padding: 12px;
      font-size: 12px;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
  }
}
</style>
