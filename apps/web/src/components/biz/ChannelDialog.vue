<!-- ChannelDialog：通知渠道的填表弹窗（业务组件层）。
     一个弹窗只管一种渠道：类型由调用方给定（加渠道时选哪种类型是页面的活，放到通知渠道页那一步做），
     弹窗里只出这一种渠道要填的东西——Telegram 要 token 加会话，Webhook 要地址加可选密钥。
     密钥从不回显（接口只回「配过没有」）：配过就提示留空表示不改，一输入就是覆盖。
     只出事件：组装好的值、读取会话、保存都由页面接；组件不碰 store、不发请求。 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/components/app/AppButton.vue'
import AppInput from '@/components/app/AppInput.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import type { ChannelChat, ChannelDialogValues } from '@/components/biz/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 编辑已有渠道时的初值；新建时留空 */
    name?: string
    /** 这一弹窗是哪种渠道：由页面在添加时定下，弹窗里不再给选择 */
    type: 'telegram' | 'webhook'
    enabled?: boolean
    chatId?: string
    url?: string
    /** 接口只回「配过没有」，不回密钥本身 */
    hasSecret?: boolean
    /** 「读取会话」的结果 */
    chats?: ChannelChat[]
    chatsLoading?: boolean
    chatsError?: string
    busy?: boolean
    error?: string
  }>(),
  {
    name: '',
    enabled: true,
    chatId: '',
    url: '',
    hasSecret: false,
    chats: () => [],
    chatsLoading: false,
    chatsError: '',
    busy: false,
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [values: ChannelDialogValues]
  /** 读会话要用「当前输入框里的 token」（新建时还没保存，页面拿不到） */
  readChats: [token: string]
  cancel: []
}>()

const { t } = useI18n()

const name = ref(props.name)
const enabled = ref(props.enabled)
const chatId = ref(props.chatId)
const url = ref(props.url)
/** 两个密钥输入框都从空开始：空＝不动已保存的密钥 */
const botToken = ref('')
const secret = ref('')

// 每次打开都回到入参那一份值，上一次没保存的输入不留到下次
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    name.value = props.name
    enabled.value = props.enabled
    chatId.value = props.chatId
    url.value = props.url
    botToken.value = ''
    secret.value = ''
  },
  { immediate: true },
)

/** 类型不作为字段：它由页面在添加时定下，这里只把种类写进标题，让用户知道在配哪种渠道 */
const typeName = computed(() =>
  props.type === 'telegram' ? t('channel.type.telegram') : t('channel.type.webhook'),
)
const title = computed(() =>
  t(props.name ? 'channel.editTyped' : 'channel.addTyped', { type: typeName.value }),
)

const submitDisabled = computed(() => {
  if (!name.value.trim()) return true
  if (props.type === 'telegram') {
    const hasToken = props.hasSecret || botToken.value.trim().length > 0
    return !hasToken || !chatId.value.trim()
  }
  return !url.value.trim()
})

function submit(): void {
  const isTelegram = props.type === 'telegram'
  emit('submit', {
    name: name.value.trim(),
    type: props.type,
    enabled: enabled.value,
    chatId: isTelegram ? chatId.value.trim() : '',
    url: isTelegram ? '' : url.value.trim(),
    secret: isTelegram ? botToken.value : secret.value,
  })
}
</script>

<template>
  <FormDialog
    :model-value="modelValue"
    :title="title"
    :busy="busy"
    :error="error"
    :persistent="busy"
    :submit-disabled="submitDisabled"
    data-test="channel-dialog"
    @update:model-value="emit('update:modelValue', $event)"
    @submit="submit"
    @cancel="emit('cancel')"
  >
    <div class="app-stack">
      <AppSwitch v-model="enabled" :label="t('common.enable')" data-test="channel-dialog-enabled" />

      <AppInput
        v-model="name"
        :label="t('common.name')"
        :maxlength="60"
        required
        data-test="channel-dialog-name"
      />

      <template v-if="type === 'telegram'">
        <AppInput
          v-model="botToken"
          type="password"
          autocomplete="off"
          :label="t('channel.botToken')"
          :placeholder="hasSecret ? t('channel.secretKept') : undefined"
          :hint="hasSecret ? undefined : t('channel.botTokenHint')"
          required
          data-test="channel-dialog-bot-token"
        />

        <AppInput
          v-model="chatId"
          :label="t('channel.chatId')"
          :hint="chats.length || chatsError ? undefined : t('channel.readChatsHint')"
          :error="chatsError"
          :action-label="t('channel.readChats')"
          :action-loading="chatsLoading"
          required
          data-test="channel-dialog-chat-id"
          @action="emit('readChats', botToken)"
        />

        <div v-if="chats.length" class="app-stack" data-test="channel-dialog-chats">
          <span class="app-field__label">{{ t('channel.chatIdPick') }}</span>
          <div class="app-row ds-wrap">
            <AppButton
              v-for="chat in chats"
              :key="chat.id"
              size="sm"
              :variant="chat.id === chatId ? 'primary' : 'ghost'"
              @click="chatId = chat.id"
            >
              {{ chat.title }} · {{ chat.id }}
            </AppButton>
          </div>
        </div>
      </template>

      <template v-else>
        <AppInput
          v-model="url"
          mono
          :label="t('channel.url')"
          required
          data-test="channel-dialog-url"
        />
        <AppInput
          v-model="secret"
          type="password"
          autocomplete="off"
          :label="t('channel.secret')"
          :placeholder="hasSecret ? t('channel.secretKept') : undefined"
          :hint="t('channel.secretHint')"
          data-test="channel-dialog-secret"
        />
      </template>
    </div>
  </FormDialog>
</template>
