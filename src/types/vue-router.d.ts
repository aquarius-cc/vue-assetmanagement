import 'vue-router'

// 为 RouteMeta 添加 requiredMinRole 类型定义

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    requiredMinRole?: string // 新增：最低角色要求
    keepAlive?: boolean
    componentName?: string
  }
}
