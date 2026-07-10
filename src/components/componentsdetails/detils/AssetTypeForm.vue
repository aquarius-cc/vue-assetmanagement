<!--
  AssetTypeForm.vue
  资产分类表单页（新增 / 编辑）
  模式判断：路由 query 中有 code 参数 → 编辑模式，否则 → 新增模式
-->
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
            <el-form-item label="资产分类编码" prop="asset_type_code">
              <el-input
                v-model="assetTypeForm.asset_type_code"
                placeholder="请输入资产分类编码"
                :disabled="isEdit"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="一级分类名称" prop="asset_type_primary">
              <el-input
                v-model="assetTypeForm.asset_type_primary"
                placeholder="请输入一级分类名称"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="二级分类名称" prop="asset_type_secondary">
              <el-input
                v-model="assetTypeForm.asset_type_secondary"
                placeholder="请输入二级分类名称"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产分类类型" prop="asset_type_category">
              <el-select
                v-model="assetTypeForm.asset_type_category"
                placeholder="请选择资产分类类型"
                style="width: 100%"
              >
                <el-option label="硬件" value="hardware" />
                <el-option label="软件" value="software" />
                <el-option label="低值易耗" value="lowvalue" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="资产分类描述" prop="asset_type_description">
              <el-input
                v-model="assetTypeForm.asset_type_description"
                placeholder="请输入资产分类描述"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row justify="center">
          <el-col :span="24" style="text-align: center; margin-top: 20px">
            <!-- 新增模式才显示重置按钮，编辑模式下重置无意义 -->
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
// ===== 导入：按“Vue核心 → 第三方库 → @/内部模块”顺序 =====
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import { useAssetTypeStore } from '@/stores/assetTypeStore'
import type { AssetTypeCreateForm, AssetTypeUpdateForm } from '@/utils/AssetType'

// ===== 路由 =====
const route = useRoute()
const router = useRouter()
const assetTypeStore = useAssetTypeStore()
const formRef = ref()

// ===== 模式判断：通过路由 query.code 是否为真确定新增/编辑（含参数 → 编辑） =====
const isEdit = computed(() => !!route.query.code)

// ===== 表单数据初始化 =====
/**
 * 工厂函数：创建全新表单数据对象
 * 返回类型声明为联合类型，编译时保证调用统一
 */
const initForm = (): AssetTypeCreateForm | AssetTypeUpdateForm => ({
  asset_type_code: '',
  asset_type_primary: '',
  asset_type_secondary: '',
  asset_type_category: '',
  asset_type_description: '',
})

const assetTypeForm = ref<AssetTypeCreateForm | AssetTypeUpdateForm>(initForm())

// ===== 表单验证规则（全字段必填，修正文案） =====
const rules = {
  asset_type_code: [
    { required: true, message: '请输入资产分类编码', trigger: 'blur' },
    { min: 3, max: 50, message: '编码长度在 3 到 50 个字符', trigger: 'blur' },
  ],
  asset_type_primary: [
    { required: true, message: '请输入一级分类名称', trigger: 'blur' },
    { min: 2, max: 100, message: '名称长度在 2 到 100 个字符', trigger: 'blur' },
  ],
  asset_type_secondary: [
    { required: true, message: '请输入二级分类名称', trigger: 'blur' },
    { min: 2, max: 100, message: '名称长度在 2 到 100 个字符', trigger: 'blur' },
  ],
  asset_type_category: [{ required: true, message: '请选择资产分类类型', trigger: 'change' }],
  asset_type_description: [{ required: true, message: '请输入资产分类描述', trigger: 'blur' }],
}

// ===== 组件挂载逻辑 =====
onMounted(async () => {
  // 新增模式无需加载数据
  if (!isEdit.value) return

  try {
    // 确保 store 中已有列表数据（父页面可能未提前加载）
    if (!assetTypeStore.list || assetTypeStore.list.length === 0) {
      await assetTypeStore.getList()
    }

    const code = route.query.code as string
    // 根据资产分类编码查找对应的完整数据
    const target = assetTypeStore.list.find((item) => item.asset_type_code === code)

    if (target) {
      // 浅拷贝避免直接修改 store 原始引用
      assetTypeForm.value = { ...target }
    } else {
      ElMessage.error('未找到对应的资产分类，请检查编码是否正确')
      // 非法编码直接退回列表页
      router.replace('/main/assettypedetails')
    }
  } catch (error) {
    console.error('获取资产分类详情失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  }
})

// ===== 提交表单 =====
const submitForm = () => {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error('请完善必填信息！')
      return
    }

    try {
      // 根据模式调用不同的 Store Action，类型断言保证参数类型匹配
      if (isEdit.value) {
        await assetTypeStore.update(assetTypeForm.value as Parameters<typeof assetTypeStore.update>[0])
        ElMessage.success('资产分类修改成功！')
      } else {
        console.log('新增资产分类:', assetTypeForm.value)
        await assetTypeStore.create(assetTypeForm.value as Parameters<typeof assetTypeStore.create>[0])
        ElMessage.success('资产分类录入成功！')
      }

      // 通知列表页需要刷新数据
      assetTypeStore.setRefreshFlag(true)
      // 操作成功后回到列表页
      router.push('/main/assettypedetails')
    } catch (error: unknown) {
      // 使用类型守卫安全提取错误信息
      if (isAxiosError(error)) {
        const msg = error.response?.data?.msg || error.message
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

// ===== 重置表单（仅新增模式） =====
const resetForm = () => {
  formRef.value.resetFields()
}

// ===== 返回上一页 =====
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
      color: #409eff;

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
    color: #303133;
    font-size: 20px;
    font-weight: bold;
    margin: 20px 0 15px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #409eff;
  }

  .el-form .el-form-item {
    margin-bottom: 20px;
  }
}

// Element Plus 组件样式穿透与统一优化
:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  &:hover {
    box-shadow: 0 0 0 1px #c0c4cc inset;
  }
  &.is-focus {
    box-shadow: 0 0 0 1px #409eff inset;
  }
}

:deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  &:hover {
    box-shadow: 0 0 0 1px #c0c4cc inset;
  }
  &:focus {
    box-shadow: 0 0 0 1px #409eff inset;
  }
}
</style>
