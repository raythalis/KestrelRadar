<!-- 仪表盘：八张指标卡（数量类 4 + 状态类 4）、最近事件、异常记录。
     数据三份各拉各的（/stats/overview、/events、/incidents）：任一失败另外两块照常显示。
     八张卡不画迷你柱——后端只给窗口内的总数，没有按天的序列，编一组柱子就是假数据。 -->
<script setup lang="ts">
import {
  EVENT_SOURCE_TAG_LIMIT,
  type Incident,
  type RecentEvent,
  type EventSourceRef,
} from '@kestrel/contracts'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppEmptyState from '@/components/app/AppEmptyState.vue'
import AppEventDialog from '@/components/app/AppEventDialog.vue'
import AppSkeleton from '@/components/app/AppSkeleton.vue'
import AppPanel from '@/components/app/AppPanel.vue'
import AppSourceFilter from '@/components/app/AppSourceFilter.vue'
import EventRow from '@/components/biz/EventRow.vue'
import IncidentCard from '@/components/biz/IncidentCard.vue'
import { SEMANTIC_ICONS } from '@/components/biz/icons'
import { useDashboardStore } from '@/stores/dashboard'
import { formatDateTime, formatShortDateTime, timeAgo } from '@/utils/format'
import { incidentDetail, incidentReasonKey } from '@/utils/incident'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral'

interface MetricCard {
  label: string
  /** 数值：数量类是「启用数」，状态类是一句话或百分数 */
  value: string
  /** 分母或单位，跟在数值后面用小字 */
  unit?: string
  /** 数值位放的是词而不是数字（如「连通」）时回 sans，不走等宽 */
  text?: boolean
  sub: string
  icon: string
  tone: Tone
}

const store = useDashboardStore()
const { t, te } = useI18n()

onMounted(() => {
  void store.load()
})

/** 数量类副文案只有三种说法：全部启用 / 全部停用 / n 个已停用 */
function countSub(enabled: number, total: number): string {
  if (enabled === total) return t('dashboard.sub.allEnabled')
  if (enabled === 0) return t('dashboard.sub.allDisabled')
  return t('dashboard.sub.disabledCount', { n: total - enabled })
}

const countCards = computed<MetricCard[]>(() => {
  const counts = store.stats?.counts
  const cards: {
    label: string
    icon: string
    tone: Tone
    key: keyof NonNullable<typeof counts>
  }[] = [
    {
      key: 'discoveries',
      label: t('dashboard.metrics.discoveries'),
      icon: SEMANTIC_ICONS.discovery,
      tone: 'primary',
    },
    {
      key: 'monitors',
      label: t('dashboard.metrics.monitors'),
      icon: SEMANTIC_ICONS.monitor,
      tone: 'info',
    },
    {
      key: 'actions',
      label: t('dashboard.metrics.actions'),
      icon: SEMANTIC_ICONS.action,
      tone: 'success',
    },
    {
      key: 'channels',
      label: t('dashboard.metrics.channels'),
      icon: SEMANTIC_ICONS.channel,
      tone: 'neutral',
    },
  ]
  return cards.map((card) => {
    const item = counts?.[card.key]
    // 统计接口没拿到就别编 0：数值位留一条横线，整页顶部会挂错误提示
    if (!item) {
      return {
        label: card.label,
        value: '—',
        unit: '',
        sub: '',
        icon: card.icon,
        tone: card.tone,
      }
    }
    return {
      label: card.label,
      value: String(item.enabled),
      unit: `/ ${item.total}`,
      // 一条都没配过（0 / 0）时，下面那行小字说「未配置」；配了但全停用还是「全部停用」
      sub:
        item.total === 0 ? t('dashboard.value.notConfigured') : countSub(item.enabled, item.total),
      icon: card.icon,
      tone: card.tone,
    }
  })
})

const stateCards = computed<MetricCard[]>(() => {
  const stats = store.stats
  const events = stats?.events ?? { today: 0, yesterday: 0 }
  const delivery = stats?.delivery ?? { sent: 0, failed: 0, rate: null }
  const collection = stats?.collection ?? { windowDays: 0, rate: null, failingSources: 0 }
  const rsshub = stats?.rsshub

  // 今日新事件：跟昨天比
  const delta = events.today - events.yesterday
  const percent = events.yesterday === 0 ? 0 : Math.round((delta / events.yesterday) * 100)
  const eventsSub =
    events.yesterday === 0
      ? t('dashboard.sub.yesterdayZero')
      : t('dashboard.sub.delta', { sign: percent >= 0 ? '+' : '', n: percent })

  // 今日已投递：全部送达 / 有失败，都没投递就不提成功率
  const deliveryRate =
    delivery.sent + delivery.failed === 0
      ? 0
      : Math.round((delivery.sent / (delivery.sent + delivery.failed)) * 100)
  const deliverySub =
    delivery.sent + delivery.failed === 0
      ? t('dashboard.sub.noDelivery')
      : delivery.failed === 0
        ? t('dashboard.sub.allDelivered', { rate: deliveryRate })
        : t('dashboard.sub.deliveryFailed', { n: delivery.failed, rate: deliveryRate })

  const probed = timeAgo(rsshub?.checkedAt)

  const cards: MetricCard[] = [
    {
      label: t('dashboard.metrics.eventsToday'),
      value: String(events.today),
      unit: t('dashboard.value.item'),
      sub: eventsSub,
      icon: SEMANTIC_ICONS.event,
      tone: 'primary',
    },
    {
      label: t('dashboard.metrics.deliveredToday'),
      value: String(delivery.sent),
      unit: t('dashboard.value.item'),
      sub: deliverySub,
      icon: SEMANTIC_ICONS.delivered,
      tone: delivery.failed === 0 ? 'success' : 'warning',
    },
    {
      label: t('dashboard.metrics.collectionRate'),
      value: collection.rate === null ? '—' : String(Math.round(collection.rate * 100)),
      unit: collection.rate === null ? '' : t('dashboard.value.percent'),
      sub:
        collection.failingSources === 0
          ? t('dashboard.sub.collectionClean', { days: collection.windowDays })
          : t('dashboard.sub.collectionFailing', {
              days: collection.windowDays,
              n: collection.failingSources,
            }),
      icon: SEMANTIC_ICONS.collection,
      tone: collection.rate === null ? 'neutral' : collection.rate < 1 ? 'warning' : 'info',
    },
    {
      label: t('dashboard.metrics.rsshub'),
      value: !rsshub?.configured
        ? t('dashboard.value.notConfigured')
        : rsshub.ok
          ? t('dashboard.value.connected')
          : t('dashboard.value.disconnected'),
      text: true,
      sub: !rsshub?.configured
        ? t('dashboard.sub.notConfigured')
        : rsshub.ok
          ? probed?.unit === 'now'
            ? t('dashboard.sub.probedJustNow')
            : probed?.unit === 'minute'
              ? t('dashboard.sub.probed', { n: probed.value })
              : formatShortDateTime(rsshub.checkedAt)
          : rsshub.message,
      icon: SEMANTIC_ICONS.rsshub,
      tone: !rsshub?.configured ? 'neutral' : rsshub.ok ? 'success' : 'danger',
    },
  ]

  return stats ? cards : cards.map((card) => ({ ...card, value: '—', unit: '', sub: '' }))
})

/** 事件时间：一天内说「多久之前」，再久就写日期 */
function eventTime(value: string): string {
  const ago = timeAgo(value)
  if (ago?.unit === 'now') return t('dashboard.events.justNow')
  if (ago?.unit === 'minute') return t('dashboard.events.minutesAgo', { n: ago.value })
  if (ago?.unit === 'hour') return t('dashboard.events.hoursAgo', { n: ago.value })
  return formatShortDateTime(value)
}

/** 面板里最多摆几条：第 7 条起收进「查看全部事件」，列表本身还是后端给的那一页 */
const DASHBOARD_EVENT_LIMIT = 6

/** 筛选项里「全部来源」那一项：值是空串（＝不筛），名字走 i18n */
const ALL_SOURCE_ID = ''
const allSources = computed(() => t('dashboard.events.allSources'))
const filterId = ref(ALL_SOURCE_ID)
const dialogOpen = ref(false)

/** 加载骨架铺满内容窗口：行高与真实条目一致（面板里 72px），6 行正好一屏 */
const SKELETON_ROWS = 6

const visibleEvents = computed(() => store.events.slice(0, DASHBOARD_EVENT_LIMIT))
const filterOptions = computed(() => [
  { id: ALL_SOURCE_ID, name: allSources.value, count: store.events.length },
  ...store.sources.map((source) => ({
    id: source.discoveryId,
    name: source.name,
    count: source.count,
  })),
])
/** 当前筛的是哪个来源：弹窗工具条上显示它的名字 */
const filterLabel = computed(
  () =>
    filterOptions.value.find((option) => option.id === filterId.value)?.name ?? allSources.value,
)

/** 换了来源就重新取第一页（后端按来源 id 过滤，前端不做本地筛选） */
async function applyFilter(discoveryId: string | null): Promise<void> {
  try {
    await store.setFilter(discoveryId)
  } catch {
    // 失败提示归 http.ts 的统一浮层，这里只保证流程不吊在半路
  }
}

/** 按来源 id 筛（不是按名字：两个来源同名时不会串台） */
watch(filterId, (id) => {
  void applyFilter(id === ALL_SOURCE_ID ? null : id)
})

function resetFilter(): void {
  filterId.value = ALL_SOURCE_ID
}

/** 点开一条：真跳原文，同时记已读（后端幂等，前端就地更新那一行） */
function openEvent(event: RecentEvent): void {
  if (event.url) window.open(event.url, '_blank', 'noopener,noreferrer')
  void store.markRead(event.id).catch(() => {
    // 同上：读不读得上已读不影响看原文
  })
}

/** 这一件事的其余来源（接口给的是全部来源，前两个挂标签、其余进 +N 浮层） */
function restOf(event: RecentEvent): EventSourceRef[] | undefined {
  const rest = event.sources.slice(EVENT_SOURCE_TAG_LIMIT)
  return rest.length > 0 ? rest : undefined
}

const timeOfEvent = (item: RecentEvent): string => eventTime(item.lastItemAt)

/** 弹窗底部那句：条数由弹窗给，文案归这里 */
const shownText = (count: number): string => t('dashboard.events.shown', { n: count })

/** 弹窗滚到底：接着上一页往下取 */
async function onLoadMore(): Promise<void> {
  try {
    await store.loadMore()
  } catch {
    // 失败提示归 http.ts 的统一浮层
  }
}

/** 问候语按当前时段换一个词，后面那句是固定的 */
const greeting = computed(() =>
  t('dashboard.greeting', { hello: t(`dashboard.hello.${timeSlot()}`) }),
)

function timeSlot(): 'morning' | 'noon' | 'afternoon' | 'evening' {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 13) return 'noon'
  if (hour >= 13 && hour < 18) return 'afternoon'
  return 'evening'
}

/** 忽视：后端只改状态；成功就把那行去掉，失败由 http.ts 的统一浮层说一声 */
/** 异常原因：码能翻就翻（当前语言），翻不了就用记录里的原文兜底 */
function incidentReason(incident: Incident): string {
  const key = incidentReasonKey(incident.code)
  return key && te(key) ? t(key) : incident.message
}

async function onDismiss(incident: Incident): Promise<void> {
  try {
    await store.dismiss(incident.id)
  } catch {
    // 失败提示归 http.ts 的统一浮层
  }
}

const loading = computed(() => store.loading && !store.stats)
</script>

<template>
  <div class="k2-page k2-page--wide" data-test="dashboard-page">
    <div class="k2-page__head">
      <div class="k2-page__lead">
        <h1 class="k2-page__title">{{ t('nav.dashboard') }}</h1>
        <p class="k2-page__note" data-test="dashboard-greeting">{{ greeting }}</p>
      </div>
    </div>

    <div class="k2-grid k2-grid--4">
      <article
        v-for="card in countCards"
        :key="card.label"
        class="k2-card k2-card--sm"
        :class="`k2-t-${card.tone}`"
        data-test="metric-card"
      >
        <div class="k2-card__head">
          <span class="k2-tile k2-tile--sm"
            ><v-icon size="20">{{ card.icon }}</v-icon></span
          >
          <span class="k2-card__heading">
            <span class="k2-card__title">{{ card.label }}</span>
          </span>
        </div>
        <div class="k2-metric">
          <div class="k2-metric__line">
            <span class="k2-num"
              >{{ card.value }}<span class="k2-unit">{{ card.unit }}</span></span
            >
          </div>
          <span class="k2-card__note">{{ card.sub }}</span>
        </div>
      </article>
    </div>

    <div class="k2-grid k2-grid--4">
      <article
        v-for="card in stateCards"
        :key="card.label"
        class="k2-card k2-card--sm"
        :class="`k2-t-${card.tone}`"
        data-test="metric-card"
      >
        <div class="k2-card__head">
          <span class="k2-tile k2-tile--sm"
            ><v-icon size="20">{{ card.icon }}</v-icon></span
          >
          <span class="k2-card__heading">
            <span class="k2-card__title">{{ card.label }}</span>
          </span>
        </div>
        <div class="k2-metric">
          <div class="k2-metric__line">
            <span class="k2-num" :class="{ 'k2-num--text': card.text }"
              >{{ card.value }}<span class="k2-unit">{{ card.unit }}</span></span
            >
          </div>
          <span class="k2-card__note">{{ card.sub }}</span>
        </div>
      </article>
    </div>

    <div class="k2-cols k2-cols--activity">
      <AppPanel class="k2-t-primary">
        <template #head>
          <span class="k2-panel__heading">
            <span class="k2-panel__mark" aria-hidden="true" />
            <span class="k2-sec__title">{{ t('dashboard.events.title') }}</span>
            <span class="k2-panel__badge">{{ store.total }}</span>
            <span class="k2-panel__sub">{{ t('dashboard.events.sub') }}</span>
          </span>
          <span class="k2-panel__actions">
            <AppSourceFilter
              v-model="filterId"
              :options="filterOptions"
              :title="t('dashboard.events.filterTitle')"
              :note="t('dashboard.events.filterNote')"
              :reset-label="t('dashboard.events.filterReset')"
              :close-label="t('common.close')"
              @reset="resetFilter"
            />
            <button
              type="button"
              class="k2-panel__link"
              data-test="events-view-all"
              @click="dialogOpen = true"
            >
              {{ t('dashboard.events.viewAll') }}
              <v-icon size="14">mdi-chevron-right</v-icon>
            </button>
          </span>
        </template>

        <AppSkeleton
          v-if="loading"
          variant="list"
          :rows="SKELETON_ROWS"
          leading="tile"
          density="compact"
        />
        <AppEmptyState
          v-else-if="store.events.length === 0"
          data-test="events-empty"
          art="events"
          :title="t('dashboard.events.empty')"
          :note="t('dashboard.events.emptySub')"
        />
        <template v-else>
          <EventRow
            v-for="event in visibleEvents"
            :key="event.id"
            :event="event"
            :time="eventTime(event.lastItemAt)"
            :rest-sources="restOf(event)"
            @open="openEvent"
          />
        </template>

        <template v-if="!loading && store.events.length > DASHBOARD_EVENT_LIMIT" #foot>
          <button
            type="button"
            class="k2-panel__more"
            data-test="events-view-all-foot"
            @click="dialogOpen = true"
          >
            {{ t('dashboard.events.viewAllFoot') }}
            <v-icon size="14">mdi-chevron-right</v-icon>
          </button>
        </template>
      </AppPanel>

      <AppPanel :class="store.incidents.length ? 'k2-t-danger' : 'k2-t-success'">
        <template #head>
          <span class="k2-panel__heading">
            <span class="k2-panel__mark" aria-hidden="true" />
            <span class="k2-sec__title">{{ t('dashboard.incidents.title') }}</span>
            <span class="k2-panel__badge">{{ store.incidents.length }}</span>
            <span class="k2-panel__sub">{{ t('dashboard.incidents.sub') }}</span>
          </span>
        </template>

        <AppSkeleton
          v-if="loading"
          variant="list"
          :rows="SKELETON_ROWS"
          leading="tile"
          density="compact"
        />
        <AppEmptyState
          v-else-if="store.incidents.length === 0"
          data-test="incidents-empty"
          art="incidents"
          :title="t('dashboard.incidents.empty')"
          :note="t('dashboard.incidents.emptySub')"
        />
        <div v-else class="k2-rows">
          <IncidentCard
            v-for="incident in store.incidents"
            :key="incident.id"
            :incident="incident"
            :reason="incidentReason(incident)"
            :detail="incidentDetail(incident)"
            :last-seen="formatDateTime(incident.createdAt)"
            :dismiss-label="t('dashboard.incidents.dismiss')"
            :group-label="
              incident.groupName ? t('dashboard.incidents.group', { name: incident.groupName }) : ''
            "
            @dismiss="onDismiss"
          />
        </div>
      </AppPanel>
    </div>

    <AppEventDialog
      v-model="dialogOpen"
      :events="store.events"
      :has-more="store.hasMore"
      :loading-more="store.loadingMore"
      :title="t('dashboard.events.dialogTitle')"
      :note="t('dashboard.events.sub')"
      :filter-label="filterLabel"
      :all-label="allSources"
      :clear-label="t('dashboard.events.clearFilter')"
      :loading-label="t('dashboard.events.loadingMore')"
      :end-label="t('dashboard.events.dialogEnd')"
      :close-label="t('common.close')"
      :filter-prefix="t('dashboard.events.filterCurrent')"
      :empty-label="t('dashboard.events.filterEmpty')"
      :scroll-hint-label="t('dashboard.events.scrollHint')"
      :stat-of="shownText"
      :time-of="timeOfEvent"
      :rest-of="restOf"
      @open="openEvent"
      @clear-filter="resetFilter"
      @load-more="onLoadMore"
    />
  </div>
</template>
