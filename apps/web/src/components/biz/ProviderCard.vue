<!-- ProviderCard：模型页上面那张供应商卡（业务组件层）。
     v1.0 不做启停，卡上只有：图标、名称、类型胶囊、编辑、删除。
     只出事件，不碰 store；删除的确认与请求由页面接。 -->
<script setup lang="ts">
import type { ModelProvider } from '@kestrel/contracts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { PROVIDER_ICON } from '@/components/biz/icons'

const props = defineProps<{ provider: ModelProvider }>()
const emit = defineEmits<{ edit: []; remove: [] }>()

const { t } = useI18n()

const kindLabel = computed(() => t(`model.kind.${props.provider.kind}`))
</script>

<template>
  <article class="k2-card k2-card--sm" data-test="provider-card">
    <div class="k2-card__head">
      <span class="k2-tile k2-tile--sm"><i class="mdi" :class="PROVIDER_ICON" /></span>
      <span class="k2-card__heading">
        <span class="k2-row__title" data-test="provider-name">{{ provider.name }}</span>
      </span>
    </div>

    <div class="k2-card__tags">
      <span class="k2-chip k2-chip--tag" data-test="provider-kind">{{ kindLabel }}</span>
    </div>

    <div class="k2-card__foot">
      <span class="app-spacer" />
      <button
        type="button"
        class="k2-iconbtn"
        :aria-label="t('common.edit')"
        data-test="provider-edit"
        @click="emit('edit')"
      >
        <i class="mdi mdi-pencil" />
      </button>
      <button
        type="button"
        class="k2-iconbtn k2-iconbtn--danger"
        :aria-label="t('common.delete')"
        data-test="provider-delete"
        @click="emit('remove')"
      >
        <i class="mdi mdi-trash-can-outline" />
      </button>
    </div>
  </article>
</template>
