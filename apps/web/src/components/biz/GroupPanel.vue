<!-- GroupPanel：配置页的「分组」折叠块（业务组件层 · v2）。
     摘要行：折叠箭头 · 名称 + 简介 · 三个计数胶囊 · 启用开关 · ⋯ 菜单（编辑 / 删除）。
     宽屏展开后三列并排；窄屏顶部出现标签，一次看一列（标签走真 AppTabs，不在这手写）。
     停用只说一次：由开关表达，不再整块压暗、也不另挂状态标签。
     卡片由页面通过插槽填进来（业务组件只负责结构与位置，不碰 store）。 -->
<script setup lang="ts">
import type { Group } from '@kestrel/contracts'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppTabs from '@/components/app/AppTabs.vue'
import type { AppTabItem } from '@/components/app/types'
import { SEMANTIC_ICONS } from '@/components/biz/icons'

type ColumnKey = 'discoveries' | 'monitors' | 'actions'

const props = defineProps<{
  group: Group
  /** 三列各有多少条 */
  counts: Record<ColumnKey, number>
  expanded: boolean
}>()

const emit = defineEmits<{
  toggle: []
  edit: []
  delete: []
  'toggle-enabled': [enabled: boolean]
  add: [column: ColumnKey]
}>()

const { t } = useI18n()

/** 窄屏一次只看一列 */
const active = ref<string>('discoveries')
const menuOpen = ref(false)

/** 三列各有自己的图标：发现=信息、监听=规则、动作=执行 */
const COLUMNS: { key: ColumnKey; icon: string; addKey: string }[] = [
  { key: 'discoveries', icon: SEMANTIC_ICONS.discovery, addKey: 'discovery.add' },
  { key: 'monitors', icon: SEMANTIC_ICONS.monitor, addKey: 'monitor.add' },
  { key: 'actions', icon: SEMANTIC_ICONS.action, addKey: 'action.add' },
]

const columns = computed(() =>
  COLUMNS.map((column) => ({ ...column, label: t(`column.${column.key}`) })),
)

/** 窄屏标签：值与计数交给 AppTabs，文案仍是这一层拼好的 */
const tabItems = computed<AppTabItem[]>(() =>
  columns.value.map((column) => ({
    value: column.key,
    label: column.label,
    icon: column.icon,
    count: props.counts[column.key],
  })),
)

const enabledLabel = computed(() =>
  props.group.enabled ? t('common.enabled') : t('common.disabled'),
)
</script>

<template>
  <section class="k2-group" data-test="group-panel">
    <div class="k2-group__head">
      <button
        type="button"
        class="k2-iconbtn"
        :aria-expanded="expanded"
        :aria-label="expanded ? t('config.collapseAll') : t('config.expandAll')"
        data-test="group-toggle"
        @click="emit('toggle')"
      >
        <v-icon size="20">{{ expanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
      </button>

      <span class="k2-group__title">
        <span class="k2-group__name" data-test="group-name">{{ group.name }}</span>
        <span v-if="group.description" class="k2-group__desc" data-test="group-description">
          {{ group.description }}
        </span>
      </span>

      <span class="k2-group__counts" data-test="group-counts">
        <span class="k2-chip k2-t-neutral"
          >{{ t('column.discoveries') }} {{ counts.discoveries }}</span
        >
        <span class="k2-chip k2-t-neutral">{{ t('column.monitors') }} {{ counts.monitors }}</span>
        <span class="k2-chip k2-t-neutral">{{ t('column.actions') }} {{ counts.actions }}</span>
      </span>

      <button
        type="button"
        class="k2-switch"
        :class="{ 'k2-switch--on': group.enabled }"
        :aria-label="enabledLabel"
        :aria-pressed="group.enabled"
        data-test="group-enabled"
        @click="emit('toggle-enabled', !group.enabled)"
      >
        <span class="k2-switch__dot" />
      </button>

      <v-menu v-model="menuOpen" :close-on-content-click="true" content-class="k2-menu">
        <template #activator="{ props: menuProps }">
          <button
            v-bind="menuProps"
            type="button"
            class="k2-iconbtn"
            :aria-label="t('config.more')"
            data-test="group-menu"
          >
            <v-icon size="18">mdi-dots-horizontal</v-icon>
          </button>
        </template>
        <button
          type="button"
          class="k2-menu__item"
          data-test="group-menu-edit"
          @click="emit('edit')"
        >
          <v-icon size="18">mdi-pencil-outline</v-icon>{{ t('config.editGroup') }}
        </button>
        <button
          type="button"
          class="k2-menu__item k2-menu__item--danger"
          data-test="group-menu-delete"
          @click="emit('delete')"
        >
          <v-icon size="18">mdi-trash-can-outline</v-icon>{{ t('config.deleteGroup') }}
        </button>
      </v-menu>
    </div>

    <div v-if="expanded" class="k2-group__body">
      <AppTabs v-model="active" :items="tabItems" />

      <section
        v-for="column in columns"
        :key="column.key"
        class="k2-col"
        :class="{ 'k2-col--on': column.key === active }"
        :data-test="`column-${column.key}`"
      >
        <div class="k2-col__head">
          <v-icon size="16">{{ column.icon }}</v-icon>
          {{ column.label }} · {{ counts[column.key] }}
        </div>

        <slot :name="column.key" />

        <button
          v-if="counts[column.key] === 0"
          type="button"
          class="k2-col__add k2-col__add--empty"
          :data-test="`add-${column.key}-empty`"
          @click="emit('add', column.key)"
        >
          <i class="mdi mdi-plus" />
          <span>{{ t(`column.empty.${column.key}`) }}</span>
          <span class="k2-col__add-sub">{{ t(`column.emptyHint.${column.key}`) }}</span>
        </button>
        <button
          v-else
          type="button"
          class="k2-col__add"
          :data-test="`add-${column.key}`"
          @click="emit('add', column.key)"
        >
          <i class="mdi mdi-plus" />
          {{ t(column.addKey) }}
        </button>
      </section>
    </div>
  </section>
</template>
