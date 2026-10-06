<!-- ProviderDialog：模型供应商的填表弹窗（业务组件层，搭 v2 的 FormDialog）。
     名称 / 类型 / 接口地址 / 密钥四个字段，顺序与旧版一致；类型在弹窗里选（只有两种）。
     密钥从不回显（接口只回「配过没有」）：配过就在提示里说明留空表示不改，一输入就是覆盖。
     保存按钮用 FormDialog 的 footer-extra 位（保留 provider-save 这个既有测试钩子），
     校验没过或保存中都点不动。只出事件：组装好的值交给页面拼 create/update 入参；
     组件不碰 store、不发请求。 -->
<script setup lang="ts">
import type { ModelProvider } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppInput from '@/components/app/AppInput.vue'
import AppSelect from '@/components/app/AppSelect.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import type { ProviderDialogValues } from '@/components/biz/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 编辑已有供应商时的初值；新建时留空 */
    provider?: ModelProvider | null
    busy?: boolean
    error?: string
  }>(),
  { provider: null, busy: false, error: '' },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [values: ProviderDialogValues]
  cancel: []
}>()

const { t } = useI18n()

const name = ref('')
const kind = ref<ModelProvider['kind']>('openai_compatible')
const baseUrl = ref('')
const apiKey = ref('')

/** 打开或换对象时重置成当前值；密钥永远从空开始（不回显） */
watch(
  () => [props.modelValue, props.provider] as const,
  () => {
    name.value = props.provider?.name ?? ''
    kind.value = props.provider?.kind ?? 'openai_compatible'
    baseUrl.value = props.provider?.baseUrl ?? ''
    apiKey.value = ''
  },
  { immediate: true },
)

const kindItems = computed(() =>
  (['openai_compatible', 'ollama'] as const).map((value) => ({
    value,
    title: t(`model.kind.${value}`),
  })),
)
const valid = computed(() => name.value.trim().length > 0 && baseUrl.value.trim().length > 0)

function submit(): void {
  if (!valid.value) return
  emit('submit', {
    name: name.value.trim(),
    kind: kind.value,
    baseUrl: baseUrl.value.trim(),
    apiKey: apiKey.value.trim(),
  })
}
</script>

<template>
  <FormDialog
    :model-value="modelValue"
    :title="provider ? t('model.editProvider') : t('model.addProvider')"
    :width="560"
    :busy="busy"
    :error="error"
    hide-submit
    data-test="provider-dialog"
    @update:model-value="emit('update:modelValue', $event)"
    @cancel="emit('cancel')"
  >
    <div class="app-stack">
      <AppInput
        v-model="name"
        :label="t('common.name')"
        :maxlength="60"
        required
        data-test="provider-name-input"
      />

      <AppSelect
        v-model="kind"
        :items="kindItems"
        :label="t('model.kindLabel')"
        data-test="provider-kind-input"
      />

      <AppInput
        v-model="baseUrl"
        mono
        :label="t('model.baseUrl')"
        :hint="t('model.baseUrlHint')"
        required
        data-test="provider-base-url-input"
      />

      <AppInput
        v-model="apiKey"
        type="password"
        autocomplete="off"
        :label="t('model.apiKey')"
        :hint="provider?.hasApiKey ? t('channel.secretKept') : t('model.apiKeyHint')"
        data-test="provider-api-key-input"
      />
    </div>

    <template #footer-extra>
      <button
        type="button"
        class="k2-btn k2-btn--primary"
        :aria-busy="busy"
        :disabled="!valid || busy"
        data-test="provider-save"
        @click="submit"
      >
        <span v-if="busy" class="k2-spin" />
        {{ t('common.save') }}
      </button>
    </template>
  </FormDialog>
</template>
