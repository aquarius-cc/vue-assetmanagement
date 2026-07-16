<!--
  RepairDoneView.vue
  标记维修完成：repairing → in_store
-->
<template>
  <div class="asset-operation-view">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <el-icon><CircleCheck /></el-icon>
          <span>维修完成</span>
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

        <el-form ref="formRef" :model="formData" label-width="140px">
          <el-form-item label="实际归还日期" prop="actual_return_date">
            <el-date-picker
              v-model="formData.actual_return_date"
              type="date"
              placeholder="请选择归还日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="维修后物理等级" prop="physical_grade_after">
            <el-select v-model="formData.physical_grade_after" placeholder="请选择等级">
              <el-option label="良好" value="good" />
              <el-option label="一般" value="fair" />
              <el-option label="较差" value="poor" />
            </el-select>
          </el-form-item>
        </el-form>

        <div class="action-buttons">
          <el-button type="success" :loading="submitting" @click="handleSubmit"
            >确认维修完成</el-button
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
import { ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CircleCheck } from '@element-plus/icons-vue'
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

const formData = reactive({
  actual_return_date: '',
  physical_grade_after: 'good',
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
    await repairAssetAPI.repairDone(assetCode.value, {
      actual_return_date: formData.actual_return_date || undefined,
      physical_grade_after: formData.physical_grade_after || undefined,
    })
    ElMessage.success('维修完成确认成功')
    router.push('/main')
  } catch (err) {
    console.error('维修完成操作失败:', err)
    ElMessage.error('维修完成操作失败，请重试')
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
