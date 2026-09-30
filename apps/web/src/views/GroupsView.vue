<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useWorkspaceStore } from '@/stores/workspace'
import type { ActionCard, AnyCard, SourceCard, WatcherCard } from '@/types/domain'

const { t } = useI18n()
const workspace = useWorkspaceStore()

function iconFor(card: AnyCard): string {
  if (card.kind === 'source') return 'mdi-rss'
  if (card.kind === 'watcher') return 'mdi-eye-outline'
  return 'mdi-send-outline'
}

function subtitleFor(card: AnyCard): string {
  if (card.kind === 'source') {
    const source = card as SourceCard
    return `${t('groups.connector')}: ${source.connector}`
  }
  if (card.kind === 'watcher') {
    const watcher = card as WatcherCard
    return `${t('groups.focus')}: ${watcher.focus}`
  }
  const action = card as ActionCard
  const trigger =
    action.trigger === 'instant' ? t('groups.triggerInstant') : t('groups.triggerDigest')
  return `${t('groups.trigger')}: ${trigger}`
}
</script>

<template>
  <div>
    <h1 class="text-h5 font-weight-bold">{{ t('groups.title') }}</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">{{ t('groups.subtitle') }}</p>

    <v-expansion-panels variant="accordion">
      <v-expansion-panel v-for="group in workspace.groups" :key="group.id">
        <v-expansion-panel-title>
          <div class="d-flex align-center flex-grow-1">
            <span class="font-weight-medium">{{ group.name }}</span>
            <v-chip
              class="ms-3"
              size="x-small"
              :color="group.enabled ? 'success' : 'default'"
              variant="tonal"
            >
              {{ group.enabled ? t('common.enabled') : t('common.disabled') }}
            </v-chip>
            <v-spacer />
            <span class="text-caption text-medium-emphasis">{{ group.cards.length }}</span>
          </div>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <p class="text-body-2 text-medium-emphasis">{{ group.description }}</p>

          <v-list density="compact" class="mt-2">
            <v-list-item v-for="card in group.cards" :key="card.id">
              <template #prepend>
                <v-icon :icon="iconFor(card)" />
              </template>
              <v-list-item-title>
                {{ card.name }}
                <v-chip
                  v-if="!card.enabled"
                  class="ms-2"
                  size="x-small"
                  variant="tonal"
                  color="default"
                >
                  {{ t('common.disabled') }}
                </v-chip>
              </v-list-item-title>
              <v-list-item-subtitle>{{ subtitleFor(card) }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
