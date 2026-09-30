<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: boolean
  title: string
  body: string
  confirmText?: string
  color?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [] }>()

const { t } = useI18n()
const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})
</script>

<template>
  <v-dialog v-model="open" max-width="480">
    <v-card data-test="confirm-dialog">
      <v-card-title class="text-body-1">{{ title }}</v-card-title>
      <v-card-text class="text-body-2">{{ body }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" data-test="confirm-cancel" @click="open = false">
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          :color="color ?? 'error'"
          variant="flat"
          data-test="confirm-ok"
          @click="emit('confirm')"
        >
          {{ confirmText ?? t('common.delete') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
