<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const route = useRoute()
const { t } = useI18n()

const titleKey = computed(() => String(route.meta.titleKey ?? 'nav.dashboard'))
const noteKey = computed(() => String(route.meta.noteKey ?? 'placeholder.dashboard'))
</script>

<template>
  <div>
    <h2 class="text-h6 mb-1">{{ t(titleKey) }}</h2>
    <p class="text-body-2 text-medium-emphasis" data-test="placeholder-note">{{ t(noteKey) }}</p>
  </div>
</template>
