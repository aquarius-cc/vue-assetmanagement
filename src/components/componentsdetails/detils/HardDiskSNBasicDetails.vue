<!--
  HardDiskSNBasicDetails.vue
  硬盘序列号详情页面
  功能：展示硬盘序列号的完整信息，支持导出 Excel
-->
<template>
  <div class="harddisk-sn-detail-page" v-loading="isLoading" element-loading-text="加载中...">
    <div class="child-page-header">
      <h1 class="page-title">
        {{ detailData?.harddisk_sn_code || '未知序列号' }} — 硬盘序列号详情
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
              <span class="info-label">记录编码：</span>
              <span class="info-value">{{ detailData.recordcode || 'N/A' }}</span>
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
              <span class="info-label">硬盘编号：</span>
              <span class="info-value">{{ detailData.harddisk_no }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">硬盘序列号：</span>
              <span class="info-value">{{ detailData.harddisk_sn_code || 'N/A' }}</span>
            </div>
          </div>
          <div class="info-column">
            <div class="info-item">
              <span class="info-label">硬盘数量：</span>
              <span class="info-value">{{ detailData.harddisk_number }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">硬盘状态：</span>
              <span class="info-value">
                <el-tag :type="getHardDiskStatusTagType(detailData.harddisk_status ?? '')">
                  {{ getHardDiskStatusText(detailData.harddisk_status ?? '') }}
                </el-tag>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">用户工号：</span>
              <span class="info-value">{{ detailData.harddisk_user_jobcode || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">硬盘类型：</span>
              <span class="info-value">
                <el-tag :type="getHardDiskTypeTagType(detailData.harddisk_type)">
                  {{ getHardDiskTypeText(detailData.harddisk_type) }}
                </el-tag>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">描述：</span>
              <span class="info-value">{{ detailData.harddisk_description || '无' }}</span>
            </div>
            <!-- // <div class="info-item">
            //   <span class="info-label">创建时间：</span>
            //   <span class="info-value">{{ formatDate(detailData.create_time) }}</span>
            // </div>
            // <div class="info-item">
            //   <span class="info-label">更新时间：</span>
            //   <span class="info-value">{{ formatDate(detailData.update_time) }}</span>
            // </div> -->
          </div>
        </div>
      </el-card>
      <div v-else-if="!isLoading">
        <el-empty description="未找到硬盘序列号详情数据" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HardDiskSNBasicDetails',
}
</script>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Download, Document } from '@element-plus/icons-vue'
import { useHardDiskSnStore } from '@/stores/harddiskSnStore'
import { useExcelExport } from '@/composables/useExcelExport'
import type { ColumnConfig } from '@/utils/excelExporter'
import type { HardDiskSN } from '@/types/harddisksn'
import { HardDiskType } from '@/types/harddisksn'
import { getHardDiskStatusText, getHardDiskStatusTagType } from '@/utils/statusMapping'
// import { formatDate } from '@/utils/Format'

// ===== 硬盘类型辅助函数 =====
const getHardDiskTypeTagType = (
  type: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'info' | '' => {
  switch (type) {
    case HardDiskType.SSD:
      return 'success'
    case HardDiskType.NVMe:
      return 'warning'
    case HardDiskType.HDD:
      return 'info'
    default:
      return ''
  }
}

const getHardDiskTypeText = (type: string | null | undefined): string => {
  switch (type) {
    case HardDiskType.HDD:
      return '机械硬盘'
    case HardDiskType.SSD:
      return '固态硬盘'
    case HardDiskType.NVMe:
      return 'NVMe硬盘'
    case HardDiskType.OTHER:
      return '其他'
    default:
      return '未知'
  }
}

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const harddiskSnStore = useHardDiskSnStore()
const isLoading = ref(true)
const detailData = ref<HardDiskSN | null>(null)

// ===== Excel 导出配置 =====
const { exportDetail } = useExcelExport()

const exportColumns: ColumnConfig<HardDiskSN>[] = [
  { title: '记录编码', key: 'recordcode', default: '' },
  { title: '资产编码', key: 'asset_code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  { title: '硬盘编号', key: 'harddisk_no', default: '', formatter: (v) => String(v) },
  { title: '硬盘序列号', key: 'harddisk_sn_code', default: '' },
  {
    title: '硬盘类型',
    key: 'harddisk_type',
    default: '',
    formatter: (v) => getHardDiskTypeText(v as string),
  },
  { title: '硬盘数量', key: 'harddisk_number', default: '', formatter: (v) => String(v) },
  {
    title: '硬盘状态',
    key: 'harddisk_status',
    default: '',
    formatter: (v) => getHardDiskStatusText(v as string),
  },
  { title: '用户工号', key: 'harddisk_user_jobcode', default: '' },
  { title: '描述', key: 'harddisk_description', default: '' },
  // {
  //   title: '创建时间',
  //   key: 'create_time',
  //   default: '',
  //   formatter: (v) => formatDate(v as string) || '',
  // },
  // {
  //   title: '更新时间',
  //   key: 'update_time',
  //   default: '',
  //   formatter: (v) => formatDate(v as string) || '',
  // },
]

// ===== 加载详情数据 =====
const loadDetail = async (code: string) => {
  try {
    console.log('loadDetail-code:', code)
    const detail = await harddiskSnStore.getById(code)
    console.log('loadDetail-detail:', detail)
    if (!detail) {
      ElMessage.error('未找到对应硬盘序列号')
      router.back()
      return
    }
    detailData.value = detail
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('加载硬盘序列号详情失败，请稍后重试')
  }
}

// ===== 生命周期 =====
onMounted(async () => {
  const code = route.query.code as string
  if (!code) {
    ElMessage.error('缺少硬盘序列号标识参数')
    router.back()
    isLoading.value = false
    return
  }
  console.log('onMounted-code:', code)
  await loadDetail(code)
  isLoading.value = false
})

// ===== 事件处理 =====
const handleBack = () => {
  router.go(-1)
}

/** 导出当前详情为 Excel */
const handleExport = async () => {
  if (!detailData.value) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  await exportDetail(
    detailData.value,
    exportColumns,
    `硬盘序列号_${detailData.value.harddisk_sn_code || detailData.value.recordcode}`,
    '硬盘序列号详情',
  )
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.harddisk-sn-detail-page {
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
  .harddisk-sn-detail-page {
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
