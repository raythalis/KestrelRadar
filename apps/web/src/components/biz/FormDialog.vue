<!-- FormDialog：所有"填表-保存"弹窗的共享外壳（原来是七个弹窗各写一遍同一套骨架）。
     职责：标题、说明、内容插槽、取消/保存、保存中、错误提示、手机端贴底。
     页面只往里放字段，不再自己拼 header / footer / 关闭逻辑。 -->
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
    loading?: boolean
    error?: string
    /** 保存中：按钮转圈并锁住取消 */
    busy?: boolean
    /** 主按钮不可点（表单没填完用） */
    submitDisabled?: boolean
    submitLabel?: string
    /** 只读型弹窗（比如"查看详情"）可以不要保存按钮 */
    hideSubmit?: boolean
    /** 保存中不许点遮罩关掉 */
    persistent?: boolean
  }>(),
  {
    width: 480,
    loading: false,
    busy: false,
    submitDisabled: false,
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

function cancel(): void {
  emit('cancel')
  open.value = false
}
</script>

<template>
  <AppDialog
    v-model="open"
    :title="title"
    :width="width"
    :loading="loading"
    :error="error"
    :persistent="persistent"
  >
    <p v-if="note" class="app-card__note" data-test="form-dialog-note">{{ note }}</p>
    <slot />

    <template #footer>
      <AppButton variant="ghost" :disabled="busy" data-test="form-dialog-cancel" @click="cancel">
        {{ t('common.cancel') }}
      </AppButton>
      <span class="app-spacer" />
      <slot name="footer-extra" />
      <AppButton
        v-if="!hideSubmit"
        variant="primary"
        :loading="busy"
        :disabled="submitDisabled"
        data-test="form-dialog-submit"
        @click="emit('submit')"
      >
        {{ submitLabel ?? t('common.save') }}
      </AppButton>
    </template>
  </AppDialog>
</template>
