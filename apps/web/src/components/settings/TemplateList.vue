<script setup lang="ts">
import type { MessageTemplate } from '@kestrel/contracts'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TemplateDialog from '@/components/TemplateDialog.vue'
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
  <section>
    <div class="d-flex align-center mb-2">
      <div>
        <h3 class="section-title">{{ t('settings.template.section') }}</h3>
        <p class="section-note">{{ t('settings.template.sectionNote') }}</p>
      </div>
      <v-spacer />
      <v-btn
        color="primary"
        size="small"
        variant="flat"
        prepend-icon="mdi-plus"
        data-test="new-template"
        @click="openDialog(null)"
      >
        {{ t('settings.template.add') }}
      </v-btn>
    </div>

    <div class="d-flex flex-column ga-3">
      <v-card
        v-for="template in store.templates"
        :key="template.id"
        variant="outlined"
        class="pa-4 template-card"
        data-test="template-card"
      >
        <div class="d-flex align-center ga-2">
          <span class="text-body-2 font-weight-medium" data-test="template-name">
            {{ templateDisplayName(template, t) }}
          </span>
          <v-chip
            v-if="template.builtin"
            size="x-small"
            label
            color="primary"
            data-test="template-builtin"
          >
            {{ t('settings.template.builtin') }}
          </v-chip>
          <v-spacer />
          <template v-if="!template.builtin">
            <v-btn
              size="x-small"
              variant="text"
              icon="mdi-pencil"
              data-test="template-edit"
              @click="openDialog(template)"
            />
            <v-btn
              size="x-small"
              variant="text"
              color="error"
              icon="mdi-delete"
              data-test="template-delete"
              @click="pendingDelete = template"
            />
          </template>
        </div>
        <pre class="template-preview" data-test="template-content">{{ template.content }}</pre>
      </v-card>
    </div>

    <TemplateDialog v-model="dialogOpen" :template="editing" />
    <ConfirmDialog
      :model-value="pendingDelete !== null"
      :title="t('settings.template.delete')"
      :body="
        t('settings.template.deleteBody', {
          name: pendingDelete ? templateDisplayName(pendingDelete, t) : '',
        })
      "
      @update:model-value="(value) => (pendingDelete = value ? pendingDelete : null)"
      @confirm="confirmDelete"
    />
  </section>
</template>
