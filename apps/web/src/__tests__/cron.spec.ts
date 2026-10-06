import { describe, expect, it } from 'vitest'

import { checkCron } from '@/utils/cron'

describe('checkCron', () => {
  it('五段都认识：星号、数字、列表、区间、步长', () => {
    const ok = [
      '* * * * *',
      '0 8 * * *',
      '30 9 * * 1-5',
      '0 8,20 * * *',
      '*/5 8 * * *',
      '0 */6 * * *',
      '0 6 1,15 * *',
    ]
    for (const expression of ok) expect(checkCron(expression)).toEqual({ ok: true })
  })

  it('段数不对，就说段数不对', () => {
    for (const expression of ['', '   ', '0 8 * *', '0 8 * * * *']) {
      expect(checkCron(expression)).toEqual({ ok: false, reason: 'fieldCount' })
    }
  })

  it('段数对但写不出来，就说读不出来', () => {
    for (const expression of ['a b c d e', '0 8 * * abc', '0 8-* * * *', '0 8 x * *']) {
      expect(checkCron(expression)).toEqual({ ok: false, reason: 'syntax' })
    }
  })

  it('段数对但超出取值范围，也算读不出来', () => {
    for (const expression of [
      '99 99 * * *',
      '0 24 * * *',
      '0 8 32 * *',
      '0 8 * 13 *',
      '0 8 * * 9',
    ]) {
      expect(checkCron(expression)).toEqual({ ok: false, reason: 'syntax' })
    }
  })
})
