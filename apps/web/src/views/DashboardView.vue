<!-- 仪表盘：八张指标卡（数量类 4 + 状态类 4）、最近事件、异常记录。
     数据三份各拉各的（/stats/overview、/events、/incidents）：任一失败另外两块照常显示。
     八张卡不画迷你柱——后端只给窗口内的总数，没有按天的序列，编一组柱子就是假数据。 -->
<script setup lang="ts">
import type { Incident } from '@kestrel/contracts'
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { DISCOVERY_ICONS, SEMANTIC_ICONS } from '@/components/biz/icons'
import { useDashboardStore } from '@/stores/dashboard'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, formatShortDateTime, timeAgo } from '@/utils/format'

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
const toast = useToastStore()
const { t } = useI18n()

/** 页面级提示已下线：读不到数据、忽视失败都走浮层 */
watch(
  () => store.errorMessage,
  (message) => {
    if (message) toast.push(t('dashboard.loadFailed'))
  },
)

onMounted(() => {
  if (!store.stats) void store.load()
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
    return {
      label: card.label,
      value: item ? String(item.enabled) : '—',
      unit: item ? `/ ${item.total}` : '',
      sub: item ? countSub(item.enabled, item.total) : '',
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

/** 事件行的来源：第一个名字 + 还有几个；一个都没有就不占行 */
function eventSourceLabel(sourceNames: string[], sourceCount: number): string {
  if (sourceNames.length === 0) return ''
  const rest = sourceCount - sourceNames.length
  return rest > 0
    ? `${sourceNames.join('、')} ${t('dashboard.events.moreSources', { n: rest })}`
    : sourceNames.join('、')
}

/** 事件时间：一天内说「多久之前」，再久就写日期 */
function eventTime(value: string): string {
  const ago = timeAgo(value)
  if (ago?.unit === 'now') return t('dashboard.events.justNow')
  if (ago?.unit === 'minute') return t('dashboard.events.minutesAgo', { n: ago.value })
  if (ago?.unit === 'hour') return t('dashboard.events.hoursAgo', { n: ago.value })
  return formatShortDateTime(value)
}

/** 事件行首图标的色调跟着来源类型走（和发现卡的图标记法一致） */
function eventTone(kind: string): Tone {
  if (kind === 'rsshub') return 'info'
  if (kind === 'web') return 'neutral'
  return 'primary'
}

function incidentSub(incident: Incident): string {
  // 副标题只留首次出现时间：类型和分组在行里已经能看出来，不必重复
  return t('dashboard.incidents.firstSeen', { time: formatDateTime(incident.firstSeenAt) })
}

/** 忽视：后端只改状态；成功就把那行去掉，失败把原因留在异常区标题下 */
async function onDismiss(incident: Incident): Promise<void> {
  try {
    await store.dismiss(incident.id)
  } catch (error) {
    toast.push((error as Error).message)
  }
}

const loading = computed(() => store.loading && !store.stats)
</script>

<template>
  <div class="k2-page k2-page--wide" data-test="dashboard-page">
    <div class="k2-page__head">
      <h1 class="k2-page__title">{{ t('nav.dashboard') }}</h1>
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

    <div class="k2-cols">
      <section class="k2-sec">
        <h2 class="k2-sec__title">{{ t('dashboard.events.title') }}</h2>

        <div v-if="loading" class="k2-card k2-card--flat k2-list" data-test="dashboard-skeleton">
          <AppSkeleton variant="list" :rows="3" leading="tile" density="compact" />
        </div>

        <div v-else-if="store.events.length === 0" class="k2-card k2-card--flat">
          <AppEmptyState
            data-test="events-empty"
            :icon="SEMANTIC_ICONS.event"
            :title="t('dashboard.events.empty')"
            :note="t('dashboard.events.emptySub')"
          />
        </div>

        <div v-else class="k2-card k2-card--flat k2-list k2-scroll" data-test="events-list">
          <component
            :is="event.url ? 'a' : 'article'"
            v-for="event in store.events"
            :key="event.id"
            class="k2-row k2-row--link k2-list__row"
            :class="`k2-t-${eventTone(event.kind)}`"
            v-bind="
              event.url ? { href: event.url, target: '_blank', rel: 'noopener noreferrer' } : {}
            "
            data-test="event-row"
          >
            <span class="k2-tile k2-tile--sm">
              <v-icon size="20">{{ DISCOVERY_ICONS[event.kind] }}</v-icon>
            </span>
            <span class="k2-list__main">
              <span class="k2-row__title k2-ellipsis">{{ event.title }}</span>
              <span class="k2-row__sub k2-ellipsis">
                {{ eventSourceLabel(event.sourceNames, event.sourceCount) }}
              </span>
            </span>
            <span class="k2-list__side">
              <span class="k2-row__sub" :title="formatDateTime(event.lastItemAt)">
                {{ eventTime(event.lastItemAt) }}
              </span>
            </span>
            <span v-if="event.url" class="k2-list__chevron">
              <v-icon size="20">mdi-chevron-right</v-icon>
            </span>
          </component>
        </div>
      </section>

      <section class="k2-sec">
        <h2 class="k2-sec__title">{{ t('dashboard.incidents.title') }}</h2>
        <div v-if="loading" class="k2-card k2-card--flat k2-list" data-test="dashboard-skeleton">
          <AppSkeleton variant="list" :rows="2" leading="tile" density="compact" />
        </div>

        <div v-else-if="store.incidents.length === 0" class="k2-card k2-card--flat">
          <AppEmptyState
            data-test="incidents-empty"
            :icon="SEMANTIC_ICONS.incident"
            :title="t('dashboard.incidents.empty')"
            :note="t('dashboard.incidents.emptySub')"
          />
        </div>

        <div v-else class="k2-rows k2-scroll" data-test="incidents-list">
          <article
            v-for="incident in store.incidents"
            :key="incident.id"
            class="k2-card k2-card--sm"
            :class="`k2-t-${incident.kind === 'delivery' ? 'warning' : 'danger'}`"
            data-test="incident-row"
          >
            <div class="k2-card__head">
              <span class="k2-tile k2-tile--sm">
                <v-icon size="20">{{ SEMANTIC_ICONS.incident }}</v-icon>
              </span>
              <span class="k2-card__heading">
                <span class="k2-row__title">{{ incident.targetName }}</span>
                <span class="k2-row__sub">{{ incidentSub(incident) }}</span>
              </span>
              <button
                type="button"
                class="k2-iconbtn k2-iconbtn--danger-hover"
                :aria-label="t('dashboard.incidents.dismiss')"
                :title="t('dashboard.incidents.dismiss')"
                data-test="incident-dismiss"
                @click="onDismiss(incident)"
              >
                <v-icon size="20">mdi-close</v-icon>
              </button>
            </div>
            <p class="k2-card__message">{{ incident.message }}</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
