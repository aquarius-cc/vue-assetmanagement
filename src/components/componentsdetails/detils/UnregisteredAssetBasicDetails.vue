<!--
  UnregisteredAssetBasicDetails.vue
  未登记资产详情页面
  功能：展示未登记资产的完整信息，支持导出 Excel，支持审批操作（通过/拒绝）
-->
<template>
  <div class="unregistered-asset-detail-page" v-loading="isLoading" element-loading-text="加载中...">
    <div class="child-page-header">
      <h1 class="page-title">
        {{ detailData?.asset_name || '未知资产' }} — 未登记资产详情
      </h1>
      <div class="action-buttons">
        <el-button type="primary" :icon="Back" @click="handleBack">返回</el-button>
        <el-button type="warning" :icon="Download" @click="handleExport">导出</el-button>
        <!-- 审批操作按钮（仅待审批状态显示） -->
        <template v-if="detailData?.approval_status === 'pending'">
          <el-button type="success" @click="handleApprove">通过</el-button>
          <el-button type="danger" @click="handleReject">拒绝</el-button>
        </template>
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
              <span class="info-label">编码：</span>
              <span class="info-value">{{ detailData.code || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">资产名称：</span>
              <span class="info-value">{{ detailData.asset_name || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">场景类型：</span>
              <span class="info-value">
                <el-tag :type="getScenarioTypeTagType(detailData.scenario_type)">
                  {{ getScenarioTypeText(detailData.scenario_type) }}
                </el-tag>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">发现日期：</span>
              <span class="info-value">{{ formatDate(detailData.discovery_date) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">发现地点：</span>
              <span class="info-value">{{ detailData.discovery_location || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">资产品牌：</span>
              <span class="info-value">{{ detailData.asset_brand || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">资产规格型号：</span>
              <span class="info-value">{{ detailData.asset_specification || '无' }}</span>
            </div>
          </div>
          <div class="info-column">
            <div class="info-item">
              <span class="info-label">资产类型编码：</span>
              <span class="info-value">{{ detailData.asset_type_code || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预估价值：</span>
              <span class="info-value">{{ detailData.estimated_value ?? '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">关联资产编码：</span>
              <span class="info-value">{{ detailData.related_asset_code || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">目标仓库编码：</span>
              <span class="info-value">{{ detailData.target_storage_code || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">审批状态：</span>
              <span class="info-value">
                <el-tag :type="getApprovalStatusTagType(detailData.approval_status)">
                  {{ getApprovalStatusText(detailData.approval_status) }}
                </el-tag>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">审批人：</span>
              <span class="info-value">{{ detailData.approver || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">审批备注：</span>
              <span class="info-value">{{ detailData.approval_remark || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">处理类型：</span>
              <span class="info-value">{{ getHandleTypeText(detailData.handle_type) }}</span>
            </div>
          </div>
        </div>

        <!-- 描述信息 -->
        <div class="info-section">
          <div class="section-sub-title">处理描述</div>
          <div class="description-content">
            {{ detailData.handle_description || '无' }}
          </div>
        </div>

        <!-- 时间信息 -->
        <div class="info-section">
          <div class="section-sub-title">时间信息</div>
          <div class="info-grid">
            <div class="info-column">
              <div class="info-item">
                <span class="info-label">创建时间：</span>
                <span class="info-value">{{ formatDate(detailData.create_time) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">更新时间：</span>
                <span class="info-value">{{ formatDate(detailData.update_time) }}</span>
              </div>
            </div>
            <div class="info-column">
              <div class="info-item">
                <span class="info-label">处理时间：</span>
                <span class="info-value">{{ formatDate(detailData.handle_time) }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>
      <div v-else-if="!isLoading">
        <el-empty description="未找到未登记资产详情数据" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'UnregisteredAssetBasicDetails',
}
</script>

<script lang="ts" setup>
import { ref, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Back, Download, Document } from '@element-plus/icons-vue'
import { useUnregisteredAssetStore } from '@/stores/unregisteredAssetStore'
import { unregisteredAssetAPI } from '@/api/unregisteredAsset'
import { useExcelExport } from '@/composables/useExcelExport'
import type { ColumnConfig } from '@/utils/excelExporter'
import type { UnregisteredAsset } from '@/utils/UnregisteredAsset'
import {
  // UnregisteredAssetStatus,
  HandleType,
  scenarioTypeTextMap,
  scenarioTypeTagMap,
  unregisteredAssetStatusTextMap,
  unregisteredAssetStatusTagMap,
  handleTypeTextMap,
} from '@/utils/UnregisteredAsset'
import { formatDate } from '@/utils/Format'

// ===== 场景类型辅助函数 =====
const getScenarioTypeText = (type: string | null | undefined): string => {
  if (!type) return '未知'
  return scenarioTypeTextMap[type] || '未知'
}

const getScenarioTypeTagType = (
  type: string | null | undefined,
): '' | 'success' | 'warning' | 'danger' | 'info' => {
  if (!type) return 'info'
  return (scenarioTypeTagMap[type] as '' | 'success' | 'warning' | 'danger' | 'info') || 'info'
}

// ===== 审批状态辅助函数 =====
const getApprovalStatusTagType = (
  status: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'info' => {
  if (!status) return 'info'
  return (unregisteredAssetStatusTagMap[status] as 'success' | 'warning' | 'danger' | 'info') || 'info'
}

const getApprovalStatusText = (status: string | null | undefined): string => {
  if (!status) return '未知'
  return unregisteredAssetStatusTextMap[status] || '未知'
}

// ===== 处理类型辅助函数 =====
const getHandleTypeText = (type: string | null | undefined): string => {
  if (!type) return '未处理'
  return handleTypeTextMap[type] || type
}

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const unregisteredAssetStore = useUnregisteredAssetStore()
const isLoading = ref(true)
const detailData = ref<UnregisteredAsset | null>(null)

// ===== Excel 导出配置 =====
const { exportDetail } = useExcelExport()

const exportColumns: ColumnConfig<UnregisteredAsset>[] = [
  { title: 'ID', key: 'id', default: '' },
  { title: '编码', key: 'code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  {
    title: '场景类型',
    key: 'scenario_type',
    default: '',
    formatter: (v) => getScenarioTypeText(v as string),
  },
  {
    title: '发现日期',
    key: 'discovery_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  { title: '发现地点', key: 'discovery_location', default: '' },
  { title: '资产品牌', key: 'asset_brand', default: '' },
  { title: '资产规格型号', key: 'asset_specification', default: '' },
  { title: '资产类型编码', key: 'asset_type_code', default: '' },
  { title: '预估价值', key: 'estimated_value', default: '' },
  { title: '关联资产编码', key: 'related_asset_code', default: '' },
  { title: '目标仓库编码', key: 'target_storage_code', default: '' },
  {
    title: '审批状态',
    key: 'approval_status',
    default: '',
    formatter: (v) => getApprovalStatusText(v as string),
  },
  { title: '审批人', key: 'approver', default: '' },
  { title: '审批备注', key: 'approval_remark', default: '' },
  {
    title: '处理类型',
    key: 'handle_type',
    default: '',
    formatter: (v) => getHandleTypeText(v as string),
  },
  { title: '处理描述', key: 'handle_description', default: '' },
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
  {
    title: '处理时间',
    key: 'handle_time',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
]

// ===== 加载详情数据 =====
const loadDetail = async (code: string) => {
  try {
    const detail = await unregisteredAssetStore.getById(code)
    if (!detail) {
      ElMessage.error('未找到对应未登记资产')
      router.back()
      return
    }
    detailData.value = detail
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('加载未登记资产详情失败，请稍后重试')
  }
}

// ===== 审批操作 =====

/** 通过审批 */
const handleApprove = async () => {
  if (!detailData.value) return
  try {
    const selectedHandleType = await selectHandleType()
    if (!selectedHandleType) return

    await unregisteredAssetAPI.approveUnregisteredAsset(detailData.value.code, {
      handle_type: selectedHandleType,
      approval_remark: '审批通过',
    })
    ElMessage.success('审批通过')
    // 重新加载详情
    await loadDetail(detailData.value.code)
    unregisteredAssetStore.setRefreshFlag(true)
  } catch (error) {
    console.error('审批操作失败:', error)
    ElMessage.error('审批操作失败，请重试')
  }
}

/** 拒绝审批 */
const handleReject = async () => {
  if (!detailData.value) return
  try {
    const { value: remark } = await ElMessageBox.prompt(
      '请输入拒绝原因（可选）：',
      '拒绝审批',
      {
        confirmButtonText: '确定拒绝',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入拒绝原因',
        inputType: 'textarea',
      },
    )
    await unregisteredAssetAPI.approveUnregisteredAsset(detailData.value.code, {
      handle_type: HandleType.REJECT,
      approval_remark: remark || '审批拒绝',
    })
    ElMessage.success('已拒绝')
    // 重新加载详情
    await loadDetail(detailData.value.code)
    unregisteredAssetStore.setRefreshFlag(true)
  } catch (error) {
    // 用户取消操作不提示错误
    if (error === 'cancel' || error === 'close') return
    console.error('拒绝操作失败:', error)
    ElMessage.error('拒绝操作失败，请重试')
  }
}

/**
 * 选择处理类型弹窗
 * 使用 beforeClose 回调将用户选中的值通过 done() 传递出来，
 * 避免 ElMessageBox.close() 无法传值的 Bug
 */
const selectHandleType = async (): Promise<string | null> => {
  const handleTypes = [
    { value: HandleType.CREATE_AND_RECYCLE, label: '新建并回收' },
    { value: HandleType.CREATE_AND_DAMAGED, label: '新建并报废' },
    { value: HandleType.SUPPLEMENT_AND_RECYCLE, label: '补录并回收' },
    { value: HandleType.CORRECT_AND_RECYCLE, label: '纠正并回收' },
  ]

  return new Promise<string | null>((resolve) => {
    ElMessageBox({
      title: '选择处理类型',
      message: h('div', null, [
        h('p', { style: 'margin-bottom: 12px; color: var(--text-regular);' }, '请选择审批通过后的处理方式：'),
        h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
          handleTypes.map((item) =>
            h('div', {
              key: item.value,
              style: 'padding: 8px 12px; border: 1px solid var(--border-color-light); border-radius: 4px; cursor: pointer; transition: all 0.2s;',
              onClick: () => resolve(item.value),
            }, `${item.label}（${item.value}）`),
          ),
        ),
      ]),
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: '取消',
      closeOnClickModal: false,
      beforeClose: (_action, instance, done) => {
        done()
        resolve(null)
      },
    }).catch(() => {
      // 用户点击取消或关闭，resolve null
      resolve(null)
    })
  })
}

// ===== 生命周期 =====
onMounted(async () => {
  const code = route.query.code as string
  if (!code) {
    ElMessage.error('缺少未登记资产标识参数')
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
    ElMessage.warning('暂无数据可导出')
    return
  }
  await exportDetail(
    detailData.value,
    exportColumns,
    `未登记资产_${detailData.value.code || detailData.value.id}`,
    '未登记资产详情',
  )
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.unregistered-asset-detail-page {
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
.info-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color-light);
}
.section-sub-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--color-primary-light);
}
.description-content {
  padding: 12px 16px;
  background-color: var(--card-background-page);
  border-radius: 6px;
  color: var(--text-regular);
  line-height: 1.6;
  min-height: 60px;
}

@media (max-width: 768px) {
  .unregistered-asset-detail-page {
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
