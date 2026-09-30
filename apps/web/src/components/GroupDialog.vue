<script setup lang="ts">
import type { Group } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const props = defineProps<{ modelValue: boolean; group: Group | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const name = ref('')
const description = ref('')

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const valid = computed(() => name.value.trim().length > 0)

watch(
  () => [props.modelValue, props.group] as const,
  () => {
    name.value = props.group?.name ?? ''
    description.value = props.group?.description ?? ''
  },
  { immediate: true },
)

async function submit(): Promise<void> {
  if (!valid.value) return
  const payload = { name: name.value.trim(), description: description.value.trim() }
  const ok = props.group
    ? await store.saveGroup(props.group.id, payload)
    : await store.createGroup(payload)
  if (!ok) return
  open.value = false
  emit('saved')
}
</script>

<template>
  <v-dialog v-model="open" max-width="520">
    <v-card data-test="group-dialog">
      <v-card-title class="text-body-1">
        {{ group ? t('config.editGroup') : t('config.newGroup') }}
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="name" :label="t('config.form.name')" data-test="group-name-input" />
        <v-textarea
          v-model="description"
          :label="t('config.form.description')"
          rows="2"
          data-test="group-description-input"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!valid" data-test="group-save" @click="submit">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
