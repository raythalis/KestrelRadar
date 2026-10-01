<!-- CronPicker：cron 表达式字段。
     输入框本身可以直接手打；点它也把生成器展开在字段下方
     （@vue-js-cron/vuetify，MIT，按 分钟/小时/日/月/周 分段点选），
     选完表达式回写到同一个输入框，不用先开弹窗、不占按钮位。
     只出事件，不碰 store。 -->
<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue'
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

/** 生成器浮层开关：点字段开，点外面关 */
const menuOpen = ref(false)

/** 包住字段的根节点：判断"是不是点在浮层外面"时用它排除字段自身 */
const rootEl = ref<HTMLElement | null>(null)

/** 浮层内容挂在类名上：内容会被 teleport 到 body，同一页有几个字段才不会互相认错 */
const menuClass = `cron-picker-menu-${getCurrentInstance()?.uid ?? 'default'}`

/** 生成器的词典只内置 zh-cn 与 en 两套 */
const cronLocale = computed(() => (locale.value.toLowerCase().startsWith('zh') ? 'zh-cn' : 'en'))

const draft = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const summary = computed(() => summarizeCron(props.modelValue))

/**
 * 点浮层、或点它自己弹出的下拉，都不算"点在外面"：
 * 那些下拉被 teleport 到浮层外面，只能顺着 aria-owns 认回来。
 */
function isInsideMenu(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (rootEl.value?.contains(target)) return true
  const content = document.querySelector(`.${menuClass}`)
  if (content?.contains(target)) return true
  const overlayId = target.closest('.v-overlay')?.getAttribute('id')
  if (!overlayId || !content) return false
  return Array.from(content.querySelectorAll('[aria-owns]')).some(
    (el) => el.getAttribute('aria-owns') === overlayId,
  )
}

function closeOnOutsidePointerDown(event: PointerEvent): void {
  if (!menuOpen.value || isInsideMenu(event.target)) return
  menuOpen.value = false
}

onMounted(() => document.addEventListener('pointerdown', closeOnOutsidePointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOnOutsidePointerDown, true))

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
  <div ref="rootEl" class="app-field" data-test="cron-picker">
    <VMenu
      v-model="menuOpen"
      :disabled="disabled || readonly"
      :close-on-content-click="false"
      persistent
    >
      <template #activator="{ props: menuProps }">
        <AppInput
          v-bind="menuProps"
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
        />
      </template>

      <div class="cron-builder" :class="menuClass" data-test="cron-builder-body">
        <CronVuetify
          v-model="draft"
          :locale="cronLocale"
          :disabled="disabled || readonly"
          :chip-props="{ color: 'primary', size: 'small' }"
        />
      </div>
    </VMenu>

    <AppHint :tone="humanTone" data-test="cron-human">{{ human }}</AppHint>
  </div>
</template>
