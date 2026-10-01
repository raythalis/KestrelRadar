<!-- /design 页面专用：一个可折叠的分组。
     桌面（≥900）永远展开；手机按分组折叠，默认只展开第一个，方便在手机上逐个看组件。
     只服务验收页，不属于 Design System。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'

const props = withDefaults(defineProps<{ title: string; note?: string; open?: boolean }>(), {
  open: false,
})

const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()
const { mdAndUp } = useDisplay()

const visible = computed(() => mdAndUp.value || props.open)
</script>

<template>
  <AppSection :title="title" :note="note">
    <template #actions>
      <button
        v-if="!mdAndUp"
        type="button"
        class="app-btn app-btn--sm app-btn--ghost"
        :aria-expanded="visible"
        :data-test="`group-toggle-${title}`"
        @click="emit('update:open', !visible)"
      >
        <v-icon size="16">{{ visible ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        {{ visible ? '收起' : '展开' }}
      </button>
    </template>

    <div v-show="visible" class="app-stack" :data-test="`group-body-${title}`">
      <slot />
    </div>
  </AppSection>
</template>
