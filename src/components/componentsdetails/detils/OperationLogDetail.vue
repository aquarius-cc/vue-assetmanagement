<!--
  OperationLogDetail.vue
  操作日志详情页面（只读展示）
  功能：展示操作日志的完整信息，变更详情（changes 字段）格式化展示，支持导出 Excel
-->
<template>
  <div class="operation-log-detail-page" v-loading="isLoading" element-loading-text="加载中...">
    <div class="child-page-header">
      <h1 class="page-title">操作日志详情</h1>
      <div class="action-buttons">
        <el-button type="primary" :icon="Back" @click="handleBack">返回</el-button>
        <el-button type="warning" :icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>

    <div class="child-page-content">
      <!-- 基本信息 -->
      <el-card class="main-info-card" v-if="detailData">
        <template #header>
          <div class="section-header">
            <el-icon><Document /></el-icon>
            <span class="section-title">基本信息</span>
          </div>
        </template>
        <div class="info-grid">
          <div class="info-column">
            <div class="info-item">
              <span class="info-label">ID：</span>
              <span class="info-value">{{ detailData.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">日志 ID：</span>
              <span class="info-value">{{ detailData.logging_id || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">资产编码：</span>
              <span class="info-value">{{ detailData.asset_code || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">资产名称：</span>
              <span class="info-value">{{ detailData.asset_name || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">操作类型：</span>
              <span class="info-value">
                <el-tag :type="getOperationTypeTagType(detailData.operation_type)">
                  {{ getOperationTypeText(detailData.operation_type) }}
                </el-tag>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">操作人：</span>
              <span class="info-value">{{ detailData.operator_name || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">操作人工号：</span>
              <span class="info-value">{{ detailData.operator_jobcode || 'N/A' }}</span>
            </div>
          </div>
          <div class="info-column">
            <div class="info-item">
              <span class="info-label">操作时间：</span>
              <span class="info-value">{{ formatDate(detailData.operation_time) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">IP 地址：</span>
              <span class="info-value">{{ detailData.ip_address || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">描述：</span>
              <span class="info-value">{{ detailData.description || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">操作时间：</span>
              <span class="info-value">{{ formatDate(detailData.operation_time) }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 变更详情 -->
      <el-card class="changes-card" v-if="detailData && parsedChanges.length > 0">
        <template #header>
          <div class="section-header">
            <el-icon><List /></el-icon>
            <span class="section-title">变更详情</span>
          </div>
        </template>
        <el-table :data="parsedChanges" border stripe style="width: 100%">
          <el-table-column prop="field" label="字段名称" width="180" align="center" />
          <el-table-column prop="old_value" label="变更前" min-width="200">
            <template #default="{ row }">
              <span class="change-old">{{ row.old_value || '(空)' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="new_value" label="变更后" min-width="200">
            <template #default="{ row }">
              <span class="change-new">{{ row.new_value || '(空)' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 无变更详情提示 -->
      <el-card class="changes-card" v-else-if="detailData">
        <template #header>
          <div class="section-header">
            <el-icon><List /></el-icon>
            <span class="section-title">变更详情</span>
          </div>
        </template>
        <el-empty description="该操作无变更详情记录" :image-size="60" />
      </el-card>

      <!-- 加载失败或无数据 -->
      <div v-else-if="!isLoading">
        <el-empty description="未找到操作日志详情数据" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'OperationLogDetail',
}
</script>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Download, Document, List } from '@element-plus/icons-vue'
import { useOperationLogStore } from '@/stores/operationLogStore'
import { useExcelExport } from '@/composables/useExcelExport'
import type { ColumnConfig } from '@/utils/excelExporter'
import type { OperationLog } from '@/utils/OperationLog'
import { operationTypeMapping, operationTypeTagMapping } from '@/utils/OperationLog'
import { formatDate } from '@/utils/Format'
import type { ChangeRecord } from '@/types/form-helpers'

// ===== 操作类型辅助函数 =====

/**
 * 获取操作类型的标签颜色
 */
const getOperationTypeTagType = (
  type: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'default' => {
  if (!type) return 'info'
  return operationTypeTagMapping[type] || 'info'
}

/**
 * 获取操作类型的中文文本
 */
const getOperationTypeText = (type: string | null | undefined): string => {
  if (!type) return '未知'
  return operationTypeMapping[type] || type
}

// ===== 状态与实例 =====
const props = defineProps<{
  /** 操作日志主键 pk（通过路由 query 传入） */
  pk?: string | number
}>()

const route = useRoute()
const router = useRouter()
const operationLogStore = useOperationLogStore()
const isLoading = ref(true)
const detailData = ref<OperationLog | null>(null)

/** 解析后的变更详情列表 */
const parsedChanges = computed<ChangeRecord[]>(() => {
  if (!detailData.value) return []
  // 后端 changes 字段不存在，使用 before_data/after_data 对比
  return []
})

// ===== Excel 导出配置 =====
const { exportDetail } = useExcelExport()

const exportColumns: ColumnConfig<OperationLog>[] = [
  { title: 'ID', key: 'id', default: '' },
  { title: '日志ID', key: 'logging_id', default: '' },
  { title: '资产编码', key: 'asset_code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  {
    title: '操作类型',
    key: 'operation_type',
    default: '',
    formatter: (v) => getOperationTypeText(v as string),
  },
  { title: '操作人', key: 'operator_name', default: '' },
  { title: '操作人工号', key: 'operator_jobcode', default: '' },
  {
    title: '操作时间',
    key: 'operation_time',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  { title: '描述', key: 'description', default: '' },
  { title: 'IP地址', key: 'ip_address', default: '' },
  {
    title: '操作时间',
    key: 'operation_time',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
]

// ===== 加载详情数据 =====
const loadDetail = async (pk: string | number) => {
  try {
    const detail = await operationLogStore.getById(String(pk))
    if (!detail) {
      ElMessage.error('未找到对应操作日志')
      router.back()
      return
    }
    detailData.value = detail
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('加载操作日志详情失败，请稍后重试')
  }
}

// ===== 生命周期 =====
onMounted(async () => {
  // 支持 props.pk 和 route.query.pk 两种传参方式
  const queryPk = route.query.pk
  const pk = props.pk || (Array.isArray(queryPk) ? queryPk[0] : queryPk)
  if (!pk) {
    ElMessage.error('缺少操作日志标识参数')
    router.back()
    isLoading.value = false
    return
  }
  await loadDetail(pk)
  isLoading.value = false
})

// ===== 事件处理 =====
const handleBack = () => {
  router.go(-1)
}

const handleExport = async () => {
  if (!detailData.value) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  await exportDetail(
    detailData.value,
    exportColumns,
    `操作日志_${detailData.value.logging_id || detailData.value.id}`,
    '操作日志详情',
  )
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.operation-log-detail-page {
  @include detail-container();
  padding: 24px;
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  background-color: var(--background-color);
}

.child-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color-light);
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.child-page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.main-info-card,
.changes-card {
  @include info-card();
  width: 100%;
  margin-bottom: 0;
}

.section-header {
  @include card-header();
}

.section-title {
  margin-left: 4px;
}

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
  min-width: 110px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  color: var(--text-regular);
  word-break: break-word;
}

/* 变更详情表格样式 */
.change-old {
  color: var(--text-secondary);
  text-decoration: line-through;
}

.change-new {
  color: var(--color-primary-light);
  font-weight: 500;
}

@media (max-width: 768px) {
  .operation-log-detail-page {
    padding: 16px;
  }

  .child-page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .action-buttons {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
