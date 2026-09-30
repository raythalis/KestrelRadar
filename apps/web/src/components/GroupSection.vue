<script setup lang="ts">
import type { Group } from '@kestrel/contracts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ActionCard from '@/components/ActionCard.vue'
import DiscoveryCard from '@/components/DiscoveryCard.vue'
import MonitorCard from '@/components/MonitorCard.vue'
import { useConfigStore } from '@/stores/config'

const props = defineProps<{ group: Group; expanded: boolean; selected: boolean }>()
const emit = defineEmits<{
  toggle: []
  select: []
  edit: []
  delete: []
  'create-discovery': []
  'edit-discovery': [id: string]
  'delete-discovery': [id: string]
  'create-monitor': []
  'edit-monitor': [id: string]
  'delete-monitor': [id: string]
  'create-action': []
  'edit-action': [id: string]
  'delete-action': [id: string]
}>()

const store = useConfigStore()
const { t } = useI18n()

const discoveries = computed(() => store.discoveriesOf(props.group.id))
const monitors = computed(() => store.monitorsOf(props.group.id))
const actions = computed(() => store.actionsOf(props.group.id))
const summary = computed(() =>
  t('config.groupSummary', {
    d: discoveries.value.length,
    m: monitors.value.length,
    a: actions.value.length,
  }),
)

const columns = computed(() => [
  {
    key: 'discoveries' as const,
    icon: 'mdi-rss',
    title: t('column.discoveries'),
    hint: t('column.discoveriesHint'),
    count: discoveries.value.length,
  },
  {
    key: 'monitors' as const,
    icon: 'mdi-filter-variant',
    title: t('column.monitors'),
    hint: t('column.monitorsHint'),
    count: monitors.value.length,
  },
  {
    key: 'actions' as const,
    icon: 'mdi-send',
    title: t('column.actions'),
    hint: t('column.actionsHint'),
    count: actions.value.length,
  },
])
</script>

<template>
  <v-card class="group-card" data-test="group-section">
    <div class="group-card__head">
      <v-checkbox-btn
        :model-value="selected"
        data-test="group-select"
        @update:model-value="emit('select')"
      />
      <v-btn
        :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        variant="text"
        size="small"
        class="chevron-btn"
        data-test="group-toggle"
        @click="emit('toggle')"
      />
      <div class="flex-grow-1">
        <div class="d-flex align-center ga-2">
          <span class="group-card__name" data-test="group-name">{{ group.name }}</span>
          <v-chip v-if="!group.enabled" size="x-small" color="warning" data-test="group-disabled">
            {{ t('common.disabled') }}
          </v-chip>
        </div>
        <div class="group-card__desc" data-test="group-description">{{ group.description }}</div>
      </div>
      <v-chip size="x-small" variant="tonal" class="group-card__stats" data-test="group-counts">
        {{ summary }}
      </v-chip>
      <v-switch
        :model-value="group.enabled"
        data-test="group-enabled"
        @update:model-value="(value) => store.setGroupEnabled(group, Boolean(value))"
      />
      <v-btn
        icon="mdi-pencil"
        variant="text"
        size="small"
        data-test="group-edit"
        @click="emit('edit')"
      />
      <v-btn
        icon="mdi-delete"
        variant="text"
        size="small"
        color="error"
        data-test="group-delete"
        @click="emit('delete')"
      />
    </div>

    <template v-if="expanded">
      <v-divider style="border-color: var(--k-border)" />
      <v-row density="compact" class="pa-3">
        <v-col v-for="column in columns" :key="column.key" cols="12" md="4">
          <div class="column-panel" :data-test="`column-${column.key}`">
            <div class="column-head">
              <v-icon size="15" :icon="column.icon" color="primary" />
              <span class="column-head__title">{{ column.title }}</span>
              <v-chip size="x-small" label variant="tonal">{{ column.count }}</v-chip>
              <span class="column-head__hint">{{ column.hint }}</span>
              <v-spacer />
              <v-btn
                icon="mdi-plus"
                variant="text"
                size="x-small"
                :data-test="`add-${column.key}`"
                @click="
                  column.key === 'discoveries'
                    ? emit('create-discovery')
                    : column.key === 'monitors'
                      ? emit('create-monitor')
                      : emit('create-action')
                "
              />
            </div>

            <div v-if="column.key === 'discoveries'" class="d-flex flex-column ga-2">
              <DiscoveryCard
                v-for="discovery in discoveries"
                :key="discovery.id"
                :discovery="discovery"
                @edit="emit('edit-discovery', discovery.id)"
                @delete="emit('delete-discovery', discovery.id)"
              />
              <div v-if="discoveries.length === 0" class="empty-state">
                <v-icon size="18" icon="mdi-rss-box" />
                <span>{{ t('column.empty') }}</span>
              </div>
            </div>

            <div v-else-if="column.key === 'monitors'" class="d-flex flex-column ga-2">
              <MonitorCard
                v-for="monitor in monitors"
                :key="monitor.id"
                :monitor="monitor"
                @edit="emit('edit-monitor', monitor.id)"
                @delete="emit('delete-monitor', monitor.id)"
              />
              <div v-if="monitors.length === 0" class="empty-state">
                <v-icon size="18" icon="mdi-filter-variant" />
                <span>{{ t('column.empty') }}</span>
              </div>
            </div>

            <div v-else class="d-flex flex-column ga-2">
              <ActionCard
                v-for="action in actions"
                :key="action.id"
                :action="action"
                @edit="emit('edit-action', action.id)"
                @delete="emit('delete-action', action.id)"
              />
              <div v-if="actions.length === 0" class="empty-state">
                <v-icon size="18" icon="mdi-send-outline" />
                <span>{{ t('column.empty') }}</span>
              </div>
            </div>
          </div>
        </v-col>
      </v-row>
    </template>
  </v-card>
</template>
