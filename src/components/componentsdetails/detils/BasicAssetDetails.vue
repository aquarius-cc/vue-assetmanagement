<!--
  BasicAssetDetails.vue
  资产详情页面（重构版）
  @description
  展示资产的完整详细信息，包括基本信息、分类信息、合同信息、人员信息、存储位置、硬盘序列号等
  @architecture
  - 使用 InfoCard 组件展示键值对形式的信息卡
  - 使用 HardDiskSNCard 组件展示硬盘序列号列
  - 使用 useAssetInfoCards composable 生成卡片配置

  @features
  - 数据驱动的卡片渲染
  - 支持条件渲染（可选数据块）
  - 支持导出 Excel
  - 支持编辑和返回操作
  @author System
  @date 2025-06-02
-->

<template>
  <div class="asset-detail-container" v-if="assetDetail">
    <!-- 页面标题和操作按钮 -->
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

        <!-- 状态流转操作按钮 -->
        <el-button v-if="canMarkBroken && canOperateAsset" type="danger" @click="handleMarkBroken"
          >标记损坏</el-button
        >
        <el-button v-if="canMarkLost && canOperateAsset" type="danger" @click="handleMarkLost"
          >标记遗失</el-button
        >
        <el-button v-if="canFound && canOperateAsset" type="success" @click="handleFound"
          >找回</el-button
        >
        <el-button v-if="canRepair && canOperateAsset" type="warning" @click="handleRepair"
          >送修</el-button
        >
        <el-button v-if="canRepairDone && canOperateAsset" type="success" @click="handleRepairDone"
          >维修完成</el-button
        >
        <el-button
          v-if="canRepairFailed && canOperateAsset"
          type="danger"
          @click="handleRepairFailed"
          >维修失败</el-button
        >
        <el-button v-if="canScrap && canOperateAsset" type="danger" @click="handleScrap"
          >报废申请</el-button
        >

        <!-- 查看日志（始终显示） -->
        <el-button :icon="Timer" @click="handleViewLogs">状态日志</el-button>

        <el-button :icon="Back" @click="handleBack" size="default">返回</el-button>
      </div>
    </div>

    <!-- 资产状态标签    -->
    <div class="status-badges">
      <StatusTag :status="assetDetail.asset_current_status" size="large" class="status-tag">
        {{ '资产状态：' + getCurrentStatusText(assetDetail.asset_current_status) }}
      </StatusTag>
    </div>

    <!-- CRIT-6: 二维码展示区域 -->
    <div class="qr-code-section" v-if="assetDetail.recordcode">
      <el-card class="qr-card" body-style="padding: 16px; text-align: center;">
        <template #header>
          <div class="qr-card-header">
            <span>资产二维码</span>
            <el-button type="primary" size="small" :icon="Download" @click="downloadQRCode">
              下载
            </el-button>
          </div>
        </template>
        <div class="qr-image-wrapper">
          <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="资产二维码" class="qr-image" />
          <div v-else class="qr-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
          </div>
        </div>
        <p class="qr-hint">扫码查看资产公开信息</p>
      </el-card>
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

    <!-- 硬盘序列号卡片（表格形式） -->
    <!-- v-if="assetDetail.harddisk_sns?.length" -->
    <HardDiskSNCard :harddisk-sns="assetDetail.harddisk_sns" :asset-code="assetDetail.asset_code" />
  </div>

  <!-- 加载状态 -->
  <div v-else-if="isLoading" class="loading-container">
    <div class="loading-content">
      <el-skeleton :rows="12" animated />
      <div class="loading-text">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在加载资产详情...</span>
      </div>
    </div>
  </div>

  <!-- 空状态 -->
  <div v-else class="empty-container">
    <el-empty description="暂无资产数据" />
  </div>
</template>


<script lang="ts" setup>
defineOptions({ name: 'BasicAssetDetails' })

// ===== 导入 =====
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit, Download, Back, Loading, Timer } from '@element-plus/icons-vue'
import { useAssetStore } from '@/stores/assetStore'
import { useExcelExport } from '@/composables/useExcelExport'
import { useAssetInfoCards } from '@/composables/useAssetInfoCards'
import InfoCard from '@/components/commoncomponents/InfoCard.vue'
import HardDiskSNCard from '@/components/commoncomponents/HardDiskSNCard.vue'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'
import type { AssetDetail } from '@/types/asset'
import type { ColumnConfig } from '@/utils/excelExporter'
import { formatDate, getAssetStatusText } from '@/utils/Format'
import { usePermission } from '@/composables/usePermission'
import { useAssetStatusChecks } from '@/composables/useAssetStatus'
import { BASE_URL } from '@/api/config'
// import { useOperationGuard } from '@/composables/useOperationGuard'

// ===== 路由与状态管理 =====
const router = useRouter()
const route = useRoute()
const assetStore = useAssetStore()
const assetDetail = ref<AssetDetail | null>(null)
const isLoading = ref(true)
const qrCodeUrl = ref('')

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
 * 统一委托 Format.getAssetStatusText（C-1 决策: 未知状态回退原始值）
 * @param value - 状态枚举值
 * @returns 中文状态名称
 */
const getCurrentStatusText = (value: string | null | undefined): string => {
  return getAssetStatusText(value)
}

// ===== 状态流转按钮可见性 =====
const currentStatus = computed(() => assetDetail.value?.asset_current_status)

// 解构出所有需要的判断
const {
  canMarkBroken,
  canMarkLost,
  canFound,
  canRepair,
  canRepairDone,
  canRepairFailed,
  canScrap,
} = useAssetStatusChecks(currentStatus)

// ===== 刷新详情 =====
// const refreshDetail = async () => {
//   const assetCode = assetDetail.value?.recordcode
//   if (!assetCode) return
//   try {
//     const data = await assetStore.getById(assetCode)
//     if (data) assetDetail.value = data
//   } catch (error) {
//     console.error('刷新资产详情失败', error)
//   }
// }

// 新增
const { canOperateAsset } = usePermission()

// ===== 状态流转操作 =====
// 注意：后端 AssetViewSet 使用 lookup_field="recordcode"，
// 操作视图通过 useAssetOperationForm 调用 getAssetByCode 和操作 API，
// 因此路由参数必须传递 recordcode（而非 asset_code），否则 get_object() 会 404。
const handleMarkBroken = () => {
  router.push({ name: 'MarkBroken', params: { code: assetDetail.value!.recordcode } })
}

const handleMarkLost = () => {
  router.push({ name: 'LostAsset', params: { code: assetDetail.value!.recordcode } })
}

const handleFound = () => {
  router.push({ name: 'FoundAsset', params: { code: assetDetail.value!.recordcode } })
}

const handleRepair = () => {
  router.push({ name: 'RepairAsset', params: { code: assetDetail.value!.recordcode } })
}

const handleRepairDone = () => {
  router.push({ name: 'RepairDone', params: { code: assetDetail.value!.recordcode } })
}

const handleRepairFailed = () => {
  router.push({ name: 'RepairFailed', params: { code: assetDetail.value!.recordcode } })
}

const handleScrap = () => {
  router.push({ name: 'ScrapAsset', params: { code: assetDetail.value!.recordcode } })
}

const handleViewLogs = () => {
  router.push({ name: 'AssetLogs', params: { code: assetDetail.value!.recordcode } })
}

// CRIT-6: 下载二维码
const downloadQRCode = () => {
  if (!qrCodeUrl.value) return
  const link = document.createElement('a')
  link.href = qrCodeUrl.value
  link.download = `qr_${assetDetail.value?.asset_code || 'asset'}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ===== 生命周期 =====
onMounted(async () => {
  const assetCode = (route.query.code as string) || (route.query.recordcode as string)
  console.log('assetCode', assetCode)
  if (!assetCode || typeof assetCode !== 'string') {
    console.error('无效的资产编码参数')
    ElMessage.error('无效的资产编码参数')
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

  // CRIT-6: 生成二维码 URL
  if (assetDetail.value?.recordcode) {
    qrCodeUrl.value = `${BASE_URL}/assets/${assetDetail.value.recordcode}/qr-code-image/`
  }
})

// ===== 导出功能 =====
const { exportDetail } = useExcelExport()

/**
 * 导出列配置
 * @description 定义导出 Excel 时的列映射
 */
const detailExportColumns: ColumnConfig<AssetDetail>[] = [
  { title: '资产编码', key: 'asset_code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  { title: '品牌', key: 'asset_brand', default: '' },
  { title: '单位', key: 'asset_unit', default: '' },
  { title: '型号规格', key: 'asset_specification', default: '' },
  { title: '资产分类', key: 'asset_type_code', default: '' },
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
    title: '质保期',
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
    title: '当前使用状态',
    key: 'asset_current_status',
    default: '',
    formatter: (v) => getCurrentStatusText(v as string),
  },
  { title: '录入人工号', key: 'asset_entry_person_jobcode', default: '' },
  { title: '合同编码', key: 'asset_contract_code', default: '' },
  { title: '申请人工号', key: 'asset_applicant_jobcode', default: '' },
  { title: '保管人工号', key: 'asset_manager_jobcode', default: '' },
  { title: '使用地点', key: 'asset_using_location', default: '' },
  { title: '仓库编码', key: 'asset_storage_code', default: '' },
  { title: '资产描述', key: 'asset_description', default: '' },
]

/**
 * 导出 Excel
 */
const handleExportExcel = async () => {
  if (!assetDetail.value) {
    ElMessage.warning('暂无资产数据可导出')
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
 * 返回上一页
 * @description 点击返回按钮，返回上一页
 */
const handleBack = () => {
  router.go(-1)
}

/**
 * 跳转到编辑页
 * @description 点击编辑按钮，跳转到编辑页
 */
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
      ElMessage.error(`跳转到编辑页面失败: ${err.message || '未知错误'}`)
    })
}
</script>

<style lang="scss" scoped src="./BasicAssetDetails.scss"></style>