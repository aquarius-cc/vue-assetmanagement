<template>
  <!-- 序号列：自动生成行号，支持分页偏移计算 -->
  <el-table-column
    v-if="column.type === 'index'"
    type="index"
    :label="column.label"
    :min-width="column.width || 'auto'"
    :align="column.align || 'center'"
  >
    <template #default="scope">
      <div style="text-align: center; width: 100%">
        {{ (currentPage - 1) * pageSize + scope.$index + 1 }}
      </div>
    </template>
  </el-table-column>

  <!-- 自定义列：通过插槽允许父组件自定义内容 -->
  <el-table-column
    v-else-if="column.type === 'custom'"
    :label="column.label"
    :min-width="column.width || 'auto'"
    :align="column.align || 'center'"
  >
    <template #default="scope">
      <div :style="{ textAlign: column.align || 'center', width: '100%' }">
        <slot :name="column.slotName || column.prop" :row="scope.row" :index="scope.$index">
          {{ scope.row[column.prop] }}
        </slot>
      </div>
    </template>
  </el-table-column>

  <!-- 普通数据列：直接显示字段值 -->
  <el-table-column
    v-else
    :prop="column.prop"
    :label="column.label"
    :min-width="column.width || 'auto'"
    :align="column.align || 'center'"
  />
</template>

<script lang="ts" setup>
import type { PropType } from 'vue'
import type { TableColumn } from './CommonList.vue'

defineProps({
  column: {
    type: Object as PropType<TableColumn>,
    required: true,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
})
</script>
