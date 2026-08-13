<!--
  RepairDoneView.vue
  标记维修完成：repairing → recycled_pending
-->
<!--
@file 标记维修完成页面，将资产状态从维修中流转为已回收待发放
@component RepairDoneView
@usedBy
  - router/index.ts: 路由懒加载
  - components/componentsdetails/detils/BasicAssetDetails.vue: 资产详情页按钮跳转
@dependsOn
  - components/AssetOperationLayout: 资产操作通用布局
  - composables/useAssetOperationForm: 资产操作表单逻辑
  - api/repairAsset: 维修资产数据接口
  - types/asset: 资产状态枚举
-->
<template>
  <AssetOperationLayout
    title="维修完成"
    :icon="CircleCheck"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
    :fetch-error="fetchError"
    @retry="fetchAsset"
  >
    <template #form>
      <el-alert
        v-if="asset && !canComplete"
        type="warning"
        :closable="false"
        title="当前资产状态不允许完成维修，仅「维修中」状态的资产可确认维修完成"
        style="margin-bottom: 16px"
      />
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="140px">
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
    </template>

    <template #actions>
      <div class="action-buttons">
        <el-button
          type="success"
          :loading="submitting"
          :disabled="!canComplete"
          @click="handleSubmit"
        >
          确认维修完成
        </el-button>
        <el-button @click="router.back()">取消</el-button>
      </div>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheck } from '@element-plus/icons-vue'
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
  fetchError, // [修复] 新增：加载失败状态
  fetchAsset, // [修复] 补充解构：供 @retry 事件调用
  formRef,
  handleSubmit: baseHandleSubmit,
} = useAssetOperationForm<{
  actual_return_date: string
  physical_grade_after: string
}>({
  submitFn: async (data) => {
    await repairAssetAPI.repairDone(assetCode.value, {
      // 空字符串兜底为 undefined，避免向后端传递空值
      actual_return_date: data.actual_return_date || undefined,
      physical_grade_after: data.physical_grade_after || undefined,
    })
  },
  successMessage: '维修完成确认成功',
  errorMessage: '维修完成操作失败，请重试',
})

// formRef 由模板 ref="formRef" 绑定到 el-form，供 composable 内部校验；
// vue-tsc 不将模板 ref 绑定计为变量使用，此处显式消费以消除 TS6133
void formRef
// 状态前置校验：仅「维修中」状态可确认维修完成
const canComplete = computed(
  () => asset.value?.asset_current_status === AssetCurrentStatus.REPAIRING,
)

const formData = reactive({
  actual_return_date: '',
  physical_grade_after: 'good', // 默认良好，与重构前保持一致
})

const rules: FormRules = {
  actual_return_date: [{ required: true, message: '请选择归还日期', trigger: 'change' }],
}

const handleSubmit = () => baseHandleSubmit(formData)
</script>
