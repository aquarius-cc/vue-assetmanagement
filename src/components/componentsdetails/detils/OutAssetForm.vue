<!--
  OutAssetForm.vue
  出库资产表单页面（新门编辑）
  模式判断：route.query.code 存在且为编辑模式，否则为新增模式
  功能：
    - 新增出库资产记录
    - 编辑已有出库资产记录
    - 自动完成资产名称、申请人姓名、保管人姓名（使用公共建议获取器）
    - 表单验证（含借用类型归还日期联动、姓名工号一致性校验）
-->
<template>
  <div class="outasset-form" v-loading="isLoading" element-loading-text="加载中...">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Plus /></el-icon>
          <span>{{ isEditMode ? '出库资产编辑' : '出库资产录入' }}</span>
        </div>
      </template>

      <!-- 资产搜索组件（仅新增模式显示，方便快速选择资产） -->
      <ExportableAssetsSearch v-if="!isEditMode" @select="handleAssetSelect" />

      <el-form
        ref="formRef"
        :model="outAssetCreateExtendedForm"
        :rules="rules"
        label-width="140px"
        size="default"
        class="full-width-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <h3 class="section-title">出库资产信息</h3>
          </el-col>

          <!-- 出库资产名称（自动完成） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="出库资产名称" prop="outasset_name">
              <el-autocomplete
                v-model="outAssetCreateExtendedForm.outasset_name"
                :fetch-suggestions="fetchAssetSuggestions"
                placeholder="请输入要出库的资产名称，如：服务器主机"
                clearable
                :disabled="isEditMode"
                @select="handleAssetNameSelect"
                @change="handleAssetNameChange"
                @blur="handleAssetNameBlur"
              >
                <template #default="{ item }">
                  <div>
                    名称：{{ item.asset_name }} / 编码：{{ item.asset_code }} / 状态：{{
                      item.asset_current_status
                    }}
                  </div>
                </template>
              </el-autocomplete>
            </el-form-item>
          </el-col>

          <!-- 出库资产编码 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="出库资产编码" prop="outasset_code">
              <el-input
                v-model="outAssetCreateExtendedForm.outasset_code"
                placeholder="请输入资产编码，如：ASSET-HW-SVR-20250101"
                clearable
                :disabled="isEditMode"
                @change="handleAssetCodeChange"
              />
            </el-form-item>
          </el-col>

          <!-- 出库数量 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="出库数量" prop="outasset_number">
              <el-input-number
                v-model="outAssetCreateExtendedForm.outasset_number"
                :min="1"
                :max="999999"
                placeholder="请输入出库数量，如：2"
                style="width: 100%"
                :disabled="isEditMode"
              />
            </el-form-item>
          </el-col>

          <!-- 出库类型 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="出库类型" prop="outasset_type">
              <el-select
                v-model="outAssetCreateExtendedForm.outasset_type"
                placeholder="请选择出库类型"
                style="width: 100%"
              >
                <el-option label="领用" value="receive" />
                <el-option label="借用" value="borrow" />
                <el-option label="重新发放" value="reissue" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 出库日期 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="出库日期" prop="outasset_date">
              <el-date-picker
                v-model="outAssetCreateExtendedForm.outasset_date"
                type="date"
                placeholder="请选择资产出库日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <!-- 归还日期（借用时必填） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="归还日期" prop="return_date">
              <el-date-picker
                v-model="outAssetCreateExtendedForm.return_date"
                type="date"
                placeholder="请选择借用资产的预计归还日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- [HR-02] 出库申请人（自动完成） -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="申请人" prop="outasset_applicant_name">
              <el-autocomplete
                v-model="outAssetCreateExtendedForm.outasset_applicant_name"
                :fetch-suggestions="fetchEmployeeSuggestions"
                placeholder="请输入申请人姓名，如：张三"
                clearable
                @select="applicantField.handleSelect"
                @change="applicantField.handleChange"
              >
                <template #default="{ item }">
                  <div>
                    {{ item.employee_department_name }} / {{ item.employee_name }} /
                    {{ item.employee_jobcode }}
                  </div>
                </template>
              </el-autocomplete>
            </el-form-item>
            <el-form-item label="申请人工号" prop="outasset_applicant_jobcode">
              <el-input
                v-model="outAssetCreateExtendedForm.outasset_applicant_jobcode"
                placeholder="工号将根据姓名自动填入"
                disabled
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- [HR-02] 出库保管人（自动完成）-->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="保管人" prop="outasset_manager_name">
              <el-autocomplete
                v-model="outAssetCreateExtendedForm.outasset_manager_name"
                :fetch-suggestions="fetchEmployeeSuggestions"
                placeholder="请输入保管人姓名，如：李四"
                clearable
                @select="managerField.handleSelect"
                @change="managerField.handleChange"
              >
                <template #default="{ item }">
                  <div>
                    {{ item.employee_department_name }} / {{ item.employee_name }} /
                    {{ item.employee_jobcode }}
                  </div>
                </template>
              </el-autocomplete>
            </el-form-item>
            <el-form-item label="保管人工号" prop="outasset_manager_jobcode">
              <el-input
                v-model="outAssetCreateExtendedForm.outasset_manager_jobcode"
                placeholder="工号将根据姓名自动填入"
                disabled
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- [HR-02] 使用地点 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="使用地点" prop="outasset_using_location">
              <el-input
                v-model="outAssetCreateExtendedForm.outasset_using_location"
                placeholder="请输入使用地点"
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- 备注 -->
          <el-col :span="24">
            <el-form-item label="备注" prop="outasset_description">
              <el-input
                type="textarea"
                :rows="3"
                v-model="outAssetCreateExtendedForm.outasset_description"
                placeholder="请输入出库备注（可选）"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-button v-if="!isEditMode" @click="resetForm">重置</el-button>
          <el-button type="primary" @click="submitForm" :loading="outAssetStore.loading">
            {{ isEditMode ? '保存修改' : '提交出库' }}
          </el-button>
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>



<script lang="ts" setup>
defineOptions({ name: 'OutAssetForm' })

import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { isAxiosError } from 'axios'
import { useAssetStore } from '@/stores/assetStore'
// [HR-01] 后端 v1.1.0 改为 read_only，移除UserStore（用户搜索联动已移除了
import { useOutAssetStore } from '@/stores/outAssetStore'
import type {
  OutAssetCreateForm,
  OutAssetCreateExtended,
  AssetAutocompleteItem,
} from '@/types/outasset'
import type { AssetDetail, AssetUpdateForm } from '@/types/asset'
import type { EmployeeAutocompleteItem } from '@/types/outasset'
// [HR-01] 后端 v1.1.0 改为 read_only，移除EmployeeExtended（用户搜索联动已移除了
// [HR-01] 后端 v1.1.0 改为 read_only，移除useEmployeeLinkage（用户搜索联动已移除了
import { formatDate } from '@/utils/Format'
import ExportableAssetsSearch from '@/components/componentsdetails/detils/detilschildcomponents/ExportableAssetsSearch.vue'
import { createSuggestionFetcher } from '@/composables/useSuggestionFetcher'
import { useEmployeeSuggestionFetcher } from '@/composables/useEmployeeSuggestionFetcher'
import { useAutocompleteField } from '@/composables/useAutocompleteField'
import { AssetCurrentStatus } from '@/types/asset'

// ========== 类型增强：解决assetStore 类型定义缺失（运行时方法存在）==========
// 注意：createEntityStore 实际返回了getByName/getById/update 等方法，但TypeScript 未能正确推断
// 此处使用类型断言，符合“类型严格”原则（不引入any，而是明确扩展类型）。
type ExtendedAssetStore = ReturnType<typeof useAssetStore> & {
  getByName: (name: string) => Promise<AssetDetail[]>
  getById: (code: string) => Promise<AssetDetail | null>
  update: (data: AssetUpdateForm) => Promise<AssetDetail>
}
const assetStore = useAssetStore() as ExtendedAssetStore

// ========== 路由与状态==========
const route = useRoute()
const router = useRouter()
const outAssetStore = useOutAssetStore()
const formRef = ref()
const isLoading = ref(false)

// 编辑模式判断
const isEditMode = ref(!!route.query.code)

// ========== 表单数据（扩展类型，包含关联名称字段）==========
// [HR-02] 恢复 outasset_applicant_jobcode / outasset_manager_jobcode / outasset_using_location
//   以及 outasset_applicant_name / outasset_manager_name 用于前端展示
const outAssetCreateExtendedForm = reactive<OutAssetCreateExtended>({
  outasset_code: '',
  outasset_number: 1,
  outasset_applicant_jobcode: '',
  outasset_manager_jobcode: '',
  outasset_date: '',
  return_date: '',
  outasset_type: '',
  outasset_using_location: '',
  outasset_description: '',
  outasset_name: '',
  outasset_applicant_name: '',
  outasset_manager_name: '',
})

// 原始数据（用于编辑模式检测变化）
const originalFormData = ref<OutAssetCreateExtended | null>(null)

// 计算属性：转换为后端需要的 OutAssetCreateForm
// [HR-02] 恢复传递 outasset_applicant_jobcode / outasset_manager_jobcode / outasset_using_location
const outAssetForm = computed<OutAssetCreateForm>(() => ({
  outasset_code: outAssetCreateExtendedForm.outasset_code,
  outasset_number: outAssetCreateExtendedForm.outasset_number,
  outasset_applicant: outAssetCreateExtendedForm.outasset_applicant_jobcode || null,
  outasset_manager: outAssetCreateExtendedForm.outasset_manager_jobcode || null,
  outasset_date: outAssetCreateExtendedForm.outasset_date
    ? formatDate(outAssetCreateExtendedForm.outasset_date) || new Date().toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0],
  return_date: outAssetCreateExtendedForm.return_date
    ? formatDate(outAssetCreateExtendedForm.return_date)
    : null,
  outasset_type: outAssetCreateExtendedForm.outasset_type,
  outasset_using_location: outAssetCreateExtendedForm.outasset_using_location || null,
  outasset_description: outAssetCreateExtendedForm.outasset_description || null,
}))

// ========== 表单验证规则 ==========
const rules = {
  outasset_code: [
    { required: true, message: '请输入出库资产编码', trigger: 'blur' },
    { min: 1, max: 50, message: '编码长度 1-50 字符', trigger: 'blur' },
  ],
  outasset_number: [
    { required: true, message: '请输入出库数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' },
  ],
  outasset_applicant_name: [{ required: true, message: '请选择申请人', trigger: 'change' }],
  outasset_manager_name: [{ required: true, message: '请选择保管人', trigger: 'change' }],
  outasset_using_location: [
    { required: true, message: '请输入使用地点', trigger: 'blur' },
    { min: 1, max: 200, message: '使用地点长度 1-200 字符', trigger: 'blur' },
  ],
  outasset_type: [{ required: true, message: '请选择出库类型', trigger: 'change' }],
  outasset_date: [{ required: true, message: '请选择出库日期', trigger: 'change' }],
  return_date: [
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error | string) => void) => {
        if (outAssetCreateExtendedForm.outasset_type === 'borrow' && !value) {
          callback(new Error('借用类型必须填写归还日期'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}

// ========== 建议获取器（使用公共函数）=========
// [HR-01] 后端 v1.1.0 改为 read_only，移除 UserSuggestion 接口（用户搜索联动已移除了
/**
 * 资产名称建议获取器
 * - 使用 assetStore.getByName 获取数据
 * - - 过滤在库和待发放资产（均可出库 asset_current_status === AssetCurrentStatus.in_store || AssetCurrentStatus.pending)
 * - 转换后返回 AssetAutocompleteItem 格式
 */
const fetchAssetSuggestions = createSuggestionFetcher({
  fetchData: (query: string) => assetStore.getByName(query),
  // 允许在库和待发放资产出库（与后端 OutAssetService 校验对齐）
  filter: (asset: AssetDetail) =>
    asset.asset_current_status === AssetCurrentStatus.IN_STORE ||
    asset.asset_current_status === AssetCurrentStatus.RECYCLED_PENDING,
  transform: (asset: AssetDetail): AssetAutocompleteItem => ({
    value: asset.asset_name,
    asset_name: asset.asset_name,
    asset_code: asset.asset_code,
    asset_current_status: asset.asset_current_status ?? '',
  }),
})

// [HR-02] 员工建议获取器（用于申请人保管人自动完成）
const fetchEmployeeSuggestions = useEmployeeSuggestionFetcher()

// ========== 员工选择相关逻辑（使用 useAutocompleteField） ==========
const applicantField = useAutocompleteField({
  form: outAssetCreateExtendedForm,
  nameField: 'outasset_applicant_name',
  codeField: 'outasset_applicant_jobcode',
  itemKey: 'employee_name',
  codeKey: 'employee_jobcode',
})

const managerField = useAutocompleteField({
  form: outAssetCreateExtendedForm,
  nameField: 'outasset_manager_name',
  codeField: 'outasset_manager_jobcode',
  itemKey: 'employee_name',
  codeKey: 'employee_jobcode',
})

// ========== 资产选择相关逻辑（用于自动完成） ==========
const selectedAsset = ref<AssetAutocompleteItem | null>(null)

/** 从下拉选择资产 */
const handleAssetNameSelect = (item: AssetAutocompleteItem) => {
  selectedAsset.value = item
  outAssetCreateExtendedForm.outasset_name = item.asset_name
  outAssetCreateExtendedForm.outasset_code = item.asset_code
}

/** 手动输入资产名称变化时，清空已选资人*/
const handleAssetNameChange = (value: string) => {
  if (selectedAsset.value?.asset_name !== value) selectedAsset.value = null
}

/** 资产名称失焦验证（确保输入的有效性） */
const handleAssetNameBlur = async (event: FocusEvent) => {
  const currentValue = (event.target as HTMLInputElement).value
  if (selectedAsset.value?.asset_name === currentValue) return
  if (!currentValue) {
    clearAssetInfo()
    return
  }
  await validateAssetByName(currentValue)
}

/** 资产编码手动输入验证 */
const handleAssetCodeChange = async (code: string) => {
  if (!code.trim()) {
    clearAssetInfo()
    return
  }
  try {
    const asset = await assetStore.getById(code)
    if (asset) {
      outAssetCreateExtendedForm.outasset_name = asset.asset_name
      selectedAsset.value = {
        value: asset.asset_name,
        asset_name: asset.asset_name,
        asset_code: asset.asset_code,
        asset_current_status: asset.asset_current_status ?? '',
      }
    } else {
      outAssetCreateExtendedForm.outasset_code = '编码错误，无此资产'
      outAssetCreateExtendedForm.outasset_name = ''
      selectedAsset.value = null
    }
  } catch (error) {
    console.error('资产编码校验失败:', error)
    ElMessage.error('系统错误，请稍后再试')
    clearAssetInfo()
  }
}

/** 根据资产名称校验并自动补入*/
const validateAssetByName = async (name: string) => {
  if (!name.trim()) {
    clearAssetInfo()
    return
  }
  try {
    const assets = await assetStore.getByName(name.trim())
    if (!assets || assets.length === 0) {
      outAssetCreateExtendedForm.outasset_code = '名称错误，请重新输入'
      selectedAsset.value = null
    } else if (assets.length === 1) {
      const asset = assets[0]
      outAssetCreateExtendedForm.outasset_name = asset.asset_name
      outAssetCreateExtendedForm.outasset_code = asset.asset_code
      selectedAsset.value = {
        value: asset.asset_name,
        asset_name: asset.asset_name,
        asset_code: asset.asset_code,
        asset_current_status: asset.asset_current_status ?? '',
      }
    } else {
      outAssetCreateExtendedForm.outasset_code = '(请从下拉列表中选择正确的资人'
      selectedAsset.value = null
    }
  } catch (error) {
    console.error('资产名称校验失败:', error)
    outAssetCreateExtendedForm.outasset_code = '验证失败'
    selectedAsset.value = null
  }
}

/** 清空资产信息 */
const clearAssetInfo = () => {
  outAssetCreateExtendedForm.outasset_name = ''
  outAssetCreateExtendedForm.outasset_code = ''
  selectedAsset.value = null
}

// ========== 申请人相关逻辑 ==========
const selectedApplicant = ref<EmployeeAutocompleteItem | null>(null)

// ========== 保管人相关逻辑 ==========
const selectedManager = ref<EmployeeAutocompleteItem | null>(null)

// ========== 资产选择组件回调 ==========
const handleAssetSelect = (asset: AssetDetail) => {
  outAssetCreateExtendedForm.outasset_code = asset.asset_code
  outAssetCreateExtendedForm.outasset_name = asset.asset_name
  selectedAsset.value = {
    value: asset.asset_name,
    asset_name: asset.asset_name,
    asset_code: asset.asset_code,
    asset_current_status: asset.asset_current_status || '',
  }
  ElMessage.success('资产已选择')
}

// ========== 加载编辑数据 ==========
const loadEditData = async (recordcode: string) => {
  isLoading.value = true
  try {
    const detail = await outAssetStore.getById(recordcode)
    if (!detail) {
      ElMessage.error('未找到该出库记录，请返回列表重新选择')
      router.back()
      return
    }
    // 填充表单
    outAssetCreateExtendedForm.outasset_code = detail.outasset_code || ''
    outAssetCreateExtendedForm.outasset_number = detail.outasset_number
    // [HR-02] 回填申请人保管人信息（从后端返回的关联对象或字段获取）
    outAssetCreateExtendedForm.outasset_applicant_jobcode = detail.outasset_applicant_jobcode || ''
    outAssetCreateExtendedForm.outasset_manager_jobcode = detail.outasset_manager_jobcode || ''
    outAssetCreateExtendedForm.outasset_applicant_name =
      detail.outasset_applicant?.employee_name || ''
    outAssetCreateExtendedForm.outasset_manager_name = detail.outasset_manager?.employee_name || ''
    outAssetCreateExtendedForm.outasset_date = detail.outasset_date
      ? formatDate(detail.outasset_date) || ''
      : ''
    outAssetCreateExtendedForm.return_date = detail.return_date
      ? formatDate(detail.return_date) || ''
      : ''
    outAssetCreateExtendedForm.outasset_type = detail.outasset_type || ''
    outAssetCreateExtendedForm.outasset_using_location = detail.outasset_using_location || ''
    outAssetCreateExtendedForm.outasset_description = detail.outasset_description || ''
    outAssetCreateExtendedForm.outasset_name = detail.asset_name || ''
    // [HR-02] 回填后同步选中状态（用于变更检测）
    // 注意：detail.outasset_applicant/outasset_manager 为 EmployeeExtended 类型
    // 包含 employee_department 关联对象；使用类型断言绕过 TypeScript 推断限制
    if (outAssetCreateExtendedForm.outasset_applicant_name) {
      const applicant = detail.outasset_applicant as Record<string, unknown> | undefined
      const applicantDept = applicant?.employee_department as Record<string, string> | undefined
      selectedApplicant.value = {
        value: outAssetCreateExtendedForm.outasset_applicant_name,
        employee_name: outAssetCreateExtendedForm.outasset_applicant_name,
        employee_jobcode: outAssetCreateExtendedForm.outasset_applicant_jobcode || '',
        employee_department_name: applicantDept?.department_name || '',
      }
    }
    if (outAssetCreateExtendedForm.outasset_manager_name) {
      const manager = detail.outasset_manager as Record<string, unknown> | undefined
      const managerDept = manager?.employee_department as Record<string, string> | undefined
      selectedManager.value = {
        value: outAssetCreateExtendedForm.outasset_manager_name,
        employee_name: outAssetCreateExtendedForm.outasset_manager_name,
        employee_jobcode: outAssetCreateExtendedForm.outasset_manager_jobcode || '',
        employee_department_name: managerDept?.department_name || '',
      }
    }
    // 保存原始数据快照
    originalFormData.value = JSON.parse(JSON.stringify(outAssetCreateExtendedForm))
  } catch (error) {
    console.error('加载出库资产详情失败:', error)
    ElMessage.error('加载出库记录失败，请刷新页面重试')
    router.back()
  } finally {
    isLoading.value = false
  }
}

// ========== 提交表单 ==========
const submitForm = () => {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error('请填写所有必填项（标记为 * 的字段）')
      return
    }

    // 编辑模式下检查是否有修改
    if (isEditMode.value && originalFormData.value) {
      const hasChanged = Object.keys(outAssetCreateExtendedForm).some(
        (key) =>
          (outAssetCreateExtendedForm as Record<string, unknown>)[key] !==
          (originalFormData.value as Record<string, unknown>)[key],
      )
      if (!hasChanged) {
        ElMessage.info('数据未修改，无需提交')
        return
      }
    }

    try {
      if (isEditMode.value) {
        const recordcode = route.query.code as string
        await outAssetStore.update({ asset_recordcode: recordcode, ...outAssetForm.value })
        ElMessage.success('出库资产修改成功')
      } else {
        await outAssetStore.create(outAssetForm.value)
        ElMessage.success('出库资产录入成功')
        // 后台自动更新状态，不需要前端更新
        // 出库成功后，更新对应资产的状态为“在用”（in_use）
        // if (outAssetCreateExtendedForm.outasset_code) {
        //   await assetStore.update({
        //     asset_code: outAssetCreateExtendedForm.outasset_code,
        //     asset_current_status: 'in_use',
        //   }).catch(e => console.warn('资产状态更新失败（非阻塞）:', e))
        // }
      }
      outAssetStore.setRefreshFlag(true)
      router.push({ name: 'OutAssetDetails' })
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        ElMessage.error(`操作失败：${error.response?.data?.message || error.message}`)
      } else if (error instanceof Error) {
        ElMessage.error(`操作失败：${error.message}`)
      } else {
        ElMessage.error('操作失败，请检查网络连接后重试')
      }
      console.error('出库资产提交失败:', error)
    }
  })
}

// ========== 重置表单（仅新增模式） ==========
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(outAssetCreateExtendedForm, {
    outasset_code: '',
    outasset_number: 1,
    outasset_applicant_jobcode: '',
    outasset_manager_jobcode: '',
    outasset_date: '',
    return_date: '',
    outasset_type: '',
    outasset_using_location: '',
    outasset_description: '',
    outasset_name: '',
    outasset_applicant_name: '',
    outasset_manager_name: '',
  })
  selectedAsset.value = null
  selectedApplicant.value = null
  selectedManager.value = null
  ElMessage.info('表单已重置')
}

// ========== 返回 ==========
const goBack = () => {
  router.go(-1)
}

// ========== 生命周期 ==========
onMounted(async () => {
  if (isEditMode.value) {
    const code = route.query.code as string
    if (!code) {
      ElMessage.error('编辑请求缺少记录编码')
      router.back()
      return
    }
    await loadEditData(code)
  }
})
</script>

<style lang="scss" scoped>
// 使用公共样式 mixin（符合规范）
@use '@/assets/styles/common-forms.scss' as *;

.outasset-form {
  // 继承公共表单容器样式（如不存在则忽略）
  @extend .form-container !optional;
}
</style>
