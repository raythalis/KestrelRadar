<!-- TemplateDialog：消息模板的填表弹窗（业务组件层，走共享的 FormDialog 外壳）。
     两个字段：模板别名 + 模板内容（等宽，变量用双花括号占位，说明列在下面）。
     系统内置模板只读，列表里不给编辑入口，所以这里不用管 builtin。 -->
<script setup lang="ts">
import type { MessageTemplate } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppInput from '@/components/app/AppInput.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import { useConfigStore } from '@/stores/config'

const props = defineProps<{ modelValue: boolean; template: MessageTemplate | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const name = ref('')
const content = ref('')
const busy = ref(false)
const error = ref('')

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const title = computed(() =>
  props.template ? t('settings.template.edit') : t('settings.template.add'),
)

/** 别名和内容都不能空；内容里还必须真有变量占位，否则发出去就是一条死文案 */
const valid = computed(() => name.value.trim().length > 0 && content.value.trim().length > 0)

watch(
  () => [props.modelValue, props.template] as const,
  () => {
    if (!props.modelValue) return
    name.value = props.template?.name ?? ''
    content.value = props.template?.content ?? ''
    error.value = ''
  },
  { immediate: true },
)

async function submit(): Promise<void> {
  if (!valid.value || busy.value) return
  busy.value = true
  error.value = ''
  const payload = { name: name.value.trim(), content: content.value.trim() }
  const ok = props.template
    ? await store.saveTemplate(props.template.id, payload)
    : await store.createTemplate(payload)
  busy.value = false
  if (!ok) {
    error.value = store.errorMessage || t('settings.error.save')
    return
  }
  open.value = false
  emit('saved')
}
</script>

<template>
  <FormDialog
    :model-value="modelValue"
    :title="title"
    :busy="busy"
    :error="error || undefined"
    :persistent="busy"
    :submit-disabled="!valid"
    :width="640"
    data-test="template-dialog"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="submit"
  >
    <AppInput
      v-model="name"
      :label="t('settings.template.name')"
      :maxlength="60"
      required
      data-test="template-name-input"
    />

    <label class="k2-field">
      <span class="k2-field__label">
        {{ t('settings.template.content') }}<span class="k2-field__req">*</span>
      </span>
      <textarea
        v-model="content"
        class="k2-textarea k2-textarea--mono"
        rows="8"
        :maxlength="4000"
        data-test="template-content-input"
      />
      <span class="k2-field__hint">{{ t('settings.template.variablesHint') }}</span>
    </label>
  </FormDialog>
</template>
