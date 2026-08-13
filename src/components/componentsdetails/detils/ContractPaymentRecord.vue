<!--
@file 合同支付记录管理组件，展示支付记录列表并支持增删审核操作
@component ContractPaymentRecord
@usedBy
  - ContractOfDetails.vue: 合同详情页面中嵌入支付记录管理
@dependsOn
  - api/contractAPI: getPaymentRecords/addPayment/deletePayment 合同支付相关接口
-->
<template>
  <div class="payment-record">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>支付记录管理</span>
          <el-button type="primary" size="small" @click="showAddDialog">
            <el-icon><Plus /></el-icon> 添加支付
          </el-button>
        </div>
      </template>

      <!-- 支付汇总信息 -->
      <el-row :gutter="20" class="summary-row">
        <el-col :span="8">
          <el-statistic title="合同总额" :value="contractAmount" prefix="¥" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="已支付金额" :value="totalPaid" prefix="¥" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="未支付金额" :value="amountUnpaid" prefix="¥" />
        </el-col>
      </el-row>

      <!-- 支付进度条 -->
      <el-progress
        :percentage="paymentPercentage"
        :format="formatPercentage"
        style="margin: 20px 0"
      />

      <!-- 支付记录表格 -->
      <el-table :data="activePayments" v-loading="loading" style="width: 100%">
        <el-table-column prop="date" label="支付日期" width="120" />
        <el-table-column prop="amount" label="支付金额" width="120">
          <template #default="{ row }"> ¥{{ formatPrice(row.amount) }} </template>
        </el-table-column>
        <el-table-column prop="description" label="支付说明" min-width="150" />
        <el-table-column prop="payment_method" label="支付方式" width="100">
          <template #default="{ row }">
            {{ paymentMethodMap[row.payment_method] || row.payment_method || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ statusMap[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              type="primary"
              @click="handleApprove(row)"
            >
              审核
            </el-button>
            <el-button
              v-if="row.status !== 'deleted' && row.status !== 'approved'"
              size="small"
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加支付记录弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="添加支付记录"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="paymentForm" :rules="rules" label-width="100px">
        <el-form-item label="支付日期" prop="date">
          <el-date-picker
            v-model="paymentForm.date"
            type="date"
            placeholder="选择支付日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="支付金额" prop="amount">
          <el-input-number
            v-model="paymentForm.amount"
            :min="0.01"
            :precision="2"
            placeholder="请输入支付金额"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="支付说明" prop="description">
          <el-input
            v-model="paymentForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入支付说明"
          />
        </el-form-item>
        <el-form-item label="支付方式">
          <el-select
            v-model="paymentForm.payment_method"
            placeholder="请选择支付方式"
            style="width: 100%"
          >
            <el-option label="银行转账" value="bank_transfer" />
            <el-option label="现金" value="cash" />
            <el-option label="支票" value="check" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPayment" :loading="submitting"> 确定 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { contractAPI } from '@/api/contract'
import type { Contract, PaymentRecord } from '@/types/contract'
import { getErrorMessage } from '@/utils/errorHandler'

// Props
const props = defineProps<{
  contract: Contract
}>()

// Emits
const emit = defineEmits<{
  (e: 'update'): void
}>()

// 状态
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const payments = ref<PaymentRecord[]>([])

// 表单数据
const paymentForm = ref({
  date: '',
  amount: 0,
  description: '',
  payment_method: 'bank_transfer',
})

// 表单验证规则
const rules: FormRules = {
  date: [{ required: true, message: '请选择支付日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入支付金额', trigger: 'blur' }],
  description: [{ required: true, message: '请输入支付说明', trigger: 'blur' }],
}

// 映射表
const statusMap: Record<string, string> = {
  pending: '待审核',
  approved: '已审核',
  deleted: '已删除',
}

const paymentMethodMap: Record<string, string> = {
  bank_transfer: '银行转账',
  cash: '现金',
  check: '支票',
  other: '其他',
}

// 计算属性
const contractAmount = computed(() => {
  return Number(props.contract.contract_amount) || 0
})

const totalPaid = computed(() => {
  return Number(props.contract.amount_paid) || 0
})

const amountUnpaid = computed(() => {
  return Number(props.contract.amount_unpaid) || 0
})

const activePayments = computed(() => {
  const record = props.contract.paid_record
  if (!record || typeof record === 'string') return []
  return (record.payments || []).filter((p) => p.status !== 'deleted')
})

const paymentPercentage = computed(() => {
  if (contractAmount.value <= 0) return 0
  return Math.min((totalPaid.value / contractAmount.value) * 100, 100)
})

// 方法
const formatPrice = (value: number) => {
  return (
    value?.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'
  )
}

const formatPercentage = (percentage: number) => {
  return `${percentage.toFixed(1)}%`
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    deleted: 'info',
  }
  return map[status] || 'info'
}

const loadPayments = async () => {
  loading.value = true
  try {
    const record = props.contract.paid_record
    if (record && typeof record !== 'string') {
      payments.value = record.payments || []
    } else {
      payments.value = []
    }
  } catch (e) {
    console.error('解析支付记录失败:', e)
    payments.value = []
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  paymentForm.value = {
    date: '',
    amount: 0,
    description: '',
    payment_method: 'bank_transfer',
  }
  dialogVisible.value = true
}

const submitPayment = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      await contractAPI.addPaymentRecord(props.contract.recordcode, {
        amount: paymentForm.value.amount,
        description: paymentForm.value.description,
      })
      ElMessage.success('支付记录添加成功')
      dialogVisible.value = false
      emit('update')
      await loadPayments()
    } catch (error) {
      ElMessage.error(getErrorMessage(error, '添加支付记录失败'))
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (payment: PaymentRecord) => {
  try {
    await ElMessageBox.confirm('确定要删除该支付记录吗？', '确认删除', { type: 'warning' })

    await contractAPI.deletePaymentRecord(props.contract.recordcode, payment.id)
    ElMessage.success('支付记录删除成功')
    emit('update')
    await loadPayments()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(getErrorMessage(error, '删除支付记录失败'))
    }
  }
}

const handleApprove = async (payment: PaymentRecord) => {
  try {
    await ElMessageBox.confirm('确定要审核通过该支付记录吗？', '确认审核', { type: 'info' })

    await contractAPI.approvePaymentRecord(props.contract.recordcode, payment.id)
    ElMessage.success('支付记录审核成功')
    emit('update')
    await loadPayments()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(getErrorMessage(error, '审核支付记录失败'))
    }
  }
}

// 生命周期
onMounted(() => {
  loadPayments()
})
</script>

<style scoped>
.payment-record {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-row {
  margin-bottom: 20px;
}

.summary-row .el-statistic {
  text-align: center;
}
</style>
