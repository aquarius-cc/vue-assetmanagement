/**
 * API配置验证测试文件
 * 
 * 注意：此文件仅用于开发环境调试，生产构建时不应执行任何代码
 * 使用 import.meta.env.DEV 进行构建时守卫
 */

// 构建时守卫：仅在开发环境执行验证代码
if (import.meta.env.DEV) {
  // 动态导入API模块进行验证（避免生产构建时引入依赖）
  const verifyAPIs = async () => {
    const {
      authAPI,
      userAPI,
      departmentAPI,
      assetAPI,
      dashboardAPI,
      contractAPI,
      storageAPI,
      assetTypeAPI,
      outAssetAPI,
      recycleAssetAPI,
      damagedAssetAPI,
      wasteAssetAPI,
      networkAPI,
    } = await import('@/api')

    // 验证所有API模块是否正确导入
    console.log('[API验证] 开发环境API配置检查:')
    console.log('  认证API:', typeof authAPI)
    console.log('  用户API:', typeof userAPI)
    console.log('  部门API:', typeof departmentAPI)
    console.log('  资产API:', typeof assetAPI)
    console.log('  仪表板API:', typeof dashboardAPI)
    console.log('  合同API:', typeof contractAPI)
    console.log('  仓库API:', typeof storageAPI)
    console.log('  资产类型API:', typeof assetTypeAPI)
    console.log('  出库资产API:', typeof outAssetAPI)
    console.log('  回收资产API:', typeof recycleAssetAPI)
    console.log('  待报废资产API:', typeof damagedAssetAPI)
    console.log('  已报废资产API:', typeof wasteAssetAPI)
    console.log('  网络API:', typeof networkAPI)
  }

  // 执行验证（不阻塞应用启动）
  verifyAPIs().catch(() => {
    // 静默处理验证失败，不影响应用运行
  })
}

/**
 * API端点常量
 * 注意：这些路径应与各API模块中的定义保持一致
 * 此处仅为参考，实际使用请直接从各API模块导入
 */
export const apiEndpoints = {
  // 认证相关
  login: '/users/login/',
  logout: '/users/logout/',
  profile: '/users/profile/',

  // 用户管理
  users: '/users/users/',
  userStatistics: '/users/users/statistics/',
  activeUsers: '/users/users/active_users/',

  // 部门管理
  departments: '/users/departments/',

  // 资产管理
  assets: '/assets/assets/',
  assetStatistics: '/assets/assets/statistics/',
  searchAvailableAssets: '/assets/assets/search_available/',

  // 仓库管理
  storages: '/assets/storages/',
  storageStatistics: '/assets/storages/statistics/',

  // 资产类型管理
  assetTypes: '/assets/asset-types/',
  assetClassifications: '/assets/asset-classifications/',

  // 合同管理
  contracts: '/assets/contracts/',
  contractStatistics: '/assets/contracts/statistics/',

  // 出库资产管理
  outAssets: '/assets/out-assets/',
  outAssetStatistics: '/assets/out-assets/statistics/',

  // 回收资产管理
  recycleAssets: '/assets/recycle-assets/',

  // 待报废资产管理
  damagedAssets: '/assets/damaged-assets/',

  // 已报废资产管理
  wasteAssets: '/assets/waste-assets/',
  wasteAssetStatistics: '/assets/waste-assets/statistics/',

  // 仪表板
  dashboardStats: '/dashboard/stats/',
}

export default {
  apiEndpoints,
}
