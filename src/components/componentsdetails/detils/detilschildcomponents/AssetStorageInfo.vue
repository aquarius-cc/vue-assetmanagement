<template>
  <!-- eslint-disable vue/no-mutating-props -- form 是父组件 reactive 对象的引用，修改属性是预期行为 -->
  <el-col :span="24"><h3 class="section-title">存储位置</h3></el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="仓库名称" prop="asset_storage_name">
      <el-select
        v-model="form.asset_storage_name"
        style="width: 100%"
        @change="associationMethods.handleStorageNameChange"
      >
        <el-option
          v-for="item in storages"
          :key="item.storage_code"
          :label="item.storage_name"
          :value="item.storage_name"
        />
      </el-select>
    </el-form-item>
  </el-col>
  <el-col :xs="24" :sm="24" :md="12">
    <el-form-item label="仓库编码">
      <span>{{ form.asset_storage || '�? }}</span>
    </el-form-item>
  </el-col>
  <el-col :span="24">
    <el-form-item label="资产描述" prop="asset_description">
      <el-input
        v-model="form.asset_description"
        type="textarea"
        :rows="3"
        placeholder="请输入描�?
      />
    </el-form-item>
  </el-col>
</template>

<script lang="ts" setup>
import type { AssetCreateFormExtended } from '@/types/asset'
import type { Storage } from '@/utils/Storage'

defineProps<{
  form: AssetCreateFormExtended
  storages: Storage[]
  associationMethods: {
    handleStorageNameChange: (name: string) => void
  }
}>()
</script>
