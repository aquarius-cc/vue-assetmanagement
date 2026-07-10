<!--
  RecycleAssetForm.vue
  回收资产表单（新增 / 编辑）
  新增模式：多条回收（selectedRecords + batch_create）
  编辑模式：单条逻辑
-->
<template>
  <div class="recycle-asset-form">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Edit v-if="isEditMode" /><Plus v-else /></el-icon>
          <span>{{ isEditMode ? '回收记录编辑' : '资产回收登记' }}</span>
        </div>
      </template>

      <RecyclableOutAssetsSearch v-if="!isEditMode" @select="addRecord" />

      <SelectedRecordsTable
        v-if="!isEditMode"
        :records="selectedRecords"
        @remove="removeRecord"
        @clear="selectedRecords = []"
      />

      <el-form ref="formRef" :model="formData" :rules="currentRules" label-width="140px" size="default">
        <template v-if="isEditMode">
          <el-row :gutter="20">
            <el-col :span="24"><h3 class="section-title">关联出库记录</h3></el-col>
            <el-col :xs="24" :sm="24" :md="12">
              <el-form-item label="出库记录编码" prop="outasset_recordcode" required>
                <el-input v-model="formData.outasset_recordcode" disabled />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="12">
              <el-form-item label="使用人姓名">
                <el-input :model-value="selectedOutAsset?.outasset_manager_name || ''" disabled />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="12">
              <el-form-item label="使用人工号">
                <el-input :model-value="selectedOutAsset?.outasset_manager_jobcode || ''" disabled />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="12">
              <el-form-item label="使用人部门">
                <el-input :model-value="departmentName" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="24"><h3 class="section-title">回收资产信息</h3></el-col>
            <el-col :xs="24" :sm="24" :md="12">
              <el-form-item label="资产编码" prop="recycle_asset" required>
                <el-input v-model="formData.recycle_asset" :disabled="!!selectedOutAsset" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="12">
              <el-form-item label="资产名称">
                <el-input :model-value="assetName" disabled />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="12">
              <el-form-item label="回收数量" prop="recycle_asset_number" required>
                <el-input-number v-model="formData.recycle_asset_number" :min="1" :max="maxRecycleNumber" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <RecycleSharedInfo
          :form-data="formData"
          :storages="associations.storages.value"
          :recycle-person-name="personLinkage.name.value"
          :user-suggestions="personLinkage.userSuggestions"
          :disabled="isEditMode"
          @update:recycle_asset_storage_code="formData.recycle_asset_storage_code = $event"
          @update:recycle_asset_recycle_person_jobcode="formData.recycle_asset_recycle_person_jobcode = $event"
          @update:recycle_asset_date="formData.recycle_asset_date = $event"
          @update:recycle_type="formData.recycle_type = $event"
          @update:recycle_asset_description="formData.recycle_asset_description = $event"
          @update:recyclePersonName="personLinkage.setName($event)"
          @personSelect="personLinkage.handleSelect"
        />

        <div class="form-actions">
          <el-button @click="resetForm">重置</el-button>
          <el-button type="primary" :loading="submitState.submitting.value" @click="submitForm">
            {{ submitButtonText }}
          </el-button>
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>

    <el-dialog v-model="submitState.confirmVisible.value" title="确认提交" width="600px">
      <div v-if="submitState.confirmData.value">
        <p><strong>操作类型：</strong>{{ submitState.confirmData.value.actionType }}</p>
        <p v-if="submitState.confirmData.value.recordCount > 1">
          <strong>记录数量：</strong>{{ submitState.confirmData.value.recordCount }} 条
        </p>
        <el-table v-if="submitState.confirmData.value.records.length > 0"
          :data="submitState.confirmData.value.records" size="small" style="width: 100%">
          <el-table-column prop="recycle_asset" label="资产编码" width="160" />
          <el-table-column prop="outasset_name" label="资产名称" />
          <el-table-column prop="outasset_manager_name" label="使用人" width="100" />
        </el-table>
        <el-descriptions :column="2" border size="small" style="margin-top: 12px">
          <el-descriptions-item label="回收仓库">{{ submitState.confirmData.value.storageName }}</el-descriptions-item>
          <el-descriptions-item label="回收人">{{ submitState.confirmData.value.personName }}</el-descriptions-item>
          <el-descriptions-item label="回收日期">{{ submitState.confirmData.value.recycleDate }}</el-descriptions-item>
          <el-descriptions-item label="回收原因">{{ submitState.confirmData.value.recycleType }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="submitState.confirmVisible.value = false">取消</el-button>
        <el-button type="primary" :loading="submitState.submitting.value" @click="submitState.doSubmit">确认提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
export default { name: 'RecycleAssetForm' }
</script>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

import { useRecycleAssetStore, useOutAssetStore, useUserStore } from '@/stores'
import type { RecycleAssetExtended } from '@/utils/RecycleAsset'
import type { RecyclableOutAsset } from '@/utils/OutAsset'
import type { OutAssetDetail } from '@/utils/OutAsset'

import { useRecycleFormAssociations } from '@/composables/useRecycleFormAssociations'
import { useRecyclePersonLinkage } from '@/composables/useRecyclePersonLinkage'
import { useDepartmentCache } from '@/composables/useDepartmentCache'
import { useRecycleFormSubmit } from '@/composables/useRecycleFormSubmit'

import RecyclableOutAssetsSearch from './detilschildcomponents/RecyclableOutAssetsSearch.vue'
import SelectedRecordsTable, { type SelectedRecord } from './detilschildcomponents/SelectedRecordsTable.vue'
import RecycleSharedInfo from './detilschildcomponents/RecycleSharedInfo.vue'

const router = useRouter()
const route = useRoute()
const recycleStore = useRecycleAssetStore()
const outAssetStore = useOutAssetStore()
const userStore = useUserStore()
const formRef = ref<FormInstance>()

const isEditMode = computed(() => !!route.query.recordcode)
const currentRecordcode = computed(() => route.query.recordcode as string | undefined)

// ==================== 已选记录 ====================
const selectedRecords = ref<SelectedRecord[]>([])
const selectedOutAsset = ref<RecyclableOutAsset | null>(null)
const departmentName = ref('')

// ==================== 共享表单 ====================
const formData = reactive({
  outasset_recordcode: '', recycle_asset: '', recycle_asset_number: 1,
  recycle_asset_storage_code: '', recycle_asset_recycle_person_jobcode: '',
  recycle_asset_date: '', recycle_type: '', recycle_asset_description: '',
  id: undefined as number | undefined,
})

const assetName = computed(() => selectedOutAsset.value?.outasset_name || '')
const maxRecycleNumber = computed(() => selectedOutAsset.value?.outasset_number || 1)

// ==================== Composables ====================
const associations = useRecycleFormAssociations()

const personLinkage = useRecyclePersonLinkage(
  (name) => userStore.getByName(name),
  (code) => userStore.getById(code),
  (code) => { formData.recycle_asset_recycle_person_jobcode = code },
)

const deptCache = useDepartmentCache()

const submitState = useRecycleFormSubmit({
  isEditMode: () => isEditMode.value,
  currentRecordcode: () => currentRecordcode.value,
  selectedRecords: () => selectedRecords.value,
  formData: () => formData,
  recycleStore,
  setSubmitting: () => {},
})

// ==================== 记录操作 ====================
const addRecord = (row: OutAssetDetail, deptName: string) => {
  const recordcode = row.asset_recordcode ?? row.recordcode ?? ''
  if (selectedRecords.value.some((r) => r.recordcode === recordcode)) {
    ElMessage.warning('该记录已在列表中')
    return
  }
  selectedRecords.value.push({
    recordcode, recycle_asset: row.asset_code ?? '',
    outasset_name: row.asset_name ?? '', outasset_manager_name: row.outasset_manager?.employee_name ?? '',
    manager_jobcode: row.outasset_manager?.employee_jobcode ?? '', department_name: deptName,
    outasset_number: row.outasset_number ?? 1,
  })
  deptCache.prefetch(selectedRecords.value.map((r) => r.manager_jobcode))
  ElMessage.success('已添加')
}

const removeRecord = (index: number) => { selectedRecords.value.splice(index, 1) }

// ==================== 校验规则 ====================
const sharedRules: FormRules = {
  recycle_asset_storage_code: [{ required: true, message: '请选择回收仓库', trigger: 'change' }],
  recycle_asset_recycle_person_jobcode: [{ required: true, message: '请选择回收人', trigger: 'change' }],
  recycle_asset_date: [{ required: true, message: '请选择回收日期', trigger: 'change' }],
  recycle_type: [{ required: true, message: '请输入回收原因', trigger: 'blur' }],
}
const editRules: FormRules = {
  outasset_recordcode: [{ required: true, message: '请选择出库记录', trigger: 'blur' }],
  recycle_asset: [{ required: true, message: '请输入资产编码', trigger: 'blur' }],
  recycle_asset_number: [{ required: true, type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' }],
}
const currentRules = computed(() => isEditMode.value ? { ...sharedRules, ...editRules } : sharedRules)

// ==================== 按钮文本 ====================
const submitButtonText = computed(() => {
  if (isEditMode.value) return '更新'
  const count = selectedRecords.value.length
  return count > 1 ? `提交（${count}条批量）` : '提交'
})

// ==================== 编辑加载 ====================
const loadEditData = async (recordcode: string) => {
  try {
    const detail = (await recycleStore.getById(recordcode)) as RecycleAssetExtended
    if (!detail) { ElMessage.error('回收记录不存在'); return }
    Object.assign(formData, {
      outasset_recordcode: detail.outasset_recordcode, recycle_asset: detail.asset_code ?? detail.asset?.asset_code ?? '',
      recycle_asset_number: detail.recycle_asset_number, recycle_asset_storage_code: detail.recycle_asset_storage_code,
      recycle_asset_recycle_person_jobcode: detail.recycle_asset_recycle_person_jobcode,
      recycle_asset_date: detail.recycle_asset_date, recycle_type: detail.recycle_type ?? '',
      recycle_asset_description: detail.recycle_asset_description ?? '', id: detail.id,
    })
    if (detail.recycle_asset_recycle_person_jobcode) {
      const name = await personLinkage.getNameByCode(detail.recycle_asset_recycle_person_jobcode)
      personLinkage.setName(name ?? '')
    }
    if (detail.outasset_recordcode) {
      try {
        const outDetail = await outAssetStore.getById(detail.outasset_recordcode)
        if (outDetail) {
          selectedOutAsset.value = outDetail as RecyclableOutAsset
        }
      } catch (e) { console.warn('加载关联出库记录失败', e) }
    }
  } catch (error) {
    console.error('加载回收记录失败:', error)
    ElMessage.error('加载回收记录失败，请刷新页面重试')
  }
}

// ==================== 提交入口 ====================
const submitForm = () => {
  formRef.value?.validate((valid) => {
    if (!valid) { ElMessage.error('请填写所有必填项'); return }
    if (!isEditMode.value && selectedRecords.value.length === 0) {
      ElMessage.warning('请至少选择一条回收记录'); return
    }
    const storageName = associations.storages.value.find(
      (s) => s.storage_code === formData.recycle_asset_storage_code,
    )?.storage_name ?? formData.recycle_asset_storage_code

    submitState.showConfirm({
      actionType: isEditMode.value ? '更新回收记录'
        : selectedRecords.value.length === 1 ? '新增回收记录' : '批量新增回收记录',
      recordCount: isEditMode.value ? 1 : selectedRecords.value.length,
      records: selectedRecords.value,
      storageName, personName: personLinkage.name.value,
      recycleDate: formData.recycle_asset_date, recycleType: formData.recycle_type,
    })
  })
}

const resetForm = () => {
  if (isEditMode.value && currentRecordcode.value) {
    loadEditData(currentRecordcode.value)
  } else {
    formRef.value?.resetFields()
    Object.assign(formData, {
      recycle_asset_number: 1, recycle_asset_description: '', recycle_type: '',
      recycle_asset_storage_code: '', recycle_asset_recycle_person_jobcode: '', recycle_asset_date: '',
    })
    selectedRecords.value = []
    selectedOutAsset.value = null
    personLinkage.setName('')
    ElMessage.info('表单已重置')
  }
}

const goBack = () => router.go(-1)

onMounted(async () => {
  await associations.loadStorages()
  if (isEditMode.value && currentRecordcode.value) await loadEditData(currentRecordcode.value)
})
</script>

<style scoped lang="scss">
.recycle-asset-form {
  padding: 24px;
  .box-card { height: 100%; }
  .card-header { display: flex; align-items: center; gap: 8px; font-weight: bold; color: var(--color-primary-light); }
  .section-title {
    color: var(--text-primary); font-size: 16px; font-weight: 600;
    margin: 28px 0 20px; padding: 12px 16px;
    background: var(--gradient-card-highlight);
    border-left: 4px solid var(--color-primary-light); border-radius: 4px;
  }
  .form-actions {
    display: flex; gap: 12px; justify-content: center;
    margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border-color-light);
  }
}
</style>
