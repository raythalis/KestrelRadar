<script setup lang="ts">
import type { Action } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConfigStore } from '@/stores/config'
import { templateDisplayName } from '@/utils/format'

const props = defineProps<{ modelValue: boolean; groupId: string; action: Action | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const name = ref('')
const triggerType = ref<Action['triggerType']>('instant')
const channelId = ref('')
const cronExpression = ref('0 9 * * *')
/** '' 表示系统内置（跟随界面语言） */
const templateId = ref('')
const includeDelivered = ref(false)
const mergeMessages = ref(true)

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const triggerOptions = computed(() =>
  (['instant', 'digest'] as const).map((value) => ({ value, title: t(`action.trigger.${value}`) })),
)
const channelOptions = computed(() =>
  store.channels.map((channel) => ({ value: channel.id, title: channel.name })),
)
const templateOptions = computed(() => [
  { value: '', title: t('action.templateBuiltin') },
  ...store.templates
    .filter((template) => !template.builtin)
    .map((template) => ({ value: template.id, title: templateDisplayName(template, t) })),
])
/** 只读展示：当前选中的模板长什么样 */
const templateContent = computed(() => store.resolvedTemplateContent(templateId.value || null))

const valid = computed(() => {
  if (name.value.trim().length === 0 || channelId.value.length === 0) return false
  if (triggerType.value === 'digest' && cronExpression.value.trim().length === 0) return false
  return true
})

watch(
  () => [props.modelValue, props.action] as const,
  () => {
    name.value = props.action?.name ?? ''
    triggerType.value = props.action?.triggerType ?? 'instant'
    channelId.value = props.action?.channelId ?? store.channels[0]?.id ?? ''
    cronExpression.value = props.action?.cronExpression ?? '0 9 * * *'
    templateId.value = props.action?.templateId ?? ''
    includeDelivered.value = props.action?.includeDelivered ?? false
    mergeMessages.value = props.action?.mergeMessages ?? true
  },
  { immediate: true },
)

async function submit(): Promise<void> {
  if (!valid.value) return
  const payload = {
    name: name.value.trim(),
    triggerType: triggerType.value,
    channelId: channelId.value,
    cronExpression: triggerType.value === 'digest' ? cronExpression.value.trim() : null,
    templateId: templateId.value || null,
    includeDelivered: includeDelivered.value,
    mergeMessages: mergeMessages.value,
  }
  const ok = props.action
    ? await store.saveAction(props.action.id, payload)
    : await store.createAction({ ...payload, groupId: props.groupId, enabled: true })
  if (!ok) return
  open.value = false
  emit('saved')
}
</script>

<template>
  <v-dialog v-model="open" max-width="640">
    <v-card data-test="action-dialog">
      <v-card-title class="text-body-1">
        {{ action ? t('action.edit') : t('action.add') }}
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="name" :label="t('common.name')" data-test="action-name-input" />
        <v-select
          v-model="triggerType"
          :items="triggerOptions"
          :label="t('action.triggerLabel')"
          data-test="action-trigger-input"
        />

        <div class="d-flex align-end ga-2">
          <v-select
            v-model="channelId"
            :items="channelOptions"
            :label="t('action.channel')"
            class="flex-grow-1"
            data-test="action-channel-input"
          />
          <v-btn
            to="/channels"
            variant="tonal"
            color="primary"
            class="mb-1"
            prepend-icon="mdi-plus"
            data-test="action-channel-add"
          >
            {{ t('action.channelAdd') }}
          </v-btn>
        </div>
        <v-text-field
          v-if="triggerType === 'digest'"
          v-model="cronExpression"
          :label="t('action.digestTime')"
          :hint="t('action.digestTimeHint')"
          persistent-hint
          data-test="action-cron-input"
        />

        <v-select
          v-model="templateId"
          :items="templateOptions"
          :label="t('action.template')"
          data-test="action-template-input"
        />
        <v-textarea
          :model-value="templateContent"
          :label="t('action.templateContent')"
          readonly
          rows="6"
          class="font-mono mt-1"
          data-test="action-template-content"
        />

        <v-checkbox
          v-model="mergeMessages"
          :label="t('action.mergeMessages')"
          density="compact"
          hide-details
          data-test="action-merge-input"
        />
        <v-checkbox
          v-if="triggerType === 'digest'"
          v-model="includeDelivered"
          :label="t('action.includeDelivered')"
          density="compact"
          hide-details
          data-test="action-include-delivered-input"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!valid" data-test="action-save" @click="submit">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
