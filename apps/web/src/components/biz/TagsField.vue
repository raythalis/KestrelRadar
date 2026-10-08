<!-- TagsField：关键词、排除词这类短词的输入（v2 标签输入零件）。
     回车 / 逗号 / 分号 / 空格分段，自动去重去空；每个标签带一个移除的小叉。
     只受控：值在父级，组件只发 update:modelValue。
     个数（max，默认 200）与单项长度（maxLength，默认 100）在这一处统一把关，
     页面不用各自实现；到上限就停手并给一句提示。 -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    label?: string
    hint?: string
    /** 最多几个标签 */
    max?: number
    /** 单个标签最长几个字符 */
    maxLength?: number
  }>(),
  { label: undefined, hint: undefined, max: 200, maxLength: 100 },
)

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const { t } = useI18n()

const draft = ref('')
/** 超限时顶掉常态说明的那一句（重新打字就清掉） */
const notice = ref('')

const full = computed(() => props.modelValue.length >= props.max)
const meta = computed(() => t('tags.meta', { count: props.modelValue.length, max: props.max }))

function commit(): void {
  const parts = draft.value
    .split(/[,，;；\s]+/)
    .map((value) => value.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    draft.value = ''
    return
  }

  const next = [...props.modelValue]
  let tooLong = 0
  let overflow = false
  for (const part of parts) {
    if (part.length > props.maxLength) {
      tooLong += 1
      continue
    }
    if (next.includes(part)) continue
    if (next.length >= props.max) {
      overflow = true
      continue
    }
    next.push(part)
  }

  if (tooLong > 0) notice.value = t('tags.tooLong', { max: props.maxLength })
  else if (overflow) notice.value = t('tags.full', { max: props.max })

  if (next.length !== props.modelValue.length) emit('update:modelValue', next)
  draft.value = ''
}

/** 打字时就把分隔符当提交：中文逗号这类没有按键名，靠输入内容判断 */
function onInput(): void {
  notice.value = ''
  if (/[,，;；\s]/.test(draft.value)) commit()
}

function remove(value: string): void {
  notice.value = ''
  emit(
    'update:modelValue',
    props.modelValue.filter((item) => item !== value),
  )
}
</script>

<template>
  <div class="k2-field">
    <span v-if="label" class="k2-field__label">{{ label }}</span>
    <div class="k2-tags">
      <span v-for="item in modelValue" :key="item" class="k2-chip k2-chip--tag" :title="item">
        <span class="k2-chip__text">{{ item }}</span>
        <button type="button" class="k2-chip__x" :aria-label="item" @click="remove(item)">
          <v-icon size="12">mdi-close</v-icon>
        </button>
      </span>
      <input
        v-model="draft"
        class="k2-tags__input"
        :maxlength="maxLength"
        :disabled="full"
        @input="onInput"
        @keydown.enter.prevent="commit"
        @blur="commit"
      />
    </div>
    <span v-if="notice" class="k2-field__error" data-test="tags-notice">{{ notice }}</span>
    <span v-else class="k2-field__hint">
      {{ hint }}<template v-if="hint"> · </template>{{ meta }}
    </span>
  </div>
</template>
