<!--
@file 资产维修申请页面，填写维修信息并提交申请
@component RepairAssetView.vue
@description 维修资产申请页面，填写维修信息并提交申请
@usedBy
  - router/index.ts: 路由懒加载
  - views/AssetManagementView.vue: 资产管理页面
  - views/ScrapAssetView.vue: 报废资产申请页面
  - views/AssetView.vue: 资产详情页面
  - views/RepairAssetView.vue: 维修资产申请页面
@dependsOn
  - components/AssetOperationLayout: 资产操作通用布局
  - composables/useAssetOperationForm: 资产操作表单逻辑
  - api/repairAsset: 维修资产数据接口
  - api/asset: 资产数据接口
  - api/repairAsset: 维修资产数据接口
-->
<template>
  <AssetOperationLayout
    title="资产维修"
    :icon="SetUp"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
  >
    <template #form>
      <el-alert
        v-if="asset && !canRepair"
        type="warning"
        :closable="false"
        title="当前资产状态不允许送修，仅「已损坏」状态的资产可发起维修"
        style="margin-bottom: 16px"
      />
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
          <el-input
            v-model="formData.repair_description"
            type="textarea"
            :rows="3"
            placeholder="请输入维修描述（可选）"
          />
        </el-form-item>
      </el-form>
    </template>

    <template #actions>
      <div class="action-buttons">
        <el-button
          type="warning"
          :loading="submitting"
          :disabled="!canRepair"
          @click="handleSubmit"
        >
          提交维修申请
        </el-button>
        <el-button @click="router.back()">取消</el-button>
      </div>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { SetUp } from '@element-plus/icons-vue'
import type { FormRules } from 'element-plus'
import AssetOperationLayout from '@/components/AssetOperationLayout.vue'
import { useAssetOperationForm } from '@/composables/useAssetOperationForm'
import { repairAssetAPI } from '@/api/repairAsset'
import { AssetCurrentStatus } from '@/types/asset'

const router = useRouter()

const {
  loading,
  submitting,
  asset,
  assetCode,
  formRef,
  handleSubmit: baseHandleSubmit,
} = useAssetOperationForm<{
  repair_asset_number: number
  repair_date: string
  repair_reason: string
  repair_description?: string | null
}>({
  submitFn: async (data) => {
    await repairAssetAPI.repairAsset(assetCode.value, {
      repair_asset_number: data.repair_asset_number,
      repair_date: data.repair_date,
      repair_reason: data.repair_reason,
      repair_description: data.repair_description || null,
    })
  },
  successMessage: '维修申请已提交',
  errorMessage: '提交维修申请失败，请重试',
})

// formRef 由模板 ref="formRef" 绑定到 el-form，供 composable 内部校验；
// vue-tsc 不将模板 ref 绑定计为变量使用，此处显式消费以消除 TS6133
void formRef
// 维修资产状态只能是故障资产
const canRepair = computed(() => asset.value?.asset_current_status === AssetCurrentStatus.BROKEN)

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

const handleSubmit = () => baseHandleSubmit(formData)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;
</style>
