<template>
  <div class="asset-type-management" v-loading="isLoading" element-loading-text="加载中...">
    <!-- 左侧：资产分类树形目录 -->
    <div class="tree-panel">
      <AssetTypeTree
        ref="treeRef"
        :data="allData"
        :current-key="selectedType?.recordcode"
        @select="handleTypeSelect"
      />

      <div class="tree-actions">
        <el-button type="primary" size="small" @click="handleAddRootType">
          <el-icon><Plus /></el-icon>
          新增根分类
        </el-button>
      </div>
    </div>

    <!-- 右侧：内容区 -->
    <div class="content-panel">
      <!-- 子路由视图 -->
      <router-view v-if="isChildRouteActive" />

      <template v-else>
        <!-- 已选中分类：显示信息卡片 + 子分类列表 -->
        <template v-if="selectedType">
          <AssetTypeInfoCard
            :asset-type="selectedType"
            @edit="handleEditType"
            @add-child="handleAddChildType"
            @batch-add-child="handleBatchAddChildType"
            @delete="handleDeleteType"
          />

          <AssetTypeChildList
            :children="childrenOfSelected"
            :loading="false"
            @add-child="handleAddChildType"
            @batch-import="handleBatchImport"
            @batch-delete="handleBatchDelete"
            @edit="handleEditChild"
            @delete="handleDeleteChild"
          />
        </template>

        <!-- 未选中分类时的提示 -->
        <el-empty v-else description="请从左侧选择资产分类" />
      </template>
    </div>

    <!-- 新增/编辑表单弹窗 -->
    <el-dialog
      v-model="formDialogVisible"
      :title="formDialogTitle"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="110px">
        <el-form-item label="类型编码" prop="type_code">
          <el-input v-model="formData.type_code" :disabled="isEditMode" placeholder="请输入类型编码" />
        </el-form-item>
        <el-form-item label="类型名称" prop="type_name">
          <el-input v-model="formData.type_name" placeholder="请输入类型名称" />
        </el-form-item>
        <el-form-item label="父级编码">
          <el-input v-model="formData.parent_type_code" disabled />
        </el-form-item>
        <el-form-item label="层级">
          <el-input-number v-model="formData.level" :min="0" :max="6" disabled />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort_order" :min="0" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.type_description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量新增子分类弹窗 -->
    <el-dialog
      v-model="batchAddVisible"
      title="批量新增子分类"
      width="600px"
      destroy-on-close
    >
      <el-form label-width="110px">
        <el-form-item label="父级分类">
          <el-tag>{{ selectedType?.type_name }} ({{ selectedType?.type_code }})</el-tag>
        </el-form-item>
        <el-form-item label="子分类列表">
          <div class="batch-add-list">
            <div v-for="(item, index) in batchAddList" :key="index" class="batch-add-item">
              <el-input v-model="item.type_code" placeholder="类型编码" style="width: 150px" />
              <el-input v-model="item.type_name" placeholder="类型名称" style="width: 150px" />
              <el-input v-model="item.type_description" placeholder="描述（可选）" style="flex: 1" />
              <el-button type="danger" link @click="batchAddList.splice(index, 1)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" link @click="addBatchItem">
              <el-icon><Plus /></el-icon> 添加一行
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchAddVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleBatchAddSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
export default {
  name: 'AssetTypeManagement',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isAxiosError } from 'axios'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { assetTypeAPI } from '@/api/assetType'
import type { AssetType, AssetTypeCreateForm } from '@/utils/AssetType'

import AssetTypeTree from '@/components/componentsdetails/components/AssetTypeTree.vue'
import AssetTypeInfoCard from '@/components/componentsdetails/components/AssetTypeInfoCard.vue'
import AssetTypeChildList from '@/components/componentsdetails/components/AssetTypeChildList.vue'

const route = useRoute()
const router = useRouter()

const isChildRouteActive = computed(() => {
  return route.name !== 'AssetTypeDetails' && ['AssetTypeForm', 'AssetTypeBatchImport'].includes(route.name as string)
})

// ==================== 状态 ====================
const isLoading = ref(false)
const submitting = ref(false)
const allData = ref<AssetType[]>([])
const selectedType = ref<AssetType | null>(null)

/** 当前选中节点的直接子节点 */
const childrenOfSelected = computed(() => {
  if (!selectedType.value) return []
  return allData.value.filter((item) => item.parent_type_code === selectedType.value!.type_code)
})

// ==================== 表单弹窗 ====================
const formDialogVisible = ref(false)
const isEditMode = ref(false)
const editingRecordcode = ref('')
const formRef = ref<FormInstance>()

const formDialogTitle = computed(() => isEditMode.value ? '编辑资产分类' : '新增资产分类')

const formData = ref<AssetTypeCreateForm>({
  type_code: '',
  type_name: '',
  parent_type_code: null,
  level: 0,
  type_description: '',
  sort_order: 0,
})

const formRules: FormRules = {
  type_code: [
    { required: true, message: '请输入类型编码', trigger: 'blur' },
    { min: 3, max: 30, message: '编码长度在 3 到 30 个字符', trigger: 'blur' },
  ],
  type_name: [
    { required: true, message: '请输入类型名称', trigger: 'blur' },
    { min: 2, max: 100, message: '名称长度在 2 到 100 个字符', trigger: 'blur' },
  ],
}

// ==================== 批量新增弹窗 ====================
const batchAddVisible = ref(false)
const batchAddList = ref<Array<{ type_code: string; type_name: string; type_description: string }>>([])

const addBatchItem = () => {
  batchAddList.value.push({ type_code: '', type_name: '', type_description: '' })
}

// ==================== 方法 ====================

/** 加载所有资产类型数据 */
const fetchAllData = async () => {
  isLoading.value = true
  try {
    const response = await assetTypeAPI.getAssetTypes({ page: 1, page_size: 9999 })
    allData.value = response.results

    // 如果当前有选中的分类，刷新其信息
    if (selectedType.value) {
      const updated = allData.value.find((d) => d.recordcode === selectedType.value!.recordcode)
      if (updated) {
        selectedType.value = updated
      }
    } else {
      // 默认选中第一个根分类
      const root = allData.value.find((d) => !d.parent_type_code)
      if (root) selectedType.value = root
    }
  } catch (error) {
    console.error('加载资产分类数据失败:', error)
    ElMessage.error('加载资产分类数据失败')
  } finally {
    isLoading.value = false
  }
}

/** 树节点选择 */
const handleTypeSelect = (assetType: AssetType) => {
  selectedType.value = assetType
}

/** 新增根分类 */
const handleAddRootType = () => {
  isEditMode.value = false
  editingRecordcode.value = ''
  formData.value = { type_code: '', type_name: '', parent_type_code: null, level: 0, type_description: '', sort_order: 0 }
  formDialogVisible.value = true
}

/** 编辑选中分类 */
const handleEditType = () => {
  if (!selectedType.value) return
  isEditMode.value = true
  editingRecordcode.value = selectedType.value.recordcode
  formData.value = {
    type_code: selectedType.value.type_code,
    type_name: selectedType.value.type_name,
    parent_type_code: selectedType.value.parent_type_code ?? null,
    level: selectedType.value.level ?? 0,
    type_description: selectedType.value.type_description ?? '',
    sort_order: selectedType.value.sort_order ?? 0,
  }
  formDialogVisible.value = true
}

/** 新增子分类 */
const handleAddChildType = () => {
  if (!selectedType.value) return
  isEditMode.value = false
  editingRecordcode.value = ''
  formData.value = {
    type_code: '',
    type_name: '',
    parent_type_code: selectedType.value.type_code,
    level: (selectedType.value.level ?? 0) + 1,
    type_description: '',
    sort_order: 0,
  }
  formDialogVisible.value = true
}

/** 批量新增子分类 */
const handleBatchAddChildType = () => {
  if (!selectedType.value) return
  batchAddList.value = [{ type_code: '', type_name: '', type_description: '' }]
  batchAddVisible.value = true
}

/** 提交表单 */
const handleSubmitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      if (isEditMode.value) {
        await assetTypeAPI.updateAssetType({
          recordcode: editingRecordcode.value,
          ...formData.value,
        })
        ElMessage.success('修改成功')
      } else {
        await assetTypeAPI.createAssetType(formData.value)
        ElMessage.success('创建成功')
      }
      formDialogVisible.value = false
      await fetchAllData()
    } catch (error) {
      const msg = isAxiosError(error) ? error.response?.data?.message || error.message : '操作失败'
      ElMessage.error(`操作失败：${msg}`)
    } finally {
      submitting.value = false
    }
  })
}

/** 批量新增提交 */
const handleBatchAddSubmit = async () => {
  const validItems = batchAddList.value.filter((item) => item.type_code.trim() && item.type_name.trim())
  if (validItems.length === 0) {
    ElMessage.warning('请至少填写一条有效的子分类数据')
    return
  }

  submitting.value = true
  try {
    const items: AssetTypeCreateForm[] = validItems.map((item) => ({
      type_code: item.type_code.trim(),
      type_name: item.type_name.trim(),
      parent_type_code: selectedType.value?.type_code ?? null,
      level: (selectedType.value?.level ?? 0) + 1,
      type_description: item.type_description.trim() || null,
      sort_order: 0,
    }))
    const result = await assetTypeAPI.batchCreateAssetTypes(items)
    if (result.fail_count > 0) {
      ElMessage.warning(`批量新增完成：成功 ${result.success_count} 条，失败 ${result.fail_count} 条`)
    } else {
      ElMessage.success(`批量新增成功：共 ${result.success_count} 条`)
    }
    batchAddVisible.value = false
    await fetchAllData()
  } catch (error) {
    const msg = isAxiosError(error) ? error.response?.data?.message || error.message : '批量新增失败'
    ElMessage.error(`批量新增失败：${msg}`)
  } finally {
    submitting.value = false
  }
}

/** 删除选中分类 */
const handleDeleteType = async () => {
  if (!selectedType.value) return
  try {
    await ElMessageBox.confirm('确定要删除该资产分类吗？删除后数据不可恢复！', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await assetTypeAPI.deleteAssetType(selectedType.value.recordcode)
    ElMessage.success('删除成功')
    selectedType.value = null
    await fetchAllData()
  } catch (err) {
    if (err === 'cancel') return
    if (isAxiosError(err) && err.response?.status === 400) {
      ElMessage.error('无法删除：该资产分类已被使用，不能删除')
    } else {
      ElMessage.error('删除失败，请重试')
    }
  }
}

/** 编辑子分类 */
const handleEditChild = (row: AssetType) => {
  isEditMode.value = true
  editingRecordcode.value = row.recordcode
  formData.value = {
    type_code: row.type_code,
    type_name: row.type_name,
    parent_type_code: row.parent_type_code ?? null,
    level: row.level ?? 0,
    type_description: row.type_description ?? '',
    sort_order: row.sort_order ?? 0,
  }
  formDialogVisible.value = true
}

/** 删除子分类 */
const handleDeleteChild = async (row: AssetType) => {
  try {
    await ElMessageBox.confirm(`确定要删除「${row.type_name}」吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await assetTypeAPI.deleteAssetType(row.recordcode)
    ElMessage.success('删除成功')
    await fetchAllData()
  } catch (err) {
    if (err === 'cancel') return
    if (isAxiosError(err) && err.response?.status === 400) {
      ElMessage.error('无法删除：该资产分类已被使用，不能删除')
    } else {
      ElMessage.error('删除失败，请重试')
    }
  }
}

/** 批量删除子分类 */
const handleBatchDelete = async (rows: AssetType[]) => {
  if (rows.length === 0) return
  const typeCodes = rows.map((r) => r.type_code).filter(Boolean)
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${typeCodes.length} 条资产分类吗？`, '批量删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await assetTypeAPI.batchDeleteAssetTypes(typeCodes)
    ElMessage.success('批量删除成功')
    await fetchAllData()
  } catch (err) {
    if (err === 'cancel') return
    ElMessage.error('批量删除失败，请重试')
  }
}

/** 批量导入 */
const handleBatchImport = () => {
  router.push({ name: 'AssetTypeBatchImport' }).catch((err) => {
    console.error('跳转批量导入页面失败:', err)
  })
}

// ==================== 路由监听 ====================
watch(
  () => isChildRouteActive.value,
  (wasActive, isActive) => {
    if (wasActive && !isActive) fetchAllData()
  },
)

onMounted(() => {
  fetchAllData()
})
</script>

<style lang="scss" scoped>
.asset-type-management {
  display: flex;
  height: 100%;
  overflow: hidden;

  .tree-panel {
    width: 280px;
    min-width: 280px;
    border-right: 1px solid var(--border-color-light);
    display: flex;
    flex-direction: column;
    background: var(--background-color);

    .tree-actions {
      padding: 8px 12px;
      border-top: 1px solid var(--border-color-light);
      display: flex;
      gap: 8px;
    }
  }

  .content-panel {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: var(--background-color);
  }
}

.batch-add-list {
  width: 100%;

  .batch-add-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
}
</style>
