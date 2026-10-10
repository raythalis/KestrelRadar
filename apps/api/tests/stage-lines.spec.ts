import { describe, expect, it } from 'vitest'

import {
  collectLine,
  deliveryLine,
  formatDuration,
  judgeLine,
  mergeLine,
  stageFailLine,
} from '../src/stage-lines.ts'

describe('流程阶段行', () => {
  it('耗时写法：小于 1 秒保留一位小数，跨分钟写成 1m02s', () => {
    expect(formatDuration(430)).toBe('0.4s')
    expect(formatDuration(12000)).toBe('12.0s')
    expect(formatDuration(62000)).toBe('1m02s')
    expect(formatDuration(undefined)).toBe('')
  })

  it('采集完成：抓了多少、新增多少、花了多久', () => {
    const line = collectLine({
      name: 'Hacker News',
      ok: true,
      foundCount: 12,
      newItemCount: 3,
      durationMs: 430,
    })
    expect(line.level).toBe('info')
    expect(line.message).toBe('采集「Hacker News」 …… 完成（抓取 12 条 · 新增 3 条 · 0.4s）')
    expect(line.fields).toMatchObject({
      stage: 'collect',
      object: 'Hacker News',
      result: 'ok',
      found: 12,
      new_items: 3,
      duration_ms: 430,
    })
  })

  it('采集完成但没有新条目：也写清原因，不留空行', () => {
    const line = collectLine({
      name: 'V2EX',
      ok: true,
      foundCount: 20,
      newItemCount: 0,
      durationMs: 800,
    })
    expect(line.message).toBe('采集「V2EX」 …… 完成（没有新条目（抓取 20 条） · 0.8s）')
  })

  it('采集失败：记 warn，带错误码与原因', () => {
    const line = collectLine({
      name: '坏源',
      ok: false,
      foundCount: 0,
      newItemCount: 0,
      code: 'collection.fetch_failed',
      message: '连不上 192.0.2.1',
      durationMs: 2000,
    })
    expect(line.level).toBe('warn')
    expect(line.message).toBe('采集「坏源」 …… 失败（连不上 192.0.2.1 · 2.0s）')
    expect(line.fields).toMatchObject({ code: 'collection.fetch_failed', result: 'failed' })
  })

  it('判定与归并：一条一行，带数量与耗时', () => {
    expect(judgeLine({ name: 'HN', written: 4, durationMs: 1200 }).message).toBe(
      '判定「HN」 …… 完成（新判 4 条 · 1.2s）',
    )
    expect(mergeLine({ name: 'HN', created: 2, merged: 3, durationMs: 120 }).message).toBe(
      '归并「HN」 …… 完成（新建事件 2 个 · 并入 3 条 · 0.1s）',
    )
  })

  it('投递：成功报条数，失败报原因', () => {
    expect(
      deliveryLine({ label: '早报', ok: true, messageCount: 2, durationMs: 1500 }).message,
    ).toBe('投递「早报」 …… 完成（2 条消息 · 1.5s）')
    const failed = deliveryLine({
      label: '早报',
      ok: false,
      messageCount: 0,
      message: '渠道返回 401',
      durationMs: 300,
    })
    expect(failed.level).toBe('warn')
    expect(failed.message).toBe('投递「早报」 …… 失败（渠道返回 401 · 0.3s）')
  })

  it('阶段整体没跑成：写清是哪个动作、哪个对象、为什么', () => {
    const line = stageFailLine({
      action: '归并',
      stage: 'merge',
      object: 'HN',
      reason: 'database is locked',
    })
    expect(line.level).toBe('warn')
    expect(line.message).toBe('归并「HN」 …… 失败（database is locked）')
    expect(line.fields).toMatchObject({ stage: 'merge', object: 'HN', result: 'failed' })
  })
})
