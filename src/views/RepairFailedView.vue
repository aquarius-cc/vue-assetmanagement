<!--
  RepairFailedView.vue
  标记维修失败：repairing → damaged
-->
<!--
@file 标记维修失败页面，将资产状态从维修中流转为待报废
@component RepairFailedView
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
    title="标记维修失败"
    :icon="WarningFilled"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
    :fetch-error="fetchError"
    @retry="fetchAsset"
  >
    <template #form>
      <el-form ref="formRef">
        <!-- 静态业务提示：始终展示 -->
        <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
          此操作将标记维修失败，资产将转入待报废状态。
        </el-alert>
        <!-- 动态状态校验提示：状态不允许时展示 -->
        <el-alert
          v-if="asset && !canFail"
          type="error"
          :closable="false"
          title="当前资产状态不允许标记维修失败，仅「维修中」状态的资产可操作"
          style="margin-bottom: 16px"
        />
      </el-form>
    </template>

    <template #actions>
      <div class="action-buttons">
        <el-button type="danger" :loading="submitting" :disabled="!canFail" @click="handleSubmit">
          确认维修失败
        </el-button>
        <el-button @click="router.back()">取消</el-button>
      </div>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { WarningFilled } from '@element-plus/icons-vue'
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
} = useAssetOperationForm<Record<string, never>>({
  submitFn: async () => {
    // 维修失败无需表单数据，仅传资产编码
    await repairAssetAPI.repairFailed(assetCode.value)
  },
  successMessage: '维修失败已确认，资产已转入待报废状态',
  errorMessage: '维修失败操作失败，请重试',
})

// formRef 由模板 ref="formRef" 绑定到 el-form，供 composable 内部校验；
// vue-tsc 不将模板 ref 绑定计为变量使用，此处显式消费以消除 TS6133 错误
void formRef
// 状态前置校验：仅「维修中」状态可标记维修失败
const canFail = computed(() => asset.value?.asset_current_status === AssetCurrentStatus.REPAIRING)

// 无表单字段，传空对象触发 composable 内部的 formRef.validate 流程
const handleSubmit = () => baseHandleSubmit({})
</script>
