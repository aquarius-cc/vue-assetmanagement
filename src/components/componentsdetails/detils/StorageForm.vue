<!--
  StorageForm.vue
  仓库表单（新增 / 编辑）—— 通过路由 query.code 判断模式
  完全遵循 AGENTS 规范：组合式 API、TypeScript 严格、别名导入、样式隔离、单一职责
-->
<template>
  <div class="storage-form">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Edit v-if="isEditMode" /><Plus v-else /></el-icon>
          <span>{{ isEditMode ? '仓库信息编辑' : '仓库录入' }}</span>
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
          <!-- 仓库信息 -->
          <el-col :span="24">
            <h3 class="section-title">仓库信息</h3>
          </el-col>

          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="仓库编码" prop="storage_code">
              <el-input
                v-model="formData.storage_code"
                placeholder="请输入仓库编码"
                clearable
                :disabled="isEditMode"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="仓库名称" prop="storage_name">
              <el-input v-model="formData.storage_name" placeholder="请输入仓库名称" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="仓库地址" prop="storage_address">
              <el-input v-model="formData.storage_address" placeholder="请输入仓库地址" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="仓库类型" prop="storage_type">
              <el-select
                v-model="formData.storage_type"
                placeholder="请选择仓库类型"
                style="width: 100%"
              >
                <el-option label="新货仓库" value="newasset" />
                <el-option label="回收仓库" value="recycle" />
                <el-option label="待报废仓库" value="damaged" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="仓库描述" prop="storage_description">
              <el-input
                v-model="formData.storage_description"
                placeholder="请输入仓库描述"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 操作按钮 -->
        <el-row justify="center">
          <el-col :span="24" style="text-align: center; margin-top: 20px">
            <el-button v-if="!isEditMode" @click="resetForm">重置</el-button>
            <el-button type="primary" @click="submitForm" :loading="storageStore.loading">
              提交
            </el-button>
            <el-button type="info" @click="goBack">返回</el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts">
export default { name: 'StorageForm' }
</script>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import { isAxiosError } from 'axios'
import type { FormInstance, FormRules } from 'element-plus'

// Stores
import { useStorageStore } from '@/stores/storageStore'
import type { StorageCreateForm } from '@/utils/Storage'

// ==================== 路由与状态 ====================
const router = useRouter()
const route = useRoute()
const storageStore = useStorageStore()
const formRef = ref<FormInstance>()

// 编辑模式：根据 query.recordcode 判断
const isEditMode = computed(() => !!route.query.recordcode)
const currentCode = computed(() => route.query.recordcode as string | undefined)

// ==================== 表单数据模型 ====================
const formData = reactive<Partial<StorageCreateForm> & { id?: number }>({
  storage_code: '',
  storage_name: '',
  storage_address: '',
  storage_type: '',
  storage_description: '',
  id: undefined,
})

// ==================== 表单校验规则 ====================
const rules: FormRules = {
  storage_code: [
    { required: true, message: '请输入仓库编码', trigger: 'blur' },
    { min: 3, max: 50, message: '仓库编码长度在 3 到 50 个字符', trigger: 'blur' },
  ],
  storage_name: [
    { required: true, message: '请输入仓库名称', trigger: 'blur' },
    { min: 2, max: 100, message: '仓库名称长度在 2 到 100 个字符', trigger: 'blur' },
  ],
  storage_address: [
    { required: true, message: '请输入仓库地址', trigger: 'blur' },
    { min: 2, max: 100, message: '仓库地址长度在 2 到 100 个字符', trigger: 'blur' },
  ],
  storage_type: [{ required: true, message: '请选择仓库类型', trigger: 'change' }],
  // storage_description 非必填，无校验规则
}

// ==================== 加载编辑数据 ====================
const loadEditData = async (code: string) => {
  try {
    // 优先从 store 缓存或直接调用 API 获取详情
    const detail = await storageStore.getById(code)
    if (!detail) {
      ElMessage.error('仓库不存在')
      router.push({ name: 'StorageDetails' })
      return
    }
    // 回填表单
    formData.storage_code = detail.storage_code
    formData.storage_name = detail.storage_name
    formData.storage_address = detail.storage_address ?? ''
    formData.storage_type = detail.storage_type ?? ''
    formData.storage_description = detail.storage_description ?? ''
    formData.id = detail.id
  } catch (error) {
    console.error('加载仓库数据失败:', error)
    ElMessage.error('加载数据失败，请重试')
    router.push({ name: 'StorageDetails' })
  }
}

// ==================== 提交表单 ====================
const submitForm = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请完善必填信息')
      return
    }

    try {
      if (isEditMode.value && currentCode.value) {
        // 编辑模式：调用 update
        await storageStore.update({
          storage_code: currentCode.value,
          storage_name: formData.storage_name,
          storage_address: formData.storage_address,
          storage_type: formData.storage_type,
          storage_description: formData.storage_description,
        })
        ElMessage.success('更新成功')
      } else {
        // 新增模式：调用 create
        await storageStore.create(formData as StorageCreateForm)
        ElMessage.success('仓库录入成功')
        resetForm()
      }
      // 通知列表页刷新
      storageStore.setRefreshFlag(true)
      // 跳转回列表页
      router.push({ name: 'StorageDetails' })
    } catch (error: unknown) {
      const msg = isAxiosError(error)
        ? error.response?.data?.message || '操作失败'
        : error instanceof Error
          ? error.message
          : '未知错误'
      ElMessage.error(msg)
      console.error('提交失败:', error)
    }
  })
}

/**
 * 重置表单（新增模式清空，编辑模式还原为原始数据）
 */
const resetForm = () => {
  if (isEditMode.value && currentCode.value) {
    loadEditData(currentCode.value)
  } else {
    formRef.value?.resetFields()
    // 额外清空可能未在 resetFields 中处理的字段
    formData.storage_type = ''
    formData.storage_description = ''
    ElMessage.info('表单已重置')
  }
}

const goBack = () => {
  router.go(-1)
}

// ==================== 生命周期 ====================
onMounted(async () => {
  if (isEditMode.value && currentCode.value) {
    await loadEditData(currentCode.value)
  }
})
</script>

<style scoped lang="scss">
.storage-form {
  padding: 24px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;

  .box-card {
    margin: 0;
    height: 100%;
    display: flex;
    flex-direction: column;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
      color: var(--color-primary-light);

      .el-icon {
        font-size: 20px;
      }
    }
  }

  .full-width-form {
    width: 100%;
    flex: 1;
  }

  .section-title {
    color: var(--text-primary);
    font-size: 20px;
    font-weight: bold;
    margin: 20px 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--color-primary-light);
  }

  .el-form {
    .el-form-item {
      margin-bottom: 20px;
    }
  }
}

// Element Plus 表单样式优化（与原有样式保持一致）
:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--border-color-input) inset;

  &:hover {
    box-shadow: 0 0 0 1px var(--border-color-input-dark) inset;
  }

  &.is-focus {
    box-shadow: 0 0 0 1px var(--color-primary-light) inset;
  }
}

:deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px var(--border-color-input) inset;

  &:hover {
    box-shadow: 0 0 0 1px var(--border-color-input-dark) inset;
  }

  &:focus {
    box-shadow: 0 0 0 1px var(--color-primary-light) inset;
  }
}
</style>
