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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document } from '@element-plus/icons-vue'
import { assetAPI } from '@/api/asset'
import type { AssetDetail } from '@/types/asset'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'

interface TimelineItem {
  status: string
  timestamp: string
  description: string
  operator_name: string
}

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const asset = ref<AssetDetail | null>(null)
const assetCode = ref(route.params.code as string)
const timeline = ref<TimelineItem[]>([])

onMounted(async () => {
  if (!assetCode.value) return
  try {
    const [assetResult, timelineResult] = await Promise.all([
      assetAPI.getAssetByCode(assetCode.value),
      assetAPI.getAssetTimeline(assetCode.value),
    ])
    asset.value = assetResult
    timeline.value = timelineResult || []
  } catch (err) {
    console.error('获取资产状态日志失败:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.asset-operation-view {
  display: flex;
  justify-content: center;
  padding: 24px;
  min-height: 100vh;
  background: var(--background-color);
}

.operation-card {
  width: 100%;
  max-width: 720px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.loading-container {
  min-height: 200px;
}

.asset-info {
  margin-bottom: 16px;
}

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
  font-size: 12px;
}
</style>
