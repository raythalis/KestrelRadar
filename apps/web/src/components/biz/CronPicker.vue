<!-- CronPicker：cron 表达式字段。
     输入框直接编辑表达式，人话行即时翻译；右边的"可视化"按钮打开 cron 生成器
     （@vue-js-cron/vuetify，MIT），按 分钟/小时/日/月/周 分段点选生成表达式。
     只出事件，不碰 store。 -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CronVuetify } from '@vue-js-cron/vuetify'
import '@vue-js-cron/vuetify/dist/vuetify.css'
import { summarizeCron } from '@/utils/cron'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    hint?: string
    error?: string
    disabled?: boolean
    readonly?: boolean
  }>(),
  { disabled: false, readonly: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t, locale } = useI18n()

/** cron 生成器的开关（用弹窗外壳：菜单在窄屏下靠不住，弹窗两个尺寸都验过） */
const builderOpen = ref(false)

/** 生成器菜单跟着界面语言走（组件只内置 zh-cn 与 en 两套词典） */
const cronLocale = computed(() => (locale.value.toLowerCase().startsWith('zh') ? 'zh-cn' : 'en'))

const draft = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const summary = computed(() => summarizeCron(props.modelValue))

const pad = (n: number): string => String(n).padStart(2, '0')

/** 表达式的人话翻译：说得清就说，说不清就老实提示 */
const human = computed<string>(() => {
  const s = summary.value
  if (!s.ok) return s.reason === 'fieldCount' ? t('cron.errorFieldCount') : t('cron.errorSyntax')
  switch (s.kind) {
    case 'everyMinute':
      return t('cron.everyMinute')
    case 'hourly':
      return t('cron.hourly', { minute: pad(s.minute) })
    case 'everyMinutes':
      return t('cron.everyMinutes', { n: s.step })
    case 'everyHours':
      return s.minute === null
        ? t('cron.everyHours', { n: s.step })
        : t('cron.everyHoursAt', { n: s.step, minute: pad(s.minute) })
    case 'hours':
      return t('cron.hours', {
        times: s.hours.map((hour) => `${pad(hour)}:${pad(s.minute)}`).join('、'),
      })
    case 'daily':
      return t('cron.daily', { time: `${pad(s.hour)}:${pad(s.minute)}` })
    case 'weekly':
      return t('cron.weekly', {
        time: `${pad(s.hour)}:${pad(s.minute)}`,
        days: s.days.map((day) => t(`cron.weekday.${day}`)).join('、'),
      })
    case 'monthly':
      return t('cron.monthly', {
        time: `${pad(s.hour)}:${pad(s.minute)}`,
        days: s.days.join('、'),
      })
    default:
      return t('cron.other')
  }
})

const humanTone = computed(() =>
  !summary.value.ok ? 'err' : summary.value.kind === 'other' ? 'warn' : 'info',
)
</script>

<template>
  <div class="app-field" data-test="cron-picker">
    <AppInput
      :model-value="modelValue"
      :label="label"
      :hint="hint"
      :error="error"
      :disabled="disabled"
      :readonly="readonly"
      placeholder="* * * * *"
      mono
      data-test="cron-input"
      @update:model-value="(value: string) => emit('update:modelValue', value)"
    >
      <template #action>
        <AppButton
          size="sm"
          :disabled="disabled || readonly"
          data-test="cron-builder"
          @click="builderOpen = true"
        >
          {{ t('cron.builder') }}
        </AppButton>
      </template>
    </AppInput>

    <AppHint :tone="humanTone" data-test="cron-human">{{ human }}</AppHint>

    <AppDialog v-model="builderOpen" :title="t('cron.builderTitle')" :width="720">
      <div class="cron-builder" data-test="cron-builder-body">
        <CronVuetify
          v-model="draft"
          :locale="cronLocale"
          :disabled="disabled || readonly"
          :chip-props="{ color: 'primary', size: 'small' }"
        />
      </div>
      <template #footer>
        <span class="app-spacer" />
        <AppButton variant="primary" data-test="cron-builder-done" @click="builderOpen = false">
          {{ t('common.done') }}
        </AppButton>
      </template>
    </AppDialog>
  </div>
</template>
