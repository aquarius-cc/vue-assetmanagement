<!--
  SearchBar.vue
  通用可配置搜索栏组件

  功能：
    - 根据 fields 配置动态渲染搜索输入框
    - 支持 text、select、date、dateRange 四种字段类型
    - 自动收集所有非空字段值，通过 search 事件传递给父组件
    - 支持重置功能，清空所有输入框

  使用示例：
    <SearchBar
      :fields="searchFields"
      @search="handleSearch"
      @reset="handleSearchReset"
    />

  配置示例：
    const searchFields = [
      { key: 'keyword', label: '名称', type: 'text', placeholder: '请输入名称', span: 4 },
      { key: 'status', label: '状态', type: 'select', options: [...], span: 4 },
    ]
-->
<template>
  <el-card class="search-bar" shadow="never">
    <el-form :model="formData" label-width="auto" class="search-form">
      <el-row :gutter="16">
        <!-- 动态渲染搜索字段 -->
        <el-col v-for="field in fields" :key="field.key" :span="field.span || 6">
          <el-form-item :label="field.label" class="search-form-item">
            <!-- 文本输入框 -->
            <el-input
              v-if="field.type === 'text'"
              v-model="formData[field.key]"
              :placeholder="field.placeholder || `请输入${field.label}`"
              clearable
              @keyup.enter="handleSearch"
            />

            <!-- 下拉选择框 -->
            <el-select
              v-else-if="field.type === 'select'"
              v-model="formData[field.key]"
              :placeholder="field.placeholder || `请选择${field.label}`"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="option in field.options"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <!-- 日期选择器 -->
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="formData[field.key]"
              type="date"
              :placeholder="field.placeholder || `请选择${field.label}`"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />

            <!-- 日期范围选择器 -->
            <el-date-picker
              v-else-if="field.type === 'dateRange'"
              v-model="formData[field.key]"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <!-- 操作按钮 -->
        <el-col :span="6" class="search-actions">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            {{ searchButtonText }}
          </el-button>
          <el-button v-if="showReset" @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 通用可配置搜索栏组件
 *
 * Props:
 *   - fields: 搜索字段配置数组
 *   - searchButtonText: 搜索按钮文本（默认"搜索"）
 *   - showReset: 是否显示重置按钮（默认true）
 *
 * Events:
 *   - search: 搜索事件，返回所有非空字段的 key-value 对
 *   - reset: 重置事件
 */
import { reactive, watch } from 'vue'
import { Search, RefreshRight } from '@element-plus/icons-vue'
import type { SearchFieldConfig } from '@/types/common'

// ===== Props 定义 =====
interface Props {
  /** 搜索字段配置数组 */
  fields: SearchFieldConfig[]
  /** 搜索按钮文本 */
  searchButtonText?: string
  /** 是否显示重置按钮 */
  showReset?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchButtonText: '搜索',
  showReset: true,
})

// ===== Emits 定义 =====
const emit = defineEmits<{
  /** 搜索事件，返回所有非空字段的 key-value 对 */
  search: [params: Record<string, string>]
  /** 重置事件 */
  reset: []
}>()

// ===== 表单数据 =====
/**
 * 使用 reactive 存储所有字段的值
 * key 为字段的 key，value 为字段值
 */
const formData = reactive<Record<string, string>>({})

// 初始化默认值
const initFormData = () => {
  props.fields.forEach((field) => {
    formData[field.key] = field.defaultValue || ''
  })
}

// 监听 fields 变化，重新初始化
watch(
  () => props.fields,
  () => initFormData(),
  { immediate: true, deep: true },
)

// ===== 方法 =====

/**
 * 收集搜索参数
 * 过滤掉空值，只返回有值的字段
 */
const collectSearchParams = (): Record<string, string> => {
  const params: Record<string, string> = {}
  props.fields.forEach((field) => {
    const value = formData[field.key]
    if (value !== undefined && value !== null && value !== '') {
      params[field.key] = value
    }
  })
  return params
}

/**
 * 处理搜索
 * 收集非空参数并通过 search 事件传递给父组件
 */
const handleSearch = () => {
  const params = collectSearchParams()
  emit('search', params)
}

/**
 * 处理重置
 * 清空所有字段值，触发 reset 事件
 */
const handleReset = () => {
  initFormData()
  emit('reset')
}

// ===== 暴露方法（供父组件调用） =====
defineExpose({
  /** 获取当前搜索参数 */
  getSearchParams: collectSearchParams,
  /** 重置搜索表单 */
  reset: handleReset,
})
</script>

<style lang="scss" scoped>
.search-bar {
  margin-bottom: 16px;
  border-radius: 8px;

  :deep(.el-card__body) {
    padding: 16px 20px 0;
  }

  .search-form {
    .search-form-item {
      margin-bottom: 16px;
    }

    .search-actions {
      display: flex;
      align-items: flex-start;
      padding-top: 0;
      gap: 8px;
    }
  }

  // 响应式：小屏幕时每行只显示一个字段
  @media (max-width: 768px) {
    .el-col {
      flex: 0 0 100%;
      max-width: 100%;
    }

    .search-actions {
      margin-top: 8px;
    }
  }
}
</style>
