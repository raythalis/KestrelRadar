import { HIDDEN_KEYS, HIDDEN_LIMITS } from '@kestrel/contracts'

import type { SettingsRepo } from './settings.repo.ts'

/**
 * 隐藏配置项：固化在代码里（默认值见 contracts 的 HIDDEN_LIMITS），
 * 允许库里覆盖，但不走设置接口、界面上不出现。
 * 以后想暴露成可见设置，把它们挪进 settingsSchema 再把文案补上即可。
 */
export function createHiddenSettings(repo: SettingsRepo) {
  return {
    /** 异常：库里与前端同为多少条 */
    incidentLimit: () => repo.readHidden(HIDDEN_KEYS.incidentLimit, HIDDEN_LIMITS.incidentLimit),
    /** 同一条错误的去重窗口（分钟） */
    incidentDedupMinutes: () =>
      repo.readHidden(HIDDEN_KEYS.incidentDedupMinutes, HIDDEN_LIMITS.incidentDedupMinutes),
    /** 统计窗口（天） */
    statsWindowDays: () =>
      repo.readHidden(HIDDEN_KEYS.statsWindowDays, HIDDEN_LIMITS.statsWindowDays),
    /** 采集流水保留天数 */
    runRetentionDays: () =>
      repo.readHidden(HIDDEN_KEYS.runRetentionDays, HIDDEN_LIMITS.runRetentionDays),
  }
}

export type HiddenSettings = ReturnType<typeof createHiddenSettings>
