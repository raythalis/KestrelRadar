<!-- FormDialog：所有「填表-保存」弹窗的共享外壳（v2）。
     职责：标题、说明（标题下的副行）、内容插槽、取消 / 保存、保存中、错误提示、字段多时正文自己滚。
     页面只往里放字段，不再自己拼 header / footer / 关闭逻辑。
     样式只消费 v2 零件（.k2-dialog / .k2-btn / .k2-alert / .k2-skeleton / .k2-iconbtn）。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    /** 标题下的一句说明（可选） */
    note?: string
    /** 桌面宽度上限 */
    width?: number | string
    dialogClass?: string
    loading?: boolean
    error?: string
    /** 保存中：按钮转圈并锁住取消 */
    busy?: boolean
    /** 主按钮不可点（表单没填完用） */
    submitDisabled?: boolean
    submitLabel?: string
    /** 只读型弹窗（比如「查看详情」）可以不要保存按钮 */
    hideSubmit?: boolean
    /** 保存中不许点遮罩关掉 */
    persistent?: boolean
  }>(),
  {
    note: undefined,
    width: 480,
    dialogClass: '',
    loading: false,
    error: undefined,
    busy: false,
    submitDisabled: false,
    submitLabel: undefined,
    hideSubmit: false,
    persistent: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: []
  cancel: []
}>()

const { t } = useI18n()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

/** 保存中自己也点不动：避免重复提交 */
const locked = computed(() => props.busy || props.submitDisabled)

function cancel(): void {
  if (props.busy) return
  emit('cancel')
  open.value = false
}

function submit(): void {
  if (locked.value) return
  emit('submit')
}
</script>

<template>
  <v-dialog
    v-model="open"
    :max-width="width"
    :persistent="persistent"
    :content-class="['k2-dialog', dialogClass]"
  >
    <div class="k2-dialog__head" data-test="form-dialog">
      <span class="k2-card__heading">
        <span class="k2-card__title">{{ title }}</span>
        <span v-if="note" class="k2-card__sub" data-test="form-dialog-note">{{ note }}</span>
      </span>
      <button
        type="button"
        class="k2-iconbtn"
        :aria-label="t('common.close')"
        data-test="form-dialog-close"
        @click="cancel"
      >
        <v-icon size="18">mdi-close</v-icon>
      </button>
    </div>

    <div class="k2-dialog__body">
      <p v-if="error" class="k2-alert k2-t-danger" data-test="app-dialog-error">{{ error }}</p>

      <template v-if="loading">
        <AppSkeleton variant="text" :rows="3" />
      </template>
      <slot v-else />
    </div>

    <div class="k2-dialog__foot">
      <button
        type="button"
        class="k2-btn k2-btn--ghost"
        :disabled="busy"
        data-test="form-dialog-cancel"
        @click="cancel"
      >
        {{ t('common.cancel') }}
      </button>
      <span class="k2-dialog__gap" />
      <slot name="footer-extra" />
      <button
        v-if="!hideSubmit"
        type="button"
        class="k2-btn k2-btn--primary"
        :aria-busy="busy"
        :aria-disabled="locked"
        :disabled="submitDisabled"
        data-test="form-dialog-submit"
        @click="submit"
      >
        <span v-if="busy" class="k2-spin" />
        {{ submitLabel ?? t('common.save') }}
      </button>
    </div>
  </v-dialog>
</template>
