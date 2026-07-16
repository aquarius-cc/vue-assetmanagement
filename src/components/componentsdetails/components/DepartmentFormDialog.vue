<!--
  DepartmentFormDialog.vue
  部门表单弹窗组件

  功能：
    - 新增部门（根部门或子部门）
    - 编辑部门信息（含调整上级部门和层级）
    - 表单验证（层级最大 6 层）
-->
<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="550px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="department-form"
    >
      <!-- 部门编码 -->
      <el-form-item label="部门编码" prop="department_code">
        <el-input
          v-model="formData.department_code"
          placeholder="请输入部门编码"
          :disabled="isEdit"
          maxlength="20"
          show-word-limit
        />
      </el-form-item>

      <!-- 部门名称 -->
      <el-form-item label="部门名称" prop="department_name">
        <el-input
          v-model="formData.department_name"
          placeholder="请输入部门名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <!-- 部门信息员 -->
      <el-form-item label="信息员" prop="department_information">
        <el-input
          v-model="formData.department_information"
          placeholder="请输入部门信息员"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <!-- 上级部门（编辑模式可选择，新增模式根据 parentDepartment 决定） -->
      <el-form-item label="上级部门" prop="parent_department_code">
        <el-tree-select
          v-model="formData.parent_department_code"
          :data="departmentTreeOptions"
          :props="treeSelectProps"
          placeholder="请选择上级部门（不选则为根部门）"
          clearable
          check-strictly
          filterable
          :render-after-expand="false"
          style="width: 100%"
          @change="handleParentChange"
        />
        <div class="form-tip">
          当前层级：{{ currentLevelText }}
          <span v-if="levelWarning" class="level-warning">{{ levelWarning }}</span>
        </div>
      </el-form-item>

      <!-- 排序顺序 -->
      <el-form-item label="排序顺序" prop="sort_order">
        <el-input-number
          v-model="formData.sort_order"
          :min="0"
          :max="9999"
          :step="1"
          controls-position="right"
          style="width: 100%"
        />
        <div class="form-tip">数值越小排序越靠前</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="isSubmitting" @click="handleSubmit"> 确定 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 部门表单弹窗组件
 *
 * Props:
 *   - visible: 弹窗显示状态
 *   - type: 表单类型 'create' | 'edit'
 *   - parentDepartment: 父部门（新增子部门时使用）
 *   - editDepartment: 编辑的部门（编辑时使用）
 *   - departmentTree: 部门树数据（用于上级部门选择）
 *
 * Emits:
 *   - update:visible: 更新显示状态
 *   - success: 提交成功时触发
 *
 * 验证规则：
 *   - 部门层级最大 6 层（level 0-5）
 *   - 不能选择自己或自己的子部门作为上级
 */
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { departmentAPI } from '@/api/department'
import type { Department, DepartmentCreateForm, DepartmentTreeNode } from '@/utils/Department'

// ==================== Props & Emits ====================

interface Props {
  /** 弹窗显示状态 */
  visible: boolean
  /** 表单类型 */
  type: 'create' | 'edit'
  /** 父部门（新增子部门时使用） */
  parentDepartment?: Department | null
  /** 编辑的部门（编辑时使用） */
  editDepartment?: Department | null
  /** 部门树数据（用于上级部门选择） */
  departmentTree?: DepartmentTreeNode[]
}

const props = withDefaults(defineProps<Props>(), {
  parentDepartment: null,
  editDepartment: null,
  departmentTree: () => [],
})

const emit = defineEmits<{
  /** 更新显示状态 */
  (e: 'update:visible', value: boolean): void
  /** 提交成功 */
  (e: 'success'): void
}>()

// ==================== 常量定义 ====================

/** 最大层级（0-5，共 6 层） */
const MAX_LEVEL = 5

// ==================== 状态定义 ====================

/** 弹窗显示状态（计算属性） */
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

/** 表单引用 */
const formRef = ref<FormInstance>()

/** 提交中 */
const isSubmitting = ref(false)

/** 表单数据 */
const formData = ref<DepartmentCreateForm & { parent_department_code: string | null }>({
  department_code: '',
  department_name: '',
  department_information: '',
  sort_order: 0,
  parent_department_code: null,
})

/** TreeSelect 配置 */
const treeSelectProps = {
  label: 'department_name',
  value: 'department_code',
  children: 'children',
  disabled: 'disabled',
}

// ==================== 计算属性 ====================

/** 是否编辑模式 */
const isEdit = computed(() => props.type === 'edit')

/** 弹窗标题 */
const dialogTitle = computed(() => {
  if (isEdit.value) return '编辑部门'
  if (props.parentDepartment) return `新增子部门（${props.parentDepartment.department_name}）`
  return '新增根部门'
})

/**
 * 部门树选项（用于上级部门选择）
 * 编辑模式下，需要禁用自己及其子部门（不能选择自己或子部门作为上级）
 */
const departmentTreeOptions = computed(() => {
  if (!props.departmentTree?.length) return []

  // 深拷贝并添加 disabled 属性
  const processNode = (node: DepartmentTreeNode): DepartmentTreeNode & { disabled?: boolean } => {
    const newNode: DepartmentTreeNode & { disabled?: boolean } = { ...node }

    // 编辑模式下，禁用自己和子部门
    if (isEdit.value && props.editDepartment) {
      const editCode = props.editDepartment.department_code
      // 如果是自己或自己的子部门，禁用
      if (node.department_code === editCode || isDescendant(node, editCode)) {
        newNode.disabled = true
      }
    }

    // 递归处理子节点
    if (node.children?.length) {
      newNode.children = node.children.map(processNode)
    }

    return newNode
  }

  return props.departmentTree.map(processNode)
})

/**
 * 当前层级文本
 * 根据选择的上级部门计算当前部门层级
 */
const currentLevelText = computed(() => {
  const level = calculateNewLevel(formData.value.parent_department_code)
  const levelNames = ['根部门', '一级部门', '二级部门', '三级部门', '四级部门', '五级部门']
  return levelNames[level] || `第 ${level + 1} 级`
})

/**
 * 层级警告信息
 */
const levelWarning = computed(() => {
  const level = calculateNewLevel(formData.value.parent_department_code)
  if (level > MAX_LEVEL) {
    return `（超出最大层级限制 ${MAX_LEVEL + 1} 层）`
  }
  // 检查如果选择该上级后，子部门是否会超出层级限制
  if (isEdit.value && props.editDepartment) {
    const maxChildDepth = getMaxChildDepth(props.editDepartment.department_code)
    if (level + maxChildDepth > MAX_LEVEL) {
      return `（子部门最大深度 ${maxChildDepth}，调整后可能超出限制）`
    }
  }
  return ''
})

// ==================== 表单验证规则 ====================

/** 自定义上级部门验证 */
const validateParentCode = (
  rule: unknown,
  value: string | null,
  callback: (error?: Error) => void,
) => {
  // 编辑模式下，检查是否选择了自己或子部门
  if (isEdit.value && props.editDepartment && value) {
    const editCode = props.editDepartment.department_code
    if (value === editCode) {
      callback(new Error('不能选择自己作为上级部门'))
      return
    }
    // 检查是否选择了子部门
    if (isDescendantByCode(value, editCode, props.departmentTree)) {
      callback(new Error('不能选择子部门作为上级部门'))
      return
    }
  }

  // 检查层级是否超出限制
  const newLevel = calculateNewLevel(value)
  if (newLevel > MAX_LEVEL) {
    callback(new Error(`层级不能超过 ${MAX_LEVEL + 1} 层`))
    return
  }

  callback()
}

const formRules: FormRules = {
  department_code: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: '只能包含字母、数字、下划线和横线',
      trigger: 'blur',
    },
  ],
  department_name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  department_information: [
    { required: true, message: '请输入部门信息员', trigger: 'blur' },
    { max: 50, message: '最多 50 个字符', trigger: 'blur' },
  ],
  parent_department_code: [{ validator: validateParentCode, trigger: 'change' }],
  sort_order: [
    { required: true, message: '请输入排序顺序', trigger: 'blur' },
    { type: 'number', min: 0, max: 9999, message: '范围 0-9999', trigger: 'blur' },
  ],
}

// ==================== 方法定义 ====================

/**
 * 计算选择指定上级后的新层级
 * @param parentCode 上级部门编码
 * @returns 新层级（0-5）
 */
const calculateNewLevel = (parentCode: string | null): number => {
  if (!parentCode) return 0 // 根部门

  // 从部门树中查找上级部门的层级
  const findLevel = (nodes: DepartmentTreeNode[], code: string): number => {
    for (const node of nodes) {
      if (node.department_code === code) {
        return node.level
      }
      if (node.children?.length) {
        const found = findLevel(node.children, code)
        if (found >= 0) return found
      }
    }
    return -1
  }

  const parentLevel = findLevel(props.departmentTree, parentCode)
  return parentLevel >= 0 ? parentLevel + 1 : 0
}

/**
 * 判断节点是否是指定编码的子部门
 * @param node 节点
 * @param parentCode 父部门编码
 */
const isDescendant = (node: DepartmentTreeNode, parentCode: string): boolean => {
  if (node.parent_department_code === parentCode) return true
  if (node.children?.length) {
    return node.children.some((child) => isDescendant(child, parentCode))
  }
  return false
}

/**
 * 判断指定编码的节点是否是另一个节点的子部门
 * @param code 要检查的编码
 * @param ancestorCode 祖先编码
 * @param tree 部门树
 */
const isDescendantByCode = (
  code: string,
  ancestorCode: string,
  tree: DepartmentTreeNode[],
): boolean => {
  const findNode = (nodes: DepartmentTreeNode[], targetCode: string): DepartmentTreeNode | null => {
    for (const node of nodes) {
      if (node.department_code === targetCode) return node
      if (node.children?.length) {
        const found = findNode(node.children, targetCode)
        if (found) return found
      }
    }
    return null
  }

  const node = findNode(tree, code)
  if (!node) return false
  return isDescendant(node, ancestorCode)
}

/**
 * 获取部门的最大子部门深度
 * @param departmentCode 部门编码
 * @returns 最大深度（0 表示无子部门）
 */
const getMaxChildDepth = (departmentCode: string): number => {
  const findNode = (nodes: DepartmentTreeNode[], targetCode: string): DepartmentTreeNode | null => {
    for (const node of nodes) {
      if (node.department_code === targetCode) return node
      if (node.children?.length) {
        const found = findNode(node.children, targetCode)
        if (found) return found
      }
    }
    return null
  }

  const getDepth = (node: DepartmentTreeNode): number => {
    if (!node.children?.length) return 0
    return 1 + Math.max(...node.children.map(getDepth))
  }

  const node = findNode(props.departmentTree, departmentCode)
  return node ? getDepth(node) : 0
}

/**
 * 处理上级部门变更
 */
const handleParentChange = (_value: string | null) => {
  // 触发表单验证
  formRef.value?.validateField('parent_department_code')
}

/**
 * 初始化表单数据
 */
const initFormData = () => {
  if (isEdit.value && props.editDepartment) {
    // 编辑模式：填充现有数据
    formData.value = {
      department_code: props.editDepartment.department_code,
      department_name: props.editDepartment.department_name,
      department_information: props.editDepartment.department_information,
      sort_order: props.editDepartment.sort_order,
      parent_department_code: props.editDepartment.parent_department_code,
    }
  } else {
    // 新增模式
    formData.value = {
      department_code: '',
      department_name: '',
      department_information: '',
      sort_order: 0,
      // 如果有父部门，设置 parent_department_code
      parent_department_code: props.parentDepartment?.department_code || null,
    }
  }
}

/**
 * 处理提交
 */
const handleSubmit = async () => {
  try {
    // 表单验证
    await formRef.value?.validate()

    // 额外验证：层级检查
    const newLevel = calculateNewLevel(formData.value.parent_department_code)
    if (newLevel > MAX_LEVEL) {
      ElMessage.error(`层级不能超过 ${MAX_LEVEL + 1} 层`)
      return
    }

    isSubmitting.value = true

    if (isEdit.value) {
      // 编辑部门：调用 moveDepartment 或 updateDepartment
      const editDept = props.editDepartment
      const parentChanged =
        editDept && editDept.parent_department_code !== formData.value.parent_department_code

      // 如果上级部门变更，需要调用 moveDepartment
      // 后端字段名为 target_parent_department_code，与 MoveDepartmentSerializer 保持一致
      if (parentChanged && editDept) {
        await departmentAPI.moveDepartment(editDept.department_code, {
          target_parent_department_code: formData.value.parent_department_code,
        })
      }

      // 更新其他信息
      await departmentAPI.updateDepartment({
        department_code: formData.value.department_code,
        department_name: formData.value.department_name,
        department_information: formData.value.department_information,
        sort_order: formData.value.sort_order,
      })
      ElMessage.success('部门更新成功')
    } else {
      // 新增部门
      await departmentAPI.createDepartment(formData.value)
      ElMessage.success('部门创建成功')
    }

    // 关闭弹窗并通知成功
    dialogVisible.value = false
    emit('success')
  } catch (error: unknown) {
    console.error('提交失败:', error)
    const errorMsg = error instanceof Error ? error.message : '操作失败'
    ElMessage.error(errorMsg)
  } finally {
    isSubmitting.value = false
  }
}

/**
 * 处理弹窗关闭
 */
const handleClosed = () => {
  formRef.value?.resetFields()
}

// ==================== 监听 ====================

// 监听显示状态，打开时初始化表单
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      initFormData()
    }
  },
)
</script>

<style lang="scss" scoped>
.department-form {
  .form-tip {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;

    .level-warning {
      color: var(--color-warning-light);
      margin-left: 8px;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
