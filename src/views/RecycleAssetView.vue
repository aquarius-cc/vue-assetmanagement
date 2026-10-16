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
  - composables/useAssetOperationForm.ts: 资产操作表单逻辑（成功后 router.back() 回跳详情页）
  - composables/useRecycleFormAssociations.ts: 回收仓库下拉数据
  - composables/useRecyclableOutAssets.ts: 可回收出库单解析（F2 契约：outasset_recordcode 必须来自活跃出库单）
  - stores/recycleAssetStore: 回收资产数据状态
-->
<template>
  <AssetOperationLayout
    title="资产回收"
    :icon="RefreshLeft"
    :asset-code="assetCode"
    :loading="loading"
    :asset="asset"
    :fetch-error="fetchError"
    @retry="fetchAsset"
  >
    <template #form>
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="回收仓库" prop="storage_code">
          <el-select
            v-model="formData.storage_code"
            placeholder="请选择回收仓库"
            :loading="storagesLoading"
            clearable
          >
            <el-option
              v-for="s in storages"
              :key="s.storage_code"
              :label="s.storage_name"
              :value="s.storage_code"
            />
          </el-select>
        </el-form-item>
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
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          确认回收
        </el-button>
        <el-button @click="router.back()">取消</el-button>
      </div>
    </template>
  </AssetOperationLayout>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, type FormRules } from 'element-plus'
import AssetOperationLayout from '@/components/AssetOperationLayout.vue'
import { useAssetOperationForm } from '@/composables/useAssetOperationForm'
import { useRecycleFormAssociations } from '@/composables/useRecycleFormAssociations'
import { useRecyclableOutAssets } from '@/composables/useRecyclableOutAssets'
import { useRecycleAssetStore } from '@/stores'
import { todayLocalISO } from '@/utils/Format'

const router = useRouter()

const { storages, loading: storagesLoading, loadStorages } = useRecycleFormAssociations()
const {
  list: recyclableList,
  loading: recyclableLoading,
  search: searchRecyclable,
} = useRecyclableOutAssets()

/** 活跃出库单 recordcode（F2 契约：单条创建必须关联真实出库单，非空才允许提交） */
const recyclableRecordcode = ref('')

/** 仓库必填下拉表单数据 */
const formData = reactive({
  storage_code: '',
  recycle_asset_number: 1,
  remark: '',
})

const rules: FormRules = {
  storage_code: [{ required: true, message: '请选择回收仓库', trigger: 'change' }],
  recycle_asset_number: [{ required: true, message: '请输入回收数量', trigger: 'blur' }],
}

const {
  loading,
  submitting,
  asset,
  assetCode,
  fetchError, // [BF-095/M-4] 加载失败状态
  fetchAsset, // [BF-095/M-4] 供 @retry 事件调用
  formRef,
  handleSubmit: baseHandleSubmit,
} = useAssetOperationForm<{
  storage_code: string
  recycle_asset_number: number
  remark?: string | null
}>({
  submitFn: async (data) => {
    const recycleAssetStore = useRecycleAssetStore()
    if (!recyclableRecordcode.value) {
      throw new Error('缺少活跃出库单，无法提交回收')
    }
    // 该 store 已配置 disableAutoMessage，成功消息由 composable 统一弹出，避免双弹
    // F2 契约字段：outasset_recordcode / storage_code / recycle_asset_date / recycle_type 必填
    await recycleAssetStore.create({
      outasset_recordcode: recyclableRecordcode.value,
      storage_code: data.storage_code,
      recycle_asset_number: data.recycle_asset_number,
      recycle_asset_date: todayLocalISO(),
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

/**
 * 资产加载后：① 回填仓库默认值；② 解析活跃出库单（F2 契约核心）。
 * asset_code（业务编码）与 recordcode（记录编码）不同——recyclable 接口按 asset_code 过滤，
 * 且后端为 icontains 模糊匹配，故客户端按精确 asset_code 二次过滤，防止子串误命中其他资产的出库单。
 */
watch(
  asset,
  async (current) => {
    if (!current) return
    if (current.asset_storage_code && !formData.storage_code) {
      formData.storage_code = current.asset_storage_code
    }
    if (!current.asset_code) return
    await searchRecyclable({ asset_code: current.asset_code, page_size: 100 })
    const exact = recyclableList.value.find((item) => item.asset_code === current.asset_code)
    if (exact) {
      recyclableRecordcode.value = exact.recordcode
    } else {
      ElMessage.warning('该资产暂无可回收的在用出库记录，无法提交回收')
    }
  },
  { immediate: true },
)

// 挂载后加载仓库下拉数据（复用 useRecycleFormAssociations 缓存）
void loadStorages()

const canSubmit = computed(() => !!recyclableRecordcode.value && !recyclableLoading.value)

const handleSubmit = () => baseHandleSubmit(formData)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/asset-operation.scss' as *;
</style>
