<script setup lang="ts">
import type { Channel } from '@kestrel/contracts'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { testChannel } from '@/api/config'
import ChannelDialog from '@/components/ChannelDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const { t } = useI18n()

const dialogOpen = ref(false)
const editing = ref<Channel | null>(null)
const pendingDelete = ref<Channel | null>(null)
const testing = ref('')
/** 每个渠道最近一次连通性结果，只在界面上留着，不入库 */
const testResults = ref<Record<string, { ok: boolean; message: string }>>({})

onMounted(() => {
  if (!store.snapshot) void store.load()
})

function openDialog(channel: Channel | null): void {
  editing.value = channel
  dialogOpen.value = true
}

function dotState(channel: Channel): string {
  if (testing.value === channel.id) return 'busy'
  const last = testResults.value[channel.id]
  if (!last) return 'idle'
  return last.ok ? 'ok' : 'err'
}

function dotText(channel: Channel): string {
  if (testing.value === channel.id) return t('channel.probeRunning')
  const last = testResults.value[channel.id]
  if (!last) return t('channel.probe')
  return last.ok ? t('channel.probeOk') : t('channel.probeFail')
}

function targetText(channel: Channel): string {
  return channel.type === 'webhook'
    ? (channel.config.url ?? '—')
    : `${t('channel.chatId')} ${channel.config.chatId ?? '—'}`
}

async function runTest(channel: Channel): Promise<void> {
  testing.value = channel.id
  try {
    const result = await testChannel(channel.id)
    testResults.value = { ...testResults.value, [channel.id]: result }
  } catch (error) {
    testResults.value = {
      ...testResults.value,
      [channel.id]: { ok: false, message: (error as { message?: string }).message ?? '' },
    }
  } finally {
    testing.value = ''
  }
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value
  pendingDelete.value = null
  if (target) await store.removeChannel(target.id)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-head__title">{{ t('nav.channels') }}</h2>
        <p class="page-head__note">{{ t('channel.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn
        color="primary"
        size="small"
        variant="flat"
        prepend-icon="mdi-plus"
        data-test="new-channel"
        @click="openDialog(null)"
      >
        {{ t('channel.add') }}
      </v-btn>
    </div>

    <v-alert
      v-if="store.errorMessage"
      type="error"
      variant="tonal"
      class="mb-4"
      data-test="channels-error"
    >
      {{ store.errorMessage }}
    </v-alert>

    <div v-if="store.channels.length === 0" class="empty-state" data-test="channels-empty">
      <span>{{ t('channel.empty') }}</span>
    </div>

    <div v-else class="d-flex flex-column">
      <div
        v-for="channel in store.channels"
        :key="channel.id"
        class="k-item"
        :class="{ 'k-item--off': !channel.enabled }"
        role="button"
        tabindex="0"
        data-test="channel-card"
        @click="openDialog(channel)"
        @keydown.enter.prevent="openDialog(channel)"
      >
        <div class="k-item__top">
          <span class="k-tag k-tag--accent" data-test="channel-type">
            {{ t(`channel.type.${channel.type}`) }}
          </span>
          <span v-if="!channel.enabled" class="k-tag k-tag--off">{{ t('common.disabled') }}</span>
          <span class="k-spacer" />
          <span @click.stop>
            <v-switch
              :model-value="channel.enabled"
              :title="channel.enabled ? t('common.enabled') : t('common.disabled')"
              data-test="channel-enabled"
              @update:model-value="
                (value) => store.saveChannel(channel.id, { enabled: Boolean(value) })
              "
            />
          </span>
        </div>

        <div class="k-item__title" data-test="channel-name">{{ channel.name }}</div>
        <div class="k-item__sub" data-test="channel-target">{{ targetText(channel) }}</div>

        <div class="k-item__meta" style="margin-top: 6px">
          <button
            type="button"
            class="status-dot"
            :class="`status-dot--${dotState(channel)}`"
            :disabled="testing === channel.id"
            :title="t('channel.probeHint')"
            data-test="channel-test"
            @click.stop="runTest(channel)"
          >
            {{ dotText(channel) }}
          </button>
        </div>

        <div
          v-if="testResults[channel.id]"
          class="k-hint"
          :class="testResults[channel.id]?.ok ? 'k-hint--warn' : 'k-hint--err'"
          data-test="channel-test-result"
        >
          {{ testResults[channel.id]?.message }}
        </div>

        <div class="k-item__foot">
          <span class="k-item__meta entity-meta--faint">
            {{ channel.hasSecret ? t('channel.hasSecret') : t('channel.noSecret') }}
          </span>
          <span class="k-spacer" />
          <button
            type="button"
            class="k-link k-link--danger"
            data-test="channel-delete"
            @click.stop="pendingDelete = channel"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <ChannelDialog v-model="dialogOpen" :channel="editing" />
    <ConfirmDialog
      :model-value="pendingDelete !== null"
      :title="t('channel.delete')"
      :body="t('channel.deleteBody', { name: pendingDelete?.name ?? '' })"
      @update:model-value="(value) => (pendingDelete = value ? pendingDelete : null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
