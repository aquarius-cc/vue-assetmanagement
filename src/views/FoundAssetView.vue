<!--
@file 找回遗失资产页面，记录找回信息并提交找回操作
@component FoundAssetView
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - components/AssetOperationLayout: 资产操作通用布局
  - composables/useAssetOperationForm: 资产操作表单逻辑
  - api/lostAsset: 遗失资产数据接口
-->
<template>
  <AssetOperationLayout
    title="找回遗失资产"
    :icon="CircleCheck"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
  >
    <template #form>
      <el-form ref="formRef" :model="formData" label-width="100px">
        <el-form-item label="找回地点" prop="found_location">
          <el-input v-model="formData.found_location" placeholder="请输入找回地点（可选）" />
        </el-form-item>
        <el-form-item label="找回描述" prop="found_description">
          <el-input
            v-model="formData.found_description"
            type="textarea"
            :rows="3"
            placeholder="请输入找回描述（可选）"
          />
        </el-form-item>
      </el-form>
    </template>

    <template #actions>
      <div class="action-buttons">
        <el-button type="success" :loading="submitting" @click="handleSubmit"> 确认找回 </el-button>
        <el-button @click="router.back()">取消</el-button>
      </div>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheck } from '@element-plus/icons-vue'
import AssetOperationLayout from '@/components/AssetOperationLayout.vue'
import { useAssetOperationForm } from '@/composables/useAssetOperationForm'
import { lostAssetAPI } from '@/api/lostAsset'

const router = useRouter()

const {
  loading,
  submitting,
  asset,
  assetCode,
  handleSubmit: baseHandleSubmit,
} = useAssetOperationForm<{
  found_location?: string | null
  found_description?: string | null
}>({
  submitFn: async (data) => {
    await lostAssetAPI.foundAsset(assetCode.value, {
      found_location: data.found_location || undefined,
      found_description: data.found_description || undefined,
    })
  },
  successMessage: '遗失资产已找回并加入已回收待发放状态',
  errorMessage: '找回操作失败，请重试',
})

const formData = reactive({
  found_location: '',
  found_description: '',
})

const handleSubmit = () => baseHandleSubmit(formData)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;
</style>
