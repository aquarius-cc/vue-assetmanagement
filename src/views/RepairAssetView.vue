<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><SetUp /></el-icon>
          <span>资产维修</span>
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
          <el-form-item label="维修数量" prop="repair_asset_number">
            <el-input-number v-model="formData.repair_asset_number" :min="1" :max="1000" />
          </el-form-item>
          <el-form-item label="维修日期" prop="repair_date">
            <el-date-picker
              v-model="formData.repair_date"
              type="date"
              placeholder="请选择维修日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="维修原因" prop="repair_reason">
            <el-input v-model="formData.repair_reason" placeholder="请输入维修原因" />
          </el-form-item>
          <el-form-item label="维修描述" prop="repair_description">
            <el-input v-model="formData.repair_description" type="textarea" :rows="3" placeholder="请输入维修描述（可选）" />
          </el-form-item>
        </el-form>

        <div class="action-buttons">
          <el-button type="warning" :loading="submitting" @click="handleSubmit">提交维修申请</el-button>
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
import { SetUp } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { assetAPI } from '@/api/asset'
import { repairAssetAPI } from '@/api/repairAsset'
import type { AssetDetail } from '@/types/asset'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(true)
const submitting = ref(false)
const asset = ref<AssetDetail | null>(null)
const assetCode = ref(route.params.code as string)

const formData = reactive({
  repair_asset_number: 1,
  repair_date: '',
  repair_reason: '',
  repair_description: '',
})

const rules: FormRules = {
  repair_asset_number: [{ required: true, message: '请输入维修数量', trigger: 'blur' }],
  repair_date: [{ required: true, message: '请选择维修日期', trigger: 'change' }],
  repair_reason: [{ required: true, message: '请输入维修原因', trigger: 'blur' }],
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
    await repairAssetAPI.repairAsset(assetCode.value, {
      asset_code: assetCode.value,
      repair_asset_number: formData.repair_asset_number,
      repair_date: formData.repair_date,
      repair_reason: formData.repair_reason,
      repair_description: formData.repair_description || null,
    })
    ElMessage.success('维修申请已提交')
    router.push('/main')
  } catch (err) {
    console.error('提交维修申请失败:', err)
    ElMessage.error('提交维修申请失败，请重试')
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
