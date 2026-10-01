<!-- ConfirmDialog：删除这类不可逆操作的确认框（业务组件层，搭在 AppDialog 上）。
     确认按钮走 danger、取消走 ghost，两者不同视觉层级；默认焦点不在确认上。
     只出 confirm 事件，真正的删除由页面执行；删除期间把 busy 打开：按钮转圈、
     遮罩与 Esc 都关不掉，避免删到一半被关掉。 -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppButton from '@/components/app/AppButton.vue'
import AppDialog from '@/components/app/AppDialog.vue'

withDefaults(
  defineProps<{
    title: string
    /** 后果说明；要放清单之类的内容用默认插槽 */
    message?: string
    /** 确认按钮文案（默认「删除」） */
    confirmLabel?: string
    /** 删除进行中 */
    busy?: boolean
    /** 删除失败的原因 */
    error?: string
  }>(),
  { message: undefined, confirmLabel: undefined, busy: false, error: undefined },
)

const emit = defineEmits<{ confirm: [] }>()
const open = defineModel<boolean>({ default: false })

const { t } = useI18n()
</script>

<template>
  <AppDialog v-model="open" :title="title" :error="error" :persistent="busy" :width="440">
    <p v-if="message" class="confirm-dialog__message" data-test="confirm-message">{{ message }}</p>
    <slot />

    <template #footer>
      <span class="app-spacer" />
      <AppButton variant="ghost" :disabled="busy" data-test="confirm-cancel" @click="open = false">
        {{ t('common.cancel') }}
      </AppButton>
      <AppButton variant="danger" :loading="busy" data-test="confirm-ok" @click="emit('confirm')">
        {{ confirmLabel ?? t('common.delete') }}
      </AppButton>
    </template>
  </AppDialog>
</template>
