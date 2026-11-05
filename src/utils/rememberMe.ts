/**
 * “记住用户名”持久化单点（LogIn.vue 6 处字面量抽取, OP-21②）
 *
 * 键统一由本模块管理: rememberMe(布尔开关) / savedUsername(用户名)。
 * 组件层禁止直触这两个 localStorage 键（回归锚: __tests__/rememberMe.spec.ts）。
 */

const REMEMBER_ME_KEY = 'rememberMe'
const SAVED_USERNAME_KEY = 'savedUsername'

/** “记住用户名”开关是否开启 */
export function isRememberMeEnabled(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true'
}

/** 读取已存用户名（未存为 null） */
export function readSavedUsername(): string | null {
  return localStorage.getItem(SAVED_USERNAME_KEY)
}

/** 登录成功: 按开关写双键或清空（清空分支收敛为一次调用） */
export function persistRememberMe(rememberMe: boolean, username: string): void {
  if (rememberMe) {
    localStorage.setItem(SAVED_USERNAME_KEY, username)
    localStorage.setItem(REMEMBER_ME_KEY, 'true')
  } else {
    clearRememberMe()
  }
}

/** 清空双键（对应原 LogIn.vue :231+:232 两步移除） */
export function clearRememberMe(): void {
  localStorage.removeItem(SAVED_USERNAME_KEY)
  localStorage.removeItem(REMEMBER_ME_KEY)
}
