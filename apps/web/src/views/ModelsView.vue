<script setup lang="ts">
import type { ModelProvider } from '@kestrel/contracts'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/components/app/AppButton.vue'
import AppInput from '@/components/app/AppInput.vue'
import ConfirmDialog from '@/components/biz/ConfirmDialog.vue'
import LlmPlusTag from '@/components/biz/LlmPlusTag.vue'
import ProviderDialog from '@/components/biz/ProviderDialog.vue'
import type { ProviderDialogValues } from '@/components/biz/types'
import { useConfigStore } from '@/stores/config'
import { useToastStore } from '@/stores/toast'

const store = useConfigStore()
const toast = useToastStore()
const { t } = useI18n()

const dialogOpen = ref(false)
const editing = ref<ModelProvider | null>(null)
const saving = ref(false)
const dialogError = ref('')
const pendingDelete = ref<ModelProvider | null>(null)
const deleting = ref(false)
/** 每个供应商下面「加一个模型」输入框里的草稿 */
const drafts = ref<Record<string, string>>({})

/** 页面级错误条已下线：弹窗开着时留给弹窗说，其余由浮层说 */
watch(
  () => store.errorMessage,
  (message) => {
    if (message && !dialogOpen.value && !pendingDelete.value) toast.push(message)
  },
)

onMounted(() => {
  if (!store.snapshot) void store.load()
})

/** 确认框开着＝有对象在等删 */
const deleteOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (value: boolean) => {
    if (!value) pendingDelete.value = null
  },
})

function openDialog(provider: ModelProvider | null): void {
  dialogError.value = ''
  editing.value = provider
  dialogOpen.value = true
}

async function saveProvider(values: ProviderDialogValues): Promise<void> {
  saving.value = true
  dialogError.value = ''
  // 密钥留空＝不改动已保存的那把；新建时留空就是不配
  const payload = {
    name: values.name,
    kind: values.kind,
    baseUrl: values.baseUrl,
    ...(values.apiKey.length > 0 ? { apiKey: values.apiKey } : {}),
  }
  const target = editing.value
  const ok = target
    ? await store.saveProvider(target.id, payload)
    : await store.createProvider({ ...payload, enabled: true, sortOrder: 0 })
  saving.value = false
  if (ok) {
    dialogOpen.value = false
    return
  }
  dialogError.value = store.errorMessage ?? ''
}

async function addModel(providerId: string): Promise<void> {
  const modelName = (drafts.value[providerId] ?? '').trim()
  if (modelName.length === 0) return
  const ok = await store.createModel(providerId, { modelName, enabled: true, sortOrder: 0 })
  if (ok) drafts.value = { ...drafts.value, [providerId]: '' }
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value
  if (!target) return
  deleting.value = true
  await store.removeProvider(target.id)
  deleting.value = false
  pendingDelete.value = null
}
</script>

<template>
  <div class="k2-page k2-page--wide" data-test="models-page">
    <div class="k2-page__head">
      <div class="k2-page__lead">
        <h1 class="k2-page__title">{{ t('nav.models') }}</h1>
        <i18n-t keypath="model.subtitle" tag="p" class="k2-page__note">
          <template #llmPlus><LlmPlusTag /></template>
        </i18n-t>
      </div>
      <div class="k2-page__actions">
        <button
          type="button"
          class="k2-btn k2-btn--primary"
          data-test="new-provider"
          @click="openDialog(null)"
        >
          <i class="mdi mdi-plus" />
          {{ t('model.addProvider') }}
        </button>
      </div>
    </div>

    <section v-if="store.providers.length === 0" class="k2-card k2-card--flat">
      <AppEmptyState data-test="models-empty" icon="mdi-brain" :title="t('model.empty')" />
    </section>

    <div v-else class="k2-grid">
      <article
        v-for="provider in store.providers"
        :key="provider.id"
        class="k2-card k2-card--sm"
        data-test="provider-card"
      >
        <div class="k2-card__head">
          <span class="k2-tile k2-tile--sm"><i class="mdi mdi-brain" /></span>
          <span class="k2-card__heading">
            <span class="k2-row__title" data-test="provider-name">{{ provider.name }}</span>
            <span class="k2-row__sub" data-test="provider-base-url">{{ provider.baseUrl }}</span>
          </span>
          <button
            type="button"
            class="k2-switch"
            :class="{ 'k2-switch--on': provider.enabled }"
            :aria-label="provider.enabled ? t('common.enabled') : t('common.disabled')"
            :aria-pressed="provider.enabled"
            data-test="provider-enabled"
            @click="store.saveProvider(provider.id, { enabled: !provider.enabled })"
          >
            <span class="k2-switch__dot" />
          </button>
        </div>

        <div class="k2-card__tags">
          <span class="k2-chip k2-chip--tag" data-test="provider-kind">
            {{ t(`model.kind.${provider.kind}`) }}
          </span>
          <span v-if="provider.hasApiKey" class="k2-chip k2-chip--tag">
            {{ t('model.hasApiKey') }}
          </span>
        </div>

        <hr class="k2-card__sep" />

        <div class="k2-rows">
          <div
            v-for="model in store.modelsOf(provider.id)"
            :key="model.id"
            class="k2-row"
            data-test="model-row"
          >
            <span class="k2-tile k2-tile--sm"><i class="mdi mdi-cube-outline" /></span>
            <span class="k2-row__main">
              <span class="k2-row__title" data-test="model-name">{{ model.modelName }}</span>
            </span>
            <span class="k2-row__side">
              <button
                type="button"
                class="k2-switch"
                :class="{ 'k2-switch--on': model.enabled }"
                :aria-label="model.enabled ? t('common.enabled') : t('common.disabled')"
                :aria-pressed="model.enabled"
                :data-test="`model-enabled-${model.id}`"
                @click="store.saveModel(model.id, { enabled: !model.enabled })"
              >
                <span class="k2-switch__dot" />
              </button>
              <button
                type="button"
                class="k2-iconbtn k2-iconbtn--danger"
                :aria-label="t('common.delete')"
                data-test="model-delete"
                @click="store.removeModel(model.id)"
              >
                <i class="mdi mdi-close" />
              </button>
            </span>
          </div>

          <div v-if="store.modelsOf(provider.id).length === 0" class="k2-row">
            <span class="k2-tile k2-tile--sm"><i class="mdi mdi-cube-outline" /></span>
            <span class="k2-row__main">
              <span class="k2-row__sub">{{ t('model.noModels') }}</span>
            </span>
            <span class="k2-row__side" />
          </div>

          <div class="k2-row">
            <span class="k2-tile k2-tile--sm"><i class="mdi mdi-plus" /></span>
            <span class="k2-row__main">
              <AppInput
                v-model="drafts[provider.id]"
                :label="t('model.addModel')"
                :maxlength="200"
                :data-test="`model-draft-${provider.id}`"
                @keyup.enter="addModel(provider.id)"
              />
            </span>
            <span class="k2-row__side">
              <AppButton
                size="sm"
                variant="secondary"
                data-test="model-add"
                @click="addModel(provider.id)"
              >
                {{ t('common.add') }}
              </AppButton>
            </span>
          </div>
        </div>

        <div class="k2-card__foot">
          <span class="app-spacer" />
          <button
            type="button"
            class="k2-iconbtn"
            :aria-label="t('common.edit')"
            data-test="provider-edit"
            @click="openDialog(provider)"
          >
            <i class="mdi mdi-pencil" />
          </button>
          <button
            type="button"
            class="k2-iconbtn k2-iconbtn--danger"
            :aria-label="t('common.delete')"
            data-test="provider-delete"
            @click="pendingDelete = provider"
          >
            <i class="mdi mdi-trash-can-outline" />
          </button>
        </div>
      </article>
    </div>

    <ProviderDialog
      v-model="dialogOpen"
      :provider="editing"
      :busy="saving"
      :error="dialogError"
      @submit="saveProvider"
      @cancel="editing = null"
    />

    <ConfirmDialog
      v-model="deleteOpen"
      :title="t('model.deleteProvider')"
      :message="t('model.deleteProviderBody', { name: pendingDelete?.name ?? '' })"
      :busy="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
