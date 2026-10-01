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
/** 每个渠道最近一次测试的结果，只在界面上留着，不入库 */
const testResults = ref<Record<string, { ok: boolean; message: string }>>({})

onMounted(() => {
  if (!store.snapshot) void store.load()
})

function openDialog(channel: Channel | null): void {
  editing.value = channel
  dialogOpen.value = true
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
      <v-icon size="22" icon="mdi-broadcast" />
      <span>{{ t('channel.empty') }}</span>
    </div>

    <div v-else class="d-flex flex-column ga-3">
      <v-card
        v-for="channel in store.channels"
        :key="channel.id"
        class="entity-card entity-card--action pa-4"
        data-test="channel-card"
      >
        <div class="d-flex align-center ga-2">
          <span class="entity-card__title" data-test="channel-name">{{ channel.name }}</span>
          <v-chip size="x-small" label variant="tonal" color="primary" data-test="channel-type">
            {{ t(`channel.type.${channel.type}`) }}
          </v-chip>
          <v-spacer />
          <v-switch
            :model-value="channel.enabled"
            data-test="channel-enabled"
            @update:model-value="
              (value) => store.saveChannel(channel.id, { enabled: Boolean(value) })
            "
          />
        </div>

        <div class="entity-meta" data-test="channel-target">
          {{
            channel.type === 'webhook'
              ? channel.config.url
              : `${t('channel.chatId')} ${channel.config.chatId ?? '—'}`
          }}
        </div>
        <div v-if="channel.type === 'webhook'" class="entity-meta entity-meta--faint">
          {{ channel.hasSecret ? t('channel.hasSecret') : t('channel.noSecret') }}
        </div>

        <div
          v-if="testResults[channel.id]"
          class="entity-meta mt-2"
          :style="{ color: testResults[channel.id]?.ok ? 'var(--k-ok)' : 'var(--k-accent-2)' }"
          data-test="channel-test-result"
        >
          {{ testResults[channel.id]?.message }}
        </div>

        <div class="d-flex align-center ga-1 mt-2">
          <v-btn
            size="x-small"
            variant="text"
            prepend-icon="mdi-access-point"
            :loading="testing === channel.id"
            data-test="channel-test"
            @click="runTest(channel)"
          >
            {{ t('channel.test') }}
          </v-btn>
          <v-spacer />
          <v-btn
            size="x-small"
            variant="text"
            icon="mdi-pencil"
            data-test="channel-edit"
            @click="openDialog(channel)"
          />
          <v-btn
            size="x-small"
            variant="text"
            color="error"
            icon="mdi-delete"
            data-test="channel-delete"
            @click="pendingDelete = channel"
          />
        </div>
      </v-card>
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
