<template>
  <el-pagination
    v-if="visible"
    class="common-pagination"
    :class="align === 'end' ? 'common-pagination--end' : 'common-pagination--center'"
    v-model:current-page="pageModel"
    v-model:page-size="pageSizeModel"
    :page-sizes="pageSizes"
    :total="total"
    :layout="layout"
    @size-change="onSizeChange"
    @current-change="onCurrentChange"
  />
</template>

<script setup lang="ts">
/** [批次4 C2/M-15] 分页单源组件：v-model 代理 + $event 原样转发 + [M-27] flex-shrink:0 单源
 *  接入方：ContactsView / NotificationList / AuthUserManage / RoleManage / CommonList
 */
import { computed } from 'vue'
import { PAGE_SIZE_OPTIONS } from '@/utils/pagination'

interface Props {
  page: number
  pageSize: number
  total: number
  pageSizes?: readonly number[]
  layout?: string
  align?: 'center' | 'end'
  hideWhenEmpty?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pageSizes: () => PAGE_SIZE_OPTIONS,
  layout: 'total, sizes, prev, pager, next',
  align: 'center',
  hideWhenEmpty: true,
})

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'update:pageSize', value: number): void
  (e: 'current-change', value: number): void
  (e: 'size-change', value: number): void
}>()

// v-model 代理：set 仅转发，不二次包装（$event 原样透出，防字符串化走样）
const pageModel = computed({
  get: () => props.page,
  set: (value) => emit('update:page', value),
})
const pageSizeModel = computed({
  get: () => props.pageSize,
  set: (value) => emit('update:pageSize', value),
})

const onCurrentChange = (value: number) => emit('current-change', value)
const onSizeChange = (value: number) => emit('size-change', value)

const visible = computed(() => !(props.hideWhenEmpty && props.total <= 0))
</script>

<style scoped lang="scss">
.common-pagination {
  display: flex;
  margin-top: 16px;
  /* [M-27] 常驻可见：不被表格滚动区压缩 */
  flex-shrink: 0;
}

.common-pagination--center {
  justify-content: center;
}

.common-pagination--end {
  justify-content: flex-end;
}

.common-pagination :deep(.el-pagination__total) {
  color: var(--text-regular);
  font-size: 14px;
}

.common-pagination :deep(.el-pagination__sizes) {
  color: var(--text-regular);
}

.common-pagination :deep(.el-pagination__jump) {
  color: var(--text-regular);
  font-size: 14px;
}

.common-pagination :deep(.el-pagination.is-background .btn-next),
.common-pagination :deep(.el-pagination.is-background .btn-prev),
.common-pagination :deep(.el-pagination.is-background .el-pager li) {
  background-color: var(--card-background);
  border: 1px solid var(--border-color-input);
  border-radius: 8px;
}

.common-pagination :deep(.el-pagination.is-background .btn-next.is-active),
.common-pagination :deep(.el-pagination.is-background .btn-prev.is-active),
.common-pagination :deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary-light);
  color: var(--card-background);
}

.common-pagination :deep(.el-pagination.is-background .btn-next:hover),
.common-pagination :deep(.el-pagination.is-background .btn-prev:hover),
.common-pagination :deep(.el-pagination.is-background .el-pager li:hover) {
  color: var(--color-primary-light);
  border-color: var(--color-primary-light);
  background-color: var(--color-primary-lighter);
}
</style>
