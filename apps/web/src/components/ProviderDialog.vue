<script setup lang="ts">
import type { ModelProvider } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const props = defineProps<{ modelValue: boolean; provider: ModelProvider | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const name = ref('')
const kind = ref<ModelProvider['kind']>('openai_compatible')
const baseUrl = ref('')
const apiKey = ref('')

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const kindOptions = computed(() =>
  (['openai_compatible', 'ollama'] as const).map((value) => ({
    value,
    title: t(`model.kind.${value}`),
  })),
)
const valid = computed(() => name.value.trim().length > 0 && baseUrl.value.trim().length > 0)

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

async function submit(): Promise<void> {
  if (!valid.value) return
  const payload = {
    name: name.value.trim(),
    kind: kind.value,
    baseUrl: baseUrl.value.trim(),
    ...(apiKey.value.trim().length > 0 ? { apiKey: apiKey.value.trim() } : {}),
  }
  const ok = props.provider
    ? await store.saveProvider(props.provider.id, payload)
    : await store.createProvider({ ...payload, enabled: true, sortOrder: 0 })
  if (!ok) return
  open.value = false
  emit('saved')
}
</script>

<template>
  <v-dialog v-model="open" max-width="560">
    <v-card data-test="provider-dialog">
      <v-card-title class="text-body-1">
        {{ provider ? t('model.editProvider') : t('model.addProvider') }}
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="name" :label="t('common.name')" data-test="provider-name-input" />
        <v-select
          v-model="kind"
          :items="kindOptions"
          :label="t('model.kindLabel')"
          data-test="provider-kind-input"
        />
        <v-text-field
          v-model="baseUrl"
          :label="t('model.baseUrl')"
          :hint="t('model.baseUrlHint')"
          persistent-hint
          data-test="provider-base-url-input"
        />
        <v-text-field
          v-model="apiKey"
          :label="t('model.apiKey')"
          :hint="provider?.hasApiKey ? t('channel.secretKept') : t('model.apiKeyHint')"
          persistent-hint
          type="password"
          class="mt-2"
          data-test="provider-api-key-input"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!valid" data-test="provider-save" @click="submit">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
