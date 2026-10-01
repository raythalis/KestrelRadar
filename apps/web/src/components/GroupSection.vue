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

const columns = computed(() => [
  {
    key: 'discoveries' as const,
    icon: 'mdi-rss',
    title: t('column.discoveries'),
    hint: t('column.discoveriesHint'),
  },
  {
    key: 'monitors' as const,
    icon: 'mdi-filter-variant',
    title: t('column.monitors'),
    hint: t('column.monitorsHint'),
  },
  {
    key: 'actions' as const,
    icon: 'mdi-send',
    title: t('column.actions'),
    hint: t('column.actionsHint'),
  },
])

const counts = computed(() => [
  { key: 'discoveries', n: discoveries.value.length, label: t('column.discoveries') },
  { key: 'monitors', n: monitors.value.length, label: t('column.monitors') },
  { key: 'actions', n: actions.value.length, label: t('column.actions') },
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
      <button
        type="button"
        class="k-link chevron-btn"
        :class="{ 'chevron-btn--open': expanded }"
        data-test="group-toggle"
        @click="emit('toggle')"
      >
        <v-icon size="18">{{ expanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
      </button>

      <div class="flex-grow-1" style="min-width: 200px">
        <div class="d-flex align-center ga-2">
          <span class="group-card__name" data-test="group-name">{{ group.name }}</span>
          <span v-if="!group.enabled" class="k-tag k-tag--off" data-test="group-disabled">
            {{ t('common.disabled') }}
          </span>
        </div>
        <div class="group-card__desc" data-test="group-description">{{ group.description }}</div>
      </div>

      <div class="counts" data-test="group-counts">
        <span v-for="item in counts" :key="item.key">{{ item.n }} {{ item.label }}</span>
      </div>

      <div class="d-flex align-center" @click.stop>
        <v-switch
          :model-value="group.enabled"
          data-test="group-enabled"
          @update:model-value="(value) => store.setGroupEnabled(group, Boolean(value))"
        />
      </div>

      <button type="button" class="k-link" data-test="group-edit" @click="emit('edit')">
        {{ t('common.edit') }}
      </button>
      <button
        type="button"
        class="k-link k-link--danger"
        data-test="group-delete"
        @click="emit('delete')"
      >
        {{ t('common.delete') }}
      </button>
    </div>

    <div v-if="expanded" class="k-cols">
      <section v-for="column in columns" :key="column.key" :data-test="`column-${column.key}`">
        <div class="column-head">
          <v-icon size="16" :icon="column.icon" color="primary" />
          <span class="column-head__title">{{ column.title }}</span>
          <span class="k-spacer" />
          <button
            type="button"
            class="k-link"
            :data-test="`add-${column.key}`"
            @click="
              column.key === 'discoveries'
                ? emit('create-discovery')
                : column.key === 'monitors'
                  ? emit('create-monitor')
                  : emit('create-action')
            "
          >
            + {{ t('common.add') }}
          </button>
        </div>
        <p class="column-sub">{{ column.hint }}</p>

        <template v-if="column.key === 'discoveries'">
          <DiscoveryCard
            v-for="discovery in discoveries"
            :key="discovery.id"
            :discovery="discovery"
            @edit="emit('edit-discovery', discovery.id)"
            @delete="emit('delete-discovery', discovery.id)"
          />
          <div v-if="discoveries.length === 0" class="empty-state">
            <span>{{ t('column.empty') }}</span>
          </div>
        </template>

        <template v-else-if="column.key === 'monitors'">
          <MonitorCard
            v-for="monitor in monitors"
            :key="monitor.id"
            :monitor="monitor"
            @edit="emit('edit-monitor', monitor.id)"
            @delete="emit('delete-monitor', monitor.id)"
          />
          <div v-if="monitors.length === 0" class="empty-state">
            <span>{{ t('column.empty') }}</span>
          </div>
        </template>

        <template v-else>
          <ActionCard
            v-for="action in actions"
            :key="action.id"
            :action="action"
            @edit="emit('edit-action', action.id)"
            @delete="emit('delete-action', action.id)"
          />
          <div v-if="actions.length === 0" class="empty-state">
            <span>{{ t('column.empty') }}</span>
          </div>
        </template>
      </section>
    </div>
  </v-card>
</template>
