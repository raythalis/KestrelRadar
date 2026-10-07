<script setup lang="ts">
import type { ModelProvider } from '@kestrel/contracts'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppEmptyState from '@/components/app/AppEmptyState.vue'
import ModelOrderList, { type ModelOrderRow } from '@/components/biz/ModelOrderList.vue'
import ProviderCard from '@/components/biz/ProviderCard.vue'
import { MODEL_ORDER_FIXTURE, MODEL_PROVIDER_FIXTURES } from './fixtures'

/**
 * 模型页样例 = 真 ProviderCard + 真 ModelOrderList。
 * 演示两件事：拿不到模型的供应商不出现在下拉里（静默）；删掉供应商后，
 * 用到它模型的那一行自动消失（空行永远留一行）。
 */
const { t } = useI18n()

/** fixture 里的时间戳（供应商的创建 / 更新时间不是可空的） */
const STAMP = '2026-10-01T00:00:00.000Z'

const providerModels = ref<Record<string, string[]>>(
  Object.fromEntries(MODEL_PROVIDER_FIXTURES.map((item) => [item.id, item.models])),
)

const providers = ref<ModelProvider[]>(
  MODEL_PROVIDER_FIXTURES.map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind,
    baseUrl: item.baseUrl,
    hasApiKey: false,
    enabled: true,
    sortOrder: 0,
    createdAt: STAMP,
    updatedAt: STAMP,
  })),
)

const order = ref<ModelOrderRow[]>([...MODEL_ORDER_FIXTURE])
const saved = ref(false)

/** 交给组件的选项来源：供应商 + 它当前能拿到的模型（拿不到就是空数组，静默不显示） */
const orderProviders = computed(() =>
  providers.value.map((provider) => ({
    id: provider.id,
    name: provider.name,
    models: providerModels.value[provider.id] ?? [],
  })),
)

function removeProvider(id: string): void {
  providers.value = providers.value.filter((provider) => provider.id !== id)
  saved.value = false
}

function reset(): void {
  providers.value = MODEL_PROVIDER_FIXTURES.map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind,
    baseUrl: item.baseUrl,
    hasApiKey: false,
    enabled: true,
    sortOrder: 0,
    createdAt: STAMP,
    updatedAt: STAMP,
  }))
  order.value = [...MODEL_ORDER_FIXTURE]
  saved.value = false
}
</script>

<template>
  <div class="lab-parts">
    <div class="lab__h3">模型页 · 供应商卡</div>
    <p class="lab__meta">
      卡上只留图标、名称、类型胶囊与编辑 / 删除；v1.0
      不做启停，所以没有开关（地址与密钥收进编辑弹窗）。
    </p>
    <div class="k2-grid">
      <ProviderCard
        v-for="provider in providers"
        :key="provider.id"
        :provider="provider"
        @edit="() => {}"
        @remove="removeProvider(provider.id)"
      />
    </div>

    <div class="lab__h3 lab__gap-top">模型页 · 模型调用顺序</div>
    <p class="lab__meta">
      按顺序依次尝试，前面的失败就用下一个，最多三行。选项是「供应商:模型」——
      「内网网关」那家没取到模型，所以选项里一条都没有它，界面上也不解释。
      删掉一家供应商，用到它模型的那一行会自己消失，末尾仍留一行空的。
    </p>
    <section class="k2-card">
      <ModelOrderList v-model:value="order" :providers="orderProviders" @save="saved = true" />
    </section>
    <div class="lab__controls">
      <button
        type="button"
        class="k2-btn k2-btn--ghost"
        data-test="lab-drop-provider"
        @click="providers.length > 0 && removeProvider(providers[providers.length - 1]!.id)"
      >
        删掉最后一家供应商
      </button>
      <button type="button" class="k2-btn k2-btn--ghost" data-test="lab-reset" @click="reset">
        还原
      </button>
      <span v-if="saved" class="lab__note">已保存（样例不发请求）</span>
    </div>

    <div class="lab__h3 lab__gap-top">模型页 · 一个供应商都没有</div>
    <p class="lab__meta">这时候页面只给空态，不显示模型调用顺序。</p>
    <section class="k2-card k2-card--flat">
      <AppEmptyState icon="mdi-brain" :title="t('model.empty')" />
    </section>
  </div>
</template>
