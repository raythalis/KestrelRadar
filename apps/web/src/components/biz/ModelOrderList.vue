<!-- ModelOrderList：判定模型的调用顺序（最多 3 行，失败时按顺序往下试）。
     行里是下拉：选项是把各供应商的模型拼成「供应商:模型」；某家取不到模型，
     它的内容就不出现在选项里，界面上不解释。删掉供应商后，用到它模型的那一行自动消失，
     但永远保留至少一行空的。行可以拖动排序（抓手在行首）。
     只受控、只出事件：值在父级，组件只发 update:value 与 save。 -->
<script setup lang="ts">
import { computed, ref } from 'vue'
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
    /** 保存中 */
    busy?: boolean
  }>(),
  { max: 3, busy: false },
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

/** 值里已经不在选项中的（供应商被删 / 模型没了）整行去掉；空行留着（用户自己加的也算），
    末尾至少保留一行空的。 */
const rows = computed<ModelOrderRow[]>(() => {
  const known = new Set(options.value.map((item) => String(item.value)))
  const next = props.value.filter((row) => row === null || known.has(row)).slice(0, props.max)
  while (next.length === 0) next.push(null)
  return next
})

/** 到上限就把加号禁掉：按钮还在，只是点不动 */
const canAdd = computed(() => rows.value.length < props.max)

/** 只剩一行时不留删除按钮：删完还是空行，没有意义 */
const canRemove = computed(() => rows.value.length > 1)

function setRow(index: number, value: unknown): void {
  const next = [...rows.value]
  next[index] = typeof value === 'string' && value !== '' ? value : null
  emit('update:value', next)
}

function addRow(): void {
  if (!canAdd.value) return
  emit('update:value', [...rows.value, null])
}

function removeRow(index: number): void {
  if (!canRemove.value) return
  const next = rows.value.filter((_, i) => i !== index)
  while (next.length === 0) next.push(null)
  emit('update:value', next)
}

/* ---------- 拖拽排序：抓着行首的抓手上下拖 ---------- */

const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)

function onDragStart(event: DragEvent, index: number): void {
  dragIndex.value = index
  overIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(event: DragEvent, index: number): void {
  if (dragIndex.value === null) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  overIndex.value = index
}

function onDrop(index: number): void {
  const from = dragIndex.value
  dragIndex.value = null
  overIndex.value = null
  if (from === null || from === index) return
  const next = [...rows.value]
  const [moved] = next.splice(from, 1)
  next.splice(index, 0, moved ?? null)
  emit('update:value', next)
}

function onDragEnd(): void {
  dragIndex.value = null
  overIndex.value = null
}
</script>

<template>
  <div class="k2-order" data-test="model-order">
    <div class="k2-order__head">
      <span class="k2-order__title">{{ t('model.order.title') }}</span>
      <span class="k2-order__sub">{{ t('model.order.sub') }}</span>
      <span class="app-spacer" />
      <button
        type="button"
        class="k2-iconbtn"
        :disabled="!canAdd"
        :aria-label="t('model.order.add')"
        :title="t('model.order.add')"
        data-test="model-order-add"
        @click="addRow"
      >
        <i class="mdi mdi-plus" />
      </button>
    </div>

    <div class="k2-order__list">
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="k2-order__row"
        :class="{ 'is-over': dragIndex !== null && dragIndex !== index && overIndex === index }"
        data-test="model-order-row"
        @dragover="onDragOver($event, index)"
        @drop="onDrop(index)"
      >
        <span
          class="k2-order__grip"
          draggable="true"
          :title="t('model.order.drag')"
          data-test="model-order-grip"
          aria-hidden="true"
          @dragstart="onDragStart($event, index)"
          @dragend="onDragEnd"
        />
        <span class="k2-order__no" data-test="model-order-no">{{ index + 1 }}</span>
        <span class="k2-order__main">
          <AppSelect
            :model-value="row"
            :items="options"
            :placeholder="t('model.order.placeholder')"
            :data-test="`model-order-select-${index}`"
            @update:model-value="setRow(index, $event)"
          />
        </span>
        <button
          v-if="canRemove"
          type="button"
          class="k2-iconbtn k2-iconbtn--danger"
          :aria-label="t('common.delete')"
          data-test="model-order-remove"
          @click="removeRow(index)"
        >
          <i class="mdi mdi-close" />
        </button>
      </div>
    </div>

    <div class="k2-order__foot">
      <span class="k2-order__hint">{{ t('model.order.hint') }}</span>
      <span class="app-spacer" />
      <AppButton :disabled="busy" data-test="model-order-save" @click="emit('save')">
        {{ t('model.order.save') }}
      </AppButton>
    </div>
  </div>
</template>
