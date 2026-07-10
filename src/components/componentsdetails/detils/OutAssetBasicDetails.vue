<!--
  OutAssetBasicDetails.vue
  出库资产详情页面
  功能：展示出库资产的完整信息，支持导�?Excel
-->
<template>
  <div class="outasset-detail-page" v-loading="isLoading" element-loading-text="加载�?..">
    <!-- 头部标题与操作按�?-->
    <div class="child-page-header">
      <h1 class="page-title">{{ showOutAssetDetails?.asset_name || '未知资产' }} �?出库资产详情</h1>
      <div class="action-buttons">
        <el-button type="primary" :icon="Back" @click="handleBack">返回</el-button>
        <el-button type="warning" :icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>
    <!-- 资产状态标�?-->
    <div class="status-badges">
      <el-tag
        :type="getStatusType(showOutAssetDetails?.outasset_current_status)"
        size="large"
        class="status-tag"
      >
        {{
          '资产状态：' + getOutAssetStatusText(showOutAssetDetails?.outasset_current_status || '')
        }}
      </el-tag>
    </div>
    <!-- 内容区：使用 InfoCard 组件展示 4 个语义卡�?-->
    <div class="child-page-content">
      <template v-if="showOutAssetDetails">
        <InfoCard :config="basicInfoConfig" />
        <InfoCard :config="contractInfoConfig" />
        <InfoCard :config="applicantInfoConfig" v-if="showOutAssetDetails?.outasset_applicant" />
        <InfoCard :config="managerInfoConfig" v-if="showOutAssetDetails?.outasset_manager" />
      </template>

      <!-- 空状态提�?-->
      <div v-else-if="!isLoading">
        <el-empty description="未找到出库资产详情数�? />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'OutAssetBasicDetails', // 必须与路�?meta.componentName 一�?}
</script>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Download } from '@element-plus/icons-vue'
import { useOutAssetStore } from '@/stores/outAssetStore'
import { useAssetStore } from '@/stores/assetStore'
import { useUserStore } from '@/stores/userStore'
import { useExcelExport } from '@/composables/useExcelExport'
import { useOutAssetDetailCards } from '@/composables/useOutAssetDetailCards'
import InfoCard from '@/components/commoncomponents/InfoCard.vue'
import type { ColumnConfig } from '@/utils/excelExporter'
import type { OutAssetDetail } from '@/utils/OutAsset'
import type { EmployeeExtended } from '@/utils/User'
import type { AssetDetail } from '@/types/asset'
import { formatDate, outassetStatusMapping, outassetTypeMapping } from '@/utils/Format'

// ========== 辅助函数：枚举转文本（安全处�?null/undefined�?==========
/**
 * 获取资产状态文�? * @param value 状态值（�?'in_use', 'returned' 等）
 * @returns 可读的中文状�? */
const getOutAssetStatusText = (value: string | null | undefined): string => {
  if (!value) return '未知'
  return outassetStatusMapping[value] || value
}

/**
 * 获取出库类型文本
 * @param value 类型值（�?'normal', 'scrap' 等）
 * @returns 可读的中文类�? */
const getOutAssetTypeText = (value: string | null | undefined): string => {
  if (!value) return '未知'
  return outassetTypeMapping[value] || value
}

// ========== 路由与状态管�?==========
const route = useRoute()
const router = useRouter()
const outAssetStore = useOutAssetStore()
const assetStore = useAssetStore()
const userStore = useUserStore()

const isLoading = ref(true) // 页面加载状�?const showOutAssetDetails = ref<OutAssetDetail | null>(null) // 出库资产详情

// 关联数据（申请人、保管人、所属资产）
const applicantUser = ref<EmployeeExtended | null>(null)
const managerUser = ref<EmployeeExtended | null>(null)
const assetContract = ref<AssetDetail | null>(null)

// ========== InfoCard 卡片配置：通过 composable 生成 4 个语义卡�?==========
/**
 * 卡片数据源：将页面中的响应式数据聚合�?composable 所需的格�? * 包含出库资产主详情、申请人、保管人、关联合同信�? */
const cardData = computed(() => ({
  detail: showOutAssetDetails.value,
  applicantUser: applicantUser.value,
  managerUser: managerUser.value,
  assetContract: assetContract.value,
}))

/**
 * 使用 useOutAssetDetailCards composable 生成 4 �?InfoCardConfig�? * - basicInfoConfig: 基本信息卡片�?1 个字段，Document 图标�? * - contractInfoConfig: 合同信息卡片�? 个字段，Tickets 图标�? * - applicantInfoConfig: 申请人信息卡片（2 个字段，User 图标�? * - managerInfoConfig: 保管人信息卡片（2 个字段，UserFilled 图标�? */
const { basicInfoConfig, contractInfoConfig, applicantInfoConfig, managerInfoConfig } =
  useOutAssetDetailCards(cardData)

// ========== 计算属性：安全展示关联信息（避免模板中出现 null�?==========
/** 申请人展示信息（姓名/部门�?*/
const displayApplicantInfo = computed(() => ({
  name: applicantUser.value?.employee_name || 'N/A',
  dept: applicantUser.value?.employee_department_name || 'N/A',
}))

/** 保管人展示信息（姓名/部门�?*/
const displayManagerInfo = computed(() => ({
  name: managerUser.value?.employee_name || 'N/A',
  dept: managerUser.value?.employee_department_name || 'N/A',
}))

// ========== 导出功能配置 ==========
const { exportDetail } = useExcelExport()

/** 导出列配置：定义导出的字段及格式化规�?*/
const exportColumns: ColumnConfig<OutAssetDetail>[] = [
  { title: '出库唯一标识�?, key: 'recordcode', default: '' },
  { title: '入库标识�?, key: 'asset_recordcode', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  {
    title: '出库时间',
    key: 'outasset_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '', // 确保返回 string
  },
  { title: '申请人工�?, key: 'applicant_jobcode', default: '' },
  {
    title: '申请人姓�?,
    key: 'applicant_jobcode', // 无直接字段，使用额外处理
    default: '',
    formatter: () => displayApplicantInfo.value.name,
  },
  { title: '保管人工�?, key: 'outasset_manager_jobcode', default: '' },
  {
    title: '保管人姓�?,
    key: 'outasset_manager_name',
    default: '',
    formatter: () => displayManagerInfo.value.name,
  },
  {
    title: '归还日期',
    key: 'return_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '资产状�?,
    key: 'outasset_current_status',
    default: '',
    formatter: (v) => getOutAssetStatusText(v as string),
  },
  {
    title: '出库类型',
    key: 'outasset_type',
    default: '',
    formatter: (v) => getOutAssetTypeText(v as string),
  },
  { title: '备注描述', key: 'outasset_description', default: '' },
]

const getStatusType = (status: string | null | undefined): string => {
  if (!status) return 'info'
  const typeMap: Record<string, string> = {
    in_use: 'success',
    recycled_pending: 'primary',
    damaged: 'warning',
    scrapped: 'danger',
  }
  return typeMap[status] || 'info'
}
// ========== 数据加载 ==========
/**
 * 加载出库资产详情及其关联信息（申请人、保管人、所属资产）
 * @param code 出库资产编码（对�?outasset_recordcode�? */
const loadDetail = async (code: string) => {
  try {
    // 1. 获取主详�?    const detail = await outAssetStore.getById(code)
    if (!detail) {
      ElMessage.error('未找到对应出库资�?)
      router.back()
      return
    }
    showOutAssetDetails.value = detail

    // 2. 并行获取关联信息（提升性能�?    const promises: Promise<unknown>[] = []

    if (detail.outasset_applicant_jobcode) {
      promises.push(
        userStore.getById(detail.outasset_applicant_jobcode).then((user) => {
          applicantUser.value = user
        }),
      )
    }
    if (detail.outasset_manager_jobcode) {
      promises.push(
        userStore.getById(detail.outasset_manager_jobcode).then((user) => {
          managerUser.value = user
        }),
      )
    }
    if (detail.outasset_code) {
      promises.push(
        assetStore.getById(detail.outasset_code).then((asset) => {
          assetContract.value = asset
        }),
      )
    }

    await Promise.all(promises)
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('加载出库资产详情失败，请稍后重试')
  }
}

// 组件挂载时执�?onMounted(async () => {
  const code = route.query.code as string
  console.log('query code:', code)
  if (!code) {
    ElMessage.error('缺少出库资产编码参数')
    router.back()
    isLoading.value = false
    return
  }
  await loadDetail(code)
  isLoading.value = false
})

// ========== 交互方法 ==========
/** 返回上一�?*/
const handleBack = () => {
  router.go(-1)
}

/** 导出当前详情�?Excel 文件 */
const handleExport = async () => {
  if (!showOutAssetDetails.value) {
    ElMessage.warning('暂无数据可导�?)
    return
  }
  await exportDetail(
    showOutAssetDetails.value,
    exportColumns,
    `出库资产_${showOutAssetDetails.value.outasset_code}`,
    '出库资产详情',
  )
}
</script>

<style lang="scss" scoped>
// 使用公共样式 mixin（符合规范）
@use '@/assets/styles/common-forms.scss' as *;

.outasset-detail-page {
  @include detail-container();
  padding: 24px;
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
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

/* 响应式适配 */
@media (max-width: 768px) {
  .outasset-detail-page {
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
}
</style>
