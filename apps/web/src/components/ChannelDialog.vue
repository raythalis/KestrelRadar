<script setup lang="ts">
import type { Channel, TelegramChat } from '@kestrel/contracts'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { readTelegramChats } from '@/api/config'
import { useConfigStore } from '@/stores/config'

const props = defineProps<{ modelValue: boolean; channel: Channel | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useConfigStore()
const { t } = useI18n()

const name = ref('')
const type = ref<Channel['type']>('telegram')
const url = ref('')
const chatId = ref('')
const secret = ref('')
const chats = ref<TelegramChat[]>([])
const reading = ref(false)
const readError = ref('')
const readHint = ref('')

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const typeOptions = computed(() =>
  (['telegram', 'webhook'] as const).map((value) => ({ value, title: t(`channel.type.${value}`) })),
)
const chatOptions = computed(() =>
  chats.value.map((chat) => ({ value: chat.id, title: `${chat.title}（${chat.id}）` })),
)
const valid = computed(() => {
  if (name.value.trim().length === 0) return false
  if (type.value === 'webhook') return url.value.trim().length > 0
  return (
    chatId.value.trim().length > 0 &&
    (Boolean(props.channel?.hasSecret) || secret.value.trim().length > 0)
  )
})

watch(
  () => [props.modelValue, props.channel] as const,
  () => {
    name.value = props.channel?.name ?? ''
    type.value = props.channel?.type ?? 'telegram'
    url.value = props.channel?.config.url ?? ''
    chatId.value = props.channel?.config.chatId ?? ''
    secret.value = ''
    chats.value = []
    readError.value = ''
    readHint.value = ''
  },
  { immediate: true },
)

async function readChats(): Promise<void> {
  reading.value = true
  readError.value = ''
  readHint.value = ''
  try {
    chats.value = await readTelegramChats({
      token: secret.value.trim() || undefined,
      channelId: props.channel?.id,
    })
    if (chats.value.length === 0) readHint.value = t('channel.noChatsHint')
  } catch (error) {
    readError.value = (error as { message?: string }).message ?? t('channel.readFailed')
  } finally {
    reading.value = false
  }
}

async function submit(): Promise<void> {
  if (!valid.value) return
  const config: Record<string, string> =
    type.value === 'telegram' ? { chatId: chatId.value.trim() } : { url: url.value.trim() }
  const payload = {
    name: name.value.trim(),
    type: type.value,
    config,
    ...(secret.value.trim().length > 0 ? { secret: secret.value.trim() } : {}),
  }
  const ok = props.channel
    ? await store.saveChannel(props.channel.id, payload)
    : await store.createChannel({ ...payload, enabled: true })
  if (!ok) return
  open.value = false
  emit('saved')
}
</script>

<template>
  <v-dialog v-model="open" max-width="620">
    <v-card data-test="channel-dialog">
      <v-card-title class="text-body-1">
        {{ channel ? t('channel.edit') : t('channel.add') }}
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="name" :label="t('common.name')" data-test="channel-name-input" />
        <v-select
          v-model="type"
          :items="typeOptions"
          :label="t('channel.typeLabel')"
          data-test="channel-type-input"
        />

        <template v-if="type === 'telegram'">
          <v-text-field
            v-model="secret"
            :label="t('channel.botToken')"
            :hint="channel?.hasSecret ? t('channel.secretKept') : t('channel.botTokenHint')"
            persistent-hint
            type="password"
            data-test="channel-token-input"
          />
          <div class="d-flex align-end ga-2 mt-2">
            <v-btn
              variant="tonal"
              color="primary"
              class="mb-1"
              :loading="reading"
              prepend-icon="mdi-refresh"
              data-test="channel-read-chats"
              @click="readChats"
            >
              {{ t('channel.readChats') }}
            </v-btn>
          </div>
          <v-select
            v-if="chatOptions.length > 0"
            v-model="chatId"
            :items="chatOptions"
            :label="t('channel.chatIdPick')"
            clearable
            data-test="channel-chat-select"
          />
          <v-text-field
            v-model="chatId"
            :label="t('channel.chatId')"
            :hint="t('channel.chatIdHint')"
            persistent-hint
            data-test="channel-chat-input"
          />
          <p class="section-note" data-test="channel-read-hint">
            {{ readError || readHint || t('channel.readChatsHint') }}
          </p>
        </template>

        <template v-else>
          <v-text-field v-model="url" :label="t('channel.url')" data-test="channel-url-input" />
          <v-text-field
            v-model="secret"
            :label="t('channel.secret')"
            :hint="t('channel.secretHint')"
            persistent-hint
            data-test="channel-secret-input"
          />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!valid" data-test="channel-save" @click="submit">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
