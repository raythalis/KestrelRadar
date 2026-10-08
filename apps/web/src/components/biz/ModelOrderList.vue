<!-- ModelOrderList：判定模型的调用顺序（最多 3 行，失败时按顺序往下试）。
     行里是下拉：选项是把各供应商的模型拼成「供应商:模型」；某家取不到模型，
     它的内容就不出现在选项里，界面上不解释。删掉供应商后，用到它模型的那一行自动消失，
     但永远保留至少一行空的。行可以拖动排序（抓手在行首）。
     只受控、只出事件：值在父级，组件只发 update:value 与 save。 -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/components/app/AppButton.vue'

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

/** 「供应商 id:模型名」里的供应商 id（模型名自己可能带冒号，只在第一个冒号处切） */
function providerIdOf(row: string): string {
  return row.slice(0, row.indexOf(':'))
}

/** 显示成「供应商名:模型名」；供应商找不到就退回原样 */
function titleOf(row: string): string {
  const provider = props.providers.find((item) => item.id === providerIdOf(row))
  return `${provider?.name ?? providerIdOf(row)}:${row.slice(row.indexOf(':') + 1)}`
}

/** 下拉选项：一行一个模型，显示成「供应商:模型」 */
const options = computed(() => {
  const listed = props.providers.flatMap((provider) =>
    provider.models.map((model) => ({
      title: `${provider.name}:${model}`,
      value: `${provider.id}:${model}`,
    })),
  )
  // 供应商的清单还没回来（或它已经不报这个模型了）时，已选中的那行也得先显示成人能看懂的名字，
  // 不能露出「id:模型」这种原始值——所以补进选项里。
  const known = new Set(listed.map((item) => item.value))
  const pending = props.value
    .filter((row): row is string => row !== null && !known.has(row))
    .map((row) => ({ title: titleOf(row), value: row }))
  return [...listed, ...pending]
})

/** 行的去留看「供应商还在不在」——清单没回来不代表这一行没了；空行留着，末尾至少保留一行空的。 */
const rows = computed<ModelOrderRow[]>(() => {
  const alive = new Set(props.providers.map((provider) => provider.id))
  const next = props.value
    .filter((row) => row === null || alive.has(providerIdOf(row)))
    .slice(0, props.max)
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

/** 打开的是哪一行的下拉（同时只开一个） */
const openIndex = ref<number | null>(null)

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
      <span class="k2-order__headtext">
        <span class="k2-field__label">{{ t('model.order.title') }}</span>
        <span class="k2-order__sub">{{ t('model.order.sub') }}</span>
      </span>
      <span class="app-spacer" />
      <button
        type="button"
        class="k2-iconbtn k2-iconbtn--primary"
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
          <!-- 下拉用全站同一套外观（.k2-select + .k2-menu）：与设置页、各弹窗里的下拉一致 -->
          <v-menu
            :model-value="openIndex === index"
            :close-on-content-click="true"
            :disabled="options.length === 0"
            content-class="k2-menu"
            @update:model-value="(open: boolean) => (openIndex = open ? index : null)"
          >
            <template #activator="{ props: menuProps }">
              <button
                v-bind="menuProps"
                type="button"
                class="k2-select"
                :aria-label="t('model.order.placeholder')"
                :data-test="`model-order-select-${index}`"
              >
                <span v-if="row === null" class="k2-select__ph">
                  {{ t('model.order.placeholder') }}
                </span>
                <span v-else class="k2-order__pick">{{ titleOf(row) }}</span>
                <i class="mdi mdi-chevron-down k2-select__caret" />
              </button>
            </template>
            <div class="k2-menu__scroll">
              <button
                v-for="option in options"
                :key="option.value"
                type="button"
                class="k2-menu__item"
                :data-test="`model-order-option-${index}`"
                @click="setRow(index, option.value)"
              >
                <i
                  class="mdi"
                  :class="option.value === row ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                />
                <span>{{ option.title }}</span>
              </button>
            </div>
          </v-menu>
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
      <AppButton
        variant="primary"
        :disabled="busy"
        data-test="model-order-save"
        @click="emit('save')"
      >
        {{ t('model.order.save') }}
      </AppButton>
    </div>
  </div>
</template>
