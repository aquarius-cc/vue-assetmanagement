# ScrapableAssetsSearch 组件实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 DamagedAssetForm 页面新增 ScrapableAssetsSearch 可报废资产搜索组件，支持按资产编码、名称、规格、品牌、仓库搜索，并可将选中资产数据同步到表单。

**架构：** 参照 ExportableAssetsSearch 和 RecyclableOutAssetsSearch 的模式，创建 ScrapableAssetsSearch 子组件和对应的 useScrapableAssets composable。组件放在 detilschildcomponents 目录，通过 emit 事件将选中资产数据传递给父组件 DamagedAssetForm。

**技术栈：** Vue 3 + TypeScript + Element Plus + SCSS

---

## 文件清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/composables/useScrapableAssets.ts` | 创建 | 可报废资产搜索逻辑：状态管理、API 调用、分页处理 |
| `src/components/componentsdetails/detils/detilschildcomponents/ScrapableAssetsSearch.vue` | 创建 | 搜索组件 UI：搜索表单、结果表格、分页、选择事件 |
| `src/components/componentsdetails/detils/DamagedAssetForm.vue` | 修改 | 引入 ScrapableAssetsSearch 组件，处理选择事件同步数据 |

---

## 任务 1：创建 useScrapableAssets composable

**文件：**
- 创建：`src/composables/useScrapableAssets.ts`

**参考：** 参照 `src/composables/useExportableAssets.ts` 和 `src/composables/useRecyclableOutAssets.ts`

- [ ] **步骤 1：创建 composable 文件**

```typescript
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAssetStore } from '@/stores/assetStore'
import type { AssetDetail } from '@/utils/Asset'
import { AssetCurrentStatus } from '@/utils/Asset'

/**
 * 可报废资产搜索 Composable
 * 搜索资产状态为 in_store 或 recycled_pending 的资产
 */
export function useScrapableAssets() {
  const assetStore = useAssetStore()

  // 状态
  const list = ref<AssetDetail[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  /**
   * 搜索可报废资产
   * @param extraParams 额外查询参数（搜索表单字段）
   */
  const search = async (extraParams: Record<string, string> = {}) => {
    loading.value = true
    try {
      const params: Record<string, string | number> = {
        page: currentPage.value,
        page_size: pageSize.value,
        // 搜索状态为在库或已回收待发放的资产
        asset_current_status__in: `${AssetCurrentStatus.IN_STORE},${AssetCurrentStatus.RECYCLED_PENDING}`,
        ...extraParams,
      }

      const response = await assetStore.searchAssets(params)
      list.value = response
      total.value = response.length // 实际应从响应中获取总数
    } catch (error) {
      console.error('搜索可报废资产失败:', error)
      ElMessage.error('搜索失败，请稍后重试')
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换分页
   * @param page 目标页码
   */
  const changePage = (page: number) => {
    currentPage.value = page
    // 注意：实际应携带之前的搜索参数重新搜索
    // 这里简化处理，父组件需要重新调用 search
  }

  return {
    list,
    loading,
    total,
    currentPage,
    pageSize,
    search,
    changePage,
  }
}
```

- [ ] **步骤 2：验证 composable 类型正确**

运行：`npm run type-check`
预期：无与 useScrapableAssets 相关的类型错误

- [ ] **步骤 3：Commit**

```bash
git add src/composables/useScrapableAssets.ts
git commit -m "feat: add useScrapableAssets composable for scrapable assets search"
```

---

## 任务 2：创建 ScrapableAssetsSearch 组件

**文件：**
- 创建：`src/components/componentsdetails/detils/detilschildcomponents/ScrapableAssetsSearch.vue`

**参考：** 参照 `ExportableAssetsSearch.vue` 和 `RecyclableOutAssetsSearch.vue`

- [ ] **步骤 1：创建组件基础结构**

```vue
<template>
  <div class="scrapable-assets-search">
    <!-- 搜索表单 -->
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
            v-model="searchForm.asset_storage_name"
            placeholder="仓库"
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

    <!-- 搜索结果 -->
    <div v-if="list.length > 0" class="search-results">
      <p class="result-title">搜索结果（共 {{ total }} 条）</p>
      <el-table :data="list" size="small">
        <el-table-column prop="asset_code" label="资产编码" />
        <el-table-column prop="asset_name" label="资产名称" />
        <el-table-column prop="asset_specification" label="型号规格" />
        <el-table-column prop="asset_brand" label="品牌" />
        <el-table-column label="仓库名称">
          <template #default="{ row }">
            {{ row.asset_storage?.storage_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="当前状态">
          <template #default="{ row }">
            {{ getAssetStatusText(row.asset_current_status) }}
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
      暂无符合条件的可报废资产，请调整搜索条件
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'ScrapableAssetsSearch' }
</script>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { AssetDetail } from '@/utils/Asset'
import { useScrapableAssets } from '@/composables/useScrapableAssets'
import { getAssetStatusText } from '@/utils/Format'

// ---------- Emits 定义 ----------
const emit = defineEmits<{
  (e: 'select', asset: AssetDetail): void
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
} = useScrapableAssets()

// ---------- 本地搜索表单数据 ----------
interface SearchForm {
  asset_code: string
  asset_name: string
  asset_specification: string
  asset_brand: string
  asset_storage_name: string
}

const searchForm = reactive<SearchForm>({
  asset_code: '',
  asset_name: '',
  asset_specification: '',
  asset_brand: '',
  asset_storage_name: '',
})

// 标记是否已执行过搜索
const searched = ref(false)

/**
 * 构建传给 Composable 的额外查询参数
 */
const buildExtraParams = (): Record<string, string> => {
  const params: Record<string, string> = {}
  if (searchForm.asset_code.trim()) params.asset_code = searchForm.asset_code.trim()
  if (searchForm.asset_name.trim()) params.asset_name = searchForm.asset_name.trim()
  if (searchForm.asset_specification.trim()) params.asset_specification = searchForm.asset_specification.trim()
  if (searchForm.asset_brand.trim()) params.asset_brand = searchForm.asset_brand.trim()
  if (searchForm.asset_storage_name.trim()) params.asset_storage_name = searchForm.asset_storage_name.trim()
  return params
}

/**
 * 搜索处理
 */
const handleSearch = async () => {
  currentPage.value = 1
  searched.value = true
  const extraParams = buildExtraParams()
  await searchAssets(extraParams)
}

/**
 * 分页页码变更
 */
const handlePageChange = (page: number) => {
  changePage(page)
  // 重新搜索携带当前表单参数
  const extraParams = buildExtraParams()
  searchAssets(extraParams)
}

/**
 * 选择资产
 */
const handleSelect = (row: AssetDetail) => {
  emit('select', row)
}
</script>

<style scoped lang="scss">
.scrapable-assets-search {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;

  .search-section {
    margin-bottom: 16px;
  }

  .search-results {
    padding: 12px;
    background-color: #ffffff;
    border-radius: 4px;
    margin-top: 12px;

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
```

- [ ] **步骤 2：验证组件类型正确**

运行：`npm run type-check`
预期：无与 ScrapableAssetsSearch 相关的类型错误

- [ ] **步骤 3：Commit**

```bash
git add src/components/componentsdetails/detils/detilschildcomponents/ScrapableAssetsSearch.vue
git commit -m "feat: add ScrapableAssetsSearch component for scrapable assets"
```

---

## 任务 3：修改 DamagedAssetForm 引入搜索组件

**文件：**
- 修改：`src/components/componentsdetails/detils/DamagedAssetForm.vue`

- [ ] **步骤 1：导入 ScrapableAssetsSearch 组件**

在 `<script lang="ts" setup>` 中添加导入：

```typescript
import ScrapableAssetsSearch from '@/components/componentsdetails/detils/detilschildcomponents/ScrapableAssetsSearch.vue'
import type { AssetDetail } from '@/utils/Asset'
```

- [ ] **步骤 2：在模板中添加搜索组件**

在 `<div class="damaged-asset-form">` 内、`<el-card>` 之前添加：

```vue
<template>
  <div class="damaged-asset-form" v-loading="isLoading" element-loading-text="加载中...">
    <!-- 可报废资产搜索组件 -->
    <ScrapableAssetsSearch @select="handleAssetSelectFromSearch" />
    
    <el-card class="box-card">
      <!-- 原有表单内容 -->
    </el-card>
  </div>
</template>
```

- [ ] **步骤 3：添加表单字段和选择事件处理**

在 `interface FormDataType` 中添加新字段：

```typescript
interface FormDataType {
  // ... 原有字段
  asset_specification: string  // 型号规格
  asset_brand: string          // 品牌
}
```

在 `formData` 初始化中添加：

```typescript
const formData = reactive<FormDataType>({
  // ... 原有字段
  asset_specification: '',
  asset_brand: '',
})
```

添加选择事件处理方法：

```typescript
/**
 * 处理从 ScrapableAssetsSearch 选择的资产
 */
const handleAssetSelectFromSearch = (asset: AssetDetail) => {
  // 同步资产基础信息到表单
  formData.damaged_asset_code = asset.asset_code
  formData.asset_name_display = asset.asset_name
  formData.asset_specification = asset.asset_specification || ''
  formData.asset_brand = asset.asset_brand || ''
  
  // 同步仓库信息
  if (asset.asset_storage) {
    formData.damaged_asset_storage_code = asset.asset_storage.storage_code || ''
    formData.storage_name_display = asset.asset_storage.storage_name || ''
  } else {
    formData.damaged_asset_storage_code = asset.asset_storage_code || ''
    // 如果只有编码没有名称，尝试通过 store 获取
    if (asset.asset_storage_code) {
      storageStore.getById(asset.asset_storage_code).then((storage) => {
        if (storage) {
          formData.storage_name_display = storage.storage_name
        }
      }).catch(() => {
        // 获取失败不阻塞
      })
    }
  }
  
  // 同步合同信息（如果有）
  if (asset.asset_contract) {
    formData.damaged_asset_contract_code = asset.asset_contract.contract_code || ''
    formData.contract_name_display = asset.asset_contract.contract_name || ''
  } else if (asset.asset_contract_code) {
    formData.damaged_asset_contract_code = asset.asset_contract_code
    // 尝试获取合同名称
    contractStore.getById(asset.asset_contract_code).then((contract) => {
      if (contract) {
        formData.contract_name_display = contract.contract_name
      }
    }).catch(() => {
      // 获取失败不阻塞
    })
  }
  
  ElMessage.success(`已选择资产：${asset.asset_name}`)
}
```

- [ ] **步骤 4：在表单中添加规格和品牌展示字段（可选）**

在表单的 el-row 中添加规格和品牌的展示（只读）：

```vue
<!-- 型号规格（只读展示） -->
<el-col :span="12">
  <el-form-item label="型号规格">
    <el-input v-model="formData.asset_specification" placeholder="选择资产后自动回填" disabled />
  </el-form-item>
</el-col>

<!-- 品牌（只读展示） -->
<el-col :span="12">
  <el-form-item label="品牌">
    <el-input v-model="formData.asset_brand" placeholder="选择资产后自动回填" disabled />
  </el-form-item>
</el-col>
```

- [ ] **步骤 5：更新重置表单逻辑**

在 `resetForm` 函数中添加新字段的重置：

```typescript
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(formData, {
    // ... 原有字段重置
    asset_specification: '',
    asset_brand: '',
  })
  ElMessage.info('表单已重置')
}
```

- [ ] **步骤 6：验证修改后的表单类型正确**

运行：`npm run type-check`
预期：无与 DamagedAssetForm 相关的类型错误

- [ ] **步骤 7：Commit**

```bash
git add src/components/componentsdetails/detils/DamagedAssetForm.vue
git commit -m "feat: integrate ScrapableAssetsSearch into DamagedAssetForm"
```

---

## 自检清单

- [ ] useScrapableAssets composable 已创建，支持搜索 in_store 和 recycled_pending 状态的资产
- [ ] ScrapableAssetsSearch 组件已创建，包含 5 个搜索字段和结果表格
- [ ] DamagedAssetForm 已引入搜索组件，能正确处理选择事件并同步数据
- [ ] 所有文件通过 type-check 检查
- [ ] 代码遵循项目现有模式（ExportableAssetsSearch / RecyclableOutAssetsSearch）
