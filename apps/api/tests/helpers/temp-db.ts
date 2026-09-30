import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** 每条测试用独立临时库，绝不碰真实数据 */
export function createTempDb() {
  const dir = mkdtempSync(join(tmpdir(), 'kestrel-test-'))
  return {
    path: join(dir, 'kestrel.db'),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}
