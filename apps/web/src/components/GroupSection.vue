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
</script>

<template>
  <v-card variant="outlined" data-test="group-section">
    <div class="d-flex align-center ga-2 pa-3">
      <v-checkbox-btn
        :model-value="selected"
        data-test="group-select"
        @update:model-value="emit('select')"
      />
      <v-btn
        :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        variant="text"
        size="small"
        data-test="group-toggle"
        @click="emit('toggle')"
      />
      <div class="flex-grow-1">
        <div class="d-flex align-center ga-2">
          <span class="text-body-1 font-weight-medium" data-test="group-name">{{
            group.name
          }}</span>
          <v-chip v-if="!group.enabled" size="x-small" color="warning" data-test="group-disabled">
            {{ t('common.disabled') }}
          </v-chip>
        </div>
        <div class="text-caption text-medium-emphasis" data-test="group-description">
          {{ group.description }}
        </div>
      </div>
      <div class="text-caption text-medium-emphasis" data-test="group-counts">{{ summary }}</div>
      <v-switch
        :model-value="group.enabled"
        color="primary"
        density="compact"
        hide-details
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
      <v-divider />
      <v-row dense class="pa-3">
        <v-col cols="12" md="4" data-test="column-discoveries">
          <div class="d-flex align-center ga-2 mb-2">
            <span class="text-subtitle-2">{{ t('column.discoveries') }}</span>
            <v-chip size="x-small" label>{{ discoveries.length }}</v-chip>
            <span class="text-caption text-medium-emphasis">{{ t('column.discoveriesHint') }}</span>
            <v-spacer />
            <v-btn
              icon="mdi-plus"
              variant="text"
              size="x-small"
              data-test="add-discovery"
              @click="emit('create-discovery')"
            />
          </div>
          <div class="d-flex flex-column ga-2">
            <DiscoveryCard
              v-for="discovery in discoveries"
              :key="discovery.id"
              :discovery="discovery"
              @edit="emit('edit-discovery', discovery.id)"
              @delete="emit('delete-discovery', discovery.id)"
            />
            <div v-if="discoveries.length === 0" class="text-caption text-medium-emphasis">
              {{ t('column.empty') }}
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="4" data-test="column-monitors">
          <div class="d-flex align-center ga-2 mb-2">
            <span class="text-subtitle-2">{{ t('column.monitors') }}</span>
            <v-chip size="x-small" label>{{ monitors.length }}</v-chip>
            <span class="text-caption text-medium-emphasis">{{ t('column.monitorsHint') }}</span>
            <v-spacer />
            <v-btn
              icon="mdi-plus"
              variant="text"
              size="x-small"
              data-test="add-monitor"
              @click="emit('create-monitor')"
            />
          </div>
          <div class="d-flex flex-column ga-2">
            <MonitorCard
              v-for="monitor in monitors"
              :key="monitor.id"
              :monitor="monitor"
              @edit="emit('edit-monitor', monitor.id)"
              @delete="emit('delete-monitor', monitor.id)"
            />
            <div v-if="monitors.length === 0" class="text-caption text-medium-emphasis">
              {{ t('column.empty') }}
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="4" data-test="column-actions">
          <div class="d-flex align-center ga-2 mb-2">
            <span class="text-subtitle-2">{{ t('column.actions') }}</span>
            <v-chip size="x-small" label>{{ actions.length }}</v-chip>
            <span class="text-caption text-medium-emphasis">{{ t('column.actionsHint') }}</span>
            <v-spacer />
            <v-btn
              icon="mdi-plus"
              variant="text"
              size="x-small"
              data-test="add-action"
              @click="emit('create-action')"
            />
          </div>
          <div class="d-flex flex-column ga-2">
            <ActionCard
              v-for="action in actions"
              :key="action.id"
              :action="action"
              @edit="emit('edit-action', action.id)"
              @delete="emit('delete-action', action.id)"
            />
            <div v-if="actions.length === 0" class="text-caption text-medium-emphasis">
              {{ t('column.empty') }}
            </div>
          </div>
        </v-col>
      </v-row>
    </template>
  </v-card>
</template>
