<!-- ChannelDialog：通知渠道的填表弹窗（业务组件层）。
     一个弹窗只管一种渠道：类型由调用方给定（加渠道时选哪种类型是页面的活，放到通知渠道页那一步做），
     弹窗里只出这一种渠道要填的东西——Telegram 要 token 加会话，Webhook 要地址加可选密钥。
     密钥从不回显（接口只回「配过没有」）：配过就提示留空表示不改，一输入就是覆盖。
     只出事件：组装好的值、读取会话、保存都由页面接；组件不碰 store、不发请求。 -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/components/app/AppButton.vue'
import { isHttpUrl } from '@kestrel/contracts'

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
    type: 'telegram' | 'webhook' | 'wecom' | 'dingtalk' | 'feishu' | 'email'
    enabled?: boolean
    chatId?: string
    url?: string
    sign?: boolean
    host?: string
    port?: string
    secure?: boolean
    from?: string
    to?: string
    username?: string
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
    sign: false,
    host: '',
    port: '587',
    secure: false,
    from: '',
    to: '',
    username: '',
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
const sign = ref(props.sign)
const host = ref(props.host)
const port = ref(props.port)
const secure = ref(props.secure)
const from = ref(props.from)
const to = ref(props.to)
const username = ref(props.username)
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
    sign.value = props.sign
    host.value = props.host
    port.value = props.port
    secure.value = props.secure
    from.value = props.from
    to.value = props.to
    username.value = props.username
    botToken.value = ''
    secret.value = ''
  },
  { immediate: true },
)

/** 类型不作为字段：它由页面在添加时定下，这里只把种类写进标题，让用户知道在配哪种渠道 */
const typeName = computed(() => t(`channel.type.${props.type}`))
const title = computed(() =>
  t(props.name ? 'channel.editTyped' : 'channel.addTyped', { type: typeName.value }),
)

const urlInvalid = computed(() => url.value.trim() !== '' && !isHttpUrl(url.value))

const submitDisabled = computed(() => {
  if (!name.value.trim()) return true
  if (props.type === 'telegram') {
    const hasToken = props.hasSecret || botToken.value.trim().length > 0
    return !hasToken || !chatId.value.trim()
  }
  if (props.type === 'email')
    return !(host.value.trim() && port.value.trim() && from.value.trim() && to.value.trim())
  return !isHttpUrl(url.value)
})

function submit(): void {
  const isTelegram = props.type === 'telegram'
  const values: ChannelDialogValues = {
    name: name.value.trim(),
    type: props.type,
    enabled: enabled.value,
    chatId: isTelegram ? chatId.value.trim() : '',
    url: isTelegram ? '' : url.value.trim(),
    secret: isTelegram ? botToken.value : secret.value,
  }
  if (props.type === 'dingtalk' || props.type === 'feishu') values.sign = sign.value
  if (props.type === 'email') {
    values.url = ''
    values.host = host.value.trim()
    values.port = port.value.trim()
    values.secure = secure.value
    values.from = from.value.trim()
    values.to = to.value.trim()
    values.username = username.value.trim()
  }
  emit('submit', values)
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
    :width="type === 'email' ? 760 : 480"
    :dialog-class="type === 'email' ? 'k2-dialog--email' : undefined"
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
          :maxlength="200"
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
          :maxlength="120"
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

      <template v-else-if="type === 'email'">
        <div class="k2-channel-email-form">
          <AppInput
            v-model="host"
            mono
            :label="t('channel.smtpHost')"
            required
            data-test="channel-dialog-smtp-host"
          />
          <AppInput
            v-model="port"
            :label="t('channel.smtpPort')"
            required
            data-test="channel-dialog-smtp-port"
          />
          <AppSwitch v-model="secure" :label="t('channel.smtpSecure')" />
          <AppInput
            v-model="from"
            :label="t('channel.from')"
            required
            data-test="channel-dialog-from"
          />
          <AppInput v-model="to" :label="t('channel.to')" required data-test="channel-dialog-to" />
          <AppInput
            v-model="username"
            :label="t('channel.username')"
            data-test="channel-dialog-username"
          />
          <AppInput
            v-model="secret"
            type="password"
            autocomplete="off"
            :label="t('channel.secret')"
            :placeholder="hasSecret ? t('channel.secretKept') : undefined"
            :hint="t('channel.smtpHint')"
            :maxlength="500"
            data-test="channel-dialog-secret"
          />
        </div>
      </template>

      <template v-else>
        <AppInput
          v-model="url"
          mono
          :label="t('channel.url')"
          :hint="t('channel.urlHint')"
          :error="urlInvalid ? t('channel.urlInvalid') : undefined"
          :maxlength="500"
          required
          data-test="channel-dialog-url"
        />
        <AppSwitch
          v-if="type === 'dingtalk' || type === 'feishu'"
          v-model="sign"
          :label="t('channel.sign')"
          :hint="t('channel.signHint')"
        />
        <AppInput
          v-if="type === 'webhook' || ((type === 'dingtalk' || type === 'feishu') && sign)"
          v-model="secret"
          type="password"
          autocomplete="off"
          :label="type === 'webhook' ? t('channel.secret') : t('channel.secretRequired')"
          :placeholder="hasSecret ? t('channel.secretKept') : undefined"
          :hint="type === 'webhook' ? t('channel.secretHint') : undefined"
          :maxlength="500"
          data-test="channel-dialog-secret"
        />
      </template>
    </div>
  </FormDialog>
</template>
