<!-- AppDialog：弹窗的唯一来源。内部是 Vuetify 的 v-dialog。
     状态：normal / loading（加载中占位）/ error（错误信息）/ 移动端底部抽屉（<900px 自动贴底成 sheet）。 -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

withDefaults(
  defineProps<{
    title?: string
    /** 桌面宽度上限 */
    width?: number | string
    loading?: boolean
    error?: string
    /** 点遮罩不关、Esc 不关（保存中或有未保存改动时用） */
    persistent?: boolean
    /** 移动端贴底成抽屉；页面里确实需要全屏时才关掉 */
    sheetOnMobile?: boolean
  }>(),
  { width: 460, loading: false, persistent: false, sheetOnMobile: true },
)

const open = defineModel<boolean>({ default: false })
</script>

<template>
  <v-dialog
    v-model="open"
    :max-width="width"
    :persistent="persistent"
    :content-class="sheetOnMobile ? 'app-dialog__sheet' : undefined"
  >
    <div class="app-overlay app-dialog" data-test="app-dialog">
      <header class="app-card__head">
        <span class="app-card__title">{{ title }}</span>
        <span class="app-spacer" />
        <button
          type="button"
          class="app-iconbtn"
          :aria-label="t('common.close')"
          data-test="app-dialog-close"
          @click="open = false"
        >
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </header>

      <div class="app-card__body app-stack">
        <div v-if="loading" class="app-dialog__state" data-test="app-dialog-loading">
          <span class="app-spinner" />
          <span>处理中…</span>
        </div>
        <div v-else-if="error" class="app-hint app-hint--err" data-test="app-dialog-error">
          {{ error }}
        </div>
        <slot v-else />
      </div>

      <footer v-if="$slots.footer" class="app-card__foot">
        <slot name="footer" />
      </footer>
    </div>
  </v-dialog>
</template>
