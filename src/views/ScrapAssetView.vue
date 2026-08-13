<!--
@file 资产报废申请页面，填写报废原因并提交申请
@component ScrapAssetView.vue
@description 资产报废申请页面，填写报废原因并提交申请
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - components/AssetOperationLayout: 资产操作通用布局
  - composables/useAssetOperationForm: 资产操作表单逻辑
  - api/asset: 资产数据接口
-->
<template>
  <AssetOperationLayout
    title="资产报废申请"
    :icon="Delete"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
    :fetch-error="fetchError"
    @retry="fetchAsset"
  >
    <template #form>
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="报废原因" prop="reason">
          <el-input
            v-model="formData.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入报废原因"
          />
        </el-form-item>
      </el-form>
    </template>

    <template #actions>
      <div class="action-buttons">
        <el-button type="danger" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
          提交报废申请
        </el-button>
        <el-button @click="router.back()">取消</el-button>
      </div>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Delete } from '@element-plus/icons-vue'
import type { FormRules } from 'element-plus'
import AssetOperationLayout from '@/components/AssetOperationLayout.vue'
import { useAssetOperationForm } from '@/composables/useAssetOperationForm'
import { assetAPI } from '@/api/asset'
import { AssetCurrentStatus } from '@/types/asset' // [修复] 新增状态枚举导入

const router = useRouter()

const {
  loading,
  submitting,
  asset,
  assetCode,
  fetchError, // [修复] 新增：加载失败状态
  fetchAsset, // [修复] 补充解构：供 @retry 事件调用
  formRef,
  handleSubmit: baseHandleSubmit,
} = useAssetOperationForm<{ reason: string }>({
  // [修复] 切换为专用报废 API，不再直接调用 changeAssetStatus 绕过状态机校验
  submitFn: async (data) => {
    await assetAPI.applyDamaged(assetCode.value, {
      reason: data.reason,
    })
  },
  successMessage: '报废申请已提交',
  errorMessage: '提交报废申请失败，请重试',
  // [修复] 移除 suppressDefaultError: true — 新分类处理逻辑已天然避免重复弹窗
})

// formRef 由模板 ref="formRef" 绑定到 el-form，供 composable 内部校验；
// vue-tsc 不将模板 ref 绑定计为变量使用，此处显式消费以消除 TS6133
void formRef
// [修复] 前端状态校验：仅允许以下状态的资产提交报废申请
// 与后端 FSM 允许的前置状态（in_use|recycled_pending|broken|lost）严格对齐
const canSubmit = computed(
  () =>
    asset.value?.asset_current_status &&
    [
      AssetCurrentStatus.IN_USE,
      AssetCurrentStatus.RECYCLED_PENDING,
      AssetCurrentStatus.BROKEN,
      AssetCurrentStatus.LOST,
    ].includes(asset.value.asset_current_status),
)

const formData = reactive({
  reason: '',
})

const rules: FormRules = {
  reason: [{ required: true, message: '请输入报废原因', trigger: 'blur' }],
}

const handleSubmit = () => baseHandleSubmit(formData)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;
</style>
