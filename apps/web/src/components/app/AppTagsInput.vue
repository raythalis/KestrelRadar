<!-- AppTagsInput：一串短标签的录入（关键词、排除词这类）。
     打字回车/逗号/空格就加一个，已加的显示成可删的标签，粘贴一串也会按分隔符拆开。
     只做录入，值就是字符串数组；重复项与空串自动丢掉。 -->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
    /** 常态说明；有 error 时让位给错误信息 */
    hint?: string
    error?: string
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    placeholder?: string
    /** 最多几个（后端也有上限，这里先拦住） */
    max?: number
  }>(),
  { disabled: false, readonly: false, required: false, max: 200 },
)

const model = defineModel<string[]>({ default: () => [] })

const emit = defineEmits<{ (e: 'overflow', max: number): void }>()

/** 分隔符：中英文逗号、分号、空格、换行、Tab 都当分隔 */
const DELIMITERS = [',', '，', ';', '；', ' ', '\n', '\t']

const chips = computed(() => model.value.filter((item) => item.trim().length > 0))

/** 归一化：去空白、去空串、去重（大小写不一致时按原样保留第一个） */
function normalize(values: readonly unknown[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    out.push(text)
  }
  return out
}

function handleUpdate(values: readonly unknown[]): void {
  const next = normalize(values)
  if (next.length > props.max) {
    emit('overflow', props.max)
    model.value = next.slice(0, props.max)
    return
  }
  model.value = next
}
</script>

<template>
  <div class="app-field" data-test="app-tags-input">
    <label v-if="label" class="app-field__label">
      {{ label }}<span v-if="required" class="app-field__req">*</span>
    </label>
    <v-combobox
      :model-value="chips"
      :disabled="disabled"
      :readonly="readonly"
      :error="Boolean(error)"
      :placeholder="placeholder"
      :delimiters="DELIMITERS"
      multiple
      chips
      closable-chips
      hide-no-data
      hide-details
      variant="outlined"
      density="compact"
      @update:model-value="handleUpdate"
    />
    <span v-if="error" class="app-field__error">{{ error }}</span>
    <span v-else-if="hint" class="app-field__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
/* 标签本身跟着 DS 的标签走（.app-tag 那套配色），不再用 Vuetify 默认灰 */
.app-field :deep(.v-chip) {
  border-radius: var(--k-radius-sm);
  background: var(--k-panel-2);
  border: 1px solid var(--k-border);
  color: var(--k-text);
  font-size: var(--k-fs-label);
}

.app-field :deep(.v-chip__close) {
  color: var(--k-muted);
}
</style>
