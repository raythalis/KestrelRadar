<script setup lang="ts">
import type { MessageTemplate } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const props = defineProps<{ modelValue: boolean; template: MessageTemplate | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const name = ref('')
const content = ref('')

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const valid = computed(() => name.value.trim().length > 0 && content.value.trim().length > 0)

watch(
  () => [props.modelValue, props.template] as const,
  () => {
    name.value = props.template?.name ?? ''
    content.value = props.template?.content ?? ''
  },
  { immediate: true },
)

async function submit(): Promise<void> {
  if (!valid.value) return
  const payload = { name: name.value.trim(), content: content.value }
  const ok = props.template
    ? await store.saveTemplate(props.template.id, payload)
    : await store.createTemplate(payload)
  if (!ok) return
  open.value = false
  emit('saved')
}
</script>

<template>
  <v-dialog v-model="open" max-width="640">
    <v-card data-test="template-dialog">
      <v-card-title class="text-body-1">
        {{ template ? t('settings.template.edit') : t('settings.template.add') }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="name"
          :label="t('settings.template.name')"
          data-test="template-name-input"
        />
        <v-textarea
          v-model="content"
          :label="t('settings.template.content')"
          :hint="t('settings.template.variablesHint')"
          rows="7"
          persistent-hint
          class="font-mono"
          data-test="template-content-input"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!valid" data-test="template-save" @click="submit">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
