/**
 * @file 认证通道检测（PC Cookie / 移动端 Bearer）
 * @module utils/device
 * @exports
 *   - AuthChannel: 通道类型
 *   - detectAuthChannel: 检测当前设备所属认证通道
 *   - isMobileDevice: 是否为移动设备
 * @description
 *   - PC 浏览器 -> cookie 通道（HttpOnly Cookie，XSS 更安全）
 *   - 移动端/API 客户端 -> bearer 通道（localStorage + Authorization 头）
 *   - 允许通过 VITE_AUTH_CHANNEL 环境变量强制指定，便于联调与灰度
 */

export type AuthChannel = 'bearer' | 'cookie'

const MOBILE_UA_PATTERN = /Android|iPhone|iPad|iPod|Windows Phone|Mobile|webOS|BlackBerry/i

/**
 * 是否为移动设备（UA + 触屏能力综合判断）
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (MOBILE_UA_PATTERN.test(ua)) return true
  return 'ontouchstart' in window && window.matchMedia?.('(pointer: coarse)').matches
}

/**
 * 检测当前认证通道
 * @returns 'cookie'（PC）或 'bearer'（移动端）
 */
export function detectAuthChannel(): AuthChannel {
  const override = import.meta.env.VITE_AUTH_CHANNEL
  if (override === 'bearer' || override === 'cookie') return override
  return isMobileDevice() ? 'bearer' : 'cookie'
}
