/**
 * @file 资产操作视图（报废/维修/丢失/回收/发现）的通用表单逻辑
 * @module composables/useAssetOperationForm.ts
 * @exports
 *   - useAssetOperationForm.vue: 资产操作表单 composable
 *   - UseAssetOperationFormOptions.vue / UseAssetOperationFormReturn.vue: 类型
 * @callers
 *   - views/ScrapAssetView.vue | views/RepairAssetView.vue
 *   - views/LostAssetView.vue | views/RecycleAssetView.vue | views/FoundAssetView.vue
 * @dependsOn
 *   - api/asset.vue: 资产信息获取
 *   - types/asset.vue: 资产详情类型
 */
import { ref, computed, onMounted, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { isAxiosError } from 'axios'
import { assetAPI } from '@/api/asset'
import type { AssetDetail } from '@/types/asset'
import { useOperationGuard } from '@/composables/useOperationGuard'

/**
 * 资产操作表单选项
 * Options 接口泛型化
 * @template T 提交数据类型，默认 Record<string, unknown>
 */
export interface UseAssetOperationFormOptions<T = Record<string, unknown>> {
  /** 提交函数 */
  submitFn: (data: T) => Promise<unknown>
  /** 成功提示消息 */
  successMessage: string
  /** 失败提示消息（可选） */
  errorMessage?: string
  /** @deprecated [修复] 抑制默认错误提示（拦截器已处理时使用），防止重复弹窗 */
  suppressDefaultError?: boolean
}

/**
 * 资产操作表单返回值
 * Returns 接口泛型化
 * @template T 提交数据类型，默认 Record<string, unknown>
 */
export interface UseAssetOperationFormReturn<T = Record<string, unknown>> {
  /** 加载状态 */
  loading: Ref<boolean>
  /** 提交状态 */
  submitting: Ref<boolean>
  /** 资产详情 */
  asset: Ref<AssetDetail | null>
  /** 资产编码 */
  assetCode: Ref<string>
  /** 表单引用 */
  formRef: Ref<FormInstance | undefined>
  /** 获取资产信息 */
  fetchAsset: () => Promise<void>
  /** 提交处理函数 */
  handleSubmit: (formData: T) => Promise<void>
  /** [修复] 资产信息加载失败状态，供调用方展示持久错误 UI */
  fetchError: Ref<boolean>
}

/**
 * 资产操作表单 composable
 * 用于在资产操作视图中引用
 * @template T 提交数据类型，默认 Record<string, unknown>
 */
export function useAssetOperationForm<T = Record<string, unknown>>(
  options: UseAssetOperationFormOptions<T>,
): UseAssetOperationFormReturn<T> {
  const route = useRoute()
  const router = useRouter()

  const loading = ref(true)
  const submitting = ref(false)
  const asset = ref<AssetDetail | null>(null)
  const formRef = ref<FormInstance>()

  const assetCode = computed(() => route.params.code as string)
  const fetchError = ref(false)

  // [修复] 资产信息加载失败状态，供调用方展示持久错误 UI
  // fetchAsset 重构
  const fetchAsset = async () => {
    if (!assetCode.value) {
      loading.value = false
      return
    }
    fetchError.value = false // [修复] 重置错误状态
    try {
      asset.value = await assetAPI.getAssetByCode(assetCode.value)
    } catch (err) {
      console.error('获取资产信息失败:', err)
      // [修复] 分类处理：业务错误（非 AxiosError）拦截器未处理，需手动提示
      if (!isAxiosError(err)) {
        ElMessage.error((err as Error).message || '获取资产信息失败')
      }
      // AxiosError 由拦截器已弹窗，不重复
      fetchError.value = true // [修复] 设置错误状态供 UI 展示
    } finally {
      loading.value = false
    }
  }

  const handleSubmit = async (formData: T) => {
    if (!formRef.value) return

    await formRef.value.validate(async (valid) => {
      if (!valid) return

      submitting.value = true
      try {
        await options.submitFn(formData)
        ElMessage.success(options.successMessage)
        router.back()
      } catch (err) {
        console.error('操作失败:', err)
        if (handleForbiddenError(err)) return // 403 处理
        if (handleConflictError(err)) return // 409 处理
        // [修复] 仅当未抑制默认错误时才显示通用提示
        if (!options.suppressDefaultError) {
          ElMessage.error(options.errorMessage || '操作失败，请稍后重试')
        }
      } finally {
        submitting.value = false
      }
    })
  }

  const { guardOnMounted, handleForbiddenError, handleConflictError } = useOperationGuard()

  onMounted(async () => {
    if (!guardOnMounted()) return // 新增：权限检查
    await fetchAsset()
  })

  return {
    loading,
    submitting,
    asset,
    assetCode,
    formRef,
    fetchError, // [修复] 新增：资产信息加载失败状态，供调用方展示持久错误 UI
    fetchAsset,
    handleSubmit,
  }
}
