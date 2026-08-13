// 独立组合式函数，封装操作页面的权限检查逻辑，
// 供 7 个操作页面（回收、维修、报废、遗失、找回、维修完成、维修失败）复用

import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePermission } from '@/composables/usePermission'
import { isAxiosError } from 'axios'

export function useOperationGuard() {
  const router = useRouter()
  const { canOperateAsset } = usePermission()

  /**
   * 在组件挂载时检查权限，无权限则拦截并跳转
   * 返回 true 表示有权限，false 表示无权限
   */
  function guardOnMounted(): boolean {
    if (!canOperateAsset.value) {
      ElMessage.error('您没有权限执行此操作')
      router.push('/main')
      return false
    }
    return true
  }

  /**
   * 处理 403 错误响应
   * @param err 错误对象
   * @param errorMessage 自定义错误消息
   * @returns true 表示已处理（403），false 表示未处理
   */
  // handleForbiddenError：移除 ElMessage.error，仅保留跳转
  function handleForbiddenError(err: unknown): boolean {
    // [修复] 拦截器已对 403 弹出"没有权限访问该资源"，此处不重复弹窗，仅做跳转
    if (isAxiosError(err) && err.response?.status === 403) {
      router.push('/main')
      return true
    }
    return false
  }

  /**
   * 处理 409 错误响应（资源锁定冲突）
   * @param err 错误对象
   * @param errorMessage 自定义错误消息
   * @returns true 表示已处理（409），false 表示未处理
   */
  // handleConflictError：移除 ElMessage.error，仅返回 true 表示已处理
  function handleConflictError(err: unknown): boolean {
    // [修复] 拦截器已对 409 弹出后端返回的 detail 消息，此处不重复弹窗
    if (isAxiosError(err) && err.response?.status === 409) {
      return true
    }
    return false
  }

  return {
    canOperateAsset,
    guardOnMounted,
    handleForbiddenError,
    handleConflictError,
  }
}
