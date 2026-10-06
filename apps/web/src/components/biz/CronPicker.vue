<!-- CronPicker：cron 表达式字段。
     输入框本身可以直接手打；点它把生成器展开在字段下方
     （@vue-js-cron/vuetify，MIT，按 分钟/小时/日/月/周 分段点选），
     选完表达式回写到同一个输入框。时间的含义由生成器自己表达，
     字段下面不再写人话翻译，只在表达式不合规时给一句报错。
     只出事件，不碰 store。 -->
<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CronVuetify } from '@vue-js-cron/vuetify'
import '@vue-js-cron/vuetify/dist/vuetify.css'
import AppInput from '@/components/app/AppInput.vue'
import { checkCron } from '@/utils/cron'

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

/** 表达式不合规时显示的一句报错；外部传 error 时以外部为准 */
const shownError = computed(() => {
  if (props.error) return props.error
  const check = checkCron(props.modelValue)
  if (check.ok) return ''
  return t(check.reason === 'fieldCount' ? 'cron.errorFieldCount' : 'cron.errorSyntax')
})

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
</script>

<template>
  <div ref="rootEl" data-test="cron-picker">
    <VMenu
      v-model="menuOpen"
      :disabled="disabled || readonly"
      :close-on-content-click="false"
      persistent
    >
      <template #activator="{ props: menuProps }">
        <AppInput
          v-bind="menuProps"
          v-model="draft"
          :label="label"
          :invalid="Boolean(shownError)"
          mono
          :disabled="disabled"
          :readonly="readonly"
          :aria-label="label"
          placeholder="* * * * *"
          data-test="cron-input"
        />
      </template>

      <div class="k2-menu" :class="menuClass" data-test="cron-builder-body">
        <CronVuetify
          v-model="draft"
          :locale="cronLocale"
          :disabled="disabled || readonly"
          :chip-props="{ color: 'primary', size: 'small' }"
        />
      </div>
    </VMenu>

    <span v-if="shownError" class="k2-field__err" data-test="cron-error">{{ shownError }}</span>
    <span v-else-if="hint" class="k2-field__hint">{{ hint }}</span>
  </div>
</template>
