<!-- 配置管理页（v2）。
     组织按需求文档：分组折叠块 + 三列流水线（发现 → 监听 → 动作）；桌面三列并排、窄屏标签切换。
     这一版走 v2 设计语言（k2-* 类）：页头动作、卡片、分组块、提示条都是 v2 零件；
     卡片行为约定：整卡点＝编辑、状态块只说一次、开关收进 ⋯、翻面只由卡脚按钮触发。
     页面只做数据映射与写操作（业务组件不碰 store）；弹窗仍是既有那一套，下一步再迁 v2。 -->
<script setup lang="ts">
import type { Action, Discovery, Group, Monitor } from '@kestrel/contracts'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ActionCard from '@/components/biz/ActionCard.vue'
import ActionDialog from '@/components/biz/ActionDialog.vue'
import ConfirmDialog from '@/components/biz/ConfirmDialog.vue'
import GroupDialog from '@/components/biz/GroupDialog.vue'
import GroupPanel from '@/components/biz/GroupPanel.vue'
import MonitorCard from '@/components/biz/MonitorCard.vue'
import MonitorDialog from '@/components/biz/MonitorDialog.vue'
import { CHANNEL_ICONS, DISCOVERY_ICONS, MONITOR_ICONS } from '@/components/biz/icons'
import SourceCard from '@/components/biz/SourceCard.vue'
import SourceDialog from '@/components/biz/SourceDialog.vue'
import type {
  ActionDialogValues,
  MonitorDialogValues,
  SourceDialogValues,
} from '@/components/biz/types'
import { useConfigStore } from '@/stores/config'
import { useToastStore } from '@/stores/toast'
import { templateDisplayName } from '@/utils/format'

type ColumnKey = 'discoveries' | 'monitors' | 'actions'
interface PendingDelete {
  title: string
  /** 一句后果说明；有 details 时改用结构化清单，不再传它 */
  message?: string
  run: () => Promise<unknown>
  /** 确认按钮文案（删除分组这类要写清删什么，不用默认的「删除」） */
  confirmLabel?: string
  /** 结构化后果：被删对象的名字 + 随它一起删掉的条数 */
  details?: {
    name: string
    counts: Record<ColumnKey, number>
  }
}

const store = useConfigStore()
const router = useRouter()
const { t } = useI18n()

/** 错误只说一次：有弹窗开着就由弹窗说，否则由浮层说 */
const anyDialogOpen = computed(
  () =>
    groupDialogOpen.value ||
    sourceDialogOpen.value ||
    monitorDialogOpen.value ||
    actionDialogOpen.value ||
    pendingDelete.value !== null,
)

/** 动作弹窗里点「新建通知渠道」：去通知渠道页，带上标记让那边直接把新建弹窗拉起来 */
function goNewChannel(): void {
  actionDialogOpen.value = false
  void router.push({ name: 'channels', query: { new: '1' } })
}
const dialogError = computed(() => store.errorMessage)

/** 同一时刻可以展开多个分组 */
const expanded = ref<string[]>([])

/** 鼠标停在监听卡或动作卡上：记下是谁，用来把相关的卡片一起标出来（触屏没有 hover，不用管） */
const hoveredCard = ref<{ kind: 'monitor' | 'action'; id: string } | null>(null)

function setHover(kind: 'monitor' | 'action', id: string, on: boolean): void {
  hoveredCard.value = on ? { kind, id } : null
}

/** 一条监听会用到哪些动作：自己指定了就用指定的；空＝跟随分组，这一组的动作都算 */
function monitorActionIds(groupId: string, monitor: Monitor): string[] {
  if (monitor.actionIds.length > 0) return monitor.actionIds
  return store.actionsOf(groupId).map((item) => item.id)
}

/** 鼠标停在一张卡上时，同一组里跟它有关联的那几张一起亮（监听 ↔ 动作，正反都要） */
function isLinked(groupId: string, kind: 'monitor' | 'action', id: string): boolean {
  const at = hoveredCard.value
  if (!at) return false
  // 鼠标下面那张自己也亮
  if (at.kind === kind) return at.id === id
  const monitors = store.monitorsOf(groupId)
  const actions = store.actionsOf(groupId)
  const monitor = monitors.find((item) => (kind === 'monitor' ? item.id === id : item.id === at.id))
  const action = actions.find((item) => (kind === 'action' ? item.id === id : item.id === at.id))
  return Boolean(monitor && action && monitorActionIds(groupId, monitor).includes(action.id))
}

const toast = useToastStore()

/** 正在试抓的数据源 id：试抓中不许再点第二次 */
const testingSourceId = ref('')

/** 页面级错误条已下线：读不到、写不动、请求失败都改由浮层说；弹窗开着时留给弹窗自己说 */
watch(
  () => store.errorMessage,
  (message) => {
    if (message && !anyDialogOpen.value) toast.push(message)
  },
)

const groupDialogOpen = ref(false)
const editingGroup = ref<Group | null>(null)

const sourceDialogOpen = ref(false)
const sourceGroupId = ref('')
const editingDiscovery = ref<Discovery | null>(null)

const monitorDialogOpen = ref(false)
const monitorGroupId = ref('')
const editingMonitor = ref<Monitor | null>(null)

const actionDialogOpen = ref(false)
const actionGroupId = ref('')
const editingAction = ref<Action | null>(null)

const pendingDelete = ref<PendingDelete | null>(null)
const deleting = ref(false)

/** 需求：非移动端默认全部展开，移动端默认全部折叠 */
const isWide = (): boolean => window.matchMedia('(min-width: 1184px)').matches

onMounted(async () => {
  await store.load()
  if (isWide()) expanded.value = store.groups.map((group) => group.id)
})

const loading = computed(() => store.loading && store.groups.length === 0)
const allExpanded = computed(
  () => store.groups.length > 0 && expanded.value.length === store.groups.length,
)

/** 展开/收起那颗按钮没有文字，靠 title 与 aria-label 说清点它会做什么 */
const allLabel = computed(() =>
  allExpanded.value ? t('config.collapseAll') : t('config.expandAll'),
)

function toggleGroup(id: string): void {
  expanded.value = expanded.value.includes(id)
    ? expanded.value.filter((value) => value !== id)
    : [...expanded.value, id]
}

function toggleAll(): void {
  expanded.value = allExpanded.value ? [] : store.groups.map((group) => group.id)
}

function countsOf(groupId: string): Record<ColumnKey, number> {
  return {
    discoveries: store.discoveriesOf(groupId).length,
    monitors: store.monitorsOf(groupId).length,
    actions: store.actionsOf(groupId).length,
  }
}

/* ---------- 卡片数据映射 ---------- */

function sourceProps(discovery: Discovery): InstanceType<typeof SourceCard>['$props'] {
  return {
    name: discovery.name,
    kindLabel: t(`discovery.kind.${discovery.kind}`),
    icon: DISCOVERY_ICONS[discovery.kind],
    enabled: discovery.enabled,
    target: discovery.target,
    cron: discovery.cronExpression,
    nextRunAt: discovery.nextRunAt,
    busy: testingSourceId.value === discovery.id,
    stat: store.cardStats?.discoveries[discovery.id] ?? null,
    windowDays: store.cardStats?.windowDays ?? 7,
  }
}

function monitorProps(monitor: Monitor): InstanceType<typeof MonitorCard>['$props'] {
  return {
    name: monitor.name,
    // 跟随全局就写「跟随全局」，不再缀当前生效的模式
    modeLabel: t(`monitor.mode.${monitor.mode}`),
    icon: MONITOR_ICONS[monitor.mode],
    keywords: monitor.includeKeywords,
    matchLabel: monitor.includeKeywords.length ? t(`monitor.matchMode.${monitor.matchMode}`) : '',
    intentText: monitor.intentText,
    sensitivityLabel: t(`monitor.sensitivity.${monitor.sensitivity}`),
    enabled: monitor.enabled,
    stat: store.cardStats?.monitors[monitor.id] ?? null,
    windowDays: store.cardStats?.windowDays ?? 7,
  }
}

function actionProps(action: Action): InstanceType<typeof ActionCard>['$props'] {
  const channel = store.channels.find((item) => item.id === action.channelId)
  const template = store.templateById(action.templateId)
  return {
    name: action.name,
    triggerLabel: t(`action.trigger.${action.triggerType}`),
    icon: channel ? CHANNEL_ICONS[channel.type] : undefined,
    cron: action.cronExpression,
    channelName: channel?.name ?? '',
    templateName: template ? templateDisplayName(template, t) : t('action.templateBuiltin'),
    enabled: action.enabled,
    stat: store.cardStats?.actions[action.id] ?? null,
    windowDays: store.cardStats?.windowDays ?? 7,
  }
}

async function runSourceTest(discovery: Discovery): Promise<void> {
  if (testingSourceId.value) return
  testingSourceId.value = discovery.id
  try {
    const result = await store.testDiscovery(discovery.id)
    // 请求本身失败：说明与浮层由 errorMessage 那条线负责
    if (!result) return
    if (!result.routeOk) {
      toast.push(`${discovery.name}：${t('discovery.testFail')}`, 'danger')
    } else if (result.contentOk) {
      toast.push(
        `${discovery.name}：${t('discovery.testOk', { n: result.foundItemCount })}`,
        'success',
      )
    } else {
      toast.push(`${discovery.name}：${t('discovery.testEmpty')}`, 'warning')
    }
  } finally {
    testingSourceId.value = ''
  }
}

/* ---------- 打开弹窗 ---------- */

function openGroupDialog(group: Group | null): void {
  editingGroup.value = group
  groupDialogOpen.value = true
}

function openAddDialog(groupId: string, column: ColumnKey): void {
  if (column === 'discoveries') {
    sourceGroupId.value = groupId
    editingDiscovery.value = null
    sourceDialogOpen.value = true
  } else if (column === 'monitors') {
    monitorGroupId.value = groupId
    editingMonitor.value = null
    monitorDialogOpen.value = true
  } else {
    actionGroupId.value = groupId
    editingAction.value = null
    actionDialogOpen.value = true
  }
}

function openSourceDialog(groupId: string, id: string): void {
  sourceGroupId.value = groupId
  editingDiscovery.value = store.discoveriesOf(groupId).find((item) => item.id === id) ?? null
  sourceDialogOpen.value = true
}

function openMonitorDialog(groupId: string, id: string): void {
  monitorGroupId.value = groupId
  editingMonitor.value = store.monitorsOf(groupId).find((item) => item.id === id) ?? null
  monitorDialogOpen.value = true
}

function openActionDialog(groupId: string, id: string): void {
  actionGroupId.value = groupId
  editingAction.value = store.actionsOf(groupId).find((item) => item.id === id) ?? null
  actionDialogOpen.value = true
}

/* ---------- 保存：成功才关弹窗 ---------- */

async function saved(work: Promise<boolean>, close: () => void): Promise<void> {
  const ok = await work
  if (!ok) return
  close()
}

async function submitGroup(values: { name: string; description: string }): Promise<void> {
  const id = editingGroup.value?.id
  if (id) {
    void saved(store.saveGroup(id, values), () => (groupDialogOpen.value = false))
    return
  }
  // 新建分组：记下现有 id，建完把新的那个直接展开（刚建完是一片折叠块，看着像没建成）
  const known = new Set(store.groups.map((group) => group.id))
  const ok = await store.createGroup(values)
  if (!ok) return
  groupDialogOpen.value = false
  const created = store.groups.find((group) => !known.has(group.id))
  if (created && !expanded.value.includes(created.id))
    expanded.value = [...expanded.value, created.id]
}

function submitSource(values: SourceDialogValues): void {
  const id = editingDiscovery.value?.id
  const patch = {
    name: values.name,
    kind: values.kind,
    target: values.target,
    cronExpression: values.cronExpression,
    enabled: values.enabled,
  }
  void saved(
    id
      ? store.saveDiscovery(id, patch)
      : store.createDiscovery({ groupId: sourceGroupId.value, ...patch }),
    () => (sourceDialogOpen.value = false),
  )
}

function submitMonitor(values: MonitorDialogValues): void {
  const id = editingMonitor.value?.id
  void saved(
    id
      ? store.saveMonitor(id, values)
      : store.createMonitor({ groupId: monitorGroupId.value, ...values }),
    () => (monitorDialogOpen.value = false),
  )
}

function submitAction(values: ActionDialogValues): void {
  const id = editingAction.value?.id
  const payload = {
    ...values,
    // 即时动作没有汇总时间；模板留空＝系统内置
    cronExpression: values.cron || null,
    templateId: values.templateId || null,
  }
  void saved(
    id
      ? store.saveAction(id, payload)
      : store.createAction({ groupId: actionGroupId.value, ...payload }),
    () => (actionDialogOpen.value = false),
  )
}

/* ---------- 删除：一律二级确认 ---------- */

function askDeleteGroup(group: Group): void {
  pendingDelete.value = {
    title: t('config.deleteGroup'),
    confirmLabel: t('config.deleteGroup'),
    details: { name: group.name, counts: countsOf(group.id) },
    run: () => store.removeGroups([group.id]),
  }
}

function askDeleteSource(discovery: Discovery): void {
  pendingDelete.value = {
    title: t('discovery.delete'),
    message: t('discovery.deleteBody'),
    run: () => store.removeDiscovery(discovery.id),
  }
}

function askDeleteMonitor(monitor: Monitor): void {
  pendingDelete.value = {
    title: t('monitor.delete'),
    message: t('monitor.deleteBody'),
    run: () => store.removeMonitor(monitor.id),
  }
}

function askDeleteAction(action: Action): void {
  pendingDelete.value = {
    title: t('action.delete'),
    message: t('action.deleteBody'),
    run: () => store.removeAction(action.id),
  }
}

/** 确认后弹窗先留着（转圈、挡住重复点击），做完再关 */
async function confirmDelete(): Promise<void> {
  const pending = pendingDelete.value
  if (!pending) return
  deleting.value = true
  try {
    await pending.run()
  } finally {
    deleting.value = false
    pendingDelete.value = null
  }
}
</script>

<template>
  <div class="k2-page k2-page--wide" data-test="config-page">
    <div class="k2-page__head">
      <div class="k2-page__lead">
        <h1 class="k2-page__title">{{ t('config.title') }}</h1>
        <p class="k2-page__note">{{ t('config.note') }}</p>
      </div>
      <div class="k2-page__actions">
        <button
          type="button"
          class="k2-iconbtn"
          :title="allLabel"
          :aria-label="allLabel"
          data-test="toggle-all"
          @click="toggleAll"
        >
          <i
            class="mdi"
            :class="allExpanded ? 'mdi-unfold-less-horizontal' : 'mdi-unfold-more-horizontal'"
          />
        </button>
        <button
          type="button"
          class="k2-btn k2-btn--primary"
          data-test="new-group"
          @click="openGroupDialog(null)"
        >
          <v-icon size="18">mdi-plus</v-icon>
          {{ t('config.newGroup') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="k2-group" data-test="config-loading">
      <AppSkeleton variant="card" :body="false" :blocks="3" />
    </div>

    <section v-else-if="store.groups.length === 0" class="k2-card k2-card--flat">
      <AppEmptyState
        data-test="config-empty"
        icon="mdi-folder-outline"
        :title="t('config.empty')"
      />
    </section>

    <template v-else>
      <GroupPanel
        v-for="group in store.groups"
        :key="group.id"
        :group="group"
        :counts="countsOf(group.id)"
        :expanded="expanded.includes(group.id)"
        @toggle="toggleGroup(group.id)"
        @edit="openGroupDialog(group)"
        @delete="askDeleteGroup(group)"
        @toggle-enabled="(value: boolean) => store.setGroupEnabled(group, value)"
        @add="(column: ColumnKey) => openAddDialog(group.id, column)"
      >
        <template #discoveries>
          <SourceCard
            v-for="discovery in store.discoveriesOf(group.id)"
            :key="discovery.id"
            v-bind="sourceProps(discovery)"
            @edit="openSourceDialog(group.id, discovery.id)"
            @delete="askDeleteSource(discovery)"
            @toggle="(value: boolean) => store.setDiscoveryEnabled(discovery.id, value)"
            @test="runSourceTest(discovery)"
          />
        </template>

        <template #monitors>
          <MonitorCard
            v-for="monitor in store.monitorsOf(group.id)"
            :key="monitor.id"
            v-bind="monitorProps(monitor)"
            :linked="isLinked(group.id, 'monitor', monitor.id)"
            @hover="(on: boolean) => setHover('monitor', monitor.id, on)"
            @edit="openMonitorDialog(group.id, monitor.id)"
            @delete="askDeleteMonitor(monitor)"
            @toggle="(value: boolean) => store.setMonitorEnabled(monitor.id, value)"
          />
        </template>

        <template #actions>
          <ActionCard
            v-for="action in store.actionsOf(group.id)"
            :key="action.id"
            v-bind="actionProps(action)"
            :linked="isLinked(group.id, 'action', action.id)"
            @hover="(on: boolean) => setHover('action', action.id, on)"
            @edit="openActionDialog(group.id, action.id)"
            @delete="askDeleteAction(action)"
            @toggle="(value: boolean) => store.setActionEnabled(action.id, value)"
          />
        </template>
      </GroupPanel>
    </template>
  </div>

  <GroupDialog
    v-model="groupDialogOpen"
    :name="editingGroup?.name ?? ''"
    :description="editingGroup?.description ?? ''"
    :busy="store.saving"
    :error="dialogError"
    @submit="submitGroup"
  />

  <SourceDialog
    v-model="sourceDialogOpen"
    :name="editingDiscovery?.name ?? ''"
    :kind="editingDiscovery?.kind ?? 'rsshub'"
    :target="editingDiscovery?.target ?? ''"
    :cron="editingDiscovery?.cronExpression ?? '0 * * * *'"
    :enabled="editingDiscovery?.enabled ?? true"
    :rsshub-base-url="store.settings.rsshubBaseUrl"
    :busy="store.saving"
    :error="dialogError"
    @submit="submitSource"
    @configure-rsshub="router.push('/settings')"
  />

  <MonitorDialog
    v-model="monitorDialogOpen"
    :name="editingMonitor?.name ?? ''"
    :mode="editingMonitor?.mode ?? 'follow_global'"
    :intent-text="editingMonitor?.intentText ?? ''"
    :include-keywords="editingMonitor?.includeKeywords ?? []"
    :exclude-keywords="editingMonitor?.excludeKeywords ?? []"
    :use-global-excludes="editingMonitor?.useGlobalExcludes ?? true"
    :match-mode="editingMonitor?.matchMode ?? 'any'"
    :sensitivity="editingMonitor?.sensitivity ?? 'medium'"
    :enabled="editingMonitor?.enabled ?? true"
    :action-ids="editingMonitor?.actionIds ?? []"
    :actions="store.actionsOf(monitorGroupId).map((item) => ({ id: item.id, name: item.name }))"
    :busy="store.saving"
    :error="dialogError"
    @submit="submitMonitor"
  />

  <ActionDialog
    v-model="actionDialogOpen"
    :name="editingAction?.name ?? ''"
    :trigger-type="editingAction?.triggerType ?? 'instant'"
    :cron="editingAction?.cronExpression ?? ''"
    :channel-id="editingAction?.channelId ?? ''"
    :template-id="editingAction?.templateId ?? ''"
    :merge-messages="editingAction?.mergeMessages ?? true"
    :include-delivered="editingAction?.includeDelivered ?? false"
    :enabled="editingAction?.enabled ?? true"
    :channels="
      store.channels.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        enabled: item.enabled,
      }))
    "
    :templates="
      store.templates.map((item) => ({ id: item.id, name: templateDisplayName(item, t) }))
    "
    :busy="store.saving"
    :error="dialogError"
    @submit="submitAction"
    @new-channel="goNewChannel"
  />

  <ConfirmDialog
    :model-value="pendingDelete !== null"
    :title="pendingDelete?.title ?? ''"
    :message="pendingDelete?.message ?? ''"
    :confirm-label="pendingDelete?.confirmLabel"
    :details="pendingDelete?.details"
    :busy="deleting"
    :error="dialogError"
    @update:model-value="(value: boolean) => (pendingDelete = value ? pendingDelete : null)"
    @confirm="confirmDelete"
  />
</template>
