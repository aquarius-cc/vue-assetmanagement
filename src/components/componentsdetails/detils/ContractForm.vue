<!--
  ContractForm.vue
  合同录入/编辑表单页面
  功能：新增合同/ 编辑已有合同（通过 query.code 识别）
-->
<template>
  <div class="contract-form, form-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Edit v-if="isEdit" /><Plus v-else /></el-icon>
          <span>{{ isEdit ? '合同信息修改' : '合同录入' }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="contractForm"
        :rules="rules"
        label-width="140px"
        size="default"
        class="full-width-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <h3 class="section-title">合同信息</h3>
          </el-col>

          <!-- 合同编码：新增可编辑，编辑只读 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同编码" prop="contract_code">
              <el-input
                v-model="contractForm.contract_code"
                placeholder="请输入合同编码"
                clearable
                :disabled="isEdit"
              />
            </el-form-item>
          </el-col>

          <!-- 合同名称：新增可编辑，编辑只读 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同名称" prop="contract_name">
              <el-input
                v-model="contractForm.contract_name"
                placeholder="请输入合同名称"
                clearable
                :disabled="isEdit"
              />
            </el-form-item>
          </el-col>

          <!-- 合同金额 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同金额" prop="contract_amount">
              <el-input-number
                v-model="contractForm.contract_amount"
                :min="0"
                :precision="2"
                placeholder="请输入合同金额"
                style="width: 100%"
                :readonly="isEdit"
              />
            </el-form-item>
          </el-col>

          <!-- 供应商-->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="供应商" prop="supplier_name">
              <el-input
                v-model="contractForm.supplier_name"
                placeholder="请输入供应商"
                clearable
                :readonly="isEdit"
              />
            </el-form-item>
          </el-col>

          <!-- 合同类型 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同类型" prop="contract_type">
              <el-select
                v-model="contractForm.contract_type"
                placeholder="请选择合同类型"
                style="width: 100%"
              >
                <el-option label="采购合同" value="purchase" />
                <el-option label="服务合同" value="service" />
                <el-option label="信息化建设合同" value="information_construction" />
                <el-option label="直接采购合同" value="direct_procurement" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 质保期（年）-->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="质保期（年）" prop="contract_warranty_period">
              <el-input-number
                v-model="contractForm.contract_warranty_period"
                :min="0"
                placeholder="请输入质保期"
                style="width: 100%"
                :readonly="isEdit"
              />
            </el-form-item>
          </el-col>

          <!-- 合同签订日期 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同签订日期" prop="contract_start_date">
              <el-date-picker
                v-model="contractForm.contract_start_date"
                type="date"
                placeholder="请选择合同签订日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                :disabled="isEdit"
              />
            </el-form-item>
          </el-col>

          <!-- 合同结算状态-->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同结算状态" prop="contract_status">
              <el-select
                v-model="contractForm.contract_status"
                placeholder="请选择结算状态"
                style="width: 100%"
              >
                <el-option label="待结算" value="pending" />
                <el-option label="已结算" value="settled" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 合同初验日期 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同初验日期" prop="initial_check_date">
              <el-date-picker
                v-model="contractForm.initial_check_date"
                type="date"
                placeholder="请选择合同初验日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- 结算金额 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="结算金额" prop="settlemented_price">
              <el-input-number
                v-model="contractForm.settlemented_price"
                :min="0"
                :precision="2"
                placeholder="请输入结算金额"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <!-- 合同终验日期 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="合同终验日期" prop="final_check_date">
              <el-date-picker
                v-model="contractForm.final_check_date"
                type="date"
                placeholder="请选择合同终验日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- 已支付金额-->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="已支付金额" prop="amount_paid">
              <el-input-number
                v-model="contractForm.amount_paid"
                :min="0"
                :precision="2"
                placeholder="请输入已支付金额"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <!-- 支付记录 -->
          <el-col :span="24">
            <el-form-item label="支付记录" prop="paid_record">
              <el-input
                type="textarea"
                :rows="3"
                v-model="contractForm.paid_record"
                placeholder="请输入支付记录"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-button v-if="!isEdit" @click="resetForm">重置</el-button>
          <el-button type="primary" @click="submitForm" :loading="contractStore.loading">
            {{ isEdit ? '提交修改' : '提交' }}
          </el-button>
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ContractForm', // 多词组件名称
}
</script>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import { useContractStore } from '@/stores/contractStore'
import type { Contract, ContractCreateForm, ContractStatus } from '@/types/contract'
import { formatDate } from '@/utils/Format'
import { isAxiosError } from 'axios'

// ========== 路由与状态==========
const route = useRoute()
const router = useRouter()
const contractStore = useContractStore()
const formRef = ref()
const isLoading = ref(false)

// 是否为编辑模式
const isEdit = ref(!!route.query.code)

// ========== 表单数据类型定义 ==========
interface ContractFormData extends ContractCreateForm {
  id: number
  contract_code: string
  contract_name: string
  contract_amount: number
  contract_status: ContractStatus | null
  contract_start_date: string | null
  supplier_name: string
  contract_type: string
  contract_warranty_period: number
  settlemented_price: number
  initial_check_date: string | null
  final_check_date: string | null
  amount_paid: number
  paid_record: string
}

// 初始化表单数据
const initFormData = (): ContractFormData => ({
  id: 0,
  contract_code: '',
  contract_name: '',
  contract_amount: 0,
  contract_status: null,
  contract_start_date: null,
  supplier_name: '',
  contract_type: '',
  contract_warranty_period: 3,
  settlemented_price: 0,
  initial_check_date: null,
  final_check_date: null,
  amount_paid: 0,
  paid_record: '',
})

const contractForm = reactive<ContractFormData>(initFormData())

// ========== 表单验证规则 ==========
const rules = {
  contract_code: [
    { required: true, message: '请输入合同编码', trigger: 'blur' },
    { min: 3, max: 50, message: '合同编码长度在3到50个字符', trigger: 'blur' },
  ],
  contract_name: [
    { required: true, message: '请输入合同名称', trigger: 'blur' },
    { min: 2, max: 100, message: '合同名称长度在2到100个字符', trigger: 'blur' },
  ],
  contract_amount: [
    { required: true, message: '请输入合同金额', trigger: 'blur' },
    { type: 'number', min: 0, message: '合同金额必须大于等于0', trigger: 'blur' },
  ],
  supplier_name: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  contract_start_date: [{ required: true, message: '请选择合同签订日期', trigger: 'change' }],
  contract_status: [{ required: true, message: '请选择合同结算状态', trigger: 'change' }],
  contract_warranty_period: [
    { required: true, message: '请输入质保期', trigger: 'blur' },
    { type: 'number', min: 0, message: '质保期必须大于等于0', trigger: 'blur' },
  ],
  contract_type: [{ required: true, message: '请选择合同类型', trigger: 'change' }],
  settlemented_price: [
    { required: true, message: '请输入结算金额', trigger: 'blur' },
    { type: 'number', min: 0, message: '结算金额必须大于等于0', trigger: 'blur' },
  ],
}

// ========== 辅助函数 ==========
/**
 * 安全获取数字候 */
const toNumber = (value: unknown, defaultValue = 0): number => {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

/**
 * 格式化日期（处理 null/undefined' */
const safeFormatDate = (date: string | null | undefined): string | null => {
  if (!date) return null
  return formatDate(date)
}

// ========== 加载编辑数据 ==========
const loadContractDetail = async (code: string) => {
  isLoading.value = true
  try {
    // 优先什store 中查找，如果找不到则设为 null
    let targetContract: Contract | null =
      contractStore.list.find((item) => item.contract_code === code) ?? null

    if (!targetContract) {
      // 如果 store 中没有，调用详情接口
      targetContract = await contractStore.getById(code)
    }

    if (!targetContract) {
      ElMessage.error('未找到对应的合同详情，请检查合同编码')
      goBack()
      return
    }

    // 填充表单数据
    Object.assign(contractForm, {
      ...targetContract,
      contract_amount: toNumber(targetContract.contract_amount),
      contract_warranty_period: toNumber(targetContract.contract_warranty_period, 3),
      settlemented_price: toNumber(targetContract.settlemented_price),
      amount_paid: toNumber(targetContract.amount_paid),
      contract_start_date: safeFormatDate(targetContract.contract_start_date),
      initial_check_date: safeFormatDate(targetContract.initial_check_date),
      final_check_date: safeFormatDate(targetContract.final_check_date),
      // 确保合同状态值为枚举字符
      contract_status: targetContract.contract_status as ContractStatus,
    })
  } catch (error) {
    console.error('获取合同详情失败:', error)
    ElMessage.error('获取合同详情失败，请重试')
    goBack()
  } finally {
    isLoading.value = false
  }
}

// ========== 生命周期 ==========
onMounted(async () => {
  if (isEdit.value) {
    const contractCode = route.query.code as string
    if (contractCode) {
      await loadContractDetail(contractCode)
    } else {
      ElMessage.error('编辑请求缺少合同编码')
      goBack()
    }
  }
})

// ========== 表单提交 ==========
const submitForm = () => {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error('请完善必填信息！')
      return
    }

    // 构建提交数据，确保类型正确
    const submitData: ContractCreateForm = {
      contract_code: contractForm.contract_code,
      contract_name: contractForm.contract_name,
      contract_amount: Number(contractForm.contract_amount),
      contract_status: contractForm.contract_status as ContractStatus,
      contract_start_date: safeFormatDate(contractForm.contract_start_date) || '',
      supplier_name: contractForm.supplier_name,
      contract_type: contractForm.contract_type,
      contract_warranty_period: Number(contractForm.contract_warranty_period),
      settlemented_price: Number(contractForm.settlemented_price),
      initial_check_date: safeFormatDate(contractForm.initial_check_date),
      final_check_date: safeFormatDate(contractForm.final_check_date),
      paid_record: contractForm.paid_record || '',
    }

    try {
      if (isEdit.value) {
        await contractStore.update(submitData)
        ElMessage.success('合同修改成功')
      } else {
        await contractStore.create(submitData)
        ElMessage.success('合同录入成功')
      }
      contractStore.setRefreshFlag(true)
      router.push({ name: 'ContractDetails' })
    } catch (error: unknown) {
      const errorMsg = isAxiosError(error)
        ? `操作失败${error.response?.data?.message || '服务器错误'}`
        : error instanceof Error
          ? error.message
          : '操作失败：未知错误'
      ElMessage.error(errorMsg)
      console.error('合同提交失败:', error)
    }
  })
}

// ========== 重置表单（仅新增模式'==========
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(contractForm, initFormData())
  ElMessage.info('表单已重置')
}

// ========== 返回 ==========
const goBack = () => {
  if (isEdit.value) {
    router.push({ name: 'ContractDetails' })
  } else {
    router.go(-1)
  }
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.contract-form {
  // 使用 !optional 避免找不到选择器时报错
  @extend .form-container !optional;
  min-height: auto;
  margin: 20px auto;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.full-width-form {
  width: 100%;
}

.form-actions {
  margin-top: 32px;
}
</style>
