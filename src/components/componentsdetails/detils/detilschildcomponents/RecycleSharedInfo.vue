<!--
  RecycleSharedInfo.vue
  回收共享信息（仓库、回收人、日期、回收原因、描述）
  新增/编辑模式共用
-->
<template>
  <el-row :gutter="20">
    <el-col :span="24"><h3 class="section-title">仓库与人员</h3></el-col>
    <el-col :xs="24" :sm="24" :md="12">
      <el-form-item label="回收仓库" prop="recycle_asset_storage_code" required>
        <el-select
          :model-value="formData.recycle_asset_storage_code"
          placeholder="请选择仓库"
          style="width: 100%"
          @update:model-value="$emit('update:recycle_asset_storage_code', $event)"
        >
          <el-option
            v-for="item in storages"
            :key="item.storage_code"
            :label="`${item.storage_name} / ${item.storage_code}`"
            :value="item.storage_code"
          />
        </el-select>
      </el-form-item>
    </el-col>
    <el-col :xs="24" :sm="24" :md="12">
      <el-form-item label="回收人" required>
        <el-autocomplete
          :model-value="recyclePersonName"
          :fetch-suggestions="userSuggestions"
          placeholder="姓名"
          clearable
          :disabled="disabled"
          @update:model-value="$emit('update:recyclePersonName', $event)"
          @select="$emit('personSelect', $event)"
        >
          <template #default="{ item }">
            <div>
              {{ item.employee_name || '无姓名' }} - {{ item.employee_jobcode }} -
              {{ item.employee_department?.department_name || '无部门' }}
            </div>
          </template>
        </el-autocomplete>
      </el-form-item>
    </el-col>
    <el-col :xs="24" :sm="24" :md="12">
      <el-form-item label="回收人工号">
        <el-input
          :model-value="formData.recycle_asset_recycle_person_jobcode"
          placeholder="输入姓名后自动填充"
          clearable
          @update:model-value="$emit('update:recycle_asset_recycle_person_jobcode', $event)"
        />
      </el-form-item>
    </el-col>
    <el-col :xs="24" :sm="24" :md="12">
      <el-form-item label="回收日期" prop="recycle_asset_date" required>
        <el-date-picker
          :model-value="formData.recycle_asset_date"
          type="date"
          placeholder="请选择回收日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
          @update:model-value="$emit('update:recycle_asset_date', $event)"
        />
      </el-form-item>
    </el-col>
    <el-col :xs="24" :sm="24" :md="12">
      <el-form-item label="回收原因" prop="recycle_type" required>
        <el-input
          :model-value="formData.recycle_type"
          placeholder="请输入回收原因，如：正常回收、损坏回收"
          clearable
          @update:model-value="$emit('update:recycle_type', $event)"
        />
      </el-form-item>
    </el-col>
    <el-col :span="24">
      <el-form-item label="回收描述" prop="recycle_asset_description">
        <el-input
          :model-value="formData.recycle_asset_description"
          type="textarea"
          :rows="3"
          placeholder="请输入回收备注（可选）"
          @update:model-value="$emit('update:recycle_asset_description', $event)"
        />
      </el-form-item>
    </el-col>
  </el-row>
</template>

<script lang="ts" setup>
import type { Storage } from '@/utils/Storage'
import type { EmployeeExtended } from '@/utils/User'

defineProps<{
  formData: {
    recycle_asset_storage_code: string
    recycle_asset_recycle_person_jobcode: string
    recycle_asset_date: string
    recycle_type: string
    recycle_asset_description: string
  }
  storages: Storage[]
  recyclePersonName: string
  userSuggestions: (queryString: string, cb: (results: (EmployeeExtended & { value: string })[]) => void) => void
  disabled?: boolean
}>()

defineEmits<{
  'update:recycle_asset_storage_code': [value: string]
  'update:recycle_asset_recycle_person_jobcode': [value: string]
  'update:recycle_asset_date': [value: string]
  'update:recycle_type': [value: string]
  'update:recycle_asset_description': [value: string]
  'update:recyclePersonName': [value: string]
  personSelect: [item: EmployeeExtended & { value: string }]
}>()
</script>

<style scoped>
.section-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  margin: 28px 0 20px;
  padding: 12px 16px;
  background: var(--gradient-card-highlight);
  border-left: 4px solid var(--color-primary-light);
  border-radius: 4px;
}
</style>
