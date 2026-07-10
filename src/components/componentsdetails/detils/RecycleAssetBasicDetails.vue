<!--
  RecycleAssetBasicDetails.vue
  回收资产详情页面
  功能：展示回收资产的完整信息，支持导�?Excel
-->
<template>
  <div class="recycle-asset-detail-page" v-loading="isLoading" element-loading-text="加载�?..">
    <div class="child-page-header">
      <h1 class="page-title">{{ detailData?.recycle_asset_name || '未知资产' }} �?回收资产详情</h1>
      <div class="action-buttons">
        <el-button type="primary" :icon="Back" @click="handleBack">返回</el-button>
        <el-button type="warning" :icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>

    <!-- 内容区：使用 InfoCard 组件展示 5 个语义卡�?-->
    <div class="child-page-content">
      <template v-if="detailData">
        <InfoCard :config="basicInfoConfig" />
        <InfoCard :config="contractInfoConfig" />
        <InfoCard :config="usingPersonInfoConfig" v-if="detailData?.asset?.asset_manager" />
        <InfoCard :config="recyclePersonInfoConfig" />
        <InfoCard :config="storageInfoConfig" />
      </template>
      <div v-else-if="!isLoading">
        <el-empty description="未找到回收资产详情数�? />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'RecycleAssetBasicDetails',
}
</script>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Download } from '@element-plus/icons-vue'
import { useRecycleAssetStore } from '@/stores/recycleAssetStore'
import { useUserStore } from '@/stores/userStore'
import { useStorageStore } from '@/stores/storageStore'
import { useExcelExport } from '@/composables/useExcelExport'
import { useRecycleAssetDetailCards } from '@/composables/useRecycleAssetDetailCards'
import InfoCard from '@/components/commoncomponents/InfoCard.vue'
import { assetAPI } from '@/api/asset'
import type { ColumnConfig } from '@/utils/excelExporter'
import type { RecycleAssetExtended } from '@/utils/RecycleAsset'
import type { Contract } from '@/types/contract'
import type { EmployeeExtended } from '@/utils/User'
import type { Storage } from '@/utils/Storage'
import { formatDate } from '@/utils/Format'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const recycleAssetStore = useRecycleAssetStore()
/** 用户 Store：用于查询使用人、回收人详细信息 */
const userStore = useUserStore()
/** 仓库 Store：用于查询仓库详细信�?*/
const storageStore = useStorageStore()
const isLoading = ref(true)
const detailData = ref<RecycleAssetExtended | null>(null)

// ===== 关联数据 ref =====
/** 合同详情：通过 assetAPI.getContractByAssetCode 获取 */
const contractDetail = ref<Contract | null>(null)
/** 【v1.1.0 对齐】移�?usingPerson ref，使用人信息通过后端序列化器 FK 链自动返�?*/
/** 回收人详情：通过 userStore.getById 获取 */
const recyclePerson = ref<EmployeeExtended | null>(null)
/** 仓库详情：通过 storageStore.getById 获取 */
const storageDetail = ref<Storage | null>(null)

// ===== InfoCard 卡片配置：通过 composable 生成 5 个语义卡�?=====
/**
 * 卡片数据源：将页面中的响应式数据聚合�?composable 所需的格�? * 【v1.1.0 对齐】移�?usingPerson，使用人信息通过 detail 中的 read_only 字段展示
 */
const cardData = computed(() => ({
  detail: detailData.value,
  contractDetail: contractDetail.value,
  recyclePerson: recyclePerson.value,
  storageDetail: storageDetail.value,
}))

/**
 * 使用 useRecycleAssetDetailCards composable 生成 5 �?InfoCardConfig�? * - basicInfoConfig: 基本信息卡片�? 个字段，Document 图标�? * - contractInfoConfig: 合同信息卡片�? 个字段，Tickets 图标�? * - usingPersonInfoConfig: 使用人信息卡片（2 个字段，User 图标�? * - recyclePersonInfoConfig: 回收人信息卡片（2 个字段，UserFilled 图标�? * - storageInfoConfig: 仓库信息卡片�? 个字段，Location 图标�? */
const {
  basicInfoConfig,
  contractInfoConfig,
  usingPersonInfoConfig,
  recyclePersonInfoConfig,
  storageInfoConfig,
} = useRecycleAssetDetailCards(cardData)

// ===== Excel 导出配置 =====
const { exportDetail } = useExcelExport()

const exportColumns: ColumnConfig<RecycleAssetExtended>[] = [
  { title: 'ID', key: 'id', default: '' },
  { title: '回收记录编码', key: 'recordcode', default: '' },
  { title: '资产编码', key: 'recycle_asset', default: '' },
  { title: '资产名称', key: 'recycle_asset_name', default: '' },
  {
    title: '回收时间',
    key: 'recycle_asset_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  { title: '回收�?, key: 'recycle_person_name', default: '' },
  { title: '回收人工�?, key: 'recycle_person_jobcode', default: '' },
  { title: '回收描述', key: 'recycle_asset_description', default: '' },
  { title: '存放仓库编码', key: 'storage_code', default: '' },
  { title: '存放仓库', key: 'recycle_asset_storage_name', default: '' },
  { title: '回收数量', key: 'recycle_asset_number', default: '' },
  { title: '使用人姓�?, key: 'using_person_name', default: '' },
  { title: '使用人工�?, key: 'using_person_jobcode', default: '' },
]

// ===== 加载详情数据 =====
/**
 * 加载回收资产详情及关联数�? *
 * @description
 * 1. 先获取回收资产主详情
 * 2. 根据主详情中的外键字段，通过 Promise.all 并行加载 3 个关联数据：
 *    - 合同：通过 assetAPI.getContractByAssetCode(recycle_asset)
 *    - 回收人：通过 userStore.getById(recycle_asset_recycle_person_jobcode)
 *    - 仓库：通过 storageStore.getById(recycle_asset_storage_code)
 * 3. 使用人信息通过后端序列化器 FK 链自动返回（using_person_name / using_person_jobcode），无需单独加载
 * 4. 每个查询前检查外键字段是否存在，避免空值调�? */
const loadDetail = async (code: string) => {
  try {
    isLoading.value = true
    const detail = await recycleAssetStore.getById(code)

    if (!detail) {
      ElMessage.error('未找到对应回收资�?)
      router.back()
      return
    }

    detailData.value = detail

    // 并行加载关联数据（提升性能�?    const promises: Promise<unknown>[] = []

    // 合同：直接调�?API（Store 未封装此方法�?    if (detail.recycle_asset) {
      promises.push(
        assetAPI.getContractByAssetCode(detail.recycle_asset).then((contract) => {
          contractDetail.value = contract
        }),
      )
    }

    // 使用�?    // 【v1.1.0 对齐】后端已删除 recycle_asset_using_person_jobcode 字段�?    // 使用人信息通过序列化器 FK 链自动返回（using_person_name / using_person_jobcode），
    // 无需再通过 userStore.getById 单独加载�?    // usingPerson 卡片改为直接使用 detail 中的 read_only 字段展示�?
    // 回收�?    if (detail.recycle_asset_recycle_person_jobcode) {
      promises.push(
        userStore.getById(detail.recycle_asset_recycle_person_jobcode).then((user) => {
          recyclePerson.value = user
        }),
      )
    }

    // 仓库
    if (detail.recycle_asset_storage_code) {
      promises.push(
        storageStore.getById(detail.recycle_asset_storage_code).then((storage) => {
          storageDetail.value = storage
        }),
      )
    }

    await Promise.all(promises)
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('加载回收资产详情失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// ===== 生命周期 =====
onMounted(async () => {
  const code = route.query.code as string
  if (!code) {
    ElMessage.error('缺少回收资产编码参数')
    router.back()
    isLoading.value = false
    return
  }
  await loadDetail(code)
  isLoading.value = false
})

// ===== 事件处理 =====
const handleBack = () => {
  router.go(-1)
}

const handleExport = async () => {
  if (!detailData.value) {
    ElMessage.warning('暂无数据可导�?)
    return
  }
  await exportDetail(
    detailData.value,
    exportColumns,
    `回收资产_${detailData.value.recycle_asset || detailData.value.id}`,
    '回收资产详情',
  )
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.recycle-asset-detail-page {
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
@media (max-width: 768px) {
  .recycle-asset-detail-page {
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
