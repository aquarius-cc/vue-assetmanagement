<!--
@file 资产遗失登记页面，填写遗失信息并提交登记
@component LostAssetView
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - components/AssetOperationLayout: 资产操作通用布局
  - composables/useAssetOperationForm: 资产操作表单逻辑
  - api/lostAsset: 遗失资产数据接口
-->
<template>
  <AssetOperationLayout
    title="资产遗失"
    :icon="Warning"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
  >
    <template #form>
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
        <el-form-item label="遗失日期" prop="lost_date">
          <el-date-picker
            v-model="formData.lost_date"
            type="date"
            placeholder="请选择遗失日期（默认今天）"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="最后位置" prop="last_known_location">
          <el-input v-model="formData.last_known_location" placeholder="最后已知位置（可选）" />
        </el-form-item>
        <el-form-item label="遗失原因" prop="lost_reason">
          <el-input v-model="formData.lost_reason" placeholder="请输入遗失原因" />
        </el-form-item>
        <el-form-item label="详细描述" prop="lost_description">
          <el-input
            v-model="formData.lost_description"
            type="textarea"
            :rows="3"
            placeholder="详细描述（可选）"
          />
        </el-form-item>
      </el-form>
    </template>

    <template #actions>
      <div class="action-buttons">
        <el-button type="danger" :loading="submitting" @click="handleSubmit"> 确认遗失 </el-button>
        <el-button @click="router.back()">取消</el-button>
      </div>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Warning } from '@element-plus/icons-vue'
import type { FormRules } from 'element-plus'
import AssetOperationLayout from '@/components/AssetOperationLayout.vue'
import { useAssetOperationForm } from '@/composables/useAssetOperationForm'
import { lostAssetAPI } from '@/api/lostAsset'

const router = useRouter()

const {
  loading,
  submitting,
  asset,
  assetCode,
  formRef,
  handleSubmit: baseHandleSubmit,
} = useAssetOperationForm<{
  last_known_location?: string | null
  lost_date?: string | null
  lost_reason: string
  lost_description?: string | null
}>({
  submitFn: async (data) => {
    await lostAssetAPI.markAssetAsLost(assetCode.value, {
      last_known_location: data.last_known_location || null,
      lost_date: data.lost_date || undefined,
      lost_reason: data.lost_reason,
      lost_description: data.lost_description || null,
    })
  },
  successMessage: '遗失登记成功',
  errorMessage: '遗失登记失败，请重试',
})

// formRef 由模板 ref="formRef" 绑定到 el-form，供 composable 内部校验；
// vue-tsc 不将模板 ref 绑定计为变量使用，此处显式消费以消除 TS6133
void formRef
const formData = reactive({
  last_known_location: '',
  lost_date: '',
  lost_reason: '',
  lost_description: '',
})

const rules: FormRules = {
  lost_reason: [{ required: true, message: '请输入遗失原因', trigger: 'blur' }],
}

const handleSubmit = () => baseHandleSubmit(formData)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;
</style>
