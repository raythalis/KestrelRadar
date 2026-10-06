<!-- TagsField：关键词、排除词这类短词的输入（v2 标签输入零件）。
     回车 / 逗号 / 分号 / 空格分段，自动去重去空；每个标签带一个移除的小叉。
     只受控：值在父级，组件只发 update:modelValue。 -->
<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    label?: string
    hint?: string
  }>(),
  { label: undefined, hint: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const draft = ref('')

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
  for (const part of parts) if (!next.includes(part)) next.push(part)
  emit('update:modelValue', next)
  draft.value = ''
}

/** 打字时就把分隔符当提交：中文逗号这类没有按键名，靠输入内容判断 */
function onInput(): void {
  if (/[,，;；\s]/.test(draft.value)) commit()
}

function remove(value: string): void {
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
        @input="onInput"
        @keydown.enter.prevent="commit"
        @blur="commit"
      />
    </div>
    <span v-if="hint" class="k2-field__hint">{{ hint }}</span>
  </div>
</template>
