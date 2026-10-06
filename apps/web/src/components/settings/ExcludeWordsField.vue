<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ modelValue: string[]; testId?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>()

const { t } = useI18n()
const input = ref('')

const words = computed(() => props.modelValue ?? [])

function add(): void {
  const value = input.value.trim()
  if (!value) return
  if (words.value.includes(value)) {
    input.value = ''
    return
  }
  emit('update:modelValue', [...words.value, value])
  input.value = ''
}

function remove(word: string): void {
  emit(
    'update:modelValue',
    words.value.filter((item) => item !== word),
  )
}
</script>

<template>
  <div class="k2-words" :data-test="testId">
    <ul v-if="words.length" class="k2-words__list">
      <li v-for="word in words" :key="word" class="k2-words__item">
        <span class="k2-words__text">{{ word }}</span>
        <button
          type="button"
          class="k2-words__del"
          :aria-label="t('settings.words.remove', { word })"
          :data-test="`word-remove-${word}`"
          @click="remove(word)"
        >
          <i class="mdi mdi-close" />
        </button>
      </li>
    </ul>
    <p v-else class="k2-words__empty">{{ t('settings.words.empty') }}</p>

    <div class="k2-words__add">
      <input
        v-model="input"
        class="k2-input"
        :placeholder="t('settings.words.placeholder')"
        :data-test="`word-input-${testId ?? 'list'}`"
        @keydown.enter.prevent="add"
      />
    </div>
    <p class="k2-field__hint">{{ t('settings.words.count', { n: words.length }) }}</p>
  </div>
</template>
