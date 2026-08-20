<!--
  WasteAssetForm.vue
  已报废资产详情页面（只读）
  【AGENTS规范】Waste记录由后端自动创建（当Damaged审批通过时），前端只能查看
  模式判断：route.query.code 存在为查看模式
  功能：
    - 查看已报废资产详情
    - 资产名称、合同名称等展示
    - 返回按钮
-->
<template>
  <div class="waste-asset-form" v-loading="isLoading" element-loading-text="加载中...">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Document /></el-icon>
          <span>已报废资产详情</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        label-width="140px"
        size="default"
        class="full-width-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <h3 class="section-title">已报废资产信息</h3>
          </el-col>

          <!-- 资产名称（只读） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产名称">
              <el-input v-model="formData.asset_name_display" disabled />
            </el-form-item>
          </el-col>

          <!-- 资产编码（只读） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产编码">
              <el-input v-model="formData.waste_asset_code" disabled />
            </el-form-item>
          </el-col>

          <!-- 合同名称（只读） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同名称">
              <el-input v-model="formData.contract_name_display" disabled />
            </el-form-item>
          </el-col>

          <!-- 合同编码（只读） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同编码">
              <el-input v-model="formData.waste_asset_contract_code" disabled />
            </el-form-item>
          </el-col>

          <!-- 已报废数量（只读） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="已报废数量">
              <el-input-number
                v-model="formData.waste_asset_number"
                :min="1"
                :max="999999"
                disabled
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <!-- 报废日期（只读） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="报废日期">
              <el-date-picker
                v-model="formData.waste_asset_date"
                type="date"
                disabled
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <!-- 报废描述（只读） -->
          <el-col :span="24">
            <el-form-item label="报废描述">
              <el-input
                type="textarea"
                :rows="3"
                v-model="formData.waste_asset_description"
                disabled
              />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-actions">
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>



<script lang="ts" setup>
defineOptions({ name: 'WasteAssetForm' })

import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import { useAssetStore } from '@/stores/assetStore'
import { useContractStore } from '@/stores/contractStore'
import { useWasteAssetStore } from '@/stores/wasteAssetStore'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const assetStore = useAssetStore()
const contractStore = useContractStore()
const wasteAssetStore = useWasteAssetStore()
const isLoading = ref(false)

// ===== 表单数据（只读展示） =====
interface FormDataType {
  waste_asset_code: string
  asset_name_display: string
  waste_asset_contract_code: string
  contract_name_display: string
  waste_asset_number: number
  waste_asset_date: string
  waste_asset_description: string
}

const formData = reactive<FormDataType>({
  waste_asset_code: '',
  asset_name_display: '',
  waste_asset_contract_code: '',
  contract_name_display: '',
  waste_asset_number: 1,
  waste_asset_date: '',
  waste_asset_description: '',
})

// ===== 加载详情数据 =====
const loadDetailData = async (code: string) => {
  isLoading.value = true
  try {
    const detail = await wasteAssetStore.getById(code)
    if (!detail) {
      ElMessage.error('未找到对应已报废资产记录')
      router.back()
      return
    }
    // 回填表单数据
    formData.waste_asset_code = detail.waste_asset_code || ''
    formData.asset_name_display = detail.asset_name || ''
    formData.waste_asset_contract_code = detail.waste_asset_contract_code || ''
    formData.contract_name_display = detail.contract_name || ''
    formData.waste_asset_number = detail.waste_asset_number || 1
    formData.waste_asset_date = detail.waste_asset_date || ''
    formData.waste_asset_description = detail.waste_asset_description || ''

    // 如果后端未返回名称，尝试通过 Store 联动查询
    if (!detail.asset_name && detail.waste_asset_code) {
      try {
        const asset = await assetStore.getById(detail.waste_asset_code)
        if (asset) formData.asset_name_display = asset.asset_name
      } catch {
        // 查询失败不阻塞
      }
    }
    if (!detail.contract_name && detail.waste_asset_contract_code) {
      try {
        const contract = await contractStore.getById(detail.waste_asset_contract_code)
        if (contract) formData.contract_name_display = contract.contract_name
      } catch {
        // 查询失败不阻塞
      }
    }
  } catch (error) {
    console.error('加载已报废资产详情失败:', error)
    ElMessage.error('加载数据失败，请刷新重试')
    router.back()
  } finally {
    isLoading.value = false
  }
}

// ===== 返回 =====
const goBack = () => {
  router.go(-1)
}

// ===== 生命周期 =====
onMounted(async () => {
  const code = route.query.code as string
  if (!code) {
    ElMessage.error('缺少资产编码参数')
    router.back()
    return
  }
  await loadDetailData(code)
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.waste-asset-form {
  @include form-container;
}
</style>
