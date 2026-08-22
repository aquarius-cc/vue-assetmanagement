<!--
  UnregisteredAssetBasicDetails.vue
  未登记资产详情页面
  功能：展示未登记资产的完整信息，支持导出 Excel，支持审批操作（通过/拒绝）
-->
<template>
  <div
    class="unregistered-asset-detail-page"
    v-loading="isLoading"
    element-loading-text="加载中..."
  >
    <div class="child-page-header">
      <h1 class="page-title">{{ detailData?.asset_name || '未知资产' }} — 未登记资产详情</h1>
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
              <span class="info-value">{{ detailData.unregistered_code || 'N/A' }}</span>
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
              <span class="info-label">发现人：</span>
              <span class="info-value">
                {{ detailData.discovery_person?.name || detailData.discovery_person_name || 'N/A' }}
                <template v-if="detailData.discovery_person?.jobcode">
                  （{{ detailData.discovery_person.jobcode }}）
                </template>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">资产类型编码：</span>
              <span class="info-value">{{ detailData.unregistered_asset_type || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预估价值：</span>
              <span class="info-value">{{ detailData.estimated_value ?? '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">关联资产编码：</span>
              <span class="info-value">
                {{
                  typeof detailData.related_asset === 'object' && detailData.related_asset
                    ? detailData.related_asset.code
                    : detailData.related_asset || '无'
                }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">目标仓库编码：</span>
              <span class="info-value">{{ detailData.unregistered_asset_storage || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">审批状态：</span>
              <span class="info-value">
                <el-tag :type="getApprovalStatusTagType(detailData.approval_status ?? '')">
                  {{ getApprovalStatusText(detailData.approval_status ?? '') }}
                </el-tag>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">审批人：</span>
              <span class="info-value">
                {{ detailData.approver?.name || detailData.approver_name || '无' }}
                <template v-if="detailData.approver?.jobcode">
                  （{{ detailData.approver.jobcode }}）
                </template>
              </span>
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
                <span class="info-value">{{ formatDate(detailData.created_at) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">更新时间：</span>
                <span class="info-value">{{ formatDate(detailData.updated_at) }}</span>
              </div>
            </div>
            <div class="info-column">
              <div class="info-item">
                <span class="info-label">处理时间：</span>
                <span class="info-value">{{ formatDate(detailData.approval_date) }}</span>
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



<script lang="ts" setup>
defineOptions({ name: 'UnregisteredAssetBasicDetails' })

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Download, Document } from '@element-plus/icons-vue'
import { useUnregisteredAssetStore } from '@/stores/unregisteredAssetStore'
import { unregisteredAssetAPI } from '@/api/unregisteredAsset'
import { useExcelExport } from '@/composables/useExcelExport'
import type { UnregisteredAsset } from '@/types/unregisteredasset'
import {
  getScenarioTypeText,
  getScenarioTypeTagType,
  getHandleTypeText,
  unregisteredAssetExportColumns as exportColumns,
} from './unregisteredAssetDetailExport'
import { useUnregisteredApproval } from '@/composables/useUnregisteredApproval'
import { formatDate } from '@/utils/Format'
import { getApprovalStatusText, getApprovalStatusTagType } from '@/utils/statusMapping'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const unregisteredAssetStore = useUnregisteredAssetStore()
const isLoading = ref(true)
const detailData = ref<UnregisteredAsset | null>(null)

// ===== Excel 导出配置（列配置已物理提取）=====
const { exportDetail } = useExcelExport()

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

// ===== 审批操作（组合式函数，DR-5 物理提取）=====
const { handleApprove, handleReject } = useUnregisteredApproval({
  detailData,
  store: unregisteredAssetStore,
  api: unregisteredAssetAPI,
  loadDetail: loadDetail,
})

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
    `未登记资产_${detailData.value.unregistered_code || detailData.value.id}`,
    '未登记资产详情',
  )
}
</script>

<style lang="scss" scoped src="./UnregisteredAssetBasicDetails.scss"></style>