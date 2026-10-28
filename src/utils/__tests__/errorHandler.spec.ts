import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError } from 'axios'

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}))

import { ElMessage } from 'element-plus'
import {
  getErrorMessage,
  getAxiosStatus,
  getAxiosResponseData,
  showErrorMessage,
  notifyCallerError,
} from '../errorHandler'

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getErrorMessage', () => {
    it('Axios 错误且响应含 message 时返回后端消息', () => {
      const err = new AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        undefined as never,
        undefined,
        {
          status: 400,
          data: { message: '资产不存在' },
          statusText: 'Bad Request',
          headers: {},
          config: {} as never,
        },
      )

      expect(getErrorMessage(err, 'fallback')).toBe('资产不存在')
    })

    it('Axios 错误但无响应数据时返回兜底消息', () => {
      const err = new AxiosError('Network Error', 'ERR_NETWORK')

      expect(getErrorMessage(err, 'fallback')).toBe('fallback')
    })

    it('普通 Error 返回其 message', () => {
      expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
    })

    it('空 message 的 Error 返回兜底消息', () => {
      expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback')
    })

    it('其他类型返回兜底消息', () => {
      expect(getErrorMessage('oops', 'fallback')).toBe('fallback')
    })
  })

  describe('getAxiosStatus', () => {
    it('返回 Axios 错误响应状态码', () => {
      const err = new AxiosError('x', 'ERR_BAD_REQUEST', undefined as never, undefined, {
        status: 404,
        data: {},
        statusText: 'Not Found',
        headers: {},
        config: {} as never,
      })

      expect(getAxiosStatus(err)).toBe(404)
    })

    it('无响应的 Axios 错误返回 0', () => {
      expect(getAxiosStatus(new AxiosError('x', 'ERR_NETWORK'))).toBe(0)
    })

    it('非 Axios 错误返回 0', () => {
      expect(getAxiosStatus(new Error('x'))).toBe(0)
    })
  })

  describe('getAxiosResponseData', () => {
    it('返回 Axios 错误响应数据', () => {
      const err = new AxiosError('x', 'ERR_BAD_REQUEST', undefined as never, undefined, {
        status: 400,
        data: { detail: 'bad' },
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
      })

      expect(getAxiosResponseData(err)).toEqual({ detail: 'bad' })
    })

    it('无响应的 Axios 错误返回 null', () => {
      expect(getAxiosResponseData(new AxiosError('x', 'ERR_NETWORK'))).toBeNull()
    })

    it('非 Axios 错误返回 null', () => {
      expect(getAxiosResponseData('x')).toBeNull()
    })
  })

  describe('showErrorMessage', () => {
    it('记录日志并通过 ElMessage 提示', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      showErrorMessage(new Error('boom'), 'fallback')

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"module":"utils/errorHandler"'))
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"message":"fallback"'))
      expect(ElMessage.error).toHaveBeenCalledWith('boom')
      spy.mockRestore()
    })
  })

  describe('notifyCallerError — M-RC-09 单出口双轨契约', () => {
    it('AxiosError → 只 logError 不弹（拦截器已提示，消灭双弹）', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const err = new AxiosError('x', 'ERR_BAD_REQUEST', undefined as never, undefined, {
        status: 400,
        data: { message: '资产不存在' },
        statusText: 'Bad Request',
        headers: {},
        config: {} as never,
      })

      notifyCallerError(err, 'fallback')

      expect(ElMessage.error).not.toHaveBeenCalled()
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('已由拦截器提示'))
      spy.mockRestore()
    })

    it('非 AxiosError（业务错误）→ 弹一次，业务消息优先', () => {
      notifyCallerError(new Error('维修单号不存在'), '操作失败，请重试')
      expect(ElMessage.error).toHaveBeenCalledTimes(1)
      expect(ElMessage.error).toHaveBeenCalledWith('维修单号不存在')
    })

    it('非 AxiosError 且无 message → 弹兜底文案', () => {
      notifyCallerError('oops', '操作失败，请重试')
      expect(ElMessage.error).toHaveBeenCalledTimes(1)
      expect(ElMessage.error).toHaveBeenCalledWith('操作失败，请重试')
    })
  })
})
