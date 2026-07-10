<!--
  ContractOfDetails.vue
  合同详情页面
  功能：展示合同完整信息，支持导出 Excel
-->
<template>
  <div class="contract-detail-page" v-loading="isLoading" element-loading-text="加载�?..">
    <div class="child-page-header">
      <h1 class="page-title">{{ contractDetails?.contract_name || '未知合同' }} �?合同详情</h1>
      <div class="action-buttons">
        <el-button type="primary" :icon="Back" @click="handleBack">返回</el-button>
        <el-button type="warning" :icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>

    <div class="child-page-content">
      <el-card class="main-info-card" v-if="contractDetails">
        <template #header>
          <div class="section-header">
            <el-icon><Document /></el-icon>
            <span class="section-title">基本信息</span>
          </div>
        </template>
        <div class="info-grid">
          <div class="info-column">
            <div class="info-item">
              <span class="info-label">合同唯一标识�?/span
              ><span class="info-value">{{ contractDetails.recordcode || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">合同编码�?/span
              ><span class="info-value">{{ contractDetails.contract_code }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">合同名称�?/span
              ><span class="info-value">{{ contractDetails.contract_name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">合同类型�?/span
              ><span class="info-value">{{
                getContractTypeText(contractDetails.contract_type)
              }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">供应商：</span
              ><span class="info-value">{{ contractDetails.contract_supplier }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">质保�?�?�?/span
              ><span class="info-value">{{ contractDetails.contract_warranty_period ?? 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">合同价格�?/span
              ><span class="info-value price"
                >¥{{ formatNumber(contractDetails.contract_price) }}</span
              >
            </div>
          </div>
          <div class="info-column">
            <div class="info-item">
              <span class="info-label">签订日期�?/span
              ><span class="info-value">{{
                formatDate(contractDetails.contract_signing_date)
              }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">结算状态：</span>
              <el-tag
                :type="
                  contractDetails.contract_settledment_status === 'settled' ? 'success' : 'primary'
                "
                size="default"
              >
                {{ getSettlementStatusText(contractDetails.contract_settledment_status) }}
              </el-tag>
            </div>
            <div class="info-item">
              <span class="info-label">结算价格�?/span
              ><span class="info-value price"
                >¥{{ formatNumber(contractDetails.contract_settledment_price) }}</span
              >
            </div>
            <div class="info-item">
              <span class="info-label">初验日期�?/span
              ><span class="info-value">{{
                formatDate(contractDetails.contract_preliminary_acceptance_date)
              }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">终验日期�?/span
              ><span class="info-value">{{
                formatDate(contractDetails.contract_final_acceptance_date)
              }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">付款次数�?/span
              ><span class="info-value">{{ contractDetails.contract_paid_count_number ?? 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">已支付金额：</span
              ><span class="info-value price"
                >¥{{ formatNumber(contractDetails.contract_paid_price) }}</span
              >
            </div>
          </div>
        </div>
        <div class="info-item full-width">
          <span class="info-label">最后更新时间：</span>
          <span class="info-value">{{ formatDate(contractDetails.updated_at) || '�? }}</span>
        </div>
        <div class="info-item full-width">
          <span class="info-label">支付记录�?/span>
          <span class="info-value">{{ contractDetails.contract_paid_record || '�? }}</span>
        </div>
      </el-card>
      <div v-else-if="!isLoading"><el-empty description="未找到合同详情数�? /></div>
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'ContractOfDetails' }
</script>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Download, Document } from '@element-plus/icons-vue'
import { useContractStore } from '@/stores/contractStore'
import { useExcelExport } from '@/composables/useExcelExport'
import type { Contract } from '@/types/contract'
import type { ColumnConfig } from '@/utils/excelExporter'
import {
  formatDate,
  formatNumber,
  contractSettlementStatusMapping,
  contractTypeMapping,
} from '@/utils/Format'

// ========== 辅助函数：枚举值转中文 ==========
const getContractTypeText = (value: string | null | undefined): string => {
  if (!value) return '未知'
  return contractTypeMapping[value] || value
}
const getSettlementStatusText = (value: string | null | undefined): string => {
  if (!value) return '未知'
  return contractSettlementStatusMapping[value] || value
}

// ========== 路由与状�?==========
const route = useRoute()
const router = useRouter()
const contractStore = useContractStore()
const isLoading = ref(true)
const contractDetails = ref<Contract | null>(null)

// ========== 导出配置 ==========
const { exportDetail } = useExcelExport()
const exportColumns: ColumnConfig<Contract>[] = [
  { title: '合同编码', key: 'contract_code', default: '' },
  { title: '合同名称', key: 'contract_name', default: '' },
  {
    title: '合同类型',
    key: 'contract_type',
    default: '',
    formatter: (v) => getContractTypeText(v as string) ?? '',
  },
  { title: '供应�?, key: 'contract_supplier', default: '' },
  {
    title: '合同价格',
    key: 'contract_price',
    default: '0',
    formatter: (v) => formatNumber(v as number) || '0',
  },
  {
    title: '签订日期',
    key: 'contract_signing_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  { title: '质保�?�?', key: 'contract_warranty_period', default: '0' },
  {
    title: '初验日期',
    key: 'contract_preliminary_acceptance_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '终验日期',
    key: 'contract_final_acceptance_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '结算状�?,
    key: 'contract_settledment_status',
    default: '',
    formatter: (v) => getSettlementStatusText(v as string) ?? '',
  },
  {
    title: '结算价格',
    key: 'contract_settledment_price',
    default: '0',
    formatter: (v) => formatNumber(v as number) || '0',
  },
  { title: '已付款次�?, key: 'contract_paid_count_number', default: '0' },
  {
    title: '已支付金�?,
    key: 'contract_paid_price',
    default: '0',
    formatter: (v) => formatNumber(v as number) || '0',
  },
  { title: '支付记录', key: 'contract_paid_record', default: '' },
]

// ========== 加载详情 ==========
const loadContractDetail = async (code: string) => {
  try {
    const detail = await contractStore.getById(code)
    if (!detail) throw new Error('合同不存�?)
    contractDetails.value = detail
  } catch (error) {
    console.error('获取合同详情失败:', error)
    ElMessage.error('获取合同详情失败，请重试')
    router.back()
  }
}

onMounted(async () => {
  const code = (route.query.code as string) || (route.params.code as string)
  if (!code) {
    ElMessage.error('缺少合同编码参数')
    router.back()
    return
  }
  await loadContractDetail(code)
  isLoading.value = false
})

// ========== 交互方法 ==========
const handleBack = () => router.go(-1)
const handleExport = async () => {
  if (!contractDetails.value) return ElMessage.warning('暂无数据可导�?)
  await exportDetail(
    contractDetails.value,
    exportColumns,
    `合同_${contractDetails.value.contract_code}`,
    '合同详情',
  )
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.contract-detail-page {
  @include detail-container();
  padding: 24px;
  background-color: #f5f7fa;
}
.child-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
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
.main-info-card {
  @include info-card();
  width: 100%;
  margin-bottom: 0;
}
.section-header {
  // card-header 样式（与 info-card mixin 内的 .card-header 一致）
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: $text-dark;
  padding: 12px 16px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
.section-title {
  margin-left: 5px;
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
  border-bottom: 1px solid #f0f0f0;
}
.info-label {
  min-width: 120px;
  font-weight: 600;
  color: #303133;
  flex-shrink: 0;
}
.info-value {
  flex: 1;
  color: #606266;
  word-break: break-word;
  &.price {
    font-weight: 500;
    color: #e6a23c;
  }
}
.full-width {
  grid-column: 1 / -1;
  margin-top: 8px;
}
@media (max-width: 768px) {
  .contract-detail-page {
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
