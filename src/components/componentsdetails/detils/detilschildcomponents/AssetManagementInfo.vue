<template>
  <!-- eslint-disable vue/no-mutating-props -- form 是父组件 reactive 对象的引用，修改属性是预期行为 -->
  <el-col :span="24"><h3 class="section-title">管理信息</h3></el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="申请人" prop="asset_applicant_name">
      <el-input
        v-model="form.asset_applicant_name"
        placeholder="姓名"
        @change="applicantLinkage.handleNameChange"
        clearable
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="申请人工号" prop="asset_applicant">
      <el-input
        v-model="form.asset_applicant"
        placeholder="工号"
        @change="applicantLinkage.handleCodeChange"
        clearable
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="管理员" prop="asset_manager_name">
      <el-input
        v-model="form.asset_manager_name"
        placeholder="姓名"
        @change="managerLinkage.handleNameChange"
        clearable
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="管理员工号" prop="asset_manager">
      <el-input
        v-model="form.asset_manager"
        placeholder="工号"
        @change="managerLinkage.handleCodeChange"
        clearable
      />
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="使用地点" prop="asset_using_location">
      <el-input
        v-model="form.asset_using_location"
        placeholder="请输入使用地点，如：数据中心A"
        clearable
      />
    </el-form-item>
  </el-col>
</template>

<script lang="ts" setup>
import type { AssetCreateFormExtended } from '@/types/asset'

defineProps<{
  form: AssetCreateFormExtended
  applicantLinkage: {
    handleNameChange: (name: string) => void
    handleCodeChange: (code: string) => void
  }
  managerLinkage: {
    handleNameChange: (name: string) => void
    handleCodeChange: (code: string) => void
  }
}>()
</script>
