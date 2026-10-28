<!--
  AssetForm.vue
  资产表单（新增/编辑）
  后端规则变更说明：
  - asset_code 由后端自动生成（格式：ASSET-{category}-{type_code}-{YYYYMMDD}-{random}-{seq}）
  - 前端新增时无需传 asset_code，编辑时作为唯一标识仍需传递
  - asset_purchase_number > 1 时，后端创建多条 Asset 记录并返回 List[AssetDetail]
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
          <el-button type="primary" @click="submitForm" :loading="submitting">提交</el-button>
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'AssetForm' })

import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import type { AssetCreateFormExtended, AssetDetail } from '@/types/asset'
import { getAssetStatusText } from '@/utils/Format'
import { notifyCallerError } from '@/utils/errorHandler'
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
import { useOperationGuard } from '@/composables/useOperationGuard'
import AssetBasicInfo from '@/components/componentsdetails/detils/detilschildcomponents/AssetBasicInfo.vue'
import AssetContractInfo from '@/components/componentsdetails/detils/detilschildcomponents/AssetContractInfo.vue'
import AssetManagementInfo from '@/components/componentsdetails/detils/detilschildcomponents/AssetManagementInfo.vue'
import AssetStorageInfo from '@/components/componentsdetails/detils/detilschildcomponents/AssetStorageInfo.vue'

const router = useRouter()
const route = useRoute()
const { guardOnMounted } = useOperationGuard()
const assetStore = useAssetStore()
const userStore = useUserStore()
const assetTypeStore = useAssetTypeStore()
const contractStore = useContractStore()
const storageStore = useStorageStore()
const formRef = ref()
const submitting = ref(false)

const isEditMode = computed(() => !!route.query.code)

// 【ID-2/取键契约】编辑模式的定位键。route.query.code 由列表页传入 recordcode
// （后端 AssetViewSet lookup_field="recordcode"），回填时从详情再捕获一次以防路由参数漂移。
const editRecordcode = ref('')

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
  asset_type_name: '',
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
 * 从可选字符串字段取值，null/undefined 兜底为默认值。
 * P1-4 复杂度收敛用：把 `field ?? ''` 的分支从 getAssetCreateForm 字段字面量里收走。
 */
const pickStr = (value: string | null | undefined, fallback: string): string => value ?? fallback

/**
 * 从可选数值字段取值，null/undefined 兜底为默认值。
 */
const pickNum = (value: number | null | undefined, fallback: number): number => value ?? fallback

/**
 * 单价字段取值：null/undefined → ''，其余 String() 化（与原三元表达式逐字等价）。
 */
const pickPrice = (value: number | string | null | undefined): string =>
  value != null ? String(value) : ''

/**
 * 从「可空关联对象」上安全取一个字符串字段。
 * 对象或字段任一缺失均兜底为默认值，与原 `detail.rel?.field ?? ''` 逐字等价。
 * P1-4 复杂度收敛用：把 `?.` 与 `??` 两处分支从调用方收走。
 */
const pickRel = (
  rel: Record<string, unknown> | null | undefined,
  field: string,
  fallback: string,
): string => {
  const value = rel?.[field]
  return typeof value === 'string' ? value : fallback
}

/**
 * 获取提交给后端的创建表单数据
 * 新增模式时不传入 asset_code（后端自动生成）
 * 编辑模式时传入 asset_code（作为唯一标识）
 * 字段映射（AssetCreateForm → AssetCreateSerializer）：
 * - asset_type → SlugRelatedField(slug_field='asset_type_code')
 * - asset_contract → SlugRelatedField(slug_field='contract_code')
 * - asset_storage → SlugRelatedField(slug_field='storage_code')
 * - asset_entry_person → SlugRelatedField(slug_field='employee_jobcode')
 * - asset_applicant → SlugRelatedField(slug_field='employee_jobcode')
 * - asset_manager ?SlugRelatedField(slug_field='employee_jobcode')
 *
 * P1-4：可选字段（类型 `string | null`，后端详情可能回 null）原逐字段 `?? 默认值`
 * 共 16 处分支，令本 computed 圈复杂度达 18（上限 10）。现收敛至 pickStr / pickNum /
 * pickPrice 三个模块级纯函数——把「空值兜底」分支从每个字段的字面量里收走，
 * 字段映射本身（键名、目标类型）逐字段不变，语义等价：null/undefined → 默认值，
 * 其余原样透传。
 */
const getAssetCreateForm = computed(() => {
  return {
    asset_name: pickStr(assetForm.asset_name, ''),
    asset_specification: pickStr(assetForm.asset_specification, ''),
    asset_brand: pickStr(assetForm.asset_brand, ''),
    asset_unit: pickStr(assetForm.asset_unit, ''),
    asset_purchase_price: pickPrice(assetForm.asset_purchase_price),
    asset_purchase_number: pickNum(assetForm.asset_purchase_number, 1),
    asset_purchase_date: pickStr(assetForm.asset_purchase_date, ''),
    asset_warranty_period: pickNum(assetForm.asset_warranty_period, 0),
    asset_entry_date: pickStr(assetForm.asset_entry_date, ''),
    asset_type: pickStr(assetForm.asset_type, ''),
    asset_entry_person: pickStr(assetForm.asset_entry_person, ''),
    asset_contract: pickStr(assetForm.asset_contract, ''),
    asset_applicant: pickStr(assetForm.asset_applicant, ''),
    asset_manager: pickStr(assetForm.asset_manager, ''),
    asset_using_location: pickStr(assetForm.asset_using_location, ''),
    asset_storage: pickStr(assetForm.asset_storage, ''),
    asset_description: pickStr(assetForm.asset_description, ''),
  }
})

/**
 * 从详情响应标量字段回填表单（BF-081：仅嵌套关联对象，无平铺 _code/_jobcode 键）。
 */
const applyScalarDetail = (detail: AssetDetail) => {
  editRecordcode.value = detail.recordcode
  assetForm.asset_code = detail.asset_code
  assetForm.asset_name = detail.asset_name
  assetForm.asset_specification = detail.asset_specification
  assetForm.asset_brand = pickStr(detail.asset_brand, '')
  assetForm.asset_unit = pickStr(detail.asset_unit, '')
  assetForm.asset_purchase_price = Number(detail.asset_purchase_price)
  assetForm.asset_purchase_number = Number(detail.asset_purchase_number)
  assetForm.asset_purchase_date = pickStr(detail.asset_purchase_date, '')
  assetForm.asset_warranty_period = Number(detail.asset_warranty_period ?? 0)
  assetForm.asset_entry_date = pickStr(detail.asset_entry_date, '')
  assetForm.asset_using_location = pickStr(detail.asset_using_location, '')
  assetForm.asset_description = pickStr(detail.asset_description, '')
  assetForm.asset_current_status = pickStr(detail.asset_current_status, '')
}

/**
 * 从详情响应嵌套关联对象回填表单的编码与名称。
 * 【BF-081】编码与名称一律直读嵌套对象——修复前读平铺键恒为空，且经 Promise.all 反查
 * 关联端点（非 recordcode 定位，必 404 后整块置空）。关联名称随嵌套对象一并返回，无需再发查询。
 * P1-4：`?.字段 ?? ''` 同构收敛至 pickRel，语义等价（对象缺失或字段缺失均落 ''）。
 */
const applyRelationDetail = (detail: AssetDetail) => {
  const type = detail.asset_type as Record<string, unknown> | null | undefined
  const contract = detail.asset_contract as Record<string, unknown> | null | undefined
  const storage = detail.asset_storage as Record<string, unknown> | null | undefined
  const entryPerson = detail.asset_entry_person as Record<string, unknown> | null | undefined
  const applicant = detail.asset_applicant as Record<string, unknown> | null | undefined
  const manager = detail.asset_manager as Record<string, unknown> | null | undefined

  assetForm.asset_type = pickRel(type, 'type_code', '')
  assetForm.asset_contract = pickRel(contract, 'contract_code', '')
  assetForm.asset_storage = pickRel(storage, 'storage_code', '')
  assetForm.asset_entry_person = pickRel(entryPerson, 'employee_jobcode', '')
  assetForm.asset_applicant = pickRel(applicant, 'employee_jobcode', '')
  assetForm.asset_manager = pickRel(manager, 'employee_jobcode', '')

  assetForm.asset_type_name = pickRel(type, 'type_name', '')
  assetForm.asset_storage_name = pickRel(storage, 'storage_name', '')
  assetForm.asset_contract_name = pickRel(contract, 'contract_name', '')
  assetForm.asset_entry_person_name = pickRel(entryPerson, 'employee_name', '')
  assetForm.asset_applicant_name = pickRel(applicant, 'employee_name', '')
  assetForm.asset_manager_name = pickRel(manager, 'employee_name', '')
}

/**
 * 编辑模式加载详情并回填表单。以详情响应中的 recordcode 为准提交更新（【ID-2/取键契约】）。
 */
const loadAssetDetail = async (recordcode: string) => {
  try {
    const detail = await assetStore.getById(recordcode)
    if (!detail) {
      ElMessage.error('未找到该资产，请确认记录编码是否正确')
      return
    }
    applyScalarDetail(detail)
    applyRelationDetail(detail)
  } catch (error) {
    // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
    notifyCallerError(error, '无法加载资产详情，请检查网络连接后刷新页面重试')
  }
}

const rules = assetFormRules

// 编辑载荷:asset_purchase_number 是「录入倍数」,仅在创建时生效。
// 后端已将其列入 ASSET_UPDATE_IMMUTABLE_FIELDS,编辑时提交该字段会被
// FIELD_NOT_ALLOWED 拒掉(400),因此编辑载荷必须剔除 —— 这是后端禁改的强制配套。
const getAssetUpdateForm = computed(() => {
  const payload: Record<string, unknown> = { ...getAssetCreateForm.value }
  delete payload.asset_purchase_number
  return payload
})

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
  contractStore.getByName, // 确保 store 提供此方法
  contractUpdater,
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

const handleAssetTypeChange = (typeName: string) => {
  const item = associations.assetTypes.value.find((t) => t.type_name === typeName)
  if (item) {
    assetForm.asset_type = item.type_code
    assetForm.asset_type_name = item.type_name
  } else {
    assetForm.asset_type = ''
    assetForm.asset_type_name = ''
  }
}

// 假设 assetForm 中有 asset_current_status
const displayStatus = computed(() => getAssetStatusText(assetForm.asset_current_status))

/**
 * 提交表单
 * 新增模式：不传定位键，后端自动生成并返回 List[AssetDetail]
 * 编辑模式：传递 recordcode 作为定位键（后端 PUT /assets/assets/{recordcode}/），返回单个 AssetDetail
 */
const submitForm = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error('请填写所有必填项（标记为 * 的字段）')
      return
    }
    if (submitting.value) return
    submitting.value = true
    try {
      if (isEditMode.value) {
        await submitUpdate()
      } else {
        await submitCreate()
      }
      assetStore.setRefreshFlag(true)
      router.go(-1)
    } catch (error: unknown) {
      // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
      // （submitUpdate 抛出的『缺少记录编码』业务 Error 也经此弹出）
      notifyCallerError(error, '操作失败，请检查网络连接后重试')
    } finally {
      submitting.value = false
    }
  })
}

/**
 * 编辑模式提交：优先用回填捕获的 recordcode，路由参数兜底（【ID-2/取键契约】）。
 */
const submitUpdate = async () => {
  const recordcode = editRecordcode.value || (route.query.code as string) || ''
  if (!recordcode) {
    // [BF-095/M-5] throw 阻断 submitForm 后续 setRefreshFlag/router.go(-1)；
    // 文案由 submitForm catch 的 resolveSubmitError 统一出口，避免双弹窗
    throw new Error('缺少记录编码，无法更新资产')
  }
  await assetStore.update({
    ...getAssetUpdateForm.value,
    recordcode,
  } as unknown as Partial<AssetDetail>)
  ElMessage.success('更新成功')
}

/**
 * 新增模式提交：不传定位键，后端自动生成并返回 List[AssetDetail]。
 */
const submitCreate = async () => {
  const createdAssets = await assetStore.create(
    getAssetCreateForm.value as unknown as Partial<AssetDetail>,
  )
  const assetCount = Array.isArray(createdAssets) ? createdAssets.length : 1
  ElMessage.success(`录入成功，共创建 ${assetCount} 条资产记录`)
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
    assetForm.asset_type_name = ''
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
    ElMessage.info('表单已重置')
  }
}

const handleLotAdds = () =>
  router
    .push({ name: 'AssetBatchImport' })
    .catch((e: Error) => ElMessage.error('页面跳转失败，请检查网络连接：' + e.message))
const goBack = () => router.go(-1)

onMounted(async () => {
  // [R-3/M-RC-07] 组件级兜底：路由守卫已按 meta.requiredMinRole 拦截，
  // 此处再拦一次（如经 router.push 的编程式导航、缓存复用场景），无权限即跳 /main
  if (!guardOnMounted()) return
  await associations.loadAssociations()
  if (isEditMode.value) {
    const code = route.query.code as string
    if (code) await loadAssetDetail(code)
  }
})
</script>

<style scoped lang="scss">
.asset-form {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  .box-card {
    // height: 100%  // 已移除：卡片高度由内容撑开，避免 el-card overflow:hidden 裁切表单内容
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
    color: var(--color-primary-light);
    position: relative;
    .batch-add-btn {
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
    }
  }
  :deep(.section-title) {
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 600;
    margin: 28px 0 20px;
    padding: 12px 16px;
    background: var(--gradient-card-highlight);
    border-left: 4px solid var(--color-primary);
    border-radius: 4px;
  }
  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color-light);
  }
}
</style>
