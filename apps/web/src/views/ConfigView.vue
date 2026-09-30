<script setup lang="ts">
import type { Action, Discovery, Group, Monitor } from '@kestrel/contracts'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ActionDialog from '@/components/ActionDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DiscoveryDialog from '@/components/DiscoveryDialog.vue'
import GroupDialog from '@/components/GroupDialog.vue'
import GroupSection from '@/components/GroupSection.vue'
import MonitorDialog from '@/components/MonitorDialog.vue'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const { t } = useI18n()

/** 同一时刻可以展开多个分组 */
const expanded = ref<string[]>([])
const selected = ref<string[]>([])

const groupDialogOpen = ref(false)
const editingGroup = ref<Group | null>(null)

const discoveryDialogOpen = ref(false)
const discoveryGroupId = ref('')
const editingDiscovery = ref<Discovery | null>(null)

const monitorDialogOpen = ref(false)
const monitorGroupId = ref('')
const editingMonitor = ref<Monitor | null>(null)

const actionDialogOpen = ref(false)
const actionGroupId = ref('')
const editingAction = ref<Action | null>(null)

interface PendingDelete {
  title: string
  body: string
  run: () => Promise<unknown>
}
const pendingDelete = ref<PendingDelete | null>(null)

onMounted(() => {
  void store.load()
})

const allExpanded = computed(
  () => store.groups.length > 0 && expanded.value.length === store.groups.length,
)

function toggleGroup(id: string): void {
  expanded.value = expanded.value.includes(id)
    ? expanded.value.filter((value) => value !== id)
    : [...expanded.value, id]
}

function toggleAll(): void {
  expanded.value = allExpanded.value ? [] : store.groups.map((group) => group.id)
}

function toggleSelect(id: string): void {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((value) => value !== id)
    : [...selected.value, id]
}

function openGroupDialog(group: Group | null): void {
  editingGroup.value = group
  groupDialogOpen.value = true
}

function openDiscoveryDialog(groupId: string, id: string | null): void {
  discoveryGroupId.value = groupId
  editingDiscovery.value = id
    ? (store.discoveriesOf(groupId).find((item) => item.id === id) ?? null)
    : null
  discoveryDialogOpen.value = true
}

function openMonitorDialog(groupId: string, id: string | null): void {
  monitorGroupId.value = groupId
  editingMonitor.value = id
    ? (store.monitorsOf(groupId).find((item) => item.id === id) ?? null)
    : null
  monitorDialogOpen.value = true
}

function openActionDialog(groupId: string, id: string | null): void {
  actionGroupId.value = groupId
  editingAction.value = id
    ? (store.actionsOf(groupId).find((item) => item.id === id) ?? null)
    : null
  actionDialogOpen.value = true
}

function askDeleteGroup(group: Group): void {
  pendingDelete.value = {
    title: t('config.deleteGroup'),
    body: t('config.deleteGroupBody', { name: group.name }),
    run: () => store.removeGroups([group.id]),
  }
}

function askDeleteSelected(): void {
  const ids = [...selected.value]
  pendingDelete.value = {
    title: t('config.deleteSelected'),
    body: t('config.deleteSelectedBody', { n: ids.length }),
    run: async () => {
      await store.removeGroups(ids)
      selected.value = []
    },
  }
}

function askDeleteDiscovery(discovery: Discovery): void {
  pendingDelete.value = {
    title: t('discovery.delete'),
    body: t('discovery.deleteBody'),
    run: () => store.removeDiscovery(discovery.id),
  }
}

function askDeleteMonitor(monitor: Monitor): void {
  pendingDelete.value = {
    title: t('monitor.delete'),
    body: t('monitor.deleteBody'),
    run: () => store.removeMonitor(monitor.id),
  }
}

function askDeleteAction(action: Action): void {
  pendingDelete.value = {
    title: t('action.delete'),
    body: t('action.deleteBody'),
    run: () => store.removeAction(action.id),
  }
}

async function confirmDelete(): Promise<void> {
  const pending = pendingDelete.value
  pendingDelete.value = null
  if (pending) await pending.run()
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-head__title">{{ t('config.title') }}</h2>
        <p class="page-head__note">{{ t('config.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn
        v-if="selected.length > 0"
        color="error"
        variant="tonal"
        size="small"
        prepend-icon="mdi-delete-outline"
        data-test="delete-selected"
        @click="askDeleteSelected"
      >
        {{ t('config.deleteSelected') }}（{{ selected.length }}）
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        :prepend-icon="allExpanded ? 'mdi-unfold-less-horizontal' : 'mdi-unfold-more-horizontal'"
        data-test="toggle-all"
        @click="toggleAll"
      >
        {{ allExpanded ? t('config.collapseAll') : t('config.expandAll') }}
      </v-btn>
      <v-btn
        color="primary"
        size="small"
        variant="flat"
        prepend-icon="mdi-plus"
        data-test="new-group"
        @click="openGroupDialog(null)"
      >
        {{ t('config.newGroup') }}
      </v-btn>
    </div>

    <v-alert
      v-if="store.errorMessage"
      type="error"
      variant="tonal"
      class="mb-4"
      data-test="config-error"
    >
      {{ store.errorMessage }}
    </v-alert>

    <v-skeleton-loader v-if="store.loading && store.groups.length === 0" type="article" />

    <div v-else-if="store.groups.length === 0" class="empty-state" data-test="config-empty">
      <v-icon size="22" icon="mdi-folder-outline" />
      <span>{{ t('config.empty') }}</span>
      <v-btn color="primary" size="small" class="mt-1" @click="openGroupDialog(null)">
        {{ t('config.newGroup') }}
      </v-btn>
    </div>

    <div v-else class="d-flex flex-column ga-3">
      <GroupSection
        v-for="group in store.groups"
        :key="group.id"
        :group="group"
        :expanded="expanded.includes(group.id)"
        :selected="selected.includes(group.id)"
        @toggle="toggleGroup(group.id)"
        @select="toggleSelect(group.id)"
        @edit="openGroupDialog(group)"
        @delete="askDeleteGroup(group)"
        @create-discovery="openDiscoveryDialog(group.id, null)"
        @edit-discovery="(id) => openDiscoveryDialog(group.id, id)"
        @delete-discovery="
          (id) => askDeleteDiscovery(store.discoveriesOf(group.id).find((item) => item.id === id)!)
        "
        @create-monitor="openMonitorDialog(group.id, null)"
        @edit-monitor="(id) => openMonitorDialog(group.id, id)"
        @delete-monitor="
          (id) => askDeleteMonitor(store.monitorsOf(group.id).find((item) => item.id === id)!)
        "
        @create-action="openActionDialog(group.id, null)"
        @edit-action="(id) => openActionDialog(group.id, id)"
        @delete-action="
          (id) => askDeleteAction(store.actionsOf(group.id).find((item) => item.id === id)!)
        "
      />
    </div>

    <GroupDialog v-model="groupDialogOpen" :group="editingGroup" />
    <DiscoveryDialog
      v-model="discoveryDialogOpen"
      :group-id="discoveryGroupId"
      :discovery="editingDiscovery"
    />
    <MonitorDialog
      v-model="monitorDialogOpen"
      :group-id="monitorGroupId"
      :monitor="editingMonitor"
    />
    <ActionDialog v-model="actionDialogOpen" :group-id="actionGroupId" :action="editingAction" />

    <ConfirmDialog
      :model-value="pendingDelete !== null"
      :title="pendingDelete?.title ?? ''"
      :body="pendingDelete?.body ?? ''"
      @update:model-value="(value) => (pendingDelete = value ? pendingDelete : null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
