import { SETTINGS_DEFAULTS, SETTINGS_KEYS, settingsSchema } from '@kestrel/contracts'
import type { SettingKey, Settings, UpdateSettingsInput } from '@kestrel/contracts'

import { AppError } from '../../plugins/errors.ts'
import { parseOrThrow } from '../../utils/parse.ts'
import type { SettingsRepo } from './settings.repo.ts'

export function createSettingsService(repo: SettingsRepo) {
  function read(): Settings {
    // 合并默认值后再校验一次：库里被手工改坏了也不会漏到接口外面
    return parseOrThrow(settingsSchema, { ...SETTINGS_DEFAULTS, ...repo.readOverrides() })
  }

  function mustBeKnownKey(key: string): SettingKey {
    if (!SETTINGS_KEYS.includes(key as SettingKey)) throw AppError.notFound('没有这个设置项')
    return key as SettingKey
  }

  return {
    get(): Settings {
      return read()
    },

    update(patch: UpdateSettingsInput): Settings {
      const entries = Object.entries(patch) as [SettingKey, unknown][]
      if (entries.length === 0) throw AppError.validation('没有要修改的设置项')
      for (const [key, value] of entries) {
        // 单项校验：跳过非法值，避免写进库
        parseOrThrow(settingsSchema.pick({ [key]: true } as Record<SettingKey, true>), {
          [key]: value,
        })
        repo.write(key, value)
      }
      return read()
    },

    reset(key: string): Settings {
      repo.remove(mustBeKnownKey(key))
      return read()
    },
  }
}

export type SettingsService = ReturnType<typeof createSettingsService>
