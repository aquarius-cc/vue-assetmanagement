/** [批次4 C2/M-15] CommonPagination 分页单源——映射与转发行为锚（先红后绿） */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import Component from '../CommonPagination.vue'

const ElPaginationStub = {
  name: 'ElPagination',
  props: ['currentPage', 'pageSize', 'pageSizes', 'total', 'layout'],
  emits: ['update:currentPage', 'update:pageSize', 'sizeChange', 'currentChange'],
  template: '<div class="el-pagination" />',
}

const mountCp = (props: Record<string, unknown> = {}) =>
  mount(Component, {
    props,
    global: { stubs: { 'el-pagination': ElPaginationStub } },
  })

describe('CommonPagination（M-15 分页单源）', () => {
  it('props 映射：page/pageSize/pageSizes/total/layout 透传给 el-pagination', () => {
    const wrapper = mountCp({
      page: 2,
      pageSize: 50,
      total: 120,
      pageSizes: [10, 20],
      layout: 'total, sizes, prev, pager, next, jumper',
    })
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    expect(pagination.props('currentPage')).toBe(2)
    expect(pagination.props('pageSize')).toBe(50)
    expect(pagination.props('total')).toBe(120)
    expect(pagination.props('pageSizes')).toEqual([10, 20])
    expect(pagination.props('layout')).toBe('total, sizes, prev, pager, next, jumper')
  })

  it('defaults：pageSizes=PAGE_SIZE_OPTIONS，layout 无 jumper，align=center，hideWhenEmpty=true', () => {
    const wrapper = mountCp({ page: 1, pageSize: 20, total: 5 })
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    expect(pagination.props('pageSizes')).toEqual([20, 50, 100])
    expect(pagination.props('layout')).toBe('total, sizes, prev, pager, next')
    expect(wrapper.find('.common-pagination--center').exists()).toBe(true)
  })

  it('v-model 代理：set 经 update:page / update:pageSize 原样转发（$event 不二次包装）', async () => {
    const wrapper = mountCp({ page: 1, pageSize: 20, total: 120 })
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    pagination.vm.$emit('update:currentPage', 4)
    pagination.vm.$emit('update:pageSize', 100)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:page')).toEqual([[4]])
    expect(wrapper.emitted('update:pageSize')).toEqual([[100]])
  })

  it('事件转发：size-change / current-change payload 原样透出', async () => {
    const wrapper = mountCp({ page: 1, pageSize: 20, total: 120 })
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    pagination.vm.$emit('sizeChange', 50)
    pagination.vm.$emit('currentChange', 3)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('size-change')).toEqual([[50]])
    expect(wrapper.emitted('current-change')).toEqual([[3]])
  })

  it('hideWhenEmpty：total=0 不渲染；显式传 false 时仍渲染', () => {
    const hidden = mountCp({ page: 1, pageSize: 20, total: 0 })
    expect(hidden.findComponent({ name: 'ElPagination' }).exists()).toBe(false)

    const shown = mountCp({ page: 1, pageSize: 20, total: 0, hideWhenEmpty: false })
    expect(shown.findComponent({ name: 'ElPagination' }).exists()).toBe(true)
  })

  it('align=end：右对齐修饰类在场', () => {
    const wrapper = mountCp({ page: 1, pageSize: 20, total: 5, align: 'end' })
    expect(wrapper.find('.common-pagination--end').exists()).toBe(true)
    expect(wrapper.find('.common-pagination--center').exists()).toBe(false)
  })
})
