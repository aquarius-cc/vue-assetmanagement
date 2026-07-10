<template>
  <div class="exportable-assets-search">
    <!-- 搜索表单（与原来基本相同�?-->
    <div class="search-section">
      <el-row :gutter="12">
        <el-col :span="6"
          ><el-input
            v-model="searchForm.asset_code"
            placeholder="资产编码"
            clearable
            @keyup.enter="handleSearch"
        /></el-col>
        <el-col :span="6"
          ><el-input
            v-model="searchForm.asset_name"
            placeholder="资产名称"
            clearable
            @keyup.enter="handleSearch"
        /></el-col>
        <el-col :span="6"
          ><el-input
            v-model="searchForm.asset_specification"
            placeholder="规格型号"
            clearable
            @keyup.enter="handleSearch"
        /></el-col>
        <el-col :span="6"
          ><el-input
            v-model="searchForm.asset_brand"
            placeholder="资产品牌"
            clearable
            @keyup.enter="handleSearch"
        /></el-col>
        <el-col :span="6"
          ><el-input
            v-model="searchForm.asset_contract_code"
            placeholder="合同编码"
            clearable
            @keyup.enter="handleSearch"
        /></el-col>
        <el-col :span="6"
          ><el-input
            v-model="searchForm.asset_contract_name"
            placeholder="合同名称"
            clearable
            @keyup.enter="handleSearch"
        /></el-col>
        <el-col :span="6">
          <el-button
            type="primary"
            :loading="loading"
            :icon="Search"
            style="width: 100%"
            @click="handleSearch"
            >搜索</el-button
          >
        </el-col>
      </el-row>
    </div>

    <!-- 搜索结果 -->
    <div v-if="list.length > 0" class="search-results">
      <p class="result-title">搜索结果（共 {{ total }} 条）</p>
      <el-table :data="list" size="small">
        <el-table-column prop="asset_name" label="资产名称" />
        <el-table-column prop="asset_code" label="资产编码" />
        <el-table-column prop="asset_specification" label="规格型号" />
        <el-table-column prop="asset_brand" label="品牌" />
        <el-table-column label="合同名称">
          <template #default="{ row }">{{
            row.asset_contract?.contract_name || row.contract_name || '-'
          }}</template>
        </el-table-column>
        <el-table-column label="合同编码">
          <template #default="{ row }">{{
            row.asset_contract?.contract_code || row.contract_code || '-'
          }}</template>
        </el-table-column>
        <el-table-column label="当前状�?>
          <template #default="{ row }">{{ getAssetStatusText(row.asset_current_status) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }"
            ><el-button link size="small" @click="handleSelect(row)">选择</el-button></template
          >
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="total > pageSize"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next, jumper"
        class="pagination"
        @current-change="handlePageChange"
      />
    </div>
    <div v-else-if="searched && list.length === 0" class="no-data">
      暂无符合条件的可出库资产，请调整搜索条件
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'ExportableAssetsSearch' }
</script>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { AssetDetail } from '@/types/asset'
import { useExportableAssets } from '@/composables/useExportableAssets'
import { getAssetStatusText } from '@/utils/Format'

const emit = defineEmits<{ (e: 'select', asset: AssetDetail): void }>()
const {
  list,
  loading,
  total,
  currentPage,
  pageSize,
  search: searchAssets,
  changePage,
} = useExportableAssets()

const searchForm = reactive({
  asset_code: '',
  asset_name: '',
  asset_specification: '',
  asset_brand: '',
  asset_contract_code: '',
  asset_contract_name: '',
})

const searched = ref(false)

const buildExtraParams = () => {
  const params: Record<string, string> = {}
  Object.entries(searchForm).forEach(([k, v]) => {
    if (v?.trim()) params[k] = v.trim()
  })
  return params
}

const handleSearch = async () => {
  searched.value = true
  await searchAssets(buildExtraParams())
}
const handlePageChange = async (page: number) => {
  await changePage(page)
}
const handleSelect = (row: AssetDetail) => {
  emit('select', row)
}
</script>

<style scoped lang="scss">
.exportable-assets-search {
  // 添加�?RecyclableOutAssetsSearch 一致的卡片样式
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;

  .search-section {
    margin-bottom: 20px;
  }

  .search-results {
    padding: 12px;
    background-color: #ffffff; // 内部结果区域可以保持白色背景
    border-radius: 4px;
    // 原有的其他样�?..
    .result-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #606266;
    }
    .pagination {
      margin-top: 12px;
      text-align: right;
    }
  }

  .no-data {
    text-align: center;
    color: #909399;
    padding: 20px;
    font-style: italic;
  }
}
</style>
