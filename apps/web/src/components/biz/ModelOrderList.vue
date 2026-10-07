<!-- ModelOrderList：模型页下面的「模型调用顺序」（最多 3 行，失败时按顺序往下试）。
     行里是下拉，选项是把当前各供应商的模型拼成「供应商:模型」；
     某个供应商的模型拿不到（没配模型 / 取不到），它的内容就不出现在选项里，界面上不解释。
     上游把供应商删掉后，用到它模型的那一行自动消失（渲染时按选项过滤），
     但永远保留至少一行空的；一行都没有时页面上就不显示这块。
     只受控 + 只出事件：值在父级，组件只发 update:value 与 save。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/components/app/AppButton.vue'
import AppSelect from '@/components/app/AppSelect.vue'

/** 一行一个模型；空行用 null */
export type ModelOrderRow = string | null

/** 可选项的来源：一家供应商 + 它当前能拿到的模型（取不到就是空数组，静默不显示） */
export interface ModelOrderProvider {
  id: string
  name: string
  models: string[]
}

const props = withDefaults(
  defineProps<{
    value: ModelOrderRow[]
    /** 供应商与它们的模型；某一家的模型是空数组，它就不出现在选项里 */
    providers: ModelOrderProvider[]
    /** 最多几行 */
    max?: number
    busy?: boolean
    hint?: string
  }>(),
  { max: 3, busy: false, hint: undefined },
)

const emit = defineEmits<{
  'update:value': [value: ModelOrderRow[]]
  save: []
}>()

const { t } = useI18n()

/** 下拉选项：一行一个模型，显示成「供应商:模型」 */
const options = computed(() =>
  props.providers.flatMap((provider) =>
    provider.models.map((model) => ({
      title: `${provider.name}:${model}`,
      value: `${provider.id}:${model}`,
    })),
  ),
)

/** 选项里已经没有了的值（供应商被删 / 模型没了）整行去掉；空行留着（用户自己加的空行也算），
    末尾至少保留一行空的。 */
const rows = computed<ModelOrderRow[]>(() => {
  const known = new Set(options.value.map((item) => String(item.value)))
  const next = props.value.filter((row) => row === null || known.has(row)).slice(0, props.max)
  while (next.length === 0) next.push(null)
  return next
})

function setRow(index: number, value: string | number | string[] | null): void {
  const next = [...rows.value]
  next[index] = typeof value === 'string' && value !== '' ? value : null
  emit('update:value', next)
}

function addRow(): void {
  if (rows.value.length >= props.max) return
  emit('update:value', [...rows.value, null])
}

function removeRow(index: number): void {
  const next = rows.value.filter((_, position) => position !== index)
  if (next.length === 0) next.push(null)
  emit('update:value', next)
}
</script>

<template>
  <section class="k2-card k2-card--flat" data-test="model-order">
    <div class="k2-card__head">
      <span class="k2-card__heading">
        <span class="k2-card__title">{{ t('model.order.title') }}</span>
        <span class="k2-card__sub">{{ t('model.order.sub') }}</span>
      </span>
    </div>

    <div class="k2-rows">
      <div v-for="(row, index) in rows" :key="index" class="k2-row" data-test="model-order-row">
        <span class="k2-tile k2-tile--sm" data-test="model-order-index">{{ index + 1 }}</span>
        <span class="k2-row__main">
          <AppSelect
            :model-value="row"
            :items="options"
            :placeholder="t('model.order.placeholder')"
            :data-test="`model-order-select-${index}`"
            @update:model-value="(value) => setRow(index, value)"
          />
        </span>
        <span class="k2-row__side">
          <button
            type="button"
            class="k2-iconbtn k2-iconbtn--danger"
            :aria-label="t('common.delete')"
            data-test="model-order-remove"
            @click="removeRow(index)"
          >
            <i class="mdi mdi-close" />
          </button>
        </span>
      </div>

      <div v-if="rows.length < max" class="k2-row">
        <span class="k2-tile k2-tile--sm"><i class="mdi mdi-plus" /></span>
        <span class="k2-row__main">
          <button
            type="button"
            class="k2-btn k2-btn--ghost"
            data-test="model-order-add"
            @click="addRow"
          >
            {{ t('model.order.add') }}
          </button>
        </span>
        <span class="k2-row__side" />
      </div>
    </div>

    <div class="k2-card__foot">
      <span class="k2-card__note">{{ hint ?? t('model.order.hint') }}</span>
      <span class="app-spacer" />
      <AppButton
        size="sm"
        variant="primary"
        :disabled="busy"
        data-test="model-order-save"
        @click="emit('save')"
      >
        {{ t('model.order.save') }}
      </AppButton>
    </div>
  </section>
</template>
