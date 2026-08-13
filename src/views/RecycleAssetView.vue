<!--
@file 资产回收页面，填写回收信息并提交回收申请
@component RecycleAssetView.vue
@usedBy
  - router/index.ts: 路由懒加载
  - views/AssetView.vue: 资产操作页
  - views/RecycleAssetView.vue: 回收资产操作页
  - views/AssetAssetView.vue: 资产操作页
@dependsOn
  - components/AssetOperationLayout.vue: 资产操作通用布局
  - composables/useAssetOperationForm.vue: 资产操作表单逻辑
  - api/recycleAsset.vue: 回收资产数据接口
  - api/Asset.vue: 资产数据接口
  - api/storage.vue: 仓库数据接口
-->
<template>
  <AssetOperationLayout
    title="资产回收"
    :icon="RefreshLeft"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
  >
    <template #form>
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="回收数量" prop="recycle_asset_number">
          <el-input-number v-model="formData.recycle_asset_number" :min="1" :max="1000" />
        </el-form-item>
        <el-form-item label="回收备注" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入回收备注"
          />
        </el-form-item>
      </el-form>
    </template>

    <template #actions>
      <div class="action-buttons">
        <el-button type="primary" :loading="submitting" @click="handleSubmit"> 确认回收 </el-button>
        <el-button @click="router.back()">取消</el-button>
      </div>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { RefreshLeft } from '@element-plus/icons-vue'
import type { FormRules } from 'element-plus'
import AssetOperationLayout from '@/components/AssetOperationLayout.vue'
import { useAssetOperationForm } from '@/composables/useAssetOperationForm'
import { recycleAssetAPI } from '@/api/recycleAsset'

const router = useRouter()

const {
  loading,
  submitting,
  asset,
  assetCode,
  formRef,
  handleSubmit: baseHandleSubmit,
} = useAssetOperationForm<{
  recycle_asset_number: number
  remark?: string | null
}>({
  submitFn: async (data) => {
    await recycleAssetAPI.createRecycleAsset({
      outasset_recordcode: assetCode.value,
      recycle_asset: assetCode.value,
      recycle_asset_number: data.recycle_asset_number,
      recycle_asset_storage: '',
      recycle_asset_recycle_person_jobcode: '',
      recycle_asset_date: new Date().toISOString().split('T')[0],
      recycle_type: 'normal',
      recycle_asset_description: data.remark || '',
    })
  },
  successMessage: '回收操作成功',
  errorMessage: '回收操作失败，请重试',
})

// formRef 由模板 ref="formRef" 绑定到 el-form，供 composable 内部校验；
// vue-tsc 不将模板 ref 绑定计为变量使用，此处显式消费以消除 TS6133
void formRef
const formData = reactive({
  recycle_asset_number: 1,
  remark: '',
})

const rules: FormRules = {
  recycle_asset_number: [{ required: true, message: '请输入回收数量', trigger: 'blur' }],
}

const handleSubmit = () => baseHandleSubmit(formData)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;
</style>
