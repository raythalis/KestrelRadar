<!-- GroupDialog：新建 / 编辑分组的弹窗（搭在 FormDialog 上）。
     字段只有名称与简介；页面负责把它接进 store（组件只出 submit 事件）。
     每次打开都回到入参那一份值，上一次没保存的输入不留到下次。 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppInput from '@/components/app/AppInput.vue'
import FormDialog from '@/components/biz/FormDialog.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 空名字＝新建（标题用「新建分组」，否则「编辑分组」） */
    name?: string
    description?: string
    busy?: boolean
    error?: string
  }>(),
  { name: '', description: '', busy: false, error: '' },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [values: { name: string; description: string }]
  cancel: []
}>()

const { t } = useI18n()

const name = ref(props.name)
const description = ref(props.description)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    name.value = props.name
    description.value = props.description
  },
)

const title = computed(() => (props.name ? t('config.editGroup') : t('config.newGroup')))
const submitDisabled = computed(() => name.value.trim() === '')
</script>

<template>
  <FormDialog
    :model-value="modelValue"
    :title="title"
    :busy="busy"
    :error="error"
    :submit-disabled="submitDisabled"
    data-test="group-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
    @submit="emit('submit', { name: name.trim(), description: description.trim() })"
    @cancel="emit('cancel')"
  >
    <AppInput
      v-model="name"
      :label="t('config.form.name')"
      :maxlength="60"
      required
      data-test="group-name-input"
    />

    <label class="k2-field">
      <span class="k2-field__label">{{ t('config.form.description') }}</span>
      <textarea v-model="description" class="k2-textarea" :maxlength="500" />
    </label>
  </FormDialog>
</template>
