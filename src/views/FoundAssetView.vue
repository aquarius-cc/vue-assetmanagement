<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><CircleCheck /></el-icon>
          <span>找回遗失资产</span>
        </div>
      </template>

      <el-result v-if="!assetCode" icon="warning" title="缺少资产编码" sub-title="请通过正确的方式访问此页面">
        <template #extra>
          <el-button type="primary" @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>

      <div v-else-if="loading" v-loading="true" class="loading-container" />

      <template v-else-if="asset">
        <el-descriptions :column="2" border class="asset-info">
          <el-descriptions-item label="资产编码">{{ asset.asset_code }}</el-descriptions-item>
          <el-descriptions-item label="资产名称">{{ asset.asset_name }}</el-descriptions-item>
          <el-descriptions-item label="资产规格">{{ asset.asset_specification || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">{{ asset.asset_current_status }}</el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <el-form ref="formRef" :model="formData" label-width="100px">
          <el-form-item label="找回地点" prop="found_location">
            <el-input v-model="formData.found_location" placeholder="请输入找回地点（可选）" />
          </el-form-item>
          <el-form-item label="找回描述" prop="found_description">
            <el-input v-model="formData.found_description" type="textarea" :rows="3" placeholder="请输入找回描述（可选）" />
          </el-form-item>
        </el-form>

        <div class="action-buttons">
          <el-button type="success" :loading="submitting" @click="handleSubmit">确认找回</el-button>
          <el-button @click="router.back()">取消</el-button>
        </div>
      </template>

      <el-result v-else icon="error" title="资产不存在" sub-title="未找到该资产信息">
        <template #extra>
          <el-button type="primary" @click="router.push('/main')">返回首页</el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CircleCheck } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { assetAPI } from '@/api/asset'
import { lostAssetAPI } from '@/api/lostAsset'
import type { AssetDetail } from '@/types/asset'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(true)
const submitting = ref(false)
const asset = ref<AssetDetail | null>(null)
const assetCode = ref(route.params.code as string)

const formData = reactive({
  found_location: '',
  found_description: '',
})

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
    await lostAssetAPI.foundAsset(assetCode.value, {
      found_location: formData.found_location || undefined,
      found_description: formData.found_description || undefined,
    })
    ElMessage.success('遗失资产已找回并入库')
    router.push('/main')
  } catch (err) {
    console.error('找回操作失败:', err)
    ElMessage.error('找回操作失败，请重试')
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
