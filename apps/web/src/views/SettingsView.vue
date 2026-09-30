<script setup lang="ts">
import type { MessageTemplate } from '@kestrel/contracts'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TemplateDialog from '@/components/TemplateDialog.vue'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const { t } = useI18n()

const dialogOpen = ref(false)
const editing = ref<MessageTemplate | null>(null)
const pendingDelete = ref<MessageTemplate | null>(null)

onMounted(() => {
  if (!store.snapshot) void store.load()
})

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
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-head__title">{{ t('nav.settings') }}</h2>
        <p class="page-head__note">{{ t('settings.subtitle') }}</p>
      </div>
      <v-spacer />
      <v-btn color="primary" variant="flat" data-test="new-template" @click="openDialog(null)">
        {{ t('settings.template.add') }}
      </v-btn>
    </div>

    <v-alert
      v-if="store.errorMessage"
      type="error"
      variant="tonal"
      class="mb-4"
      data-test="settings-error"
    >
      {{ store.errorMessage }}
    </v-alert>

    <section>
      <h3 class="section-title">{{ t('settings.template.section') }}</h3>
      <p class="section-note">{{ t('settings.template.sectionNote') }}</p>

      <div class="d-flex flex-column ga-3 mt-3">
        <v-card
          v-for="template in store.templates"
          :key="template.id"
          variant="outlined"
          class="pa-4 template-card"
          data-test="template-card"
        >
          <div class="d-flex align-center ga-2">
            <span class="text-body-2 font-weight-medium" data-test="template-name">
              {{ template.name }}
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
    </section>

    <p class="section-note mt-6" data-test="settings-rest-note">{{ t('placeholder.settings') }}</p>

    <TemplateDialog v-model="dialogOpen" :template="editing" />
    <ConfirmDialog
      :model-value="pendingDelete !== null"
      :title="t('settings.template.delete')"
      :body="t('settings.template.deleteBody', { name: pendingDelete?.name ?? '' })"
      @update:model-value="(value) => (pendingDelete = value ? pendingDelete : null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
