<!--
  DepartmentBatchAddDialog.vue
  批量新增子部门弹窗

  功能：
    - 在当前部门下批量新增多个子部门
    - 支持动态添加/删除行
    - 调用后端 batch-create 接口一次性提交
    - 展示成功/失败结果明细
-->
<template>
  <el-dialog
    :model-value="visible"
    title="批量新增子部门"
    width="720px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event as boolean)"
    @close="handleClose"
  >
    <!-- 目标部门提示 -->
    <el-alert type="info" :closable="false" show-icon>
      <template #title>
        在「<strong>{{ parentDepartment?.department_name }}</strong>」下批量新增子部门
      </template>
    </el-alert>

    <!-- 批量新增表格 -->
    <el-table :data="formItems" border stripe style="margin-top: 16px" max-height="400">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column label="部门编码" min-width="140">
        <template #default="{ row }">
          <el-input
            v-model="row.department_code"
            placeholder="如 DEP001"
            size="small"
            :disabled="submitting"
          />
        </template>
      </el-table-column>
      <el-table-column label="部门名称" min-width="160">
        <template #default="{ row }">
          <el-input
            v-model="row.department_name"
            placeholder="如 研发部"
            size="small"
            :disabled="submitting"
          />
        </template>
      </el-table-column>
      <el-table-column label="信息员" min-width="120">
        <template #default="{ row }">
          <el-input
            v-model="row.department_information"
            placeholder="信息员姓名"
            size="small"
            :disabled="submitting"
          />
        </template>
      </el-table-column>
      <el-table-column label="排序" width="100" align="center">
        <template #default="{ row }">
          <el-input-number
            v-model="row.sort_order"
            :min="0"
            size="small"
            :disabled="submitting"
            controls-position="right"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="70" align="center">
        <template #default="{ $index }">
          <el-button
            type="danger"
            size="small"
            link
            :disabled="submitting || formItems.length <= 1"
            @click="removeRow($index)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加行按钮 -->
    <el-button
      type="primary"
      size="small"
      style="margin-top: 12px"
      :disabled="submitting"
      @click="addRow"
    >
      + 添加一行
    </el-button>

    <!-- 结果展示 -->
    <el-result
      v-if="submitResult"
      :icon="submitResult.fail_count > 0 ? 'warning' : 'success'"
      :title="`成功 ${submitResult.success_count} 条，失败 ${submitResult.fail_count} 条`"
      :sub-title="resultSummary"
      style="margin-top: 16px"
    />

    <template #footer>
      <el-button @click="handleClose" :disabled="submitting">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        提交
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { departmentAPI } from '@/api/department'
import type { Department, DepartmentCreateForm } from '@/utils/Department'
import type { DepartmentBatchCreateResult } from '@/api/department'

// ==================== Props & Emits ====================

interface Props {
  /** 弹窗可见性 */
  visible: boolean
  /** 父部门信息 */
  parentDepartment: Department | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

// ==================== 表单数据 ====================

interface FormItem {
  department_code: string
  department_name: string
  department_information: string
  sort_order: number
}

const createEmptyRow = (): FormItem => ({
  department_code: '',
  department_name: '',
  department_information: '',
  sort_order: 0,
})

const formItems = ref<FormItem[]>([createEmptyRow()])
const submitting = ref(false)
const submitResult = ref<DepartmentBatchCreateResult | null>(null)

// ==================== 方法 ====================

const addRow = () => {
  formItems.value.push(createEmptyRow())
}

const removeRow = (index: number) => {
  formItems.value.splice(index, 1)
}

const resultSummary = computed(() => {
  if (!submitResult.value) return ''
  const errors = submitResult.value.fail_items
    .slice(0, 3)
    .map((e) => `第${e.index + 1}行: ${e.error_message}`)
    .join('; ')
  const more = submitResult.value.fail_count > 3 ? ` 等${submitResult.value.fail_count}条` : ''
  return errors ? `${errors}${more}` : ''
})

const handleSubmit = async () => {
  if (!props.parentDepartment) return

  // 校验：至少有一行且必填字段不为空
  const validItems = formItems.value.filter(
    (item) => item.department_code.trim() && item.department_name.trim()
  )
  if (validItems.length === 0) {
    ElMessage.warning('请至少填写一条有效的部门信息（编码和名称为必填）')
    return
  }

  submitting.value = true
  submitResult.value = null

  try {
    const items: DepartmentCreateForm[] = validItems.map((item) => ({
      department_code: item.department_code.trim(),
      department_name: item.department_name.trim(),
      department_information: item.department_information.trim() || '-',
      parent_department_code: props.parentDepartment!.department_code,
      sort_order: item.sort_order ?? 0,
    }))

    const result = await departmentAPI.batchCreateDepartments(items)
    submitResult.value = result

    if (result.fail_count === 0) {
      ElMessage.success(`成功创建 ${result.success_count} 个子部门`)
      emit('success')
      handleClose()
    } else if (result.success_count > 0) {
      ElMessage.warning(`成功 ${result.success_count} 条，失败 ${result.fail_count} 条`)
      emit('success')
    } else {
      ElMessage.error('所有部门创建失败')
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '批量创建失败'
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  formItems.value = [createEmptyRow()]
  submitResult.value = null
  emit('update:visible', false)
}

// 监听弹窗打开，重置表单
watch(
  () => props.visible,
  (val) => {
    if (val) {
      formItems.value = [createEmptyRow()]
      submitResult.value = null
    }
  }
)
</script>
