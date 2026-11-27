<!--
@file 通用可配置搜索栏，根据字段配置动态渲染搜索输入框
@component SearchBar
@usedBy
  - componentsdetails/AssetContentDetails.vue: 资产内容搜索
@dependsOn
  - (无外部依赖，纯交互组件)
-->
<template>
  <el-card class="search-bar" shadow="never">
    <el-form :model="formData" label-width="80px" class="search-form">
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
 *   - initialValues: 恢复回填值（一次性；null/缺省 = 纯默认初始化）
 *
 * Events:
 *   - search: 搜索事件，返回所有非空字段的 key-value 对
 *   - reset: 重置事件
 */
import { reactive, ref, watch } from 'vue'
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
  /** 恢复回填值（一次性；null/缺省 = 纯默认初始化） */
  initialValues?: Record<string, string> | null
}

const props = withDefaults(defineProps<Props>(), {
  searchButtonText: '搜索',
  showReset: true,
  initialValues: null,
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
const pendingInitialValues = ref<Record<string, string> | null>(null)
let hydrated = false

/** fields 变化只补缺键；快照含该键则优先取快照，避免异步选项加载丢值 */
const fillMissingFields = () => {
  props.fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(formData, field.key)) return
    formData[field.key] = pendingInitialValues.value?.[field.key] ?? field.defaultValue ?? ''
  })
}

/** 显式回填：浅拷贝记住完整快照，再对当前 fields 强制赋值 */
const applyInitialValues = (values: Record<string, string>) => {
  pendingInitialValues.value = { ...values }
  props.fields.forEach((field) => {
    formData[field.key] = values[field.key] ?? field.defaultValue ?? ''
  })
}

/** 重置：先清快照记忆，再整表回落默认值（唯一重置入口） */
const clearToDefaults = () => {
  pendingInitialValues.value = null
  props.fields.forEach((field) => {
    formData[field.key] = field.defaultValue ?? ''
  })
}

// deep 仅用于感知键集/下拉选项变化，不再承担「重置」语义；重置唯一入口是 clearToDefaults
watch(() => props.fields, fillMissingFields, { immediate: true, deep: true })

watch(
  () => props.initialValues,
  (values) => {
    if (hydrated || !values) return
    hydrated = true
    applyInitialValues(values)
  },
  { immediate: true },
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
  clearToDefaults()
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
  // App 壳式布局：顶区筛选不被列表区压缩
  flex-shrink: 0;

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
