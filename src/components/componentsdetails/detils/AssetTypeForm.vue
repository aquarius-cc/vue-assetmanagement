<template>
  <div class="asset-entry">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Plus /></el-icon>
          <span>{{ isEdit ? '资产分类编辑' : '资产分类录入' }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="assetTypeForm"
        :rules="rules"
        label-width="140px"
        size="default"
        class="full-width-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <h3 class="section-title">资产分类信息</h3>
          </el-col>

          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="类型编码" prop="type_code">
              <el-input
                v-model="assetTypeForm.type_code"
                placeholder="请输入类型编码"
                :disabled="isEdit"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="类型名称" prop="type_name">
              <el-input v-model="assetTypeForm.type_name" placeholder="请输入类型名称" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="父级编码" prop="parent_type_code">
              <el-input
                v-model="assetTypeForm.parent_type_code"
                placeholder="顶级分类无需填写"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="层级" prop="level">
              <el-input-number
                v-model="assetTypeForm.level"
                :min="0"
                :max="6"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="排序" prop="sort_order">
              <el-input-number
                v-model="assetTypeForm.sort_order"
                :min="0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="类型描述" prop="type_description">
              <el-input
                v-model="assetTypeForm.type_description"
                placeholder="请输入类型描述"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row justify="center">
          <el-col :span="24" style="text-align: center; margin-top: 20px">
            <el-button v-if="!isEdit" @click="resetForm">重置</el-button>
            <el-button type="success" @click="submitForm" :loading="assetTypeStore.loading"
              >提交</el-button
            >
            <el-button type="primary" @click="goBack">返回</el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts">
export default {
  name: 'AssetTypeForm',
}
</script>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import { useAssetTypeStore } from '@/stores/assetTypeStore'
import type { AssetTypeCreateForm, AssetTypeUpdateForm } from '@/utils/AssetType'

const route = useRoute()
const router = useRouter()
const assetTypeStore = useAssetTypeStore()
const formRef = ref()

const isEdit = computed(() => !!route.query.code)

const initForm = (): AssetTypeCreateForm => ({
  type_code: '',
  type_name: '',
  parent_type_code: null,
  level: 0,
  type_description: '',
  sort_order: 0,
})

const assetTypeForm = ref<AssetTypeCreateForm>(initForm())

const rules = {
  type_code: [
    { required: true, message: '请输入类型编码', trigger: 'blur' },
    { min: 3, max: 30, message: '编码长度在 3 到 30 个字符', trigger: 'blur' },
  ],
  type_name: [
    { required: true, message: '请输入类型名称', trigger: 'blur' },
    { min: 2, max: 100, message: '名称长度在 2 到 100 个字符', trigger: 'blur' },
  ],
  parent_type_code: [],
  level: [],
  type_description: [],
  sort_order: [],
}

onMounted(async () => {
  if (!isEdit.value) return

  try {
    const code = route.query.code as string
    // 使用 recordcode 从 API 加载详情
    const target = await assetTypeStore.getById(code)

    if (target) {
      assetTypeForm.value = {
        type_code: target.type_code,
        type_name: target.type_name,
        parent_type_code: target.parent_type_code ?? null,
        level: target.level ?? 0,
        type_description: target.type_description ?? '',
        sort_order: target.sort_order ?? 0,
      }
    } else {
      ElMessage.error('未找到对应的资产分类，请检查编码是否正确')
      router.replace('/main/assettypedetails')
    }
  } catch (error) {
    console.error('获取资产分类详情失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  }
})

const submitForm = () => {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error('请完善必填信息！')
      return
    }

    try {
      if (isEdit.value) {
        const code = route.query.code as string
        const updateData: AssetTypeUpdateForm = {
          recordcode: code,
          ...assetTypeForm.value,
        }
        await assetTypeStore.update(updateData)
        ElMessage.success('资产分类修改成功！')
      } else {
        await assetTypeStore.create(assetTypeForm.value)
        ElMessage.success('资产分类录入成功！')
      }

      assetTypeStore.setRefreshFlag(true)
      router.push('/main/assettypedetails')
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const msg = error.response?.data?.message || error.message
        ElMessage.error(`操作失败：${msg}`)
      } else if (error instanceof Error) {
        ElMessage.error(`操作失败：${error.message}`)
      } else {
        ElMessage.error('操作失败，发生未知错误')
      }
      console.error('资产分类操作失败：', error)
    }
  })
}

const resetForm = () => {
  formRef.value.resetFields()
}

const goBack = () => {
  router.go(-1)
}
</script>

<style scoped lang="scss">
.asset-entry {
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

  .el-form .el-form-item {
    margin-bottom: 20px;
  }
}

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
