<!-- Design System 预览页（开发用）
     路径：/design（只在开发环境注册，生产构建不会打包这个页面）
     作用：用真实 App* 组件把 Foundation 与组件状态矩阵摊开，桌面/手机两种宽度下直接看渲染结果。
     页面自身只用 App* 与 Vuetify，不写任何色值、间距、圆角。 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

import { findTheme, THEMES } from '@/design/tokens'
import { designGroups, spaceItems } from '@/design/preview'
import ActionCard from '@/components/biz/ActionCard.vue'
import MonitorCard from '@/components/biz/MonitorCard.vue'
import ChannelCard from '@/components/biz/ChannelCard.vue'
import ConfirmDialog from '@/components/biz/ConfirmDialog.vue'
import CronPicker from '@/components/biz/CronPicker.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import SourceCard from '@/components/biz/SourceCard.vue'
import { useUiStore } from '@/stores/ui'
import DesignGroup from '@/views/design/DesignGroup.vue'
import { makeDesignCopy, makeDesignLists, type DesignCopyKey } from '@/design/lab-copy'

const ui = useUiStore()
const { t, locale } = useI18n()
// 这个页面自己的文案（开发页，不进产品文案表）；调用时读 locale，切语言立刻跟着变
const c = (key: DesignCopyKey, params?: Record<string, string | number>): string =>
  makeDesignCopy(locale.value)(key, params)
const { name: breakpointName } = useDisplay()

const viewport = ref(0)
function readViewport(): void {
  viewport.value = window.innerWidth
}
onMounted(() => {
  readViewport()
  window.addEventListener('resize', readViewport)
})
onUnmounted(() => window.removeEventListener('resize', readViewport))

const activeBreakpoint = computed(() => {
  const w = viewport.value
  if (w >= 1440) return c('bp.xl')
  if (w >= 1280) return c('bp.lg')
  if (w >= 900) return c('bp.md')
  if (w >= 600) return c('bp.sm')
  return c('bp.xs')
})

// 主题一变，色值清单跟着变（数据全部来自 tokens，页面不另存一份）
const groups = computed(() => designGroups(findTheme(ui.theme) ?? THEMES[0], c))

// 手机上的折叠状态：桌面忽略它，永远全展开
// 手机默认只展开第一组，其余收着；桌面（≥900）不看这个状态，永远全展开
const open = ref<Record<string, boolean>>({ Color: true })
function setOpen(key: string, value: boolean): void {
  open.value = { ...open.value, [key]: value }
}

// 组件演示用的临时状态
const inputValue = ref('http://192.168.5.100:1200')
const selectValue = ref('standard')
const switchOn = ref(true)
const readonlySwitch = ref(true)
const disabledSwitch = ref(false)
const dialog = ref<'none' | 'normal' | 'loading' | 'error'>('none')
const dialogOpen = computed({
  get: () => dialog.value !== 'none',
  set: (value: boolean) => {
    if (!value) dialog.value = 'none'
  },
})
const toastVisible = ref(false)
function flashToast(): void {
  toastVisible.value = true
  window.setTimeout(() => (toastVisible.value = false), 2200)
}

// 业务组件演示状态
const cronDaily = ref('0 8 * * *')
const cronStep = ref('*/5 * * * *')
const cronBad = ref('0 8 * *')
const bizDialog = ref<'none' | 'normal' | 'busy' | 'error'>('none')
const bizDialogOpen = computed({
  get: () => bizDialog.value !== 'none',
  set: (value: boolean) => {
    if (!value) bizDialog.value = 'none'
  },
})

const selectItems = computed(() => [
  { title: c('demo.mode.standard'), value: 'standard' },
  { title: c('demo.mode.assisted'), value: 'assisted' },
])

// 渠道卡演示：× 要确认；圆点走「未测 → 测试中 → 连通／失败」的状态机（结果只留在内存里）
type Probe = 'idle' | 'testing' | 'ok' | 'warn' | 'fail'
type DemoChannel = {
  id: string
  name: string
  type: 'telegram' | 'webhook'
  enabled: boolean
  tone: 'ok' | 'warn' | 'err' | 'neutral'
  probe: Probe
  /** 演示用：这个渠道点测试会落成什么结果 */
  result?: 'ok' | 'warn' | 'fail'
}
function initialChannels(): DemoChannel[] {
  return [
    {
      id: 'c1',
      name: c('demo.channel.mine'),
      type: 'telegram',
      enabled: true,
      tone: 'ok',
      probe: 'ok',
      result: 'ok',
    },
    {
      id: 'c2',
      name: c('demo.channel.warn'),
      type: 'telegram',
      enabled: true,
      tone: 'warn',
      probe: 'warn',
      result: 'warn',
    },
    {
      id: 'c3',
      name: c('demo.channel.untested'),
      type: 'webhook',
      enabled: true,
      tone: 'neutral',
      probe: 'idle',
      result: 'ok',
    },
    {
      id: 'c4',
      name: c('demo.channel.off'),
      type: 'webhook',
      enabled: false,
      tone: 'neutral',
      probe: 'idle',
      result: 'ok',
    },
    {
      id: 'c5',
      name: c('demo.channel.fail'),
      type: 'telegram',
      enabled: true,
      tone: 'err',
      probe: 'fail',
      result: 'fail',
    },
  ]
}
const demoChannels = ref<DemoChannel[]>(initialChannels())

// 演示卡的名字/状态是 setup 时算好的，切语言时按新语言重建一遍（只影响这个预览页）
watch(locale, () => {
  demoChannels.value = initialChannels()
  demoSources.value = initialSources()
  demoActions.value = initialActions()
  demoMonitors.value = initialMonitors()
})

// 演示里改过的东西（删过卡、点过测试）才显示复位按钮
const demoDirty = computed(() => {
  const base = initialChannels()
  return (
    demoChannels.value.length !== base.length ||
    demoChannels.value.some((c, index) => c.probe !== base[index]?.probe)
  )
})

// 点圆点：先转圈，再落成连通或失败；转圈期间按钮是 disabled，点不动
function runChannelTest(channel: DemoChannel): void {
  if (channel.probe === 'testing') return
  channel.probe = 'testing'
  window.setTimeout(() => {
    const result = channel.result ?? 'ok'
    channel.probe = result
    // 圆点说「失败」，左侧色条说的是「红」——两套枚举各叫各的
    channel.tone = result === 'fail' ? 'err' : result
  }, 900)
}

// 点卡片＝编辑：保存后把圆点退回未测（凭证/目标可能改了，旧结论作废）
const editingChannel = ref<DemoChannel | null>(null)
const editOpen = computed({
  get: () => editingChannel.value !== null,
  set: (value: boolean) => {
    if (!value) editingChannel.value = null
  },
})
const editName = ref('')
function openChannelEdit(channel: DemoChannel): void {
  editingChannel.value = channel
  editName.value = channel.name
}
function submitChannelEdit(): void {
  const channel = editingChannel.value
  if (!channel) return
  channel.name = editName.value
  channel.probe = 'idle'
  channel.tone = 'neutral'
  editingChannel.value = null
}

// 数据源演示：点状态块＝抓取测试（转圈 900ms 后落成结果）；点卡片＝编辑；右上角 ×＝删除
type DemoTone = 'ok' | 'warn' | 'err' | 'neutral'
type DemoSource = {
  id: string
  name: string
  icon: string
  kindLabel: string
  enabled: boolean
  target: string
  cron: string
  nextRunAt: string | null
  tone: DemoTone
  statusText: string
  /** 演示用：抓完落成什么结果 */
  result: 'ok' | 'warn' | 'err'
  busy: boolean
}
const SOURCE_LABELS = {
  get ok() {
    return c('demo.sourceStatusOk')
  },
  get warn() {
    return c('demo.sourceStatusWarn')
  },
  get err() {
    return c('demo.sourceStatusFail')
  },
}
/** 演示用：把「下次采集」放在当前时间之后若干分钟 */
function inMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function initialSources(): DemoSource[] {
  return [
    {
      id: 's1',
      name: c('demo.source.bili'),
      icon: 'mdi-video-outline',
      kindLabel: t('discovery.kind.rsshub'),
      enabled: true,
      target: '/bilibili/ranking/all',
      cron: '*/30 * * * *',
      nextRunAt: inMinutes(18),
      tone: 'ok',
      statusText: SOURCE_LABELS.ok,
      result: 'ok',
      busy: false,
    },
    {
      id: 's2',
      name: c('demo.source.new'),
      icon: 'mdi-rss',
      kindLabel: t('discovery.kind.rsshub'),
      enabled: true,
      target: '/github/trending/daily',
      cron: '0 * * * *',
      nextRunAt: inMinutes(42),
      tone: 'neutral',
      statusText: '',
      result: 'ok',
      busy: false,
    },
    {
      id: 's3',
      name: c('demo.source.empty'),
      icon: 'mdi-web',
      kindLabel: t('discovery.kind.web'),
      enabled: true,
      target: 'https://example.com/blog',
      cron: '0 */6 * * *',
      nextRunAt: inMinutes(205),
      tone: 'warn',
      statusText: SOURCE_LABELS.warn,
      result: 'warn',
      busy: false,
    },
    {
      id: 's4',
      name: c('demo.source.bad'),
      icon: 'mdi-rss',
      kindLabel: t('discovery.kind.rsshub'),
      enabled: true,
      target: '/bilibili/ranking/dance',
      cron: '0 */6 * * *',
      nextRunAt: inMinutes(205),
      tone: 'err',
      statusText: SOURCE_LABELS.err,
      result: 'err',
      busy: false,
    },
    {
      id: 's5',
      name: c('demo.source.off'),
      icon: 'mdi-rss',
      kindLabel: t('discovery.kind.rsshub'),
      enabled: false,
      target: '/hackernews/best',
      cron: '*/30 * * * *',
      nextRunAt: null,
      tone: 'neutral',
      statusText: t('common.disabled'),
      result: 'ok',
      busy: false,
    },
  ]
}
const demoSources = ref<DemoSource[]>(initialSources())
const pendingSource = ref<DemoSource | null>(null)
const sourceDeleteOpen = computed({
  get: () => pendingSource.value !== null,
  set: (value: boolean) => {
    if (!value) pendingSource.value = null
  },
})
const sourceDeleteBusy = ref(false)
async function confirmSourceDelete(): Promise<void> {
  sourceDeleteBusy.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 400))
  demoSources.value = demoSources.value.filter((s) => s.id !== pendingSource.value?.id)
  sourceDeleteBusy.value = false
  pendingSource.value = null
}

const demoSourcesDirty = computed(() =>
  demoSources.value.some((s, index) => s.statusText !== initialSources()[index]?.statusText),
)
function runSourceTest(source: DemoSource): void {
  if (source.busy || !source.enabled) return
  source.busy = true
  window.setTimeout(() => {
    source.busy = false
    source.tone = source.result
    source.statusText = SOURCE_LABELS[source.result]
  }, 900)
}

// 监听卡演示：点卡片＝编辑、右上角 ×＝删除（二级确认）、卡脚开关
type DemoMonitor = {
  id: string
  name: string
  icon: string
  modeLabel: string
  keywords: string[]
  matchLabel: string
  excludeCount: number
  intentText: string
  sensitivityLabel: string
  boundActionsLabel: string
  enabled: boolean
}
function initialMonitors(): DemoMonitor[] {
  const words = makeDesignLists(locale.value)
  return [
    {
      id: 'm1',
      name: c('demo.monitor.dance'),
      icon: 'mdi-magnify',
      modeLabel: t('monitor.mode.algorithm'),
      keywords: words('demo.monitor.keywords.dance'),
      matchLabel: t('monitor.matchMode.any'),
      excludeCount: 2,
      intentText: '',
      sensitivityLabel: t('monitor.sensitivity.medium'),
      boundActionsLabel: '',
      enabled: true,
    },
    {
      id: 'm2',
      name: c('demo.monitor.ai'),
      icon: 'mdi-robot-outline',
      modeLabel: t('monitor.mode.algorithm_llm'),
      keywords: words('demo.monitor.keywords.ai'),
      matchLabel: t('monitor.matchMode.all'),
      excludeCount: 0,
      intentText: c('demo.monitor.intent'),
      sensitivityLabel: t('monitor.sensitivity.high'),
      boundActionsLabel: '',
      enabled: true,
    },
    {
      id: 'm3',
      name: c('demo.monitor.nokw'),
      icon: 'mdi-filter-variant',
      modeLabel: t('monitor.mode.follow_global'),
      keywords: [],
      matchLabel: '',
      excludeCount: 0,
      intentText: '',
      sensitivityLabel: t('monitor.sensitivity.low'),
      boundActionsLabel: t('monitor.onlyActions', { names: c('demo.action.push') }),
      enabled: true,
    },
    {
      id: 'm4',
      name: c('demo.monitor.off'),
      icon: 'mdi-text-search',
      modeLabel: t('monitor.mode.algorithm'),
      keywords: words('demo.monitor.keywords.dance'),
      matchLabel: t('monitor.matchMode.all'),
      excludeCount: 0,
      intentText: '',
      sensitivityLabel: t('monitor.sensitivity.medium'),
      boundActionsLabel: '',
      enabled: false,
    },
  ]
}
const demoMonitors = ref<DemoMonitor[]>(initialMonitors())
const pendingMonitor = ref<DemoMonitor | null>(null)
const monitorDeleteOpen = computed({
  get: () => pendingMonitor.value !== null,
  set: (value: boolean) => {
    if (!value) pendingMonitor.value = null
  },
})
const monitorDeleteBusy = ref(false)
async function confirmMonitorDelete(): Promise<void> {
  monitorDeleteBusy.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 400))
  demoMonitors.value = demoMonitors.value.filter((m) => m.id !== pendingMonitor.value?.id)
  monitorDeleteBusy.value = false
  pendingMonitor.value = null
}
const demoMonitorsDirty = computed(() => {
  const base = initialMonitors()
  return (
    demoMonitors.value.length !== base.length ||
    demoMonitors.value.some((m, index) => m.enabled !== base[index]?.enabled)
  )
})
function toggleMonitor(monitor: DemoMonitor, value: boolean): void {
  monitor.enabled = value
}

// 动作卡演示：点卡片＝编辑、右上角 ×＝删除（二级确认）、卡脚开关
type DemoAction = {
  id: string
  name: string
  icon: string
  triggerLabel: string
  cron: string | null
  nextRunAt: string | null
  channelName?: string
  channelEnabled?: boolean
  templateName?: string
  enabled: boolean
}
function initialActions(): DemoAction[] {
  return [
    {
      id: 'a1',
      name: c('demo.action.push'),
      icon: 'mdi-bell-ring-outline',
      triggerLabel: c('demo.trigger.realtime'),
      cron: null,
      nextRunAt: null,
      channelName: c('demo.channelName'),
      templateName: c('demo.templateDefault'),
      enabled: true,
    },
    {
      id: 'a2',
      name: c('demo.action.digest'),
      icon: 'mdi-clock-outline',
      triggerLabel: c('demo.trigger.digest'),
      cron: '0 8 * * *',
      nextRunAt: inMinutes(480),
      channelName: c('demo.channelName'),
      templateName: c('demo.templateBrief'),
      enabled: true,
    },
    {
      id: 'a3',
      name: c('demo.action.missing'),
      icon: 'mdi-bell-off-outline',
      triggerLabel: c('demo.trigger.realtime'),
      cron: null,
      nextRunAt: null,
      templateName: c('demo.templateDefault'),
      enabled: true,
    },
    {
      id: 'a5',
      name: c('demo.action.channelOff'),
      icon: 'mdi-bell-alert-outline',
      triggerLabel: c('demo.trigger.realtime'),
      cron: null,
      nextRunAt: null,
      channelName: c('demo.channelName'),
      channelEnabled: false,
      templateName: c('demo.templateDefault'),
      enabled: true,
    },
    {
      id: 'a4',
      name: c('demo.action.off'),
      icon: 'mdi-bell-outline',
      triggerLabel: c('demo.trigger.realtime'),
      cron: null,
      nextRunAt: null,
      channelName: c('demo.channelName'),
      enabled: false,
    },
  ]
}
const demoActions = ref<DemoAction[]>(initialActions())
const pendingAction = ref<DemoAction | null>(null)
const actionDeleteOpen = computed({
  get: () => pendingAction.value !== null,
  set: (value: boolean) => {
    if (!value) pendingAction.value = null
  },
})
const actionDeleteBusy = ref(false)
async function confirmActionDelete(): Promise<void> {
  actionDeleteBusy.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 400))
  demoActions.value = demoActions.value.filter((a) => a.id !== pendingAction.value?.id)
  actionDeleteBusy.value = false
  pendingAction.value = null
}
const demoActionsDirty = computed(() => {
  const base = initialActions()
  return (
    demoActions.value.length !== base.length ||
    demoActions.value.some((a, index) => a.enabled !== base[index]?.enabled)
  )
})
function toggleAction(action: DemoAction, value: boolean): void {
  action.enabled = value
}

const pendingChannel = ref<DemoChannel | null>(null)
const channelDeleteOpen = computed({
  get: () => pendingChannel.value !== null,
  set: (value: boolean) => {
    if (!value) pendingChannel.value = null
  },
})
const channelDeleteBusy = ref(false)
async function confirmChannelDelete(): Promise<void> {
  channelDeleteBusy.value = true
  // 演示里假装删一下，好让确认按钮的转圈看得见
  await new Promise((resolve) => window.setTimeout(resolve, 400))
  demoChannels.value = demoChannels.value.filter((c) => c.id !== pendingChannel.value?.id)
  channelDeleteBusy.value = false
  pendingChannel.value = null
}
</script>

<template>
  <AppPage width="wide" :title="c('page.title')" :note="c('page.note')">
    <template #actions>
      <span class="app-tag font-mono" data-test="design-viewport">
        {{ c('page.viewport', { w: viewport, bp: activeBreakpoint, v: breakpointName }) }}
      </span>
    </template>

    <div class="app-stack" data-test="design-page">
      <!-- Foundation -->
      <DesignGroup
        v-for="group in groups"
        :key="group.title"
        :title="group.title"
        :note="group.note"
        :open="open[group.title] ?? false"
        @update:open="(value) => setOpen(group.title, value)"
      >
        <AppCard>
          <div class="ds-token-grid">
            <div v-for="item in group.items" :key="item.name" class="ds-token">
              <div
                v-if="group.kind === 'color'"
                class="ds-token__swatch"
                :style="{ background: item.value }"
              />
              <div
                v-else-if="group.kind === 'space'"
                class="ds-token__bar"
                :style="{ width: item.value }"
              />
              <div
                v-else-if="group.kind === 'radius'"
                class="ds-token__radius"
                :style="{ borderRadius: item.value }"
              />
              <div
                v-else-if="group.kind === 'shadow'"
                class="ds-token__shadow"
                :style="{ boxShadow: item.value }"
              />
              <span v-else-if="group.kind === 'type'" class="ds-token__sample" :style="item.style">
                {{ c('page.sample') }}
              </span>
              <span v-else class="ds-token__sample">{{ item.value }}</span>
              <span class="ds-token__name font-mono">{{ item.name }}</span>
              <span class="ds-token__value font-mono">{{ item.value }}</span>
            </div>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- 间距阶梯（单独一组，方便手机逐档核对） -->
      <DesignGroup
        :title="c('sec.foundation.spacing')"
        :note="c('sec.foundation.spacingNote')"
        :open="open[c('sec.foundation.spacing')] ?? false"
        @update:open="(value) => setOpen(c('sec.foundation.spacing'), value)"
      >
        <AppCard>
          <div class="app-stack">
            <div v-for="item in spaceItems()" :key="item.name" class="ds-space">
              <span class="app-badge">{{ item.name }}</span>
              <span class="ds-space__bar" :style="{ width: item.value }" />
              <span class="app-card__note font-mono">{{ item.value }}</span>
            </div>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- AppButton -->
      <DesignGroup
        title="AppButton"
        :note="c('states.button')"
        :open="open['AppButton'] ?? false"
        @update:open="(value) => setOpen('AppButton', value)"
      >
        <div class="ds-cols">
          <AppCard :title="c('card.variants')" :note="c('card.variantsNote')">
            <div class="app-stack">
              <div class="app-row ds-wrap">
                <AppButton variant="primary">{{ c('btn.primary') }}</AppButton>
                <AppButton>{{ c('btn.secondary') }}</AppButton>
                <AppButton variant="ghost">{{ c('btn.ghost') }}</AppButton>
                <AppButton variant="danger">{{ t('common.delete') }}</AppButton>
              </div>
              <div class="app-row ds-wrap">
                <AppButton size="sm" variant="primary">{{ c('btn.smPrimary') }}</AppButton>
                <AppButton size="sm">{{ c('btn.sm') }}</AppButton>
                <AppButton size="sm" variant="ghost">{{ c('btn.smGhost') }}</AppButton>
              </div>
            </div>
          </AppCard>

          <AppCard :title="c('card.disabled')" :note="c('card.disabledNote')">
            <div class="app-stack">
              <div class="app-row ds-wrap">
                <AppButton disabled>{{ c('btn.disabled') }}</AppButton>
                <AppButton variant="primary" disabled>{{ c('btn.disabledPrimary') }}</AppButton>
                <AppButton loading>{{ c('btn.saving') }}</AppButton>
                <AppButton variant="primary" loading>{{ c('btn.submitting') }}</AppButton>
              </div>
              <AppButton variant="primary" block>{{ c('btn.block') }}</AppButton>
            </div>
          </AppCard>
        </div>
      </DesignGroup>

      <!-- AppInput / AppSelect -->
      <DesignGroup
        title="AppInput / AppSelect"
        :note="c('states.input')"
        :open="open['AppInput / AppSelect'] ?? false"
        @update:open="(value) => setOpen('AppInput / AppSelect', value)"
      >
        <div class="ds-cols">
          <AppCard title="AppInput" :note="c('card.inputNote')">
            <div class="app-stack">
              <AppInput
                v-model="inputValue"
                :label="c('field.instance')"
                :hint="c('field.instanceHint')"
              />
              <AppInput
                :model-value="''"
                :label="c('field.empty')"
                placeholder="http://192.168.5.100:1200"
              />
              <AppInput
                :model-value="c('field.filled')"
                :label="c('field.readonly')"
                readonly
                :hint="c('field.readonlyHint')"
              />
              <AppInput :model-value="'x'" :label="c('btn.disabled')" disabled />
              <AppInput
                :model-value="'http://192.168.5.100:9999'"
                :label="c('field.errorState')"
                :error="c('field.errorMsg')"
              />
              <AppInput
                v-model="inputValue"
                :label="c('field.withAction')"
                :hint="c('field.actionHint')"
                :action-label="t('discovery.test')"
              />
            </div>
          </AppCard>

          <AppCard title="AppSelect" :note="c('card.selectNote')">
            <div class="app-stack">
              <AppSelect
                v-model="selectValue"
                :label="c('field.judgeMode')"
                :items="selectItems"
                :hint="c('field.judgeHint')"
              />
              <AppSelect
                :model-value="null"
                :label="c('field.defaultState')"
                :items="selectItems"
                :placeholder="c('field.select')"
              />
              <AppSelect
                :model-value="'standard'"
                :label="c('btn.disabled')"
                :items="selectItems"
                disabled
              />
              <AppSelect
                :model-value="'standard'"
                :label="c('field.readonly')"
                :items="selectItems"
                readonly
              />
              <AppSelect
                :model-value="'bad'"
                :label="c('field.errorState')"
                :items="selectItems"
                :error="c('field.modeGone')"
              />
            </div>
          </AppCard>
        </div>
      </DesignGroup>

      <!-- AppSwitch -->
      <DesignGroup
        title="AppSwitch"
        :note="c('states.switch')"
        :open="open['AppSwitch'] ?? false"
        @update:open="(value) => setOpen('AppSwitch', value)"
      >
        <AppCard>
          <div class="app-stack">
            <AppSwitch
              v-model="switchOn"
              :label="c('field.groupSwitch')"
              :hint="c('field.groupSwitchHint')"
            />
            <AppSwitch v-model="readonlySwitch" :label="c('field.switchOn')" hint="on" />
            <AppSwitch
              v-model="disabledSwitch"
              :label="c('btn.disabled')"
              :hint="c('field.builtinHint')"
              disabled
            />
          </div>
        </AppCard>
      </DesignGroup>

      <!-- AppStatus -->
      <DesignGroup
        title="AppStatus"
        :note="c('states.status')"
        :open="open['AppStatus'] ?? false"
        @update:open="(value) => setOpen('AppStatus', value)"
      >
        <AppCard>
          <div class="app-stack">
            <div class="app-row ds-wrap">
              <AppStatus tone="ok">{{ c('demo.toneOk') }}</AppStatus>
              <AppStatus tone="warn">{{ c('demo.toneWarn') }}</AppStatus>
              <AppStatus tone="err">{{ c('demo.toneErr') }}</AppStatus>
              <AppStatus tone="info">{{ c('demo.toneInfo') }}</AppStatus>
              <AppStatus tone="neutral">{{ t('common.disabled') }}</AppStatus>
              <AppStatus busy>{{ c('demo.toneBusy') }}</AppStatus>
            </div>
            <div class="app-row ds-wrap">
              <AppStatus tone="ok" action>{{ c('demo.toneAction') }}</AppStatus>
              <AppStatus tone="neutral" :dot="false">{{ c('demo.tonePlain') }}</AppStatus>
            </div>
            <div class="app-row ds-wrap">
              <span class="app-tag app-tag--accent">{{ t('discovery.kind.rsshub') }}</span>
              <span class="app-tag">{{ t('discovery.kind.web') }}</span>
              <span class="app-tag app-tag--ok">{{ t('common.enabled') }}</span>
              <span class="app-tag app-tag--err">{{ t('common.disabled') }}</span>
              <span class="app-badge">{{ c('demo.badgeDiscoveries') }}</span>
              <span class="app-badge">{{ c('demo.badgeMonitors') }}</span>
            </div>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- AppCard -->
      <DesignGroup
        title="AppCard"
        :note="c('states.card')"
        :open="open['AppCard'] ?? false"
        @update:open="(value) => setOpen('AppCard', value)"
      >
        <div class="ds-cols">
          <AppCard :title="c('card.surfaceType')" :note="c('card.surfaceTypeNote')">
            <div class="app-stack">
              <div class="app-surface">{{ c('demo.embedded') }}</div>
              <div class="app-hint app-hint--info">{{ c('demo.cardLayering') }}</div>
            </div>
            <template #footer>
              <span class="app-card__note">{{ c('demo.cardFoot') }}</span>
              <span class="app-spacer" />
              <AppButton size="sm" variant="danger">{{ t('common.delete') }}</AppButton>
            </template>
          </AppCard>

          <div class="app-stack">
            <AppCard :title="c('card.interactive')" :note="c('card.interactiveNote')" interactive>
              <span class="app-card__note">{{ c('demo.cardFootInteractive') }}</span>
            </AppCard>
            <AppCard :title="c('card.off')" :note="c('card.offNote')" disabled>
              <span class="app-card__note">{{ c('demo.cardOff') }}</span>
            </AppCard>
          </div>
        </div>
      </DesignGroup>

      <!-- AppDialog -->
      <DesignGroup
        title="AppDialog"
        :note="c('card.dialogNote')"
        :open="open['AppDialog'] ?? false"
        @update:open="(value) => setOpen('AppDialog', value)"
      >
        <AppCard>
          <div class="app-stack">
            <div class="app-row ds-wrap">
              <AppButton size="sm" variant="primary" @click="dialog = 'normal'">{{
                c('demo.dialogNormal')
              }}</AppButton>
              <AppButton size="sm" @click="dialog = 'loading'">{{
                c('demo.dialogLoading')
              }}</AppButton>
              <AppButton size="sm" variant="danger" @click="dialog = 'error'">{{
                c('demo.dialogErrBtn')
              }}</AppButton>
            </div>
            <div class="app-hint app-hint--info">
              {{ c('demo.dialogNote') }}
              Esc。
            </div>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- AppEmptyState -->
      <DesignGroup
        title="AppEmptyState"
        :note="c('card.hintNote')"
        :open="open['AppEmptyState'] ?? false"
        @update:open="(value) => setOpen('AppEmptyState', value)"
      >
        <div class="ds-cols">
          <AppCard>
            <AppEmptyState
              icon="mdi-tray-arrow-down"
              :title="c('demo.emptyTitle')"
              :note="c('demo.emptyNote')"
            />
          </AppCard>
          <AppCard>
            <AppEmptyState :title="c('demo.emptyGroupTitle')" :note="c('demo.emptyGroupNote')">
              <template #actions>
                <AppButton size="sm" variant="primary">{{ c('demo.groupName') }}</AppButton>
              </template>
            </AppEmptyState>
          </AppCard>
        </div>
      </DesignGroup>

      <!-- AppSkeleton -->
      <DesignGroup
        title="AppSkeleton"
        :note="c('states.skeleton')"
        :open="open['AppSkeleton'] ?? false"
        @update:open="(value) => setOpen('AppSkeleton', value)"
      >
        <div class="ds-cols">
          <AppCard :title="c('demo.layoutTextCard')">
            <div class="app-stack">
              <AppSkeleton variant="text" />
              <AppSkeleton variant="card" :rows="2" />
            </div>
          </AppCard>
          <AppCard :title="c('demo.layoutListPage')">
            <div class="app-stack">
              <AppSkeleton variant="list" :rows="3" />
              <AppSkeleton variant="page" />
            </div>
          </AppCard>
        </div>
      </DesignGroup>

      <!-- AppHint -->
      <DesignGroup
        title="AppHint"
        :note="c('states.hint')"
        :open="open['AppHint'] ?? false"
        @update:open="(value) => setOpen('AppHint', value)"
      >
        <AppCard>
          <div class="app-stack">
            <AppHint tone="info">{{ c('demo.hintInfo') }}</AppHint>
            <AppHint tone="ok">{{ c('demo.hintOk') }}</AppHint>
            <AppHint tone="warn">{{ c('demo.hintWarn') }}</AppHint>
            <AppHint tone="err">{{ c('demo.hintErr') }}</AppHint>
            <div class="app-row">
              <AppButton size="sm" @click="flashToast">{{ c('demo.toast') }}</AppButton>
              <span class="app-card__note">{{ c('demo.toastNote') }}</span>
            </div>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- AppPage / AppSection -->
      <DesignGroup
        title="AppPage / AppSection"
        :note="c('sec.foundation.width')"
        :open="open['AppPage / AppSection'] ?? false"
        @update:open="(value) => setOpen('AppPage / AppSection', value)"
      >
        <AppCard>
          <div class="app-stack">
            <div v-for="w in ['narrow', 'default', 'wide', 'full']" :key="w" class="ds-width">
              <span class="app-tag font-mono">AppPage :width="{{ w }}"</span>
              <div class="ds-width__bar" :class="`ds-width__bar--${w}`" />
              <span class="app-card__note font-mono">
                {{ w === 'full' ? c('demo.widthFull') : c('demo.widthValue', { w }) }}
              </span>
            </div>
            <AppHint tone="info">
              {{ c('sec.foundation.widthNote') }}
            </AppHint>
            <AppSection title="AppSection" :note="c('card.sectionNote')">
              <template #actions>
                <AppButton size="sm">{{ t('discovery.test') }}</AppButton>
              </template>
              <div class="app-surface">{{ c('demo.sectionContent') }}</div>
            </AppSection>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- 业务组件层（P1.5） -->
      <DesignGroup
        :title="c('sec.biz')"
        :note="c('sec.bizNote')"
        :open="open[c('sec.biz')] ?? false"
        @update:open="(value) => setOpen(c('sec.biz'), value)"
      >
        <div class="app-stack">
          <AppCard title="FormDialog" :note="c('states.formDialog')">
            <div class="app-stack">
              <div class="app-row ds-wrap">
                <AppButton
                  size="sm"
                  variant="primary"
                  data-test="biz-dialog-normal"
                  @click="bizDialog = 'normal'"
                  >{{ c('demo.dialogOpen') }}</AppButton
                >
                <AppButton size="sm" data-test="biz-dialog-busy" @click="bizDialog = 'busy'">{{
                  c('demo.dialogBusy')
                }}</AppButton>
                <AppButton
                  size="sm"
                  variant="danger"
                  data-test="biz-dialog-error"
                  @click="bizDialog = 'error'"
                  >{{ c('demo.dialogError') }}</AppButton
                >
              </div>
              <AppHint tone="info">
                {{ c('demo.formDialogNote') }}
              </AppHint>
            </div>
          </AppCard>

          <AppCard title="CronPicker" :note="c('states.cron')">
            <div class="app-stack">
              <CronPicker
                v-model="cronDaily"
                :label="c('field.summaryTime')"
                :hint="c('field.summaryTimeHint')"
              />
              <CronPicker v-model="cronStep" :label="c('field.every5')" />
              <CronPicker v-model="cronBad" :label="c('field.badCron')" />
            </div>
          </AppCard>

          <div class="ds-cols">
            <AppCard title="ChannelCard" :note="c('states.channel')">
              <div class="app-stack">
                <div class="app-card-grid">
                  <ChannelCard
                    v-for="channel in demoChannels"
                    :key="channel.id"
                    :name="channel.name"
                    :type="channel.type"
                    :enabled="channel.enabled"
                    :tone="channel.tone"
                    :probe="channel.probe"
                    @edit="openChannelEdit(channel)"
                    @test="runChannelTest(channel)"
                    @delete="pendingChannel = channel"
                  />
                </div>
                <AppButton
                  v-if="demoDirty"
                  size="sm"
                  variant="ghost"
                  @click="demoChannels = initialChannels()"
                >
                  {{ c('demo.reset') }}
                </AppButton>
              </div>
            </AppCard>

            <div class="app-stack">
              <AppCard title="SourceCard" :note="c('states.source')">
                <div class="app-stack">
                  <div class="app-card-grid">
                    <SourceCard
                      v-for="source in demoSources"
                      :key="source.id"
                      :name="source.name"
                      :icon="source.icon"
                      :kind-label="source.kindLabel"
                      :enabled="source.enabled"
                      :target="source.target"
                      :cron="source.cron"
                      :next-run-at="source.nextRunAt"
                      :tone="source.tone"
                      :status-text="source.statusText || t('discovery.test')"
                      :busy="source.busy"
                      @test="runSourceTest(source)"
                      @toggle="source.enabled = $event"
                      @delete="pendingSource = source"
                    />
                  </div>
                  <AppButton
                    v-if="demoSourcesDirty"
                    size="sm"
                    variant="ghost"
                    @click="demoSources = initialSources()"
                  >
                    {{ c('demo.reset') }}
                  </AppButton>
                </div>
              </AppCard>

              <AppCard title="MonitorCard" :note="c('states.monitor')">
                <div class="app-card-grid">
                  <MonitorCard
                    v-for="monitor in demoMonitors"
                    :key="monitor.id"
                    :name="monitor.name"
                    :icon="monitor.icon"
                    :mode-label="monitor.modeLabel"
                    :keywords="monitor.keywords"
                    :match-label="monitor.matchLabel"
                    :exclude-count="monitor.excludeCount"
                    :intent-text="monitor.intentText"
                    :sensitivity-label="monitor.sensitivityLabel"
                    :bound-actions-label="monitor.boundActionsLabel"
                    :enabled="monitor.enabled"
                    @delete="pendingMonitor = monitor"
                    @toggle="(value: boolean) => toggleMonitor(monitor, value)"
                  />
                </div>
                <div v-if="demoMonitorsDirty" class="app-row-end">
                  <AppButton size="sm" variant="ghost" @click="demoMonitors = initialMonitors()">
                    {{ c('demo.reset') }}
                  </AppButton>
                </div>
              </AppCard>

              <AppCard title="ActionCard" :note="c('states.action')">
                <div class="app-card-grid">
                  <ActionCard
                    v-for="action in demoActions"
                    :key="action.id"
                    :name="action.name"
                    :icon="action.icon"
                    :trigger-label="action.triggerLabel"
                    :cron="action.cron"
                    :next-run-at="action.nextRunAt"
                    :channel-name="action.channelName"
                    :channel-enabled="action.channelEnabled !== false"
                    :template-name="action.templateName"
                    :enabled="action.enabled"
                    @delete="pendingAction = action"
                    @toggle="(value: boolean) => toggleAction(action, value)"
                  />
                </div>
                <div v-if="demoActionsDirty" class="app-row-end">
                  <AppButton size="sm" variant="ghost" @click="demoActions = initialActions()">
                    {{ c('demo.reset') }}
                  </AppButton>
                </div>
              </AppCard>
            </div>
          </div>
        </div>
      </DesignGroup>

      <!-- AppSidebar / AppHeader -->
      <DesignGroup
        title="AppSidebar / AppHeader"
        :note="c('sec.shell')"
        :open="open['AppSidebar / AppHeader'] ?? false"
        @update:open="(value) => setOpen('AppSidebar / AppHeader', value)"
      >
        <AppCard>
          <div class="app-stack">
            <AppHint tone="info">
              {{ c('sec.shellNote') }}
            </AppHint>
            <div class="app-row ds-wrap">
              <span class="app-tag font-mono">AppSidebar</span>
              <span class="app-tag font-mono">AppHeader</span>
              <span class="app-tag font-mono">{{ c('demo.twoRender') }}</span>
            </div>
          </div>
        </AppCard>
      </DesignGroup>
    </div>

    <AppDialog
      v-model="dialogOpen"
      :title="dialog === 'error' ? c('demo.saveFailed') : c('demo.dialogTitle')"
      :loading="dialog === 'loading'"
      :error="dialog === 'error' ? c('demo.serverError') : undefined"
    >
      <div class="app-stack">
        <AppInput
          :model-value="''"
          :label="t('common.name')"
          :placeholder="c('field.namePlaceholder')"
          required
        />
        <AppSwitch
          v-model="switchOn"
          :label="c('field.enableNow')"
          :hint="c('field.enableNowHint')"
        />
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="dialog = 'none'">{{ t('common.cancel') }}</AppButton>
        <span class="app-spacer" />
        <AppButton variant="primary" @click="dialog = 'none'">{{ t('common.save') }}</AppButton>
      </template>
    </AppDialog>

    <FormDialog
      v-model="bizDialogOpen"
      :title="bizDialog === 'error' ? c('demo.saveFailed') : c('demo.bizDialogTitle')"
      :note="c('demo.formDialogShellNote')"
      :busy="bizDialog === 'busy'"
      :error="bizDialog === 'error' ? c('demo.serverError') : undefined"
    >
      <div class="app-stack">
        <AppInput
          :model-value="''"
          :label="c('field.actionName')"
          :placeholder="c('field.actionNamePlaceholder')"
          required
        />
        <CronPicker v-model="cronDaily" :label="c('field.every5Summary')" />
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model="monitorDeleteOpen"
      :title="t('monitor.delete')"
      :message="t('monitor.deleteBody')"
      :busy="monitorDeleteBusy"
      @confirm="confirmMonitorDelete"
    />

    <ConfirmDialog
      v-model="actionDeleteOpen"
      :title="t('action.delete')"
      :message="t('action.deleteBody')"
      :busy="actionDeleteBusy"
      @confirm="confirmActionDelete"
    />

    <ConfirmDialog
      v-model="sourceDeleteOpen"
      :title="t('discovery.delete')"
      :message="t('discovery.deleteBody')"
      :busy="sourceDeleteBusy"
      @confirm="confirmSourceDelete"
    />

    <FormDialog v-model="editOpen" :title="c('demo.channelEdit')" @submit="submitChannelEdit">
      <div class="app-stack">
        <AppInput v-model="editName" :label="t('common.name')" />
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model="channelDeleteOpen"
      :title="t('channel.delete')"
      :message="t('channel.deleteBody', { name: pendingChannel?.name ?? '' })"
      :busy="channelDeleteBusy"
      @confirm="confirmChannelDelete"
    />

    <transition name="ds-toast">
      <div v-if="toastVisible" class="ds-toast app-overlay" data-test="design-toast">
        {{ c('demo.hintOk') }}
      </div>
    </transition>
  </AppPage>
</template>

<style scoped>
/* 这个页面的排版只服务预览本身，不属于 Design System，所以放在这里而不是 components.scss */
.ds-token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--k-space-3);
}

.ds-token {
  display: flex;
  flex-direction: column;
  gap: var(--k-space-1);
  padding: var(--k-space-2);
  border: 1px solid var(--k-border-soft);
  border-radius: var(--k-radius-md);
}

.ds-token__swatch {
  height: 32px;
  border-radius: var(--k-radius-sm);
  /* 白/极浅色块在白色卡片上要看得见：描边比普通边框深一档 */
  border: 1px solid color-mix(in srgb, var(--k-text) 22%, transparent);
}

.ds-token__bar,
.ds-space__bar {
  height: 12px;
  background: var(--k-accent-soft);
  border: 1px solid color-mix(in srgb, var(--k-accent) 35%, transparent);
  border-radius: var(--k-radius-sm);
}

.ds-token__radius {
  height: 32px;
  border: 1px solid var(--k-border);
  background: var(--k-panel-2);
}

.ds-token__shadow {
  height: 32px;
  background: var(--k-panel);
  border-radius: var(--k-radius-sm);
}

.ds-token__sample {
  display: block;
  color: var(--k-text);
}

.ds-token__name {
  font-size: var(--k-fs-label);
  color: var(--k-text);
}

.ds-token__value {
  /* 色值/数值是要被核对的正文，不用最浅那档灰（浅灰只留给辅助说明） */
  font-size: var(--k-fs-label);
  color: var(--k-muted);
  word-break: break-all;
}

.ds-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--k-space-3);
}

.ds-wrap {
  flex-wrap: wrap;
}

@media (min-width: 900px) {
  .ds-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.ds-width,
.ds-space {
  display: flex;
  align-items: center;
  gap: var(--k-space-3);
}

.ds-width__bar {
  height: 18px;
  background: var(--k-panel-2);
  border: 1px solid var(--k-border);
  border-radius: var(--k-radius-sm);
}

.ds-width__bar--narrow {
  width: var(--k-page-narrow);
  max-width: 60%;
}

.ds-width__bar--default {
  width: var(--k-page-default);
  max-width: 80%;
}

.ds-width__bar--wide {
  width: var(--k-page-wide);
  max-width: 95%;
}

.ds-width__bar--full {
  flex: 1;
}

.ds-toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--k-space-6) + env(safe-area-inset-bottom));
  z-index: 40;
  padding: var(--k-space-2) var(--k-space-4);
  font-size: var(--k-fs-body);
  transform: translateX(-50%);
}

.ds-toast-enter-active,
.ds-toast-leave-active {
  transition: opacity 0.18s ease;
}

.ds-toast-enter-from,
.ds-toast-leave-to {
  opacity: 0;
}

/* 手机：色值清单一律横排一行，省掉大面积空白 */
@media (max-width: 599px) {
  .ds-token-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--k-space-2);
  }

  .ds-token {
    flex-direction: row;
    align-items: center;
    gap: var(--k-space-2);
  }

  .ds-token__swatch {
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
  }

  .ds-token__bar,
  .ds-token__radius,
  .ds-token__shadow {
    flex: 0 0 36px;
    width: 36px;
  }

  .ds-token__radius,
  .ds-token__shadow {
    height: 24px;
  }

  .ds-token__value {
    margin-left: auto;
    text-align: right;
  }

  .ds-width__bar {
    display: none;
  }
}
</style>
