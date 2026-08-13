<!--
  UnregisteredAssetForm.vue
  未登记资产表单页面（新增/编辑）  模式判断：route.query.code 存在为编辑模式，否则为新增模式）  功能：    - 新增未登记资产记录）    - 编辑已有未登记资产记录）    - 场景类型选择（el-select）    - 资产类型编码联动（el-autocomplete 联动 assetTypeStore）    - 关联资产编码联动（el-autocomplete 联动 assetStore）    - 目标仓库编码联动（el-autocomplete 联动 storageStore）    - S2/S3 场景）related_asset_code 必填联动校验
    - 表单验证
-->
<template>
  <div class="unregistered-asset-form" v-loading="isLoading" element-loading-text="加载中...">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><EditPen /></el-icon>
          <span>{{ isEditMode ? '未登记资产编码' : '未登记资产录入' }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        size="default"
        class="full-width-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <h3 class="section-title">未登记资产信息</h3>
          </el-col>

          <!-- 场景类型 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="场景类型" prop="scenario_type">
              <el-select
                v-model="formData.scenario_type"
                placeholder="请选择场景类型"
                style="width: 100%"
                @change="handleScenarioTypeChange"
              >
                <el-option
                  v-for="item in scenarioTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 发现日期 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="发现日期" prop="discovery_date">
              <el-date-picker
                v-model="formData.discovery_date"
                type="date"
                placeholder="请选择发现日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <!-- 发现地点 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="发现地点" prop="discovery_location">
              <el-input
                v-model="formData.discovery_location"
                placeholder="请输入发现地点"
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- 资产名称 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产名称" prop="asset_name">
              <el-input v-model="formData.asset_name" placeholder="请输入资产名称" clearable />
            </el-form-item>
          </el-col>

          <!-- 资产品牌 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产品牌" prop="asset_brand">
              <el-input
                v-model="formData.asset_brand"
                placeholder="请输入资产品牌（可选）"
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- 资产规格型号 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产规格型号" prop="asset_specification">
              <el-input
                v-model="formData.asset_specification"
                placeholder="请输入资产规格型号（可选）"
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- 资产类型编码（联动 assetTypeStore） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产类型编码" prop="asset_type_code_display">
              <el-autocomplete
                v-model="formData.asset_type_code_display"
                :fetch-suggestions="fetchAssetTypeSuggestions"
                placeholder="请输入资产类型编码"
                clearable
                @select="handleAssetTypeSelect"
                @change="handleAssetTypeCodeChange"
              >
                <template #default="{ item }">
                  <div>类型编码：{{ item.type_code }} / 类型名称：{{ item.type_name }}</div>
                </template>
              </el-autocomplete>
            </el-form-item>
          </el-col>

          <!-- 预估价值 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="预估价值" prop="estimated_value">
              <el-input-number
                v-model="formData.estimated_value"
                :min="0"
                :precision="2"
                :step="100"
                placeholder="请输入预估价值（可选）"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <!-- 关联资产编码（S2/S3 场景必填） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item
              label="关联资产编码"
              prop="related_asset_code_display"
              :required="isRelatedAssetRequired"
            >
              <el-autocomplete
                v-model="formData.related_asset_code_display"
                :fetch-suggestions="fetchAssetSuggestions"
                placeholder="请输入关联资产编码"
                clearable
                @select="handleRelatedAssetSelect"
                @change="handleRelatedAssetCodeChange"
              >
                <template #default="{ item }">
                  <div>
                    资产名称：{{ item.asset_name }} / 资产编码：{{ item.asset_code }} / 规格型号：{{
                      item.asset_specification || ''
                    }}
                  </div>
                </template>
              </el-autocomplete>
              <div v-if="isRelatedAssetRequired" class="field-hint">
                当前场景下关联资产编码为必填
              </div>
            </el-form-item>
          </el-col>

          <!-- 目标仓库编码（联动 storageStore） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="目标仓库编码" prop="target_storage_code_display">
              <el-autocomplete
                v-model="formData.target_storage_code_display"
                :fetch-suggestions="fetchStorageSuggestions"
                placeholder="请输入目标仓库编码（可选）"
                clearable
                @select="handleStorageSelect"
                @change="handleStorageCodeChange"
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

          <!-- 处理描述 -->
          <el-col :span="24">
            <el-form-item label="处理描述" prop="handle_description">
              <el-input
                type="textarea"
                :rows="3"
                v-model="formData.handle_description"
                placeholder="请输入处理描述（可选）"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-actions">
          <el-button v-if="!isEditMode" @click="resetForm">重置</el-button>
          <el-button type="primary" @click="submitForm" :loading="unregisteredAssetStore.loading">
            {{ isEditMode ? '保存修改' : '提交登记' }}
          </el-button>
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts">
export default {
  name: 'UnregisteredAssetForm',
}
</script>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { EditPen } from '@element-plus/icons-vue'
import { isAxiosError } from 'axios'
import { useAssetStore } from '@/stores/assetStore'
import { useAssetTypeStore } from '@/stores/assetTypeStore'
import { useStorageStore } from '@/stores/storageStore'
import { useUnregisteredAssetStore } from '@/stores/unregisteredAssetStore'
import type { UnregisteredAssetCreateForm } from '@/types/unregisteredasset'
import { ScenarioType } from '@/types/unregisteredasset'
import type { AssetDetail } from '@/types/asset'
import type { AssetType } from '@/types/assettype'
import type { Storage } from '@/types/storage'
import type { AssetTypeSuggestion } from '@/types/form-helpers'
import { createSuggestionFetcher } from '@/composables/useSuggestionFetcher'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const assetStore = useAssetStore()
const assetTypeStore = useAssetTypeStore()
const storageStore = useStorageStore()
const unregisteredAssetStore = useUnregisteredAssetStore()
const formRef = ref()
const isLoading = ref(false)

const isEditMode = ref(!!route.query.code)

// ===== 场景类型选项 =====
const scenarioTypeOptions = [
  { value: ScenarioType.S1_NO_RECORD, label: '无记录资产' },
  { value: ScenarioType.S2_NO_OUTASSET, label: '无出库记录' },
  { value: ScenarioType.S3_STATUS_MISMATCH, label: '状态不匹配' },
]

// ===== S2/S3 场景下关联资产编码必填判断 =====
const isRelatedAssetRequired = computed(() => {
  return (
    formData.scenario_type === ScenarioType.S2_NO_OUTASSET ||
    formData.scenario_type === ScenarioType.S3_STATUS_MISMATCH
  )
})

// ===== 表单数据 =====
interface FormDataType {
  scenario_type: string
  discovery_date: string
  discovery_location: string
  asset_name: string
  asset_brand: string
  asset_specification: string
  asset_type_code_display: string
  asset_type_code: string
  estimated_value: number | null
  related_asset_code_display: string
  related_asset_code: string
  target_storage_code_display: string
  target_storage_code: string
  handle_description: string
}

const formData = reactive<FormDataType>({
  scenario_type: '',
  discovery_date: '',
  discovery_location: '',
  asset_name: '',
  asset_brand: '',
  asset_specification: '',
  asset_type_code_display: '',
  asset_type_code: '',
  estimated_value: null,
  related_asset_code_display: '',
  related_asset_code: '',
  target_storage_code_display: '',
  target_storage_code: '',
  handle_description: '',
})

const originalFormData = ref<FormDataType | null>(null)

// ===== 提交数据（仅包含 API 需要的字段）=====
const submitData = computed<UnregisteredAssetCreateForm>(() => ({
  scenario_type: formData.scenario_type,
  discovery_date: formData.discovery_date,
  discovery_location: formData.discovery_location,
  asset_name: formData.asset_name,
  asset_brand: formData.asset_brand || null,
  asset_specification: formData.asset_specification || null,
  unregistered_asset_type: formData.asset_type_code || null,
  estimated_value: formData.estimated_value ?? null,
  related_asset: formData.related_asset_code || null,
  unregistered_asset_storage: formData.target_storage_code || null,
  handle_description: formData.handle_description || null,
}))

// ===== 表单验证规则 =====
const formRules = computed(() => ({
  scenario_type: [{ required: true, message: '请选择场景类型', trigger: 'change' }],
  discovery_date: [{ required: true, message: '请选择发现日期', trigger: 'change' }],
  discovery_location: [{ required: true, message: '请输入发现地点', trigger: 'blur' }],
  asset_name: [{ required: true, message: '请输入资产名称', trigger: 'blur' }],
  related_asset_code_display: [
    {
      required: isRelatedAssetRequired.value,
      message: '当前场景下关联资产编码为必填',
      trigger: 'blur',
    },
  ],
}))

// ===== 场景类型切换处理 =====
const handleScenarioTypeChange = (value: string) => {
  // 切换到 S1 场景时，清空关联资产编码
  if (value === ScenarioType.S1_NO_RECORD) {
    formData.related_asset_code = ''
    formData.related_asset_code_display = ''
  }
}

// ===== 资产类型编码联动 =====
const fetchAssetTypeSuggestions = createSuggestionFetcher<AssetType, AssetTypeSuggestion>({
  fetchData: async (query: string) => {
    const response = await assetTypeStore.getList({ search: query, page: 1, page_size: 20 })
    return response
  },
  transform: (assetType: AssetType): AssetTypeSuggestion => ({
    value: assetType.type_code,
    type_code: assetType.type_code,
    type_name: assetType.type_name,
  }),
})

const handleAssetTypeSelect = (item: AssetTypeSuggestion) => {
  formData.asset_type_code_display = item.type_code
  formData.asset_type_code = item.type_code
}

const handleAssetTypeCodeChange = (value: string) => {
  if (!value.trim()) {
    formData.asset_type_code = ''
  }
}

// ===== 关联资产编码联动 =====
interface AssetSuggestion {
  value: string
  asset_name: string
  asset_code: string
  asset_specification: string | null
}

const fetchAssetSuggestions = createSuggestionFetcher<AssetDetail, AssetSuggestion>({
  fetchData: (query: string) => assetStore.getByName(query),
  transform: (asset: AssetDetail): AssetSuggestion => ({
    value: asset.asset_code,
    asset_name: asset.asset_name,
    asset_code: asset.asset_code,
    asset_specification: asset.asset_specification,
  }),
})

const handleRelatedAssetSelect = (item: AssetSuggestion) => {
  formData.related_asset_code_display = item.asset_code
  formData.related_asset_code = item.asset_code
}

const handleRelatedAssetCodeChange = (value: string) => {
  if (!value.trim()) {
    formData.related_asset_code = ''
  }
}

// ===== 目标仓库编码联动 =====
interface StorageSuggestion {
  value: string
  storage_name: string
  storage_code: string
  storage_address: string | null
}

const fetchStorageSuggestions = createSuggestionFetcher<Storage, StorageSuggestion>({
  fetchData: async (query: string) => {
    const response = await storageStore.getList({ search: query, page: 1, page_size: 20 })
    return response
  },
  transform: (storage: Storage): StorageSuggestion => ({
    value: storage.storage_code,
    storage_name: storage.storage_name,
    storage_code: storage.storage_code,
    storage_address: storage.storage_address,
  }),
})

const handleStorageSelect = (item: StorageSuggestion) => {
  formData.target_storage_code_display = item.storage_code
  formData.target_storage_code = item.storage_code
}

const handleStorageCodeChange = (value: string) => {
  if (!value.trim()) {
    formData.target_storage_code = ''
  }
}

// ===== 编辑模式：加载现有数据 =====
const loadEditData = async (code: string) => {
  isLoading.value = true
  try {
    const detail = await unregisteredAssetStore.getById(code)
    if (!detail) {
      ElMessage.error('未找到对应未登记资产记录')
      router.back()
      return
    }
    // 回填表单数据
    formData.scenario_type = detail.scenario_type || ''
    formData.discovery_date = detail.discovery_date || ''
    formData.discovery_location = detail.discovery_location || ''
    formData.asset_name = detail.asset_name || ''
    formData.asset_brand = detail.asset_brand || ''
    formData.asset_specification = detail.asset_specification || ''
    formData.asset_type_code =
      typeof detail.unregistered_asset_type === 'string' ? detail.unregistered_asset_type : ''
    formData.asset_type_code_display = formData.asset_type_code
    formData.estimated_value = detail.estimated_value ? Number(detail.estimated_value) : null
    const relatedAssetCode =
      typeof detail.related_asset === 'object' && detail.related_asset !== null
        ? detail.related_asset.code
        : typeof detail.related_asset === 'string'
          ? detail.related_asset
          : ''
    formData.related_asset_code = relatedAssetCode || ''
    formData.related_asset_code_display = formData.related_asset_code
    formData.target_storage_code =
      typeof detail.unregistered_asset_storage === 'string' ? detail.unregistered_asset_storage : ''
    formData.target_storage_code_display = formData.target_storage_code
    formData.handle_description = detail.handle_description || ''

    originalFormData.value = JSON.parse(JSON.stringify(formData))
  } catch (error) {
    console.error('加载未登记资产详情失败', error)
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
    // S2/S3 场景下关联资产编码必填校验
    if (isRelatedAssetRequired.value && !formData.related_asset_code) {
      ElMessage.error('当前场景下关联资产编码为必填')
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
        await unregisteredAssetStore.update(submitData.value)
        ElMessage.success('未登记资产修改成功！')
      } else {
        await unregisteredAssetStore.create(submitData.value)
        ElMessage.success('未登记资产录入成功！')
      }
      unregisteredAssetStore.setRefreshFlag(true)
      router.push({ name: 'UnregisteredAssetDetails' })
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        ElMessage.error(`操作失败${error.response?.data?.message || error.message}`)
      } else if (error instanceof Error) {
        ElMessage.error(`操作失败${error.message}`)
      } else {
        ElMessage.error('操作失败，请重试')
      }
      console.error('未登记资产提交失败', error)
    }
  })
}

// ===== 重置表单 =====
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(formData, {
    scenario_type: '',
    discovery_date: '',
    discovery_location: '',
    asset_name: '',
    asset_brand: '',
    asset_specification: '',
    asset_type_code_display: '',
    asset_type_code: '',
    estimated_value: null,
    related_asset_code_display: '',
    related_asset_code: '',
    target_storage_code_display: '',
    target_storage_code: '',
    handle_description: '',
  })
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

.unregistered-asset-form {
  @include form-container;
}

.field-hint {
  font-size: 12px;
  color: var(--color-warning-light);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
