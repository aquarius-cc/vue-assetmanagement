<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><Iphone /></el-icon>
          <span>扫码查看</span>
        </div>
      </template>

      <el-result
        v-if="!recordcode"
        icon="info"
        title="缺少记录编码"
        sub-title="请通过扫码方式访问此页面"
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>

      <div v-else-if="loading" v-loading="true" class="loading-container" />

      <template v-else-if="asset">
        <el-descriptions :column="1" border class="asset-info">
          <el-descriptions-item label="资产编码">{{ asset.asset_code }}</el-descriptions-item>
          <el-descriptions-item label="资产名称">{{ asset.asset_name }}</el-descriptions-item>
          <el-descriptions-item label="资产规格">{{
            asset.asset_specification || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="品牌">{{ asset.asset_brand || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <StatusTag :status="asset.asset_current_status" />
          </el-descriptions-item>
          <el-descriptions-item label="存放仓库">{{
            asset.asset_storage_name || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="资产分类">{{
            asset.asset_type_name || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="使用人">{{
            asset.asset_manager_name || '-'
          }}</el-descriptions-item>
        </el-descriptions>

        <div class="action-buttons">
          <el-button
            type="primary"
            @click="router.push({ path: '/main/assetdetails/' + asset.asset_code })"
          >
            查看详情
          </el-button>
          <el-button @click="router.push('/main')">返回首页</el-button>
        </div>
      </template>

      <el-result
        v-else
        icon="error"
        title="未找到资产"
        sub-title="无法根据该编码找到对应的资产信息"
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Iphone } from '@element-plus/icons-vue'
import { get } from '@/api/request'
import type { AssetDetail } from '@/types/asset'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const asset = ref<AssetDetail | null>(null)
const recordcode = ref(route.params.recordcode as string)

onMounted(async () => {
  if (!recordcode.value) return
  try {
    const res = await get<AssetDetail>(`/public/scan/${recordcode.value}`)
    asset.value = res.data as AssetDetail
  } catch (err) {
    console.error('获取资产信息失败:', err)
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

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}
</style>
