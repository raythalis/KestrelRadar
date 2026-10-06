<!-- 通知渠道页（v2）。
     渠道是「动作往哪里发」的落点，所以这一页只有一件事：把渠道列清楚、能试通、能改。
     页头 + 一条提示带（最近一次测试的结论）+ 卡片网格；卡片上不出现开关：
     启用、密钥、会话都在编辑弹窗里改（加渠道时先选类型）。
     页面负责数据与写操作，卡片 / 弹窗只出事件。 -->
<script setup lang="ts">
import type { Channel, ChannelType } from '@kestrel/contracts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { readTelegramChats, testChannel } from '@/api/config'
import ChannelCard from '@/components/biz/ChannelCard.vue'
import ChannelDialog from '@/components/biz/ChannelDialog.vue'
import ConfirmDialog from '@/components/biz/ConfirmDialog.vue'
import type { ChannelChat, ChannelDialogValues } from '@/components/biz/types'
import { useConfigStore } from '@/stores/config'
import { useToastStore } from '@/stores/toast'

const store = useConfigStore()
const toast = useToastStore()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

type DotState = 'idle' | 'testing' | 'ok' | 'warn' | 'fail'

/** 每张卡右下角圆点的状态（就地结论：测过没测过、成没成，一眼能看出来） */
const dots = ref<Record<string, DotState>>({})

/** 新建渠道要先选类型：这个菜单只在点「新建渠道」时出现 */
const typeMenuOpen = ref(false)

const dialogOpen = ref(false)
const editing = ref<Channel | null>(null)
const dialogType = ref<ChannelType>('telegram')

const chats = ref<ChannelChat[]>([])
const chatsLoading = ref(false)
const chatsError = ref('')

const pendingDelete = ref<Channel | null>(null)

onMounted(() => {
  if (!store.snapshot) void store.load()
  document.addEventListener('click', closeTypeMenu)
  // 从动作弹窗点「新建通知渠道」跳过来：直接把新建拉起来（默认 Telegram），并清掉地址里的标记
  if (route?.query?.new === '1') {
    openCreate('telegram')
    void router?.replace({ name: 'channels' })
  }
})

onBeforeUnmount(() => document.removeEventListener('click', closeTypeMenu))

function closeTypeMenu(): void {
  typeMenuOpen.value = false
}

function openCreate(type: ChannelType): void {
  editing.value = null
  dialogType.value = type
  chats.value = []
  chatsError.value = ''
  typeMenuOpen.value = false
  dialogOpen.value = true
}

function openEdit(channel: Channel): void {
  editing.value = channel
  dialogType.value = channel.type
  chats.value = []
  chatsError.value = ''
  // 改了凭证，旧的测试结论作废（圆点回到未测）
  dots.value = { ...dots.value, [channel.id]: 'idle' }
  dialogOpen.value = true
}

async function readChats(values: { token: string; channelId?: string }): Promise<void> {
  chatsLoading.value = true
  chatsError.value = ''
  try {
    chats.value = await readTelegramChats({
      token: values.token.trim() || undefined,
      channelId: values.channelId,
    })
    if (chats.value.length === 0) chatsError.value = t('channel.noChatsHint')
  } catch (error) {
    chatsError.value = (error as { message?: string }).message ?? t('channel.readFailed')
  } finally {
    chatsLoading.value = false
  }
}

async function submitChannel(values: ChannelDialogValues): Promise<void> {
  const config: Record<string, string> =
    values.type === 'telegram' ? { chatId: values.chatId.trim() } : { url: values.url.trim() }
  const payload = {
    name: values.name.trim(),
    type: values.type,
    enabled: values.enabled,
    config,
    ...(values.secret.trim().length > 0 ? { secret: values.secret.trim() } : {}),
  }
  const ok = editing.value
    ? await store.saveChannel(editing.value.id, payload)
    : await store.createChannel(payload)
  if (!ok) return
  if (editing.value) dots.value = { ...dots.value, [editing.value.id]: 'idle' }
  dialogOpen.value = false
}

async function runTest(channel: Channel): Promise<void> {
  dots.value = { ...dots.value, [channel.id]: 'testing' }
  try {
    const result = await testChannel(channel.id)
    dots.value = { ...dots.value, [channel.id]: result.ok ? 'ok' : 'warn' }
    toast.push(`${channel.name}：${result.message}`, result.ok ? 'success' : 'danger')
  } catch (error) {
    dots.value = { ...dots.value, [channel.id]: 'fail' }
    const message = (error as { message?: string }).message ?? t('channel.testFailed')
    toast.push(`${channel.name}：${message}`, 'danger')
  }
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value
  pendingDelete.value = null
  if (target) await store.removeChannel(target.id)
}

/** 页面级错误条已下线：弹窗开着时留给弹窗说，其余由浮层说 */
watch(
  () => store.errorMessage,
  (message) => {
    if (message && !dialogOpen.value && !pendingDelete.value) toast.push(message)
  },
)
</script>

<template>
  <div class="k2-page k2-page--wide" data-test="channels-page">
    <div class="k2-page__head">
      <div class="k2-page__lead">
        <h1 class="k2-page__title">{{ t('nav.channels') }}</h1>
        <p class="k2-page__note">{{ t('channel.subtitle') }}</p>
      </div>
      <div class="k2-page__actions">
        <div class="k2-chan__new">
          <button
            type="button"
            class="k2-btn k2-btn--primary"
            data-test="new-channel"
            @click.stop="typeMenuOpen = !typeMenuOpen"
          >
            <i class="mdi mdi-plus" />
            {{ t('channel.add') }}
          </button>
          <div v-if="typeMenuOpen" class="k2-menu" data-test="channel-type-menu" @click.stop>
            <button
              type="button"
              class="k2-menu__item"
              data-test="new-channel-telegram"
              @click="openCreate('telegram')"
            >
              {{ t('channel.type.telegram') }}
            </button>
            <button
              type="button"
              class="k2-menu__item"
              data-test="new-channel-webhook"
              @click="openCreate('webhook')"
            >
              {{ t('channel.type.webhook') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <section v-if="store.channels.length === 0" class="k2-card k2-card--flat">
      <div class="k2-empty" data-test="channels-empty">
        <i class="mdi mdi-bell-outline" />
        <span class="k2-empty__title">{{ t('channel.empty') }}</span>
      </div>
    </section>

    <div v-else class="k2-grid" data-test="channels-list">
      <ChannelCard
        v-for="channel in store.channels"
        :key="channel.id"
        :name="channel.name"
        :type="channel.type"
        :enabled="channel.enabled"
        :last-pushed-at="channel.lastDeliveredAt"
        :tone="channel.enabled ? 'ok' : 'neutral'"
        :probe="dots[channel.id] ?? 'idle'"
        @edit="openEdit(channel)"
        @test="runTest(channel)"
        @delete="pendingDelete = channel"
      />
    </div>

    <ChannelDialog
      v-model="dialogOpen"
      :name="editing?.name ?? ''"
      :type="dialogType"
      :enabled="editing?.enabled ?? true"
      :chat-id="editing?.config.chatId ?? ''"
      :url="editing?.config.url ?? ''"
      :has-secret="editing?.hasSecret ?? false"
      :chats="chats"
      :chats-loading="chatsLoading"
      :chats-error="chatsError"
      :busy="store.saving"
      :error="store.errorMessage ?? ''"
      @submit="submitChannel"
      @read-chats="(token: string) => readChats({ token, channelId: editing?.id })"
    />

    <ConfirmDialog
      :model-value="pendingDelete !== null"
      :title="t('channel.delete')"
      :message="t('channel.deleteBody', { name: pendingDelete?.name ?? '' })"
      @update:model-value="(value) => (pendingDelete = value ? pendingDelete : null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
