import { computed } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 轻页头标题与显示条件（唯一实现，MainView 与 AppBreadcrumb 共用）
 *
 * 仅带 meta.showPageHeader 标记的列表页显示：
 * - Dashboard 自带欢迎栏、NotificationList 自带页头，均排除
 * - 详情/表单页自带 child-page-header，不重复显示
 * - 可选参数默认子路由（如 /main/assetdetails 命中 :asset_code? 空值）：列表态显示页头
 *
 * 注意：消费方必须复用本 composable，不得直读 route.meta 重建同逻辑（DR-1）。
 */
export function usePageHeader() {
  const route = useRoute()

  const showPageHeader = computed(() => {
    if (route.name === 'Dashboard' || route.name === 'NotificationList') return false
    const leaf = route.matched[route.matched.length - 1]
    if (leaf?.meta?.showPageHeader) return true
    // 可选参数默认子路由（如 /main/assetdetails 命中 :asset_code? 空值）：列表态显示页头
    if (leaf?.name === 'AssetContentDetails' && !route.params.asset_code) {
      return !!route.meta.showPageHeader
    }
    return false
  })

  const pageTitle = computed(() => {
    if (!showPageHeader.value) return ''
    // 可选参数默认子路由（如 /main/assetdetails 命中的 AssetContentDetails 列表态）：取父级列表页标题
    const leaf = route.matched[route.matched.length - 1]
    if (leaf?.name === 'AssetContentDetails' && !route.params.asset_code) {
      return (route.matched[1]?.meta?.title as string) || ''
    }
    return (route.meta.title as string) || ''
  })

  return { showPageHeader, pageTitle }
}
