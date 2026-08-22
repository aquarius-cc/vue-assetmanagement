/**
 * 批量导入预览表格分页组合式函数（DR-1 收敛：原先在 Asset/Contract/User 等
 * 多个 BatchImport 组件中重复实现相同的分页三件套）
 *
 * 行为零变更：页大小固定为 10、翻页、解析新文件后重置回第一页，
 * 与原各组件内联实现完全一致。
 */
import { ref, computed, type Ref } from 'vue'

/** 预览表格固定页大小 */
export const PREVIEW_PAGE_SIZE = 10

/**
 * @param rows - 预览数据行的响应式来源（ref 或 getter）
 */
export function usePreviewPagination<T>(rows: Ref<T[]> | (() => T[])) {
  const currentPreviewPage = ref(1)

  /** 分页后的预览数据 */
  const paginatedPreviewData = computed(() => {
    const list = typeof rows === 'function' ? rows() : rows.value
    const start = (currentPreviewPage.value - 1) * PREVIEW_PAGE_SIZE
    const end = start + PREVIEW_PAGE_SIZE
    return list.slice(start, end)
  })

  /** 重置分页到第一行 */
  const resetPreviewPage = () => {
    currentPreviewPage.value = 1
  }

  /** 分页页码改变 */
  const handlePreviewPageChange = (page: number) => {
    currentPreviewPage.value = page
  }

  return {
    previewPageSize: PREVIEW_PAGE_SIZE,
    currentPreviewPage,
    paginatedPreviewData,
    resetPreviewPage,
    handlePreviewPageChange,
  }
}
