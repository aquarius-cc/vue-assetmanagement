<!--
  OutAssetBasicDetails.vue
  出库资产详情页面
  功能：展示出库资产的完整信息，支持导出 Excel
-->
<template>
  <div class="outasset-detail-page" v-loading="isLoading" element-loading-text="加载中...">
    <!-- 头部标题与操作按钮 -->
    <div class="child-page-header">
      <h1 class="page-title">{{ showOutAssetDetails?.asset_name || '未知资产' }} - 出库资产详情</h1>
      <div class="action-buttons">
        <el-button type="primary" :icon="Back" @click="handleBack">返回</el-button>
        <el-button type="warning" :icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>
    <!-- 资产状态标签 -->
    <div class="status-badges">
      <StatusTag
        :status="showOutAssetDetails?.outasset_current_status || ''"
        map-type="outasset"
        size="large"
        class="status-tag"
      >
        {{ '资产状态：' + getAssetStatusText(showOutAssetDetails?.outasset_current_status || '') }}
      </StatusTag>
    </div>
    <!-- 内容区：使用 InfoCard 组件展示 4 个语义卡片 -->
    <div class="child-page-content">
      <template v-if="showOutAssetDetails">
        <InfoCard :config="basicInfoConfig" />
        <InfoCard :config="contractInfoConfig" />
        <InfoCard :config="applicantInfoConfig" v-if="showOutAssetDetails?.outasset_applicant" />
        <InfoCard :config="managerInfoConfig" v-if="showOutAssetDetails?.outasset_manager" />
      </template>

      <!-- 空状态提示 -->
      <div v-else-if="!isLoading">
        <el-empty description="未找到出库资产详情数据" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'OutAssetBasicDetails', // 必须与路由 meta.componentName 一致
}
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
import StatusTag from '@/components/commoncomponents/StatusTag.vue'
import type { ColumnConfig } from '@/utils/excelExporter'
import type { OutAssetDetail } from '@/types/outasset'
import type { EmployeeExtended } from '@/types/user'
import type { AssetDetail } from '@/types/asset'
import { formatDate, outassetTypeMapping } from '@/utils/Format'
import { getAssetStatusText } from '@/utils/statusMapping'

// ========== 辅助函数：枚举转文本（安全处理 null/undefined）==========
/**
 * 获取出库类型文本
 * @param value 类型值（如 'normal', 'scrap' 等）
 * @returns 可读的中文类型 */
const getOutAssetTypeText = (value: string | null | undefined): string => {
  if (!value) return '未知'
  return outassetTypeMapping[value] || value
}

// ========== 路由与状态管理==========
const route = useRoute()
const router = useRouter()
const outAssetStore = useOutAssetStore()
const assetStore = useAssetStore()
const userStore = useUserStore()

const isLoading = ref(true) // 页面加载状态
// const searched = ref(false) // 搜索状态
const showOutAssetDetails = ref<OutAssetDetail | null>(null) // 出库资产详情

// 关联数据（申请人、保管人、所属资产）
const applicantUser = ref<EmployeeExtended | null>(null)
const managerUser = ref<EmployeeExtended | null>(null)
const assetContract = ref<AssetDetail | null>(null)

// ========== InfoCard 卡片配置：通过 composable 生成 4 个语义卡片==========
/**
 * 卡片数据源：将页面中的响应式数据聚合为 composable 所需的格式
 * 包含出库资产主详情、申请人、保管人、关联合同信息
 */
const cardData = computed(() => ({
  detail: showOutAssetDetails.value,
  applicantUser: applicantUser.value,
  managerUser: managerUser.value,
  assetContract: assetContract.value,
}))

/**
 * 使用 useOutAssetDetailCards composable 生成 4 个语义卡片的 InfoCardConfig：
 * - basicInfoConfig: 基本信息卡片（11 个字段，Document 图标）
 * - contractInfoConfig: 合同信息卡片（2 个字段，Tickets 图标）
 * - applicantInfoConfig: 申请人信息卡片（2 个字段，User 图标）
 * - managerInfoConfig: 保管人信息卡片（2 个字段，UserFilled 图标）
 */
const { basicInfoConfig, contractInfoConfig, applicantInfoConfig, managerInfoConfig } =
  useOutAssetDetailCards(cardData)

// ========== 计算属性：安全展示关联信息（避免模板中出现 null）==========
/** 申请人展示信息（姓名/部门）*/
const displayApplicantInfo = computed(() => ({
  name: applicantUser.value?.employee_name || 'N/A',
  dept: applicantUser.value?.employee_department_name || 'N/A',
}))

/** 保管人展示信息（姓名/部门）*/
const displayManagerInfo = computed(() => ({
  name: managerUser.value?.employee_name || 'N/A',
  dept: managerUser.value?.employee_department_name || 'N/A',
}))

// ========== 导出功能配置 ==========
const { exportDetail } = useExcelExport()

/** 导出列配置：定义导出的字段及格式化规则 */
const exportColumns: ColumnConfig<OutAssetDetail>[] = [
  { title: '出库唯一标识', key: 'recordcode', default: '' },
  { title: '入库标识', key: 'asset_recordcode', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  {
    title: '出库时间',
    key: 'outasset_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '', // 确保返回 string
  },
  { title: '申请人工号', key: 'applicant_jobcode', default: '' },
  {
    title: '申请人姓名',
    key: 'applicant_jobcode', // 无直接字段，使用额外处理
    default: '',
    formatter: () => displayApplicantInfo.value.name,
  },
  { title: '保管人工号', key: 'outasset_manager_jobcode', default: '' },
  {
    title: '保管人姓名',
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
    title: '资产状态',
    key: 'outasset_current_status',
    default: '',
    formatter: (v) => getAssetStatusText((v as string) ?? ''),
  },
  {
    title: '出库类型',
    key: 'outasset_type',
    default: '',
    formatter: (v) => getOutAssetTypeText(v as string),
  },
  { title: '备注描述', key: 'outasset_description', default: '' },
]

// ========== 数据加载 ==========
/**
 * 加载出库资产详情及其关联信息（申请人、保管人、所属资产）
 * @param code 出库资产编码（对应 outasset_recordcode）*/
const loadDetail = async (code: string) => {
  try {
    // 1. 获取主详情
    const detail = await outAssetStore.getById(code)
    if (!detail) {
      ElMessage.error('未找到对应出库资产')
      router.back()
      return
    }
    showOutAssetDetails.value = detail

    // 2. 并行获取关联信息（提升性能）
    const promises: Promise<unknown>[] = []

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

// 组件挂载时执行
onMounted(async () => {
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
/** 返回上一页 */
const handleBack = () => {
  router.go(-1)
}

/** 导出当前详情为 Excel 文件 */
const handleExport = async () => {
  if (!showOutAssetDetails.value) {
    ElMessage.warning('暂无数据可导出')
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
