<!--
  AssetForm.vue
  资产表单（新�?/ 编辑�?
  后端规则变更说明�?  - asset_code 由后端自动生成（格式：ASSET-{category}-{type_code}-{YYYYMMDD}-{random}-{seq}�?  - 前端新增时无需传�?asset_code，编辑时作为唯一标识仍需传�?  - �?asset_purchase_number > 1 时，后端创建多条 Asset 记录并返�?List[AssetDetail]
-->
<template>
  <div class="asset-form">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Edit v-if="isEditMode" /><Plus v-else /></el-icon>
          <span>{{ isEditMode ? '资产编辑' : '资产录入' }}</span>
          <el-button
            v-if="!isEditMode"
            type="primary"
            size="default"
            @click="handleLotAdds"
            class="batch-add-btn"
          >
            批量导入
          </el-button>
        </div>
      </template>

      <el-form ref="formRef" :model="assetForm" :rules="rules" label-width="140px" size="default">
        <el-row :gutter="20">
          <AssetBasicInfo
            :form="assetForm"
            :is-edit-mode="isEditMode"
            :display-status="displayStatus"
            :asset-types="associations.assetTypes.value"
            :entry-linkage="entryLinkage"
            @type-change="handleAssetTypeChange"
          />
          <AssetContractInfo
            :form="assetForm"
            :contracts="associations.contracts.value"
            :association-methods="associationMethods"
          />
          <AssetManagementInfo
            :form="assetForm"
            :applicant-linkage="applicantLinkage"
            :manager-linkage="managerLinkage"
          />
          <AssetStorageInfo
            :form="assetForm"
            :storages="associations.storages.value"
            :association-methods="associationMethods"
          />
        </el-row>

        <div class="form-actions">
          <el-button @click="resetForm">重置</el-button>
          <el-button type="primary" @click="submitForm">提交</el-button>
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts">
export default { name: 'AssetForm' }
</script>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import type {
  AssetCreateFormExtended,
} from '@/types/asset'
import { getAssetStatusText } from '@/utils/Format'
import { assetAPI } from '@/api/asset'
import {
  useUserStore,
  useAssetStore,
  useAssetTypeStore,
  useContractStore,
  useStorageStore,
} from '@/stores/index'
import { assetFormRules } from '@/utils/assetFormRules'
import {
  useEmployeeLinkage,
  useAssetFormAssociations,
  useAssetFormAssociationMethods,
} from '@/composables/useAssetFormHelpers'
import AssetBasicInfo from '@/components/componentsdetails/detils/detilschildcomponents/AssetBasicInfo.vue'
import AssetContractInfo from '@/components/componentsdetails/detils/detilschildcomponents/AssetContractInfo.vue'
import AssetManagementInfo from '@/components/componentsdetails/detils/detilschildcomponents/AssetManagementInfo.vue'
import AssetStorageInfo from '@/components/componentsdetails/detils/detilschildcomponents/AssetStorageInfo.vue'

const router = useRouter()
const route = useRoute()
const assetStore = useAssetStore()
const userStore = useUserStore()
const assetTypeStore = useAssetTypeStore()
const contractStore = useContractStore()
const storageStore = useStorageStore()
const formRef = ref()

const isEditMode = computed(() => !!route.query.code)

const assetForm = reactive<AssetCreateFormExtended>({
  asset_code: '',
  asset_name: '',
  asset_specification: '',
  asset_brand: '',
  asset_unit: '',
  asset_purchase_price: 0,
  asset_purchase_number: 1,
  asset_purchase_date: '',
  asset_warranty_period: 3,
  asset_entry_date: '',
  asset_type: '',
  asset_type_primary: '',
  asset_type_category: '',
  asset_entry_person: '',
  asset_entry_person_name: '',
  asset_contract: '',
  asset_contract_name: '',
  asset_applicant: '',
  asset_applicant_name: '',
  asset_manager: '',
  asset_manager_name: '',
  asset_using_location: '',
  asset_storage: '',
  asset_storage_name: '',
  asset_description: '',
  asset_current_status: '',
})

/**
 * 获取提交给后端的创建表单数据
 * 新增模式时不传�?asset_code（后端自动生成）
 * 编辑模式时传�?asset_code（作为唯一标识�? *
 * 字段映射（AssetCreateForm �?AssetCreateSerializer）：
 * - asset_type �?SlugRelatedField(slug_field='asset_type_code')
 * - asset_contract �?SlugRelatedField(slug_field='contract_code')
 * - asset_storage �?SlugRelatedField(slug_field='storage_code')
 * - asset_entry_person �?SlugRelatedField(slug_field='employee_jobcode')
 * - asset_applicant �?SlugRelatedField(slug_field='employee_jobcode')
 * - asset_manager �?SlugRelatedField(slug_field='employee_jobcode')
 */
const getAssetCreateForm = computed(() => {
  return {
    asset_name: assetForm.asset_name ?? '',
    asset_specification: assetForm.asset_specification ?? '',
    asset_brand: assetForm.asset_brand ?? '',
    asset_unit: assetForm.asset_unit ?? '',
    asset_purchase_price: assetForm.asset_purchase_price != null
      ? String(assetForm.asset_purchase_price) : '',
    asset_purchase_number: assetForm.asset_purchase_number ?? 1,
    asset_purchase_date: assetForm.asset_purchase_date ?? '',
    asset_warranty_period: assetForm.asset_warranty_period ?? 0,
    asset_entry_date: assetForm.asset_entry_date ?? '',
    asset_type: assetForm.asset_type ?? '',
    asset_entry_person: assetForm.asset_entry_person ?? '',
    asset_contract: assetForm.asset_contract ?? '',
    asset_applicant: assetForm.asset_applicant ?? '',
    asset_manager: assetForm.asset_manager ?? '',
    asset_using_location: assetForm.asset_using_location ?? '',
    asset_storage: assetForm.asset_storage ?? '',
    asset_description: assetForm.asset_description ?? '',
  }
})

const rules = assetFormRules

// 基础数据加载
const associations = useAssetFormAssociations(assetTypeStore, contractStore, storageStore)

// 合同 / 仓库联动
const contractUpdater = (name: string, code: string) => {
  assetForm.asset_contract_name = name
  assetForm.asset_contract = code
}
const storageCodeUpdater = (code: string) => {
  assetForm.asset_storage = code
}
const associationMethods = useAssetFormAssociationMethods(
  associations.contracts,
  associations.storages,
  contractStore.getByName, // 确保 store 提供此方�?  contractUpdater,
  storageCodeUpdater,
)

// 人员联动
const entryLinkage = useEmployeeLinkage(userStore.getByName, userStore.getById, (name, code) => {
  assetForm.asset_entry_person_name = name
  assetForm.asset_entry_person = code
})
const applicantLinkage = useEmployeeLinkage(
  userStore.getByName,
  userStore.getById,
  (name, code) => {
    assetForm.asset_applicant_name = name
    assetForm.asset_applicant = code
  },
)
const managerLinkage = useEmployeeLinkage(userStore.getByName, userStore.getById, (name, code) => {
  assetForm.asset_manager_name = name
  assetForm.asset_manager = code
})

const handleAssetTypeChange = (primaryName: string) => {
  const item = associations.assetTypes.value.find((t) => t.asset_type_primary === primaryName)
  if (item) {
    assetForm.asset_type = item.asset_type_code
    assetForm.asset_type_primary = item.asset_type_primary
    assetForm.asset_type_category = item.asset_type_category ?? ''
  } else {
    assetForm.asset_type = ''
    assetForm.asset_type_primary = ''
    assetForm.asset_type_category = ''
  }
}

// 编辑：加载详�?const loadAssetDetail = async (assetCode: string) => {
  try {
    const detail = await assetStore.getById(assetCode)
    if (!detail) {
      ElMessage.error('未找到该资产，请确认资产编码是否正确')
      return
    }

    assetForm.asset_code = detail.asset_code
    assetForm.asset_name = detail.asset_name
    assetForm.asset_specification = detail.asset_specification
    assetForm.asset_brand = detail.asset_brand ?? ''
    assetForm.asset_unit = detail.asset_unit ?? ''
    assetForm.asset_purchase_price = Number(detail.asset_purchase_price)
    assetForm.asset_purchase_number = Number(detail.asset_purchase_number)
    assetForm.asset_purchase_date = detail.asset_purchase_date ?? ''
    assetForm.asset_warranty_period = Number(detail.asset_warranty_period ?? 0)
    assetForm.asset_entry_date = detail.asset_entry_date ?? ''
    assetForm.asset_using_location = detail.asset_using_location ?? ''
    assetForm.asset_description = detail.asset_description ?? ''
    assetForm.asset_current_status = detail.asset_current_status ?? ''

    // FK 字段：后端返�?_code 后缀，表单使用同名字�?    assetForm.asset_type = detail.asset_type_code ?? ''
    assetForm.asset_contract = detail.asset_contract_code ?? ''
    assetForm.asset_storage = detail.asset_storage_code ?? ''
    assetForm.asset_entry_person = detail.asset_entry_person_jobcode ?? ''
    assetForm.asset_applicant = detail.asset_applicant_jobcode ?? ''
    assetForm.asset_manager = detail.asset_manager_jobcode ?? ''

    // 并行加载关联名称用于表单显示
    const [at, st, ep, ap, mg, ct] = await Promise.all([
      detail.asset_type_code ? assetTypeStore.getById(detail.asset_type_code) : null,
      detail.asset_storage_code ? storageStore.getById(detail.asset_storage_code) : null,
      detail.asset_entry_person_jobcode ? userStore.getById(detail.asset_entry_person_jobcode) : null,
      detail.asset_applicant_jobcode ? userStore.getById(detail.asset_applicant_jobcode) : null,
      detail.asset_manager_jobcode ? userStore.getById(detail.asset_manager_jobcode) : null,
      detail.asset_contract_code ? contractStore.getById(detail.asset_contract_code) : null,
    ])
    assetForm.asset_type_primary = at?.asset_type_primary ?? ''
    assetForm.asset_type_category = at?.asset_type_category ?? ''
    assetForm.asset_storage_name = st?.storage_name ?? ''
    assetForm.asset_entry_person_name = ep?.employee_name ?? ''
    assetForm.asset_applicant_name = ap?.employee_name ?? ''
    assetForm.asset_manager_name = mg?.employee_name ?? ''
    assetForm.asset_contract_name = ct?.contract_name ?? ''
  } catch {
    ElMessage.error('无法加载资产详情，请检查网络连接后刷新页面重试')
  }
}

// 假设 assetForm 中有 asset_current_status
const displayStatus = computed(() => getAssetStatusText(assetForm.asset_current_status))

/**
 * 提交表单
 * 新增模式：不传�?asset_code，后端自动生成并返回 List[AssetDetail]
 * 编辑模式：传�?asset_code 作为唯一标识，后端返回单�?AssetDetail
 */
const submitForm = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error('请填写所有必填项（标记为 * 的字段）')
      return
    }
    try {
      if (isEditMode.value) {
        await assetAPI.updateAsset({
          ...getAssetCreateForm.value,
          asset_code: assetForm.asset_code || '',
        })
        ElMessage.success('更新成功')
      } else {
        const createdAssets = await assetAPI.createAsset(getAssetCreateForm.value)
        const assetCount = Array.isArray(createdAssets) ? createdAssets.length : 1
        ElMessage.success(`录入成功，共创建 ${assetCount} 条资产记录`)
      }
      assetStore.setRefreshFlag(true)
      router.go(-1)
    } catch (error: unknown) {
      const msg = isAxiosError(error)
        ? error.response?.data?.msg || error.response?.data?.message || '操作失败，请检查网络连接后重试'
        : error instanceof Error
          ? error.message
          : '未知错误'
      ElMessage.error(msg)
    }
  })
}

const resetForm = () => {
  if (isEditMode.value) {
    const code = route.query.code as string
    if (code) loadAssetDetail(code)
  } else {
    formRef.value?.resetFields()
    assetForm.asset_code = ''
    assetForm.asset_purchase_number = 1
    assetForm.asset_warranty_period = 3
    assetForm.asset_type = ''
    assetForm.asset_type_primary = ''
    assetForm.asset_type_category = ''
    assetForm.asset_contract = ''
    assetForm.asset_contract_name = ''
    assetForm.asset_storage = ''
    assetForm.asset_storage_name = ''
    assetForm.asset_entry_person = ''
    assetForm.asset_entry_person_name = ''
    assetForm.asset_applicant = ''
    assetForm.asset_applicant_name = ''
    assetForm.asset_manager = ''
    assetForm.asset_manager_name = ''
    ElMessage.info('表单已重�?)
  }
}

const handleLotAdds = () =>
  router
    .push({ name: 'AssetBatchImport' })
    .catch((e: Error) => ElMessage.error('页面跳转失败，请检查网络连接：' + e.message))
const goBack = () => router.go(-1)

onMounted(async () => {
  await associations.loadAssociations()
  if (isEditMode.value) {
    const code = route.query.code as string
    if (code) await loadAssetDetail(code)
  }
})
</script>

<style scoped lang="scss">
.asset-form {
  padding: 24px;
  .box-card {
    height: 100%;
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
    color: #409eff;
    position: relative;
    .batch-add-btn {
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
    }
  }
  :deep(.section-title) {
    color: #303133;
    font-size: 16px;
    font-weight: 600;
    margin: 28px 0 20px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%);
    border-left: 4px solid #409eff;
    border-radius: 4px;
  }
  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
  }
}
</style>
