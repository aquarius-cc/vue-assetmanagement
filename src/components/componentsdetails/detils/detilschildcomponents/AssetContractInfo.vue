<template>
  <!-- eslint-disable vue/no-mutating-props -- form 是父组件 reactive 对象的引用，修改属性是预期行为 -->
  <el-col :span="24"><h3 class="section-title">合同信息</h3></el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="合同名称" prop="asset_contract_name">
      <el-autocomplete
        v-model="form.asset_contract_name"
        :fetch-suggestions="associationMethods.fetchContractSuggestions"
        placeholder="请输入合同名称"
        clearable
        @select="associationMethods.handleContractSelect"
        @change="associationMethods.handleContractNameChange"
        @blur="
          () => associationMethods.handleContractNameChange(form.asset_contract_name ?? '')
        "
      >
        <template #default="{ item }">
          <div>{{ item.contract_name }}/{{ item.contract_code }}</div>
        </template>
      </el-autocomplete>
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="合同编码" prop="asset_contract">
      <el-select
        v-model="form.asset_contract"
        placeholder="请输入合同编码，如：CT-2025-001"
        style="width: 100%"
        @change="associationMethods.handleContractCodeChange"
      >
        <el-option
          v-for="item in contracts"
          :key="item.contract_code"
          :label="item.contract_code"
          :value="item.contract_code"
        />
      </el-select>
    </el-form-item>
  </el-col>
</template>

<script lang="ts" setup>
import type { AssetCreateFormExtended } from '@/types/asset'
import type { Contract } from '@/types/contract'
import type { ContractSuggestion } from '@/composables/useAssetFormHelpers'

defineProps<{
  form: AssetCreateFormExtended
  contracts: Contract[]
  associationMethods: {
    fetchContractSuggestions: (q: string, cb: (r: ContractSuggestion[]) => void) => void
    handleContractSelect: (item: ContractSuggestion) => void
    handleContractNameChange: (name: string) => void
    handleContractCodeChange: (code: string) => void
  }
}>()
</script>
