<!-- ConfirmDialog：删除这类不可逆操作的确认框（业务组件层，v2 弹窗骨架）。
     取消＝描边按钮，确认＝实心危险按钮，并且写清删什么（「删除分组」而不是「删除」）。
     传了 details 时按「将要删掉 / 会保留」两块列出来（对象名走错误色、数字加粗），
     让人一眼看清影响面；细节文案由页面给（组件不碰数据）。
     只出 confirm 事件，真正的删除由页面执行；删除期间把 busy 打开：按钮转圈、
     遮罩与 Esc 都关不掉，避免删到一半被关掉。 -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    title: string
    /** 一句后果说明；要放清单之类的内容用默认插槽 */
    message?: string
    /** 确认按钮文案（默认「删除」） */
    confirmLabel?: string
    /** 结构化后果：被删对象的名字 + 随之删掉的条数 */
    details?: {
      name: string
      counts: { discoveries: number; monitors: number; actions: number }
    }
    /** 删除进行中 */
    busy?: boolean
    /** 删除失败的原因 */
    error?: string
  }>(),
  {
    message: undefined,
    confirmLabel: undefined,
    details: undefined,
    busy: false,
    error: undefined,
  },
)

const emit = defineEmits<{ confirm: [] }>()
const open = defineModel<boolean>({ default: false })

const { t } = useI18n()

/**
 * 删除进行中（busy）不允许再触发确认：按钮已禁用，这里再做一次事件层兜底，
 * 防止程序化点击 / 回车等路径在转圈期间抛出第二次 confirm 导致重复删除。
 */
function confirmOnce(): void {
  if (props.busy) return
  emit('confirm')
}
</script>

<template>
  <v-dialog
    v-model="open"
    :max-width="details ? 480 : 440"
    :persistent="busy"
    content-class="k2-dialog"
  >
    <div class="k2-dialog__head" data-test="confirm-dialog">
      <span class="k2-card__heading">
        <span class="k2-card__title">{{ title }}</span>
      </span>
      <button
        type="button"
        class="k2-iconbtn"
        :aria-label="t('common.close')"
        data-test="confirm-close"
        @click="open = false"
      >
        <v-icon size="18">mdi-close</v-icon>
      </button>
    </div>

    <div class="k2-dialog__body" data-test="confirm-body">
      <p v-if="error" class="k2-alert k2-t-danger" data-test="app-dialog-error">{{ error }}</p>

      <p v-if="message && !details" class="k2-card__message" data-test="confirm-message">
        {{ message }}
      </p>

      <template v-if="details">
        <p class="k2-card__message" data-test="confirm-lead">
          <i18n-t keypath="confirm.removeLead" tag="span">
            <template #name>
              <b class="k2-dialog__subject">{{ details.name }}</b>
            </template>
          </i18n-t>
        </p>

        <div class="k2-dialog__section">
          <span class="k2-dialog__section-title">{{ t('confirm.willRemove') }}</span>
          <ul class="k2-dialog__list" data-test="confirm-remove-list">
            <li>
              <b>{{ details.counts.discoveries }}</b> {{ t('column.discoveries') }}
            </li>
            <li>
              <b>{{ details.counts.monitors }}</b> {{ t('column.monitors') }}
            </li>
            <li>
              <b>{{ details.counts.actions }}</b> {{ t('column.actions') }}
            </li>
          </ul>
        </div>

        <div class="k2-dialog__section">
          <span class="k2-dialog__section-title">{{ t('confirm.willKeep') }}</span>
          <ul class="k2-dialog__list" data-test="confirm-keep-list">
            <li>{{ t('confirm.keepItems') }}</li>
            <li>{{ t('confirm.keepEvents') }}</li>
          </ul>
        </div>

        <p class="k2-card__note" data-test="confirm-question">{{ t('confirm.question') }}</p>
      </template>

      <slot />
    </div>

    <div class="k2-dialog__foot">
      <span class="k2-dialog__gap" />
      <button
        type="button"
        class="k2-btn k2-btn--ghost"
        :disabled="busy"
        data-test="confirm-cancel"
        @click="open = false"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="button"
        class="k2-btn k2-btn--danger"
        :aria-busy="busy"
        :disabled="busy"
        data-test="confirm-ok"
        @click="confirmOnce"
      >
        <span v-if="busy" class="k2-spin" />
        {{ confirmLabel ?? t('common.delete') }}
      </button>
    </div>
  </v-dialog>
</template>
