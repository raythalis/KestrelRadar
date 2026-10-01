<script setup lang="ts">
import type { ModelProvider } from '@kestrel/contracts'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ProviderDialog from '@/components/ProviderDialog.vue'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const { t } = useI18n()

const dialogOpen = ref(false)
const editing = ref<ModelProvider | null>(null)
const pendingDelete = ref<ModelProvider | null>(null)
/** 每个供应商下面「加一个模型」输入框里的草稿 */
const drafts = ref<Record<string, string>>({})

onMounted(() => {
  if (!store.snapshot) void store.load()
})

function openDialog(provider: ModelProvider | null): void {
  editing.value = provider
  dialogOpen.value = true
}

async function addModel(providerId: string): Promise<void> {
  const modelName = (drafts.value[providerId] ?? '').trim()
  if (modelName.length === 0) return
  const ok = await store.createModel(providerId, { modelName, enabled: true, sortOrder: 0 })
  if (ok) drafts.value = { ...drafts.value, [providerId]: '' }
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value
  pendingDelete.value = null
  if (target) await store.removeProvider(target.id)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-head__title">{{ t('nav.models') }}</h2>
        <p class="page-head__note">{{ t('model.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn
        color="primary"
        size="small"
        variant="flat"
        prepend-icon="mdi-plus"
        data-test="new-provider"
        @click="openDialog(null)"
      >
        {{ t('model.addProvider') }}
      </v-btn>
    </div>

    <v-alert
      v-if="store.errorMessage"
      type="error"
      variant="tonal"
      class="mb-4"
      data-test="models-error"
    >
      {{ store.errorMessage }}
    </v-alert>

    <div v-if="store.providers.length === 0" class="empty-state" data-test="models-empty">
      <v-icon size="22" icon="mdi-brain" />
      <span>{{ t('model.empty') }}</span>
    </div>

    <div v-else class="d-flex flex-column ga-3">
      <v-card
        v-for="provider in store.providers"
        :key="provider.id"
        class="entity-card entity-card--monitor pa-4"
        data-test="provider-card"
      >
        <div class="d-flex align-center ga-2">
          <span class="entity-card__title" data-test="provider-name">{{ provider.name }}</span>
          <v-chip size="x-small" label variant="tonal" color="accent" data-test="provider-kind">
            {{ t(`model.kind.${provider.kind}`) }}
          </v-chip>
          <v-chip v-if="provider.hasApiKey" size="x-small" label variant="tonal">
            {{ t('model.hasApiKey') }}
          </v-chip>
          <v-spacer />
          <v-switch
            :model-value="provider.enabled"
            data-test="provider-enabled"
            @update:model-value="
              (value) => store.saveProvider(provider.id, { enabled: Boolean(value) })
            "
          />
        </div>

        <div class="entity-meta" data-test="provider-base-url">{{ provider.baseUrl }}</div>

        <div class="d-flex flex-column ga-1 mt-3">
          <div
            v-for="model in store.modelsOf(provider.id)"
            :key="model.id"
            class="d-flex align-center ga-2"
            data-test="model-row"
          >
            <v-icon size="14" icon="mdi-cube-outline" />
            <span class="entity-meta" data-test="model-name">{{ model.modelName }}</span>
            <v-spacer />
            <v-switch
              :model-value="model.enabled"
              density="compact"
              hide-details
              :data-test="`model-enabled-${model.id}`"
              @update:model-value="
                (value) => store.saveModel(model.id, { enabled: Boolean(value) })
              "
            />
            <v-btn
              size="x-small"
              variant="text"
              color="error"
              icon="mdi-close"
              data-test="model-delete"
              @click="store.removeModel(model.id)"
            />
          </div>
          <div
            v-if="store.modelsOf(provider.id).length === 0"
            class="entity-meta entity-meta--faint"
          >
            {{ t('model.noModels') }}
          </div>
        </div>

        <div class="d-flex align-center ga-2 mt-2">
          <v-text-field
            v-model="drafts[provider.id]"
            :label="t('model.addModel')"
            density="compact"
            hide-details
            class="flex-grow-1"
            :data-test="`model-draft-${provider.id}`"
            @keyup.enter="addModel(provider.id)"
          />
          <v-btn
            variant="tonal"
            size="small"
            color="primary"
            data-test="model-add"
            @click="addModel(provider.id)"
          >
            {{ t('common.add') }}
          </v-btn>
          <v-spacer />
          <v-btn
            size="x-small"
            variant="text"
            icon="mdi-pencil"
            data-test="provider-edit"
            @click="openDialog(provider)"
          />
          <v-btn
            size="x-small"
            variant="text"
            color="error"
            icon="mdi-delete"
            data-test="provider-delete"
            @click="pendingDelete = provider"
          />
        </div>
      </v-card>
    </div>

    <ProviderDialog v-model="dialogOpen" :provider="editing" />
    <ConfirmDialog
      :model-value="pendingDelete !== null"
      :title="t('model.deleteProvider')"
      :body="t('model.deleteProviderBody', { name: pendingDelete?.name ?? '' })"
      @update:model-value="(value) => (pendingDelete = value ? pendingDelete : null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
