<!--
  BasicAssetDetails.vue
  资产详情页面（重构版�?
  @description
  展示资产的完整详细信息，包括基本信息、分类信息、合同信息�?  人员信息、存储位置、硬盘序列号等�?
  @architecture
  - 使用 InfoCard 组件展示键值对形式的信息卡�?  - 使用 HardDiskSNCard 组件展示硬盘序列号列�?  - 使用 useAssetInfoCards composable 生成卡片配置

  @features
  - 数据驱动的卡片渲�?  - 支持条件渲染（可选数据块�?  - 支持导出 Excel
  - 支持编辑和返回操�?
  @author System
  @date 2025-06-02
-->

<template>
  <div class="asset-detail-container" v-if="assetDetail">
    <!-- 页面标题和操作按�?-->
    <div class="header-section">
      <div class="title-area">
        <h1 class="page-title">{{ assetDetail.asset_name }}</h1>
        <div class="asset-basic-info">
          <span class="asset-code">{{ assetDetail.asset_code }}</span>
          <span class="asset-brand" v-if="assetDetail.asset_brand">
            {{ assetDetail.asset_brand }}
          </span>
        </div>
      </div>
      <div class="action-buttons">
        <el-button type="primary" :icon="Edit" @click="handleEdit" size="default"> 编辑 </el-button>
        <el-button type="warning" :icon="Download" @click="handleExportExcel" size="default">
          导出
        </el-button>
        <el-button :icon="Back" @click="handleBack" size="default">返回</el-button>
      </div>
    </div>

    <!-- 资产状态标�?-->
    <div class="status-badges">
      <el-tag
        :type="getStatusType(assetDetail.asset_current_status)"
        size="large"
        class="status-tag"
      >
        {{ '资产状态：' + getCurrentStatusText(assetDetail.asset_current_status) }}
      </el-tag>
    </div>

    <!-- 使用 InfoCard 组件展示各类信息 -->
    <InfoCard :config="basicInfoCard" />
    <InfoCard :config="assetTypeCard" />
    <InfoCard :config="contractCard" />
    <InfoCard :config="entryPersonCard" />
    <InfoCard :config="applicantCard" />
    <InfoCard :config="managerCard" />
    <InfoCard :config="storageCard" />
    <InfoCard :config="descriptionCard" />

    <!-- 硬盘序列号卡片（表格形式�?-->
    <!-- v-if="assetDetail.harddisk_sns?.length" -->
    <HardDiskSNCard :harddisk-sns="assetDetail.harddisk_sns" :asset-code="assetDetail.asset_code" />
  </div>

  <!-- 加载状�?-->
  <div v-else-if="isLoading" class="loading-container">
    <div class="loading-content">
      <el-skeleton :rows="12" animated />
      <div class="loading-text">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在加载资产详情...</span>
      </div>
    </div>
  </div>

  <!-- 空状�?-->
  <div v-else class="empty-container">
    <el-empty description="暂无资产数据" />
  </div>
</template>

<script lang="ts">
/**
 * 组件名称定义
 * 用于�?Vue DevTools 中识别组�? */
export default {
  name: 'BasicAssetDetails',
}
</script>

<script lang="ts" setup>
// ===== 导入 =====
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit, Download, Back, Loading } from '@element-plus/icons-vue'
import { useAssetStore } from '@/stores/assetStore'
import { useExcelExport } from '@/composables/useExcelExport'
import { useAssetInfoCards } from '@/composables/useAssetInfoCards'
import InfoCard from '@/components/commoncomponents/InfoCard.vue'
import HardDiskSNCard from '@/components/commoncomponents/HardDiskSNCard.vue'
import type { AssetDetail } from '@/types/asset'
import type { ColumnConfig } from '@/utils/excelExporter'
import { formatDate, assetCurrentStatusMapping } from '@/utils/Format'

// ===== 路由与状�?=====
const router = useRouter()
const route = useRoute()
const assetStore = useAssetStore()
const assetDetail = ref<AssetDetail | null>(null)
const isLoading = ref(true)

// ===== 使用 composable 生成卡片配置 =====
const {
  basicInfoCard,
  assetTypeCard,
  contractCard,
  entryPersonCard,
  applicantCard,
  managerCard,
  storageCard,
  descriptionCard,
} = useAssetInfoCards(assetDetail)

// ===== 辅助函数 =====

/**
 * 获取资产当前状态的中文文本
 * @param value - 状态枚举�? * @returns 中文状态文�? */
const getCurrentStatusText = (value: string | null | undefined): string => {
  if (!value) return '未知状�?
  return assetCurrentStatusMapping[value] || '未知状�?
}

/**
 * 获取状态标签的类型
 * @param status - 状态枚举�? * @returns Element Plus Tag 组件�?type 属性�? */
const getStatusType = (status: string | null | undefined): string => {
  if (!status) return 'info'
  const typeMap: Record<string, string> = {
    in_store: 'success',
    recycled_pending: 'success',
    in_use: 'primary',
    damaged: 'warning',
    scrapped: 'danger',
  }
  return typeMap[status] || 'info'
}

// ===== 生命周期 =====
onMounted(async () => {
  const assetCode = (route.query.code as string) || (route.query.recordcode as string)
  console.log('assetCode', assetCode)
  if (!assetCode || typeof assetCode !== 'string') {
    console.error('无效的资产编码参�?)
    ElMessage.error('无效的资产编码参�?)
    isLoading.value = false
    return
  }

  try {
    const assetData = await assetStore.getById(assetCode)
    if (assetData) {
      assetDetail.value = assetData
    } else {
      ElMessage.warning(`未找到资产编码为 ${assetCode} 的资产`)
    }
  } catch (error) {
    console.error('获取资产详情失败', error)
    ElMessage.error('获取资产详情失败，请重试')
  } finally {
    isLoading.value = false
  }
})

// ===== 导出功能 =====
const { exportDetail } = useExcelExport()

/**
 * 导出列配�? * 定义导出 Excel 时的列映�? */
const detailExportColumns: ColumnConfig<AssetDetail>[] = [
  { title: '资产编码', key: 'asset_code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  { title: '品牌', key: 'asset_brand', default: '' },
  { title: '单位', key: 'asset_unit', default: '' },
  { title: '型号规格', key: 'asset_specification', default: '' },
  { title: '资产分类�?, key: 'asset_type_code', default: '' },
  {
    title: '单价',
    key: 'asset_purchase_price',
    default: '0',
    formatter: (v) => String(v ?? '0'),
  },
  {
    title: '采购数量',
    key: 'asset_purchase_number',
    default: '0',
    formatter: (v) => String(v ?? '0'),
  },
  {
    title: '采购日期',
    key: 'asset_purchase_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '质保�?�?',
    key: 'asset_warranty_period',
    default: '0',
    formatter: (v) => String(v ?? '0'),
  },
  {
    title: '录入日期',
    key: 'asset_entry_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '当前使用状�?,
    key: 'asset_current_status',
    default: '',
    formatter: (v) => getCurrentStatusText(v as string),
  },
  { title: '录入人工�?, key: 'asset_entry_person_jobcode', default: '' },
  { title: '合同编码', key: 'asset_contract_code', default: '' },
  { title: '申请人工�?, key: 'asset_applicant_jobcode', default: '' },
  { title: '保管人工�?, key: 'asset_manager_jobcode', default: '' },
  { title: '使用地点', key: 'asset_using_location', default: '' },
  { title: '仓库编码', key: 'asset_storage_code', default: '' },
  { title: '资产描述', key: 'asset_description', default: '' },
]

/**
 * 导出 Excel
 */
const handleExportExcel = async () => {
  if (!assetDetail.value) {
    ElMessage.warning('暂无资产数据可导�?)
    return
  }
  await exportDetail(
    assetDetail.value,
    detailExportColumns,
    `资产_${assetDetail.value.asset_code}`,
    '资产详情',
  )
}

// ===== 交互方法 =====

/**
 * 返回上一�? */
const handleBack = () => {
  router.go(-1)
}

/**
 * 跳转到编辑页�? */
const handleEdit = () => {
  if (!assetDetail.value?.asset_code) {
    ElMessage.error('资产编码不存在，无法编辑')
    return
  }
  router
    .push({
      name: 'AssetForm',
      query: { code: assetDetail.value.asset_code },
    })
    .catch((err) => {
      ElMessage.error(`跳转到编辑页面失�? ${err.message || '未知错误'}`)
    })
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.asset-detail-container {
  padding: 24px;
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  background-color: var(--background-color);
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color-light);
}

.title-area {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2329;
  margin: 0 0 8px 0;
}

.asset-basic-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.asset-code,
.asset-brand {
  font-size: 14px;
  color: #6b7280;
  background-color: var(--card-background-subtle);
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.status-badges {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.status-tag {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
}

.loading-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: 14px;

  .el-icon {
    font-size: 16px;
  }
}
</style>
