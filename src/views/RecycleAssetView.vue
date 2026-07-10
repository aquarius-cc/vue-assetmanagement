<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><RefreshLeft /></el-icon>
          <span>资产回收</span>
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

        <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
          <el-form-item label="回收数量" prop="recycle_asset_number">
            <el-input-number v-model="formData.recycle_asset_number" :min="1" :max="1000" />
          </el-form-item>
          <el-form-item label="回收备注" prop="remark">
            <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入回收备注" />
          </el-form-item>
        </el-form>

        <div class="action-buttons">
          <el-button type="primary" :loading="submitting" @click="handleSubmit">确认回收</el-button>
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
import { RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { assetAPI } from '@/api/asset'
import { recycleAssetAPI } from '@/api/recycleAsset'
import type { AssetDetail } from '@/types/asset'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(true)
const submitting = ref(false)
const asset = ref<AssetDetail | null>(null)
const assetCode = ref(route.params.code as string)

const formData = reactive({
  recycle_asset_number: 1,
  remark: '',
})

const rules: FormRules = {
  recycle_asset_number: [{ required: true, message: '请输入回收数量', trigger: 'blur' }],
}

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
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await recycleAssetAPI.create({
      asset_code: assetCode.value,
      recycle_asset_number: formData.recycle_asset_number,
      remark: formData.remark,
    } as never)
    ElMessage.success('回收操作成功')
    router.push('/main/recycleassetdetails')
  } catch (err) {
    console.error('回收操作失败:', err)
    ElMessage.error('回收操作失败，请重试')
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
