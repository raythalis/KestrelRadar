<script setup lang="ts">
import type { MessageTemplate } from '@kestrel/contracts'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmDialog from '@/components/biz/ConfirmDialog.vue'
import TemplateDialog from '@/components/biz/TemplateDialog.vue'
import { useConfigStore } from '@/stores/config'
import { templateDisplayName } from '@/utils/format'

const store = useConfigStore()
const { t } = useI18n()

const dialogOpen = ref(false)
const editing = ref<MessageTemplate | null>(null)
const pendingDelete = ref<MessageTemplate | null>(null)

function openDialog(template: MessageTemplate | null): void {
  editing.value = template
  dialogOpen.value = true
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value
  pendingDelete.value = null
  if (target) await store.removeTemplate(target.id)
}
</script>

<template>
  <section class="k2-card k2-set" data-test="card-templates">
    <div class="k2-card__head">
      <span class="k2-card__heading">
        <span class="k2-card__title">{{ t('settings.template.section') }}</span>
        <span class="k2-card__sub">{{ t('settings.template.sectionNote') }}</span>
      </span>
      <span class="k2-set__spacer" />
      <button
        type="button"
        class="k2-btn k2-btn--primary"
        data-test="new-template"
        @click="openDialog(null)"
      >
        <i class="mdi mdi-plus" />
        {{ t('settings.template.add') }}
      </button>
    </div>

    <div
      v-for="template in store.templates"
      :key="template.id"
      class="k2-tpl"
      data-test="template-card"
    >
      <div class="k2-tpl__head">
        <span class="k2-field__label" data-test="template-name">
          {{ templateDisplayName(template, t) }}
        </span>
        <span v-if="template.builtin" class="k2-chip" data-test="template-builtin">
          {{ t('settings.template.builtin') }}
        </span>
        <span class="k2-set__spacer" />
        <button
          v-if="!template.builtin"
          type="button"
          class="k2-iconbtn"
          :title="t('common.edit')"
          :aria-label="t('common.edit')"
          data-test="template-edit"
          @click="openDialog(template)"
        >
          <i class="mdi mdi-pencil" />
        </button>
        <button
          v-if="!template.builtin"
          type="button"
          class="k2-iconbtn k2-iconbtn--danger"
          :title="t('common.delete')"
          :aria-label="t('common.delete')"
          data-test="template-delete"
          @click="pendingDelete = template"
        >
          <i class="mdi mdi-close" />
        </button>
      </div>
      <pre class="k2-tpl__content" data-test="template-content">{{ template.content }}</pre>
    </div>
  </section>

  <TemplateDialog v-model="dialogOpen" :template="editing" />
  <ConfirmDialog
    :model-value="pendingDelete !== null"
    :title="t('settings.template.delete')"
    :message="
      t('settings.template.deleteBody', {
        name: pendingDelete ? templateDisplayName(pendingDelete, t) : '',
      })
    "
    @update:model-value="(value) => (pendingDelete = value ? pendingDelete : null)"
    @confirm="confirmDelete"
  />
</template>
