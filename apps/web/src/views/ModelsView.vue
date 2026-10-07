<script setup lang="ts">
import type { ModelProvider } from '@kestrel/contracts'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmDialog from '@/components/biz/ConfirmDialog.vue'
import LlmPlusTag from '@/components/biz/LlmPlusTag.vue'
import ModelOrderList, { type ModelOrderRow } from '@/components/biz/ModelOrderList.vue'
import ProviderCard from '@/components/biz/ProviderCard.vue'
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

/** 各家供应商现场报回来的模型清单；问不到的那家就是空数组，下拉里静默缺席 */
const remoteModels = ref<Record<string, string[]>>({})
/** 判定模型的调用顺序；存的是「供应商 id:模型名」，空行是 null */
const order = ref<ModelOrderRow[]>([null])
const savingOrder = ref(false)

onMounted(async () => {
  if (!store.snapshot) await store.load()
  const saved = store.settings.judgeModelOrder ?? []
  order.value = saved.length > 0 ? [...saved] : [null]
  await loadRemoteModels()
})

async function loadRemoteModels(): Promise<void> {
  const entries = await Promise.all(
    store.providers.map(async (provider) => {
      const models = await store.availableModels(provider.id)
      return [provider.id, models] as const
    }),
  )
  remoteModels.value = Object.fromEntries(entries)
}

/** 顺序列表的选项来源：供应商 + 它报回来的模型（问不到就是空数组） */
const orderProviders = computed(() =>
  store.providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    models: remoteModels.value[provider.id] ?? [],
  })),
)

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
    // 地址或密钥改了，能拿到哪些模型也可能变了
    await loadRemoteModels()
    return
  }
  dialogError.value = store.errorMessage ?? ''
}

/** 保存顺序：空行不存；顺序里引用的供应商已经没了，行也早就从界面上消失了 */
async function saveOrder(): Promise<void> {
  savingOrder.value = true
  const values = order.value.filter((row): row is string => row !== null)
  const ok = await store.saveSettings({ judgeModelOrder: values })
  savingOrder.value = false
  if (ok) toast.push(t('model.order.saved'), 'success')
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value
  if (!target) return
  deleting.value = true
  const ok = await store.removeProvider(target.id)
  deleting.value = false
  pendingDelete.value = null
  if (!ok) return
  // 顺序里引用这一家的行跟着去掉，顺手把设置也清干净
  order.value = order.value.map((row) => (row?.startsWith(`${target.id}:`) ? null : row))
  await saveOrder()
  await loadRemoteModels()
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

    <template v-else>
      <div class="k2-grid">
        <ProviderCard
          v-for="provider in store.providers"
          :key="provider.id"
          :provider="provider"
          @edit="openDialog(provider)"
          @remove="pendingDelete = provider"
        />
      </div>

      <section class="k2-card" data-test="model-order-card">
        <ModelOrderList
          v-model:value="order"
          :providers="orderProviders"
          :busy="savingOrder"
          @save="saveOrder"
        />
      </section>
    </template>

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
