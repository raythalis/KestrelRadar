<script setup lang="ts">
import { DISCOVERY_KINDS, type Discovery } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'

const props = defineProps<{ modelValue: boolean; groupId: string; discovery: Discovery | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const kind = ref<(typeof DISCOVERY_KINDS)[number]>('rsshub')
const name = ref('')
const target = ref('')
const cronExpression = ref('0 * * * *')

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const kindOptions = computed(() =>
  DISCOVERY_KINDS.map((value) => ({ value, title: t(`discovery.kind.${value}`) })),
)
const valid = computed(
  () =>
    name.value.trim().length > 0 &&
    target.value.trim().length > 0 &&
    cronExpression.value.trim().length > 0,
)

watch(
  () => [props.modelValue, props.discovery] as const,
  () => {
    kind.value = props.discovery?.kind ?? 'rsshub'
    name.value = props.discovery?.name ?? ''
    target.value = props.discovery?.target ?? ''
    cronExpression.value = props.discovery?.cronExpression ?? '0 * * * *'
  },
  { immediate: true },
)

async function submit(): Promise<void> {
  if (!valid.value) return
  const payload = {
    kind: kind.value,
    name: name.value.trim(),
    target: target.value.trim(),
    cronExpression: cronExpression.value.trim(),
  }
  const ok = props.discovery
    ? await store.saveDiscovery(props.discovery.id, payload)
    : await store.createDiscovery({ ...payload, groupId: props.groupId, enabled: true })
  if (!ok) return
  open.value = false
  emit('saved')
}
</script>

<template>
  <v-dialog v-model="open" max-width="560">
    <v-card data-test="discovery-dialog">
      <v-card-title class="text-body-1">
        {{ discovery ? t('discovery.edit') : t('discovery.add') }}
      </v-card-title>
      <v-card-text>
        <v-select
          v-model="kind"
          :items="kindOptions"
          :label="t('discovery.kindLabel')"
          data-test="discovery-kind-input"
        />
        <v-text-field v-model="name" :label="t('common.name')" data-test="discovery-name-input" />
        <v-text-field
          v-model="target"
          :label="t('discovery.target')"
          data-test="discovery-target-input"
        />
        <v-text-field
          v-model="cronExpression"
          :label="t('discovery.frequency')"
          :hint="t('discovery.frequencyHint')"
          persistent-hint
          data-test="discovery-cron-input"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!valid" data-test="discovery-save" @click="submit">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
