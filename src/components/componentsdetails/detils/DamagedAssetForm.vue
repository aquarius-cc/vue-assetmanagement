<!--
  DamagedAssetForm.vue
  待报废资产表单页面（新增/编辑）
  模式判断：route.query.id 存在为编辑模式，否则为新增模式
  功能：
  - 新增待报废资产记录
  - 编辑已有待报废资产记录
  - 资产搜索选择（ScrapableAssetsSearch）
  - 资产名称→资产编码联动（el-autocomplete）
  - 合同名称→合同编码联动（el-autocomplete）
  - 仓库名称→仓库编码联动（el-autocomplete）
  - 表单验证
-->
<template>
  <div class="damaged-asset-form" v-loading="isLoading" element-loading-text="加载中...">
    <!-- 可报废资产搜索组件（新增模式显示）-->
    <ScrapableAssetsSearch
      v-if="!isEditMode"
      @select="handleAssetSearchSelect"
      class="search-component"
    />

    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><EditPen /></el-icon>
          <span>{{ isEditMode ? '待报废资产编码' : '待报废资产录入' }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        size="default"
        class="full-width-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <h3 class="section-title">待报废资产信息</h3>
          </el-col>

          <!-- 资产名称（联动资产编码） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产名称" prop="asset_name_display">
              <el-autocomplete
                v-model="formData.asset_name_display"
                :fetch-suggestions="assetLinkage.fetchSuggestions"
                placeholder="请输入资产名称"
                clearable
                :disabled="isEditMode"
                @select="assetLinkage.handleSelect"
                @change="assetLinkage.handleNameChange"
                @blur="assetLinkage.handleNameBlur"
              >
                <template #default="{ item }">
                  <div>
                    资产名称：{{ item.asset_name }} / 资产编码：{{ item.asset_code }} / 规格型号：{{
                      item.asset_specification || ''
                    }}
                  </div>
                </template>
              </el-autocomplete>
            </el-form-item>
          </el-col>

          <!-- 资产编码（只读回填） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产编码" prop="damaged_asset_code">
              <el-input
                v-model="formData.damaged_asset_code"
                placeholder="选择资产名称后自动回塀"
                disabled
              />
            </el-form-item>
          </el-col>

          <!-- 合同名称（联动合同编码） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同名称" prop="contract_name_display">
              <el-autocomplete
                v-model="formData.contract_name_display"
                :fetch-suggestions="contractLinkage.fetchSuggestions"
                placeholder="请输入合同名称"
                clearable
                @select="contractLinkage.handleSelect"
                @change="contractLinkage.handleNameChange"
                @blur="contractLinkage.handleNameBlur"
              >
                <template #default="{ item }">
                  <div>合同名称：{{ item.contract_name }} / 合同编码：{{ item.contract_code }}</div>
                </template>
              </el-autocomplete>
            </el-form-item>
          </el-col>

          <!-- 合同编码（只读回填） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同编码" prop="damaged_asset_contract_code">
              <el-input
                v-model="formData.damaged_asset_contract_code"
                placeholder="选择合同名称后自动回塀"
                disabled
              />
            </el-form-item>
          </el-col>

          <!-- 仓库名称（联动仓库编码） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="仓库名称" prop="storage_name_display">
              <el-autocomplete
                v-model="formData.storage_name_display"
                :fetch-suggestions="storageLinkage.fetchSuggestions"
                placeholder="请输入仓库名称"
                clearable
                @select="storageLinkage.handleSelect"
                @change="storageLinkage.handleNameChange"
                @blur="storageLinkage.handleNameBlur"
              >
                <template #default="{ item }">
                  <div>
                    仓库名称：{{ item.storage_name }} / 仓库编码：{{ item.storage_code }} /
                    仓库位置：{{ item.storage_address || '' }}
                  </div>
                </template>
              </el-autocomplete>
            </el-form-item>
          </el-col>

          <!-- 仓库编码（只读回填） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="仓库编码" prop="damaged_asset_storage_code">
              <el-input
                v-model="formData.damaged_asset_storage_code"
                placeholder="选择仓库名称后自动回塀"
                disabled
              />
            </el-form-item>
          </el-col>

          <!-- 待报废数量-->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="待报废数量" prop="damaged_asset_number">
              <el-input-number
                v-model="formData.damaged_asset_number"
                :min="1"
                :max="999999"
                placeholder="请输入数量"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <!-- 待报废日期 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="待报废日期" prop="damaged_date">
              <el-date-picker
                v-model="formData.damaged_date"
                type="date"
                placeholder="请选择待报废日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <!-- 描述 -->
          <el-col :span="24">
            <el-form-item label="描述" prop="damaged_asset_description">
              <el-input
                type="textarea"
                :rows="3"
                v-model="formData.damaged_asset_description"
                placeholder="请输入描述"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-actions">
          <el-button v-if="!isEditMode" @click="resetForm">重置</el-button>
          <el-button type="primary" @click="submitForm" :loading="damagedAssetStore.loading">
            {{ isEditMode ? '保存修改' : '提交报废' }}
          </el-button>
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'DamagedAssetForm' })

import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { EditPen } from '@element-plus/icons-vue'
import { isAxiosError } from 'axios'
import { useAssetStore } from '@/stores/assetStore'
import { useContractStore } from '@/stores/contractStore'
import { useStorageStore } from '@/stores/storageStore'
import { useDamagedAssetStore } from '@/stores/damagedAssetStore'
import type { DamagedAssetCreateForm } from '@/types/damagedasset'
import type { AssetDetail } from '@/types/asset'
import type { Contract } from '@/types/contract'
import type { Storage } from '@/types/storage'
import { useFormLinkage } from '@/composables/useFormLinkage'
import ScrapableAssetsSearch from '@/components/componentsdetails/detils/detilschildcomponents/ScrapableAssetsSearch.vue'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const assetStore = useAssetStore()
const contractStore = useContractStore()
const storageStore = useStorageStore()
const damagedAssetStore = useDamagedAssetStore()
const formRef = ref()
const isLoading = ref(false)

const isEditMode = ref(!!route.query.code)

// ===== 表单数据 =====
interface FormDataType {
  damaged_asset_code: string
  asset_name_display: string
  damaged_asset_contract_code: string
  contract_name_display: string
  damaged_asset_storage_code: string
  storage_name_display: string
  damaged_asset_number: number
  damaged_date: string
  damaged_asset_description: string
}

const formData = reactive<FormDataType>({
  damaged_asset_code: '',
  asset_name_display: '',
  damaged_asset_contract_code: '',
  contract_name_display: '',
  damaged_asset_storage_code: '',
  storage_name_display: '',
  damaged_asset_number: 1,
  damaged_date: '',
  damaged_asset_description: '',
})

const originalFormData = ref<FormDataType | null>(null)

// ===== 提交数据（仅包含 API 需要的字段）=====
// 【AGENTS规范】固定approval_status='pending'，不提交 approver
// [HALT] FE-C2修复：字段名从 damaged_asset_code 改为 asset_recordcode，与后端Serializer对齐
const submitData = computed<DamagedAssetCreateForm>(() => ({
  asset_recordcode: formData.damaged_asset_code || null,
  damaged_asset_number: formData.damaged_asset_number,
  damaged_date: formData.damaged_date || null,
  approval_status: 'pending',
  approver: null,
  damaged_asset_contract_code: formData.damaged_asset_contract_code || null,
  damaged_asset_storage_code: formData.damaged_asset_storage_code,
  damaged_asset_description: formData.damaged_asset_description || null,
}))

// ===== 表单验证规则 =====
const rules = {
  damaged_asset_storage_code: [{ required: true, message: '请选择仓库', trigger: 'blur' }],
  damaged_asset_number: [
    { required: true, message: '请输入待报废数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' },
  ],
}

// ===== 字段联动（DR-1: 消除 3 组重复的 select/change/blur 模式）=====
const assetLinkage = useFormLinkage<AssetDetail>({
  formData,
  displayField: 'asset_name_display',
  codeField: 'damaged_asset_code',
  fetcher: (q) => assetStore.getByName(q),
  getDisplayValue: (item) => String(item.asset_name ?? ''),
  getCodeValue: (item) => String(item.recordcode ?? ''),
})

const contractLinkage = useFormLinkage<Contract>({
  formData,
  displayField: 'contract_name_display',
  codeField: 'damaged_asset_contract_code',
  fetcher: (q) => contractStore.getByName(q),
  getDisplayValue: (item) => String(item.contract_name ?? ''),
  getCodeValue: (item) => String(item.contract_code ?? ''),
})

const storageLinkage = useFormLinkage<Storage>({
  formData,
  displayField: 'storage_name_display',
  codeField: 'damaged_asset_storage_code',
  fetcher: async (q) => {
    return await storageStore.getList({ search: q, page: 1, page_size: 20 })
  },
  getDisplayValue: (item) => String(item.storage_name ?? ''),
  getCodeValue: (item) => String(item.storage_code ?? ''),
})

// 资产搜索组件回调（专属 ScrapableAssetsSearch，绕过 linkage composable 直接写 formData）
const handleAssetSearchSelect = (asset: AssetDetail) => {
  formData.asset_name_display = asset.asset_name
  formData.damaged_asset_code = asset.recordcode
  if (asset.asset_storage) {
    formData.storage_name_display = asset.asset_storage.storage_name || ''
    formData.damaged_asset_storage_code = asset.asset_storage.storage_code || ''
  }
  if (asset.asset_contract) {
    formData.contract_name_display = asset.asset_contract.contract_name || ''
    formData.damaged_asset_contract_code = asset.asset_contract.contract_code || ''
  }
  ElMessage.success(`已选择资产${asset.asset_name}`)
}

// ===== 编辑模式：加载现有数捀=====
const loadEditData = async (code: string) => {
  isLoading.value = true
  try {
    const detail = await damagedAssetStore.getById(code)
    if (!detail) {
      ElMessage.error('未找到对应待报废资产记录')
      router.back()
      return
    }
    // 回填表单数据
    // [修复] damaged_asset_code 承载的是资产 recordcode（ASSET-xxx），后端序列化器输出字段为 asset_recordcode
    formData.damaged_asset_code = detail.asset_recordcode || ''
    formData.asset_name_display = detail.damaged_asset_name || ''
    formData.damaged_asset_contract_code = detail.damaged_asset_contract_code || ''
    formData.contract_name_display = detail.damaged_asset_contract_name || ''
    formData.damaged_asset_storage_code = detail.damaged_asset_storage_code || ''
    formData.storage_name_display = detail.damaged_asset_storage_name || ''
    formData.damaged_asset_number = detail.damaged_asset_number
    formData.damaged_date = detail.damaged_date || ''
    formData.damaged_asset_description = detail.damaged_asset_description || ''

    // 如果后端未返回名称，尝试通过 Store 联动查询
    if (!detail.damaged_asset_name && detail.asset_recordcode) {
      try {
        const asset = await assetStore.getById(detail.asset_recordcode)
        if (asset) formData.asset_name_display = asset.asset_name
      } catch {
        // 查询失败不阻塞
      }
    }
    if (!detail.damaged_asset_contract_name && detail.damaged_asset_contract_code) {
      try {
        const contract = await contractStore.getById(detail.damaged_asset_contract_code)
        if (contract) formData.contract_name_display = contract.contract_name
      } catch {
        // 查询失败不阻塞
      }
    }
    if (!detail.damaged_asset_storage_name && detail.damaged_asset_storage_code) {
      try {
        const storage = await storageStore.getById(detail.damaged_asset_storage_code)
        if (storage) formData.storage_name_display = storage.storage_name
      } catch {
        // 查询失败不阻塞
      }
    }

    originalFormData.value = JSON.parse(JSON.stringify(formData))
  } catch (error) {
    console.error('加载待报废资产详情失败', error)
    ElMessage.error('加载数据失败，请刷新重试')
    router.back()
  } finally {
    isLoading.value = false
  }
}

// ===== 提交表单 =====
const submitForm = () => {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error('请完善必填信息！')
      return
    }
    // 编辑模式下检查是否有修改
    if (isEditMode.value && originalFormData.value) {
      const hasChanged = Object.keys(formData).some(
        (key) =>
          (formData as Record<string, unknown>)[key] !==
          (originalFormData.value as Record<string, unknown>)[key],
      )
      if (!hasChanged) {
        ElMessage.info('数据未修改，无需提交')
        return
      }
    }
    try {
      if (isEditMode.value) {
        // 编辑模式：submitData 已包含damaged_asset_code（主键）
        await damagedAssetStore.update(submitData.value)
        ElMessage.success('待报废资产修改成功！')
      } else {
        await damagedAssetStore.create(submitData.value)
        ElMessage.success('待报废资产录入成功！')
      }
      damagedAssetStore.setRefreshFlag(true)
      router.push({ name: 'DamagedAssetDetails' })
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        ElMessage.error(`操作失败${error.response?.data?.message || error.message}`)
      } else if (error instanceof Error) {
        ElMessage.error(`操作失败${error.message}`)
      } else {
        ElMessage.error('操作失败，请重试')
      }
      console.error('待报废资产提交失败', error)
    }
  })
}

// ===== 重置表单 =====
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(formData, {
    damaged_asset_code: '',
    asset_name_display: '',
    damaged_asset_contract_code: '',
    contract_name_display: '',
    damaged_asset_storage_code: '',
    storage_name_display: '',
    damaged_asset_number: 1,
    damaged_date: '',
    damaged_asset_description: '',
  })
  // 【AGENTS规范】重置时不需要设置approval_status 咀approver
  ElMessage.info('表单已重置')
}

// ===== 返回 =====
const goBack = () => {
  router.go(-1)
}

// ===== 生命周期 =====
onMounted(async () => {
  if (isEditMode.value) {
    const code = route.query.code as string
    if (!code) {
      ElMessage.error('编辑请求缺少资产编码')
      router.back()
      return
    }
    await loadEditData(code)
  }
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.damaged-asset-form {
  @include form-container;

  .search-component {
    margin-bottom: 20px;
  }
}
</style>
