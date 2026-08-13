<!--
@file 资产损坏登记页面，填写损坏信息并提交登记
@component MarkBrokenView
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - components/AssetOperationLayout: 资产操作通用布局
  - composables/useAssetOperationForm: 资产操作表单逻辑
  - api/asset: 资产数据接口
-->
<template>
  <AssetOperationLayout
    title="资产损坏登记"
    :icon="WarningFilled"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
  >
    <template #form>
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
        <el-form-item label="损坏日期" prop="broken_date">
          <el-date-picker
            v-model="formData.broken_date"
            type="date"
            placeholder="请选择损坏日期（默认今天）"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="损坏原因" prop="broken_reason">
          <el-input v-model="formData.broken_reason" placeholder="请输入损坏原因" />
        </el-form-item>
        <el-form-item label="详细描述" prop="broken_description">
          <el-input
            v-model="formData.broken_description"
            type="textarea"
            :rows="3"
            placeholder="详细描述（可选）"
          />
        </el-form-item>
      </el-form>
    </template>

    <template #actions>
      <div class="action-buttons">
        <el-button type="danger" :loading="submitting" @click="handleSubmit"> 确认损坏 </el-button>
        <el-button @click="router.back()">取消</el-button>
      </div>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { WarningFilled } from '@element-plus/icons-vue'
import type { FormRules } from 'element-plus'
import AssetOperationLayout from '@/components/AssetOperationLayout.vue'
import { useAssetOperationForm } from '@/composables/useAssetOperationForm'
import { assetAPI } from '@/api/asset'

const router = useRouter()

const {
  loading,
  submitting,
  asset,
  assetCode,
  formRef,
  handleSubmit: baseHandleSubmit,
} = useAssetOperationForm<{
  broken_reason: string
  broken_description?: string | null
  broken_date?: string | null
}>({
  submitFn: async (data) => {
    await assetAPI.markAssetAsBroken(assetCode.value, {
      broken_reason: data.broken_reason,
      broken_description: data.broken_description || undefined,
      broken_date: data.broken_date || undefined,
    })
  },
  successMessage: '损坏登记成功',
  errorMessage: '损坏登记失败，请重试',
})

// formRef 由模板 ref="formRef" 绑定到 el-form，供 composable 内部校验；
// vue-tsc 不将模板 ref 绑定计为变量使用，此处显式消费以消除 TS6133
void formRef
const formData = reactive({
  broken_date: '',
  broken_reason: '',
  broken_description: '',
})

const rules: FormRules = {
  broken_reason: [{ required: true, message: '请输入损坏原因', trigger: 'blur' }],
}

const handleSubmit = () => baseHandleSubmit(formData)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;
</style>
