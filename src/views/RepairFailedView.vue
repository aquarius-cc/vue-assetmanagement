<!--
  RepairFailedView.vue
  标记维修失败：repairing → damaged
-->
<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><WarningFilled /></el-icon>
          <span>标记维修失败</span>
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

      <template v-else-if="asset">
        <el-descriptions :column="2" border class="asset-info">
          <el-descriptions-item label="资产编码">{{ asset.asset_code }}</el-descriptions-item>
          <el-descriptions-item label="资产名称">{{ asset.asset_name }}</el-descriptions-item>
          <el-descriptions-item label="型号规格">{{
            asset.asset_specification || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">{{
            asset.asset_current_status
          }}</el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
          此操作将标记维修失败，资产将转入待报废状态。
        </el-alert>

        <div class="action-buttons">
          <el-button type="danger" :loading="submitting" @click="handleSubmit"
            >确认维修失败</el-button
          >
          <el-button @click="router.back()">取消</el-button>
        </div>
      </template>

      <el-result v-else icon="error" title="未找到资产" sub-title="无法获取资产信息">
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
import { WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { assetAPI } from '@/api/asset'
import { repairAssetAPI } from '@/api/repairAsset'
import type { AssetDetail } from '@/types/asset'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)
const asset = ref<AssetDetail | null>(null)
const assetCode = ref(route.params.code as string)

onMounted(async () => {
  if (!assetCode.value) return
  try {
    asset.value = await assetAPI.getAssetByCode(assetCode.value)
  } catch (err) {
    console.error('获取资产信息失败:', err)
  } finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  submitting.value = true
  try {
    await repairAssetAPI.repairFailed(assetCode.value, {})
    ElMessage.success('维修失败已确认，资产已转入待报废状态')
    router.push('/main')
  } catch (err) {
    console.error('维修失败操作异常:', err)
    ElMessage.error('维修失败操作失败，请重试')
  } finally {
    submitting.value = false
  }
}
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
