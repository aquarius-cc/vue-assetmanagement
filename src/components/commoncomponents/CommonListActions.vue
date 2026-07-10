<template>
  <el-table-column
    v-if="showActions"
    align="center"
    :min-width="actionColumnWidth || 'auto'"
    label="操作"
  >
    <!-- 表头搜索框 -->
    <template #header>
      <el-input
        v-if="enableSearch"
        v-model="localSearch"
        size="small"
        :placeholder="searchPlaceholder"
        clearable
        class="search-input"
        @keyup.enter="handleSearchSubmit"
        @clear="handleSearchClear"
      />
    </template>

    <!-- 操作按钮组 -->
    <template #default="scope">
      <slot name="actions" :row="scope.row" :index="scope.$index">
        <div class="action-buttons">
          <el-button
            v-if="showDetailButton"
            size="small"
            type="primary"
            @click="handleDetails(scope.row, scope.$index)"
          >
            详情
          </el-button>
          <el-button
            v-if="enableEdit"
            size="small"
            type="success"
            @click="handleEdit(scope.row, scope.$index)"
          >
            编辑
          </el-button>
          <el-button
            v-if="enableDelete"
            size="small"
            type="danger"
            @click="$emit('delete', scope.row, scope.$index)"
          >
            删除
          </el-button>
        </div>
      </slot>
    </template>
  </el-table-column>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

// ===== Props 定义 =====
const props = defineProps({
  showActions: {
    type: Boolean,
    default: true,
  },
  actionColumnWidth: {
    type: [Number, String],
    default: 'auto',
  },
  enableSearch: {
    type: Boolean,
    default: true,
  },
  searchPlaceholder: {
    type: String,
    default: '搜索',
  },
  search: {
    type: String,
    default: '',
  },
  enableEdit: {
    type: Boolean,
    default: true,
  },
  enableDelete: {
    type: Boolean,
    default: true,
  },
  showDetailButton: {
    type: Boolean,
    default: false,
  },
  detailRouteName: {
    type: String,
    default: null,
  },
  editRouteName: {
    type: String,
    default: null,
  },
})

// ===== Events 定义 =====
const emit = defineEmits<{
  'update:search': [keyword: string]
  search: [keyword: string]
  edit: [row: Record<string, unknown>, index: number]
  delete: [row: Record<string, unknown>, index: number]
  detail: [row: Record<string, unknown>, index: number]
}>()

// ===== Router =====
const router = useRouter()

// ===== 本地状态 =====
const localSearch = ref(props.search || '')

// 监听父组件 search 变化，同步到本地（用于清空等场景）
watch(() => props.search, (newVal) => {
  localSearch.value = newVal || ''
})

// ===== 方法 =====
/**
 * 安全地从实体中提取标识符值
 * 用于路由跳转时构建 query 参数
 */
function getIdentifierValue(entity: Record<string, unknown>): Record<string, string> | null {
  const identifierFields = [
    'code',
    'recordcode',
    'outasset_recordcode',
    'asset_code',
    'harddisk_sn_code',
    'contract_code',
    'user_jobcode',
    'department_code',
    'storage_code',
    'asset_type_code',
    'waste_asset_code',
    'logging_id',
    'id',
  ] as const

  for (const field of identifierFields) {
    if (field in entity && entity[field] !== undefined && entity[field] !== null) {
      const value = entity[field]
      if (typeof value === 'string' || typeof value === 'number') {
        return { [field]: String(value) }
      }
    }
  }

  return null
}

/**
 * 构建查询参数
 */
function buildQueryParams(row: Record<string, unknown>): Record<string, string> {
  const identifier = getIdentifierValue(row)
  if (!identifier) {
    return { index: '0' }
  }

  const queryParam: Record<string, string> = {}
  for (const [key, value] of Object.entries(identifier)) {
    if (
      key === 'code' ||
      key === 'harddisk_sn_code' ||
      key === 'contract_code' ||
      key === 'asset_code' ||
      key === 'user_jobcode' ||
      key === 'department_code' ||
      key === 'outasset_recordcode' ||
      key === 'storage_code' ||
      key === 'asset_type_code' ||
      key === 'recordcode' ||
      key === 'waste_asset_code' ||
      key === 'logging_id'
    ) {
      queryParam['code'] = value
    } else {
      queryParam[key] = value
    }
  }

  return queryParam
}

/**
 * 处理详情按钮点击
 */
const handleDetails = (row: Record<string, unknown>, index: number) => {
  if (props.detailRouteName) {
    try {
      const queryParam = buildQueryParams(row)
      router
        .push({
          name: props.detailRouteName,
          query: queryParam,
        })
        .catch((error) => {
          console.error('详情路由跳转失败:', error)
          ElMessage.error('详情路由跳转失败')
        })
    } catch (error) {
      console.error('详情路由跳转失败:', error)
      ElMessage.error('详情路由跳转失败')
    }
  } else {
    emit('detail', row, index)
  }
}

/**
 * 处理编辑按钮点击
 */
const handleEdit = (row: Record<string, unknown>, index: number) => {
  if (props.editRouteName) {
    try {
      const queryParam = buildQueryParams(row)
      router
        .push({
          name: props.editRouteName,
          query: queryParam,
        })
        .catch((error) => {
          console.error('编辑路由跳转失败:', error)
          ElMessage.error('编辑路由跳转失败')
        })
    } catch (error) {
      console.error('编辑路由跳转失败:', error)
      ElMessage.error('编辑路由跳转失败')
    }
  } else {
    emit('edit', row, index)
  }
}

/**
 * 处理搜索提交
 */
const handleSearchSubmit = () => {
  const keyword = localSearch.value.trim()
  emit('update:search', keyword)
  emit('search', keyword)
}

/**
 * 处理搜索清空
 */
const handleSearchClear = () => {
  localSearch.value = ''
  emit('update:search', '')
  emit('search', '')
}

// ===== 暴露方法 =====
defineExpose({
  search: handleSearchSubmit,
  clearSearch: handleSearchClear,
})
</script>

<style scoped>
.search-input {
  width: 100%;
  border-radius: 8px;
  box-sizing: border-box;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.search-input :deep(.el-input__inner) {
  font-size: 14px;
  height: 32px;
  line-height: 32px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  margin: 0;
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 8px;
  min-width: 60px;
  text-align: center;
}

@media (max-width: 768px) {
  .search-input {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
