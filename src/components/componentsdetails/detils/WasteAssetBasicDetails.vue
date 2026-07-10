<!--
  WasteAssetBasicDetails.vue
  已报废资产详情页面
  功能：展示已报废资产的完整信息，支持导出 Excel
-->
<template>
  <div class="waste-asset-detail-page" v-loading="isLoading" element-loading-text="加载中...">
    <div class="child-page-header">
      <h1 class="page-title">
        {{ detailData?.asset_name || '未知资产' }} — 已报废资产详情
      </h1>
      <div class="action-buttons">
        <el-button type="primary" :icon="Back" @click="handleBack">返回</el-button>
        <el-button type="warning" :icon="Download" @click="handleExport">导出</el-button>
      </div>
    </div>

    <div class="child-page-content">
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
              <span class="info-value">{{ detailData.id || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">已报废资产编码：</span>
              <span class="info-value">{{ detailData.waste_asset_code || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">资产编码：</span>
              <span class="info-value">{{ detailData.waste_asset_code || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">资产名称：</span>
              <span class="info-value">{{ detailData.asset_name || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">已报废数量：</span>
              <span class="info-value">{{ detailData.waste_asset_number }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">报废日期：</span>
              <span class="info-value">{{ formatDate(detailData.waste_asset_date) }}</span>
            </div>
          </div>
          <div class="info-column">
            <div class="info-item">
              <span class="info-label">合同编码：</span>
              <span class="info-value">{{ detailData.waste_asset_contract_code || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">合同名称：</span>
              <span class="info-value">{{ detailData.contract_name || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">报废描述：</span>
              <span class="info-value">{{ detailData.waste_asset_description || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">创建时间：</span>
              <span class="info-value">{{ formatDate(detailData.create_time) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">更新时间：</span>
              <span class="info-value">{{ formatDate(detailData.update_time) }}</span>
            </div>
          </div>
        </div>
      </el-card>
      <div v-else-if="!isLoading">
        <el-empty description="未找到已报废资产详情数据" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'WasteAssetBasicDetails',
}
</script>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Download, Document } from '@element-plus/icons-vue'
import { useWasteAssetStore } from '@/stores/wasteAssetStore'
import { useExcelExport } from '@/composables/useExcelExport'
import type { ColumnConfig } from '@/utils/excelExporter'
import type { WasteAsset } from '@/utils/WasteAsset'
import { formatDate } from '@/utils/Format'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const wasteAssetStore = useWasteAssetStore()
const isLoading = ref(true)
const detailData = ref<WasteAsset | null>(null)

// ===== Excel 导出配置 =====
const { exportDetail } = useExcelExport()

const exportColumns: ColumnConfig<WasteAsset>[] = [
  { title: 'ID', key: 'id', default: '' },
  { title: '已报废资产编码', key: 'waste_asset_code', default: '' },
  { title: '资产编码', key: 'waste_asset_code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  { title: '已报废数量', key: 'waste_asset_number', default: '' },
  {
    title: '报废日期',
    key: 'waste_asset_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  { title: '合同编码', key: 'waste_asset_contract_code', default: '' },
  { title: '合同名称', key: 'contract_name', default: '' },
  { title: '报废描述', key: 'waste_asset_description', default: '' },
  {
    title: '创建时间',
    key: 'create_time',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '更新时间',
    key: 'update_time',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
]

// ===== 加载详情数据 =====
const loadDetail = async (id: string) => {
  try {
    const detail = await wasteAssetStore.getById(id)
    if (!detail) {
      ElMessage.error('未找到对应已报废资产')
      router.back()
      return
    }
    detailData.value = detail
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('加载已报废资产详情失败，请稍后重试')
  }
}

// ===== 生命周期 =====
onMounted(async () => {
  // CommonList 详情按钮传递 waste_asset_code 作为 query.code
  // 同时也支持直接传递 id 参数（编辑后返回等场景）
  const code = route.query.code as string
  const id = route.query.id as string
  const identifier = id || code
  if (!identifier) {
    ElMessage.error('缺少已报废资产标识参数')
    router.back()
    isLoading.value = false
    return
  }
  // 优先使用 id（主键）查询，其次使用 waste_asset_code 查询
  if (id) {
    await loadDetail(id)
  } else if (code) {
    // 通过 waste_asset_code 查询列表，取第一条记录
    try {
      const response = await wasteAssetStore.getList({ waste_asset_code: code, page: 1, page_size: 1 })
      if (response && response.length > 0) {
        detailData.value = response[0]
      } else {
        ElMessage.error('未找到对应已报废资产')
        router.back()
      }
    } catch (error) {
      console.error('获取详情失败:', error)
      ElMessage.error('加载已报废资产详情失败，请稍后重试')
    }
  }
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
    `已报废资产_${detailData.value.waste_asset_code || detailData.value.id}`,
    '已报废资产详情',
  )
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.waste-asset-detail-page {
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
.main-info-card {
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

@media (max-width: 768px) {
  .waste-asset-detail-page {
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
