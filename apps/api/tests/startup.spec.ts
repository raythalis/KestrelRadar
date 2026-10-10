import { describe, expect, it } from 'vitest'

import { readyLine, startupLines, type StartupFacts } from '../src/startup.ts'

const facts: StartupFacts = {
  version: '1.1.0',
  node: '24.12.0',
  host: '192.168.5.100',
  port: 8765,
  dbPath: '/data/kestrel.db',
  dbExisted: false,
  staticReady: true,
  staticDir: '/app/apps/web/dist',
}

describe('启动阶段输出', () => {
  it('横幅一行，然后四步各一行', () => {
    const lines = startupLines(facts)
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe('Kestrel Radar 启动 · 1.1.0 · node 24.12.0')
    expect(lines[1]).toBe('[1/4] 读取配置 …… 完成（端口 8765 · 数据库 /data/kestrel.db）')
    expect(lines[2]).toBe('[2/4] 打开数据库 …… 完成（首次创建）')
    expect(lines[3]).toBe('[3/4] 挂载界面产物 …… 完成（/app/apps/web/dist）')
  })

  it('沿用已有库时写法跟着变', () => {
    expect(startupLines({ ...facts, dbExisted: true })[2]).toBe(
      '[2/4] 打开数据库 …… 完成（沿用已有库）',
    )
  })

  it('没有构建产物时第三行写「跳过」，并说明只提供 API', () => {
    const line = startupLines({ ...facts, staticReady: false, staticDir: undefined })[3]
    expect(line).toContain('[3/4] 挂载界面产物 …… 跳过')
    expect(line).toContain('本次只提供 API')
  })

  it('就绪行带地址、形态与总耗时（保留一位小数）', () => {
    expect(readyLine(facts, 0.78)).toBe(
      '[4/4] 服务就绪 …… http://192.168.5.100:8765（界面 + API · 启动耗时 0.8s）',
    )
    expect(readyLine({ ...facts, staticReady: false }, 1.24)).toContain(
      '（仅 API · 启动耗时 1.2s）',
    )
  })
})
