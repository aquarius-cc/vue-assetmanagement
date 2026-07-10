<template>
  <!-- eslint-disable vue/no-mutating-props -- form 是父组件 reactive 对象的引用，修改属性是预期行为 -->
  <el-col :span="24"><h3 class="section-title">基本信息</h3></el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="编码" prop="asset_code">
      <el-input
        v-model="form.asset_code"
        :placeholder="isEditMode ? '资产编码' : '系统自动生成，无需填写'"
        disabled
        clearable
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="名称" prop="asset_name">
      <el-input v-model="form.asset_name" placeholder="请输入资产名称，如：戴尔服务�? clearable />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="型号规格" prop="asset_specification">
      <el-input v-model="form.asset_specification" placeholder="请输入型号规�? clearable />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="品牌" prop="asset_brand">
      <el-input v-model="form.asset_brand" placeholder="请输入品�? clearable />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="单位" prop="asset_unit">
      <el-select v-model="form.asset_unit" placeholder="请输入单位，如：�? style="width: 100%">
        <el-option label="�? value="�? />
        <el-option label="�? value="�? />
        <el-option label="�? value="�? />
        <el-option label="�? value="�? />
        <el-option label="�? value="�? />
      </el-select>
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="单价" prop="asset_purchase_price">
      <el-input-number
        v-model="form.asset_purchase_price"
        :min="0"
        :precision="2"
        placeholder="请输入采购价�?
        style="width: 100%"
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="采购数量" prop="asset_purchase_number">
      <el-input-number
        v-model="form.asset_purchase_number"
        :min="1"
        placeholder="请输入采购数�?
        style="width: 100%"
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="采购日期" prop="asset_purchase_date">
      <el-date-picker
        v-model="form.asset_purchase_date"
        type="date"
        placeholder="选择日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width: 100%"
        :disabled="isEditMode"
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="质保�?�?" prop="asset_warranty_period">
      <el-input-number
        v-model="form.asset_warranty_period"
        :min="0"
        placeholder="请输入质保年限，如：3"
        style="width: 100%"
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="录入日期" prop="asset_entry_date">
      <el-date-picker
        v-model="form.asset_entry_date"
        type="date"
        placeholder="选择日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width: 100%"
        :disabled="isEditMode"
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="资产分类" prop="asset_type">
      <el-select
        v-model="form.asset_type"
        style="width: 100%"
        @change="$emit('typeChange', $event)"
      >
        <el-option
          v-for="item in assetTypes"
          :key="item.asset_type_code"
          :label="`${item.asset_type_code} / ${item.asset_type_category ?? ''} / ${item.asset_type_primary} / ${item.asset_type_secondary}`"
          :value="item.asset_type_primary"
        >
          <span>{{ item.asset_type_code }}</span>
          <span style="color: var(--text-muted); font-size: 12px"> / {{ item.asset_type_category ?? '�? }} / {{ item.asset_type_primary }} / {{ item.asset_type_secondary }}</span>
        </el-option>
      </el-select>
    </el-form-item>
    <el-form-item prop="asset_type" class="hidden-field">
      <el-input v-model="form.asset_type" type="hidden" />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item v-if="isEditMode" label="当前状�? prop="asset_current_status">
      <el-input :model-value="displayStatus" placeholder="当前状�? style="width: 100%" disabled />
    </el-form-item>
  </el-col>
  <el-col :span="24">
    <el-form-item label="分类类型" prop="asset_type_category">
      <span>
        {{ assetTypeMapping[form.asset_type_category ?? ''] || form.asset_type_category || '�? }}
      </span>
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="录入�? prop="asset_entry_person_name">
      <el-autocomplete
        v-model="form.asset_entry_person_name"
        :fetch-suggestions="entryLinkage.fetchSuggestions"
        placeholder="请输入录入人姓名"
        clearable
        @select="entryLinkage.handleSelect"
        @change="entryLinkage.handleNameChange"
        @blur="() => entryLinkage.handleNameChange(form.asset_entry_person_name ?? '')"
      >
        <template #default="{ item }">
          <div>{{ item.department_name }}/{{ item.user_name }}/{{ item.user_jobcode }}</div>
        </template>
      </el-autocomplete>
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="录入人工�? prop="asset_entry_person">
      <el-input
        v-model="form.asset_entry_person"
        placeholder="工号"
        @change="entryLinkage.handleCodeChange"
        clearable
      />
    </el-form-item>
  </el-col>
</template>

<script lang="ts" setup>
import type { AssetCreateFormExtended } from '@/types/asset'
import type { AssetType } from '@/utils/AssetType'
import type { UserSuggestion } from '@/composables/useAssetFormHelpers'
import { assetTypeMapping } from '@/utils/Format'

defineProps<{
  form: AssetCreateFormExtended
  isEditMode: boolean
  displayStatus: string
  assetTypes: AssetType[]
  entryLinkage: {
    fetchSuggestions: (q: string, cb: (r: UserSuggestion[]) => void) => void
    handleSelect: (item: UserSuggestion) => void
    handleNameChange: (name: string) => void
    handleCodeChange: (code: string) => void
  }
}>()

defineEmits<{
  typeChange: [primaryName: string]
}>()
</script>

<style scoped>
.hidden-field {
  position: absolute;
  visibility: hidden;
  height: 0;
  overflow: hidden;
  margin: 0;
  padding: 0;
}
</style>
