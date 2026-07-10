# 项目安全规范
> 前端安全实践：权限控制、认证、敏感信息保护。
## 1. 前端权限控制

基于 **@casl/ability** + **@casl/vue**，通过 `v-can` 指令实现细粒度 UI 管控。

### 1.1 能力定义
在 `src/permission.ts` 中根据用户权限构建 Ability：
```ts
import { defineAbility } from '@casl/ability'

export const ability = defineAbility((can) => {
  const userStore = useUserStore()
  userStore.permissions.forEach(p => {
    const [action, subject] = p.split(':')
    can(action, subject)
  })
})
```

### 1.2 视图层使用
```vue
<el-button v-can="{ action: 'delete', subject: 'Asset' }">删除</el-button>
```
- 按钮只对拥有 delete:Asset 权限的用户可见
- 禁止使用硬编码角色判断（如 v-if="role === 'admin'"），必须基于 Ability
- 路由守卫中同样使用 Ability 校验页面访问权

## 2. 认证与 Token 管理
- 登录成功后 token 存储在 Pinia Store 并持久化到 localStorage（通过 pinia-plugin-persistedstate）
- 所有 HTTP 请求由 src/utils/request.ts 的 Axios 拦截器自动添加 Authorization 头
- Token 过期或无效时，统一拦截器负责清除登录态并跳转至登录页

```ts
// request.ts 核心拦截逻辑
service.interceptors.request.use(config => {
  const user = useUserStore()
  if (user.token) config.headers.Authorization = `Bearer ${user.token}`
  return config
})

service.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 清除 token，跳转登录
    }
    return Promise.reject(error)
  }
)
```
- 敏感操作（如删除、导出）可根据需要添加二次确认，前端弹出确认框

## 3. 敏感信息保护
- 禁止在源代码中硬编码 API 密钥、账号、密码等
- 使用 .env 文件管理环境变量（如 VITE_API_TARGET），所有以 VITE_ 开头的变量会被 Vite 暴露给客户端
- 生产构建前确保 .env 文件不进入版本控制（已在 .gitignore 中）
- 如需使用第三方 API Key，应通过后端中转，避免直接暴露在前端代码中

## 5. XSS 防护
- Vue 默认对 {{ }} 插值进行 HTML 转义，普通文本渲染安全
- 若必须渲染富文本，使用 v-html 前必须对内容进行消毒（推荐引入 DOMPurify）
- 用户输入通过表单组件绑定，Element Plus 组件会自动处理基础转义

## 5. 输入校验
- 前端必须进行表单验证：所有用户提交的数据通过 Element Plus 的表单校验规则进行必填、格式、长度等验证
- 对于文件上传，校验文件类型、大小，防止恶意文件
- 禁止直接信任用户输入并拼接到 URL 或动态执行（如 eval）

## 6. 依赖安全
- 定期执行 npm audit 检查已知漏洞
- 升级依赖时注意 Breaking Changes，阅读 Changelog，并更新相关文档
- 锁定依赖版本（package-lock.json 已纳入版本控制），避免自动升级引入风险

## 7. 环境安全
- 开发、测试、生产环境使用独立的 .env 文件（如 .env.development、.env.production）。
- 生产构建时移除 debug 和 console 日志（已在 vite.config.ts 的 Terser 配置中启用 drop_console: true）。
- 生产环境部署前运行 npm run build 生成优化后的静态资源