<!--
  RecyclableOutAssetsSearch.vue
  可回收出库资产搜索组件

  功能：
  - 根据资产编码、名称、型号、品牌、申请人、保管人、部门搜索出库状态为 "in_use" 的出库记录
  - 结果分页展示，每行带“选择”按钮
  - 选中后通过 emit 将完整的出库资产对象传递给父组件

  遵守 AGENTS 规范：
  - 使用组合式 API + TypeScript 严格模式
  - 样式隔离 scoped
  - 禁止 any 类型
  - 单向数据流：通过 emit 向上传递数据
  - 复杂逻辑抽离到 useRecyclableOutAssets composable
  - 全量使用 @/ 别名导入
-->

<template>
  <div class="recyclable-out-assets-search">
    <!-- 搜索表单区域 -->
    <div class="search-section">
      <el-row :gutter="12">
        <el-col :span="6">
          <el-input
            v-model="searchForm.asset_code"
            placeholder="资产编码"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="searchForm.asset_name"
            placeholder="资产名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="searchForm.asset_specification"
            placeholder="型号规格"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="searchForm.asset_brand"
            placeholder="品牌"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="searchForm.outasset_applicant_name"
            placeholder="申请人"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="searchForm.outasset_manager_name"
            placeholder="保管人"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="searchForm.department"
            placeholder="部门"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-button
            type="primary"
            :loading="loading"
            :icon="Search"
            style="width: 100%"
            @click="handleSearch"
          >
            搜索
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索结果列表 -->
    <div v-if="list.length > 0" class="search-results">
      <p class="result-title">可回收出库记录（共 {{ total }} 条，最多显示 {{ pageSize }} 条/页）</p>
      <el-table :data="list" size="small" style="width: 100%">
        <el-table-column prop="asset_recordcode" label="出库记录编码" width="140" />
        <el-table-column prop="asset_code" label="资产编码" width="140" />
        <el-table-column prop="asset_name" label="资产名称" />
        <el-table-column prop="asset_specification" label="规格型号" />
        <el-table-column prop="asset_brand" label="品牌" />
        <el-table-column label="申请人">
          <template #default="{ row }">
            {{ row.outasset_applicant?.employee_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="保管人">
          <template #default="{ row }">
            {{ row.outasset_manager?.employee_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="保管人工号">
          <template #default="{ row }">
            {{ row.outasset_manager?.employee_jobcode || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="保管人部门">
          <template #default="{ row }">
            {{ row.outasset_manager?.employee_department_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleSelect(row)">
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
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

    <!-- 无数据提示（已搜索但无结果） -->
    <div v-else-if="searched && list.length === 0" class="no-data">
      暂无可回收的出库记录，请调整搜索条件
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'RecyclableOutAssetsSearch' }
</script>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { OutAssetDetail } from '@/utils/OutAsset'
import { useRecyclableOutAssets } from '@/composables/useRecyclableOutAssets'

// ---------- Emits 定义 ----------
const emit = defineEmits<{
  (e: 'select', outAsset: OutAssetDetail, departmentName: string): void
}>()

// ---------- Composable 状态与方法 ----------
const {
  list,
  loading,
  total,
  currentPage,
  pageSize,
  search: searchAssets,
  changePage,
} = useRecyclableOutAssets()

// ---------- 本地搜索表单数据 ----------
interface SearchForm {
  asset_code: string
  asset_name: string
  asset_specification: string
  asset_brand: string
  outasset_applicant_name: string
  outasset_manager_name: string
  department: string
}

const searchForm = reactive<SearchForm>({
  asset_code: '',
  asset_name: '',
  asset_specification: '',
  asset_brand: '',
  outasset_applicant_name: '',
  outasset_manager_name: '',
  department: '',
})

// 标记是否已执行过搜索（用于显示无数据提示）
const searched = ref(false)

/**
 * 构建传给 Composable 的额外查询参数
 * 过滤掉空字符串字段，避免后端收到无意义的参数
 */
const buildExtraParams = (): Record<string, string> => {
  const params: Record<string, string> = {}
  Object.entries(searchForm).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      params[key] = value.trim()
    }
  })
  return params
}

/**
 * 搜索处理
 * 重置到第一页，并根据表单条件请求数据
 */
const handleSearch = async () => {
  currentPage.value = 1 // 重置页码
  searched.value = true
  const extraParams = buildExtraParams()
  await searchAssets(extraParams)
}

/**
 * 分页页码变更
 * @param page - 新页码
 */
const handlePageChange = (page: number) => {
  changePage(page)
}

/**
 * 选择出库记录
 * @param row - 选中的出库资产详情
 */
const handleSelect = (row: OutAssetDetail) => {
  emit('select', row, row.outasset_manager?.employee_department_name ?? '')
}
</script>

<style scoped lang="scss">
.recyclable-out-assets-search {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--background-color);
  border-radius: 8px;
  border: 1px solid var(--border-color-light);

  .search-section {
    margin-bottom: 16px;
  }

  .search-results {
    padding: 12px;
    background-color: var(--card-background);
    border-radius: 4px;
    margin-top: 12px;

    .result-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: var(--text-regular);
    }

    .pagination {
      margin-top: 12px;
      text-align: right;
    }
  }

  .no-data {
    text-align: center;
    color: var(--text-secondary);
    padding: 20px;
    font-style: italic;
  }
}
</style>
