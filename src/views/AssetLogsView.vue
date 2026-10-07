<!--
@file 资产状态日志页面，展示指定资产的状态变更历史记录
@component AssetLogsView
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - stores/assetStore: 资产数据状态
  - components/commoncomponents/StatusTag: 资产状态标签
-->
<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><Document /></el-icon>
          <span>资产状态日志</span>
        </div>
      </template>

      <el-result
        v-if="!assetCode"
        icon="warning"
        title="缺少资产编码"
        sub-title="请通过正确的方式访问此页面"
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>

      <div v-else-if="loading" v-loading="true" class="loading-container" />

      <template v-else>
        <el-descriptions v-if="asset" :column="2" border class="asset-info">
          <el-descriptions-item label="资产编码">{{ asset.asset_code }}</el-descriptions-item>
          <el-descriptions-item label="资产名称">{{ asset.asset_name }}</el-descriptions-item>
        </el-descriptions>

        <el-divider v-if="asset" />

        <div v-if="timeline.length > 0" class="timeline-container">
          <el-timeline>
            <el-timeline-item
              v-for="item in timeline"
              :key="item.timestamp"
              :timestamp="item.timestamp"
              placement="top"
            >
              <el-card shadow="never">
                <div class="timeline-item-content">
                  <StatusTag :status="item.status" />
                  <span class="timeline-desc">{{ item.description }}</span>
                  <span class="timeline-operator">操作人: {{ item.operator_name }}</span>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>

        <el-empty v-else description="暂无状态日志记录" />
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAssetStore } from '@/stores'
import type { AssetDetail, AssetTimelineItem } from '@/types/asset'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'
import { logError, logWarn } from '@/utils/logger'

const route = useRoute()
const router = useRouter()
const assetStore = useAssetStore()
const loading = ref(true)
const asset = ref<AssetDetail | null>(null)
const assetCode = computed(() => route.params.code as string)
const timeline = ref<AssetTimelineItem[]>([])

onMounted(async () => {
  if (!assetCode.value) return

  // 1) 资产详情：取键契约为 recordcode（asset_view.py:57 lookup_field="recordcode"）
  try {
    asset.value = await assetStore.getById(assetCode.value)
  } catch (err) {
    logError('views/AssetLogsView', '获取资产详情失败:', err)
    ElMessage.error('获取资产信息失败，请稍后重试')
  }

  // 2) 状态时间线：取键契约为 asset_code（urls.py:82 / operation_log_selector.py:82），
  //    由详情结果派生——单一 route.params.code 无法同时满足两个契约，故串行而非并行；
  //    详情缺失（null）时不发无意义请求
  if (asset.value) {
    try {
      timeline.value = (await assetStore.getAssetTimeline(asset.value.asset_code)) ?? []
    } catch (err) {
      logWarn('views/AssetLogsView', '获取状态日志失败，按空时间线渲染:', { err })
      timeline.value = []
    }
  }

  loading.value = false
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;

.timeline-container {
  padding: 16px 0;
}

.timeline-item-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-desc {
  color: var(--text-regular);
  font-size: 14px;
}

.timeline-operator {
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
