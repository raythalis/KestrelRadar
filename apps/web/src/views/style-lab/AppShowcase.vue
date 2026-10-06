<script setup lang="ts">
import type { EventSourceRef, Incident, RecentEvent } from '@kestrel/contracts'
import { computed, reactive, ref } from 'vue'

import AppButton from '@/components/app/AppButton.vue'
import AppEmptyState from '@/components/app/AppEmptyState.vue'
import AppEventDialog from '@/components/app/AppEventDialog.vue'
import AppHint from '@/components/app/AppHint.vue'
import AppInput from '@/components/app/AppInput.vue'
import AppSelect from '@/components/app/AppSelect.vue'
import AppPanel from '@/components/app/AppPanel.vue'
import AppSkeleton from '@/components/app/AppSkeleton.vue'
import AppSourceFilter from '@/components/app/AppSourceFilter.vue'
import AppSourceTags from '@/components/app/AppSourceTags.vue'
import EventRow from '@/components/biz/EventRow.vue'
import IncidentCard from '@/components/biz/IncidentCard.vue'
import AppStatus from '@/components/app/AppStatus.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'
import AppTabs from '@/components/app/AppTabs.vue'
import AppTextarea from '@/components/app/AppTextarea.vue'
import { formatDateTime, timeAgo } from '@/utils/format'

import {
  ACTIVITY_EVENTS,
  ACTIVITY_INCIDENTS,
  ACTIVITY_REST_SOURCES,
  ACTIVITY_SOURCE_NAMES,
  FORM_TEXT,
  LAZY_EXTRA_EVENTS,
  LAZY_FILLER_EVENTS,
  MANY_ACTIVITY_EVENTS,
  MANY_ACTIVITY_INCIDENTS,
  MANY_SOURCES,
  SELECT_ITEMS,
  TAB_ITEMS,
} from './fixtures'

/**
 * App 组件样例 = 真组件。
 * 表单类（输入、下拉、开关、长文本、按钮）在生产里只出现在弹窗表单里，
 * 所以这里也摆在弹窗宽度上、按 label 在上控制在下排，和真弹窗一致；
 * 页面级零件（空态、提示条、骨架、状态、标签页）按它们真实的用法单独摆。
 */
const name = ref(FORM_TEXT.name)
const address = ref(FORM_TEXT.addressValue)
const rsshub = ref(FORM_TEXT.route)
const channel = ref<string | null>(FORM_TEXT.channel)
const summary = ref(FORM_TEXT.summary)
const enabled = ref(true)
const tab = ref('discoveries')

/**
 * 活跃区样例：外部列表与「查看全部」弹窗共用同一批对象，
 * 所以弹窗里点开一件事记了已读，外面那一条的未读圆点会同时消失。
 */
const ALL_SOURCES = '全部来源'
/** 仪表盘外部列表最多显示 6 条；超过 6 条底部才出现「查看全部事件」 */
const DASHBOARD_EVENT_LIMIT = 6
const events = reactive<RecentEvent[]>(ACTIVITY_EVENTS.map((event) => ({ ...event })))
const incidents = reactive(ACTIVITY_INCIDENTS.map((incident) => ({ ...incident })))
const dialogOpen = ref(false)
const sourceFilter = ref(ALL_SOURCES)

/** 圆点对照：没看过（实心）／看过之后又有新条目（空心圈）／已读（不挂）。
    用副本，点了也不改状态，保证这一组样例始终是三者对照 */
const dotSamples = reactive<RecentEvent[]>([
  { ...ACTIVITY_EVENTS[0], id: 'sample-unread', readAt: null },
  { ...ACTIVITY_EVENTS[1], id: 'sample-updated' },
  { ...ACTIVITY_EVENTS[3], id: 'sample-read' },
])

const filteredEvents = computed(() =>
  sourceFilter.value === ALL_SOURCES
    ? events
    : events.filter((event) => event.sourceNames.includes(sourceFilter.value)),
)
const visibleEvents = computed(() => filteredEvents.value.slice(0, DASHBOARD_EVENT_LIMIT))
const filterOptions = computed(() => [
  { name: ALL_SOURCES, count: events.length },
  ...ACTIVITY_SOURCE_NAMES.map((name) => ({
    name,
    count: events.filter((event) => event.sourceNames.includes(name)).length,
  })),
])

/** 10 条那一档：外部列表仍然最多 6 条（底栏出「还有 4 条」），「查看全部」里列全 10 条 */
const manyEvents = reactive<RecentEvent[]>(MANY_ACTIVITY_EVENTS.map((event) => ({ ...event })))
const manyIncidents = reactive<Incident[]>(
  MANY_ACTIVITY_INCIDENTS.map((incident) => ({ ...incident })),
)
const manyDialogOpen = ref(false)
const visibleManyEvents = computed(() => manyEvents.slice(0, DASHBOARD_EVENT_LIMIT))

/**
 * 「查看全部」的懒加载模拟：先给一页（6 条），滚到底再补一页。
 * 生产里这是后端 cursor 分页（前端只把 cursor 递上去、把回来的那页接在后面），
 * 这里没有后端，就用定时器假装一次网络往返，好看清加载态和结果追加。
 */
const LAZY_PAGE = 20
const LAZY_DELAY = 900
const lazyPool = reactive<RecentEvent[]>([
  ...manyEvents,
  ...LAZY_EXTRA_EVENTS.map((event) => ({ ...event })),
  ...LAZY_FILLER_EVENTS.map((event) => ({ ...event })),
])
const lazyLoaded = ref(LAZY_PAGE)
const lazyLoading = ref(false)
const lazyEvents = computed(() => lazyPool.slice(0, lazyLoaded.value))
const lazyHasMore = computed(() => lazyLoaded.value < lazyPool.length)

function loadMoreLazy(): void {
  if (lazyLoading.value || !lazyHasMore.value) return
  lazyLoading.value = true
  window.setTimeout(() => {
    lazyLoaded.value = Math.min(lazyLoaded.value + LAZY_PAGE, lazyPool.length)
    lazyLoading.value = false
  }, LAZY_DELAY)
}

/**
 * 样例里的动作：记一次已读（组件只抛 open，记已读是页面的事），并照生产的行为跳去原文。
 * 行本身不是 <a>（里面挂着来源标签），所以跳转由页面在这里做。
 */
function openEvent(event: RecentEvent): void {
  event.readAt = new Date().toISOString()
  if (event.url) window.open(event.url, '_blank', 'noopener,noreferrer')
}

function resetFilter(): void {
  sourceFilter.value = ALL_SOURCES
}

const timeOfEvent = (event: RecentEvent): string => eventTime(event.lastItemAt)

/** 这件事的其余来源（真实实现是点 +N 时按需取的） */
function restOf(event: RecentEvent): EventSourceRef[] | undefined {
  return ACTIVITY_REST_SOURCES.find((item) => item.id === event.id)?.sources
}

function noop(): void {}

/** 事件行的时间文案：和仪表盘同一套口径 */
function eventTime(value: string): string {
  const ago = timeAgo(value)
  if (ago?.unit === 'now') return '刚刚'
  if (ago?.unit === 'minute') return `${ago.value} 分钟前`
  if (ago?.unit === 'hour') return `${ago.value} 小时前`
  return formatDateTime(value)
}
</script>

<template>
  <div class="lab-parts">
    <div class="lab__h3">表单控件 · 弹窗里的样子</div>
    <p class="lab__meta">
      宽度按弹窗宽度（640）来，label
      在控件上方、说明与报错跟在下面——这些都是组件自己给的，样例不另排一套。
    </p>
    <div class="lab-form lab-panel">
      <AppInput v-model="name" label="名称" :hint="FORM_TEXT.nameHint" required />
      <AppInput v-model="address" :label="FORM_TEXT.address" :error="FORM_TEXT.addressError" />
      <AppInput
        v-model="rsshub"
        label="RSSHub 路由"
        :prefix="FORM_TEXT.rsshubPrefix"
        mono
        action-label="试抓"
      />
      <AppSelect v-model="channel" label="通知渠道" :items="SELECT_ITEMS" />
      <AppSwitch v-model="enabled" label="启用" hint="停用后不再抓取，已有内容留着" />
      <AppTextarea v-model="summary" label="意图描述" :hint="FORM_TEXT.summaryHint" :rows="3" />
      <div class="lab-row lab-row--end">
        <AppButton variant="ghost">取消</AppButton>
        <AppButton variant="primary">保存</AppButton>
        <AppButton variant="danger-solid" size="sm">删除</AppButton>
      </div>
    </div>

    <div class="lab__h3">空态 · AppEmptyState</div>
    <div class="lab-form">
      <AppEmptyState
        title="还没有通知渠道"
        note="配一个渠道，命中后的内容才有地方发出去"
        icon="mdi-bell-outline"
      >
        <template #actions>
          <AppButton variant="primary" size="sm">新建渠道</AppButton>
        </template>
      </AppEmptyState>
    </div>

    <div class="lab__h3">提示条 · AppHint</div>
    <div class="lab-form">
      <AppHint tone="info">路由通了，但这页不像订阅源</AppHint>
      <AppHint tone="ok">已抓到 12 条，最近一条 3 分钟前</AppHint>
      <AppHint tone="warn">这个渠道今天有 3 次发不出去</AppHint>
      <AppHint tone="err">地址打不开，检查是否要带 http</AppHint>
    </div>

    <div class="lab__h3">骨架 · AppSkeleton</div>
    <div class="lab-form">
      <AppSkeleton variant="text" :rows="3" />
      <AppSkeleton variant="card" />
      <AppSkeleton variant="list" />
      <AppSkeleton variant="page" />
    </div>

    <!-- 业务场景：按生产页面真实形态展示扩展能力，供以后对照（页面外壳是基础结构，骨架走真组件） -->
    <div class="lab__h3">骨架 · 业务场景（对照生产页面）</div>
    <div class="lab-form">
      <!-- 仪表盘「事件 / 故障」列表：扁平卡 + 方块首列 + 紧凑短粗副条，3 行 -->
      <div class="k2-card k2-card--flat k2-list">
        <AppSkeleton variant="list" :rows="3" leading="tile" density="compact" />
      </div>
      <!-- 配置页分组卡：标题 + 一排 3 个方块（外壳用扁平卡这个基础结构；分组的头由生产页面自己持有） -->
      <div class="k2-card k2-card--flat">
        <AppSkeleton variant="card" :body="false" :blocks="3" />
      </div>
    </div>

    <!-- 活跃区：面板 + 事件行 + 异常卡，全是真组件（生产仪表盘就按这个形态迁） -->
    <div class="lab__h3">活跃区 · AppPanel / EventRow / IncidentCard</div>
    <p class="lab__meta">
      两栏面板：头部固定、内容区自己滚；事件行挂来源标签（最多两个，多的收成
      +N，点开是浮层，完整来源列在里面，最多显示 4
      条高度，再多在浮层里滚）；未读圆点是实心的，看过之后又有新条目换空心圈；外部列表最多 6 条、6
      条以内不出底栏；两栏的内容窗口都是「正好 6 行」那一档，所以两栏一样高，
      异常列表超过就在卡片内滚。
    </p>
    <div class="lab__cols lab__cols--activity">
      <AppPanel class="k2-t-primary">
        <template #head>
          <span class="k2-panel__heading">
            <span class="k2-panel__mark" aria-hidden="true" />
            <span class="k2-sec__title">最近事件</span>
            <span class="k2-panel__badge">{{ filteredEvents.length }}</span>
            <span class="k2-panel__sub">24h内关注的事件动态</span>
          </span>
          <span class="k2-panel__actions">
            <AppSourceFilter
              v-model="sourceFilter"
              :options="filterOptions"
              :all-label="ALL_SOURCES"
              @reset="resetFilter"
            />
            <button type="button" class="k2-panel__link" @click="dialogOpen = true">
              查看全部
              <v-icon size="14">mdi-chevron-right</v-icon>
            </button>
          </span>
        </template>
        <EventRow
          v-for="event in visibleEvents"
          :key="event.id"
          :event="event"
          :time="eventTime(event.lastItemAt)"
          :rest-sources="restOf(event)"
          @open="openEvent"
        />
        <template v-if="filteredEvents.length > DASHBOARD_EVENT_LIMIT" #foot>
          <button type="button" class="k2-panel__more" @click="dialogOpen = true">
            查看全部事件
            <v-icon size="14">mdi-chevron-right</v-icon>
          </button>
        </template>
      </AppPanel>
      <AppPanel :class="incidents.length ? 'k2-t-danger' : 'k2-t-success'">
        <template #head>
          <span class="k2-panel__heading">
            <span class="k2-panel__mark" aria-hidden="true" />
            <span class="k2-sec__title">异常记录</span>
            <span class="k2-panel__badge">{{ incidents.length }}</span>
            <span class="k2-panel__sub">同一处异常60分钟内重复只更新时间，最多展示20条</span>
          </span>
        </template>
        <div class="k2-rows">
          <IncidentCard
            v-for="incident in incidents"
            :key="incident.id"
            :incident="incident"
            :last-seen="formatDateTime(incident.createdAt)"
            dismiss-label="忽视"
            @dismiss="noop"
          />
        </div>
      </AppPanel>
    </div>

    <!-- 圆点两态：实心＝没看过；空心圈＝看过之后又有新条目（不回退成未读） -->
    <div class="lab__h3">事件行 · 未读 / 有更新 / 已读</div>
    <p class="lab__meta">
      右上角实心圆点＝这件事从没看过（readAt 为空）；空心圈＝看过之后又有新条目 （lastItemAt 晚于
      readAt），不退回未读；都没有就不挂。三条是固定对照，点了不会变。
    </p>
    <AppPanel class="k2-t-primary" height="auto">
      <EventRow
        v-for="event in dotSamples"
        :key="event.id"
        :event="event"
        :time="eventTime(event.lastItemAt)"
        :rest-sources="restOf(event)"
        @open="noop"
      />
    </AppPanel>

    <!-- 查看全部：外部列表与弹窗共用同一批对象，弹窗里点开一条，外面的圆点会同时消失 -->
    <AppEventDialog
      v-model="dialogOpen"
      :events="filteredEvents"
      :filter-label="sourceFilter"
      :all-label="ALL_SOURCES"
      :time-of="timeOfEvent"
      :rest-of="restOf"
      @open="openEvent"
      @clear-filter="resetFilter"
    />

    <div class="lab__h3">活跃区 · 空状态（没有数据时的样子）</div>
    <p class="lab__meta">
      两个面板都没有数据时：内容区居中放空状态（真组件 AppEmptyState），头部入口照常保留；
      异常面板一条都没有时头部换成绿色（有异常才是红色）。
    </p>
    <div class="lab__cols lab__cols--activity">
      <AppPanel class="k2-t-primary">
        <template #head>
          <span class="k2-panel__heading">
            <span class="k2-panel__mark" aria-hidden="true" />
            <span class="k2-sec__title">最近事件</span>
            <span class="k2-panel__badge">0</span>
            <span class="k2-panel__sub">24h内关注的事件动态</span>
          </span>
        </template>
        <AppEmptyState
          art="events"
          title="还没有事件"
          note="采集到条目并归并成事件后，最近 24 小时的会出现在这里"
        />
      </AppPanel>
      <AppPanel class="k2-t-success">
        <template #head>
          <span class="k2-panel__heading">
            <span class="k2-panel__mark" aria-hidden="true" />
            <span class="k2-sec__title">异常记录</span>
            <span class="k2-panel__badge">0</span>
            <span class="k2-panel__sub">同一处异常60分钟内重复只更新时间，最多展示20条</span>
          </span>
        </template>
        <AppEmptyState art="incidents" title="没有异常" note="采集、判定、推送出错时会记在这里" />
      </AppPanel>
    </div>

    <!-- 条数变多：外部列表最多 6 条（超出的进底栏），异常列表不截断、超过窗口就在卡片内滚 -->
    <div class="lab__h3">活跃区 · 条数变多（10 条事件 / 10 条异常）</div>
    <p class="lab__meta">
      外部列表最多 6 条，第 7 条起收进底栏（「还有 4 条」），点它或头部的「查看全部」都能打开列全 10
      条的弹窗； 异常列表不截断（上限 20 条），10
      条超过卡片窗口就在卡片内滚，页面高度不变、两栏仍然同高。
    </p>
    <div class="lab__cols lab__cols--activity">
      <AppPanel class="k2-t-primary">
        <template #head>
          <span class="k2-panel__heading">
            <span class="k2-panel__mark" aria-hidden="true" />
            <span class="k2-sec__title">最近事件</span>
            <span class="k2-panel__badge">{{ manyEvents.length }}</span>
            <span class="k2-panel__sub">24h内关注的事件动态</span>
          </span>
          <span class="k2-panel__actions">
            <button type="button" class="k2-panel__link" @click="manyDialogOpen = true">
              查看全部
              <v-icon size="14">mdi-chevron-right</v-icon>
            </button>
          </span>
        </template>
        <EventRow
          v-for="event in visibleManyEvents"
          :key="event.id"
          :event="event"
          :time="eventTime(event.lastItemAt)"
          :rest-sources="restOf(event)"
          @open="openEvent"
        />
        <template #foot>
          <button type="button" class="k2-panel__more" @click="manyDialogOpen = true">
            查看全部事件
            <v-icon size="14">mdi-chevron-right</v-icon>
          </button>
        </template>
      </AppPanel>
      <AppPanel class="k2-t-danger">
        <template #head>
          <span class="k2-panel__heading">
            <span class="k2-panel__mark" aria-hidden="true" />
            <span class="k2-sec__title">异常记录</span>
            <span class="k2-panel__badge">{{ manyIncidents.length }}</span>
            <span class="k2-panel__sub">同一处异常60分钟内重复只更新时间，最多展示20条</span>
          </span>
        </template>
        <div class="k2-rows">
          <IncidentCard
            v-for="incident in manyIncidents"
            :key="incident.id"
            :incident="incident"
            :last-seen="formatDateTime(incident.createdAt)"
            dismiss-label="忽视"
            @dismiss="noop"
          />
        </div>
      </AppPanel>
    </div>
    <AppEventDialog
      v-model="manyDialogOpen"
      :events="lazyEvents"
      :has-more="lazyHasMore"
      :loading-more="lazyLoading"
      :note="`24h内关注的事件动态 · 先给一页，滚到底再补一页（模拟后端的 cursor 分页）`"
      :time-of="timeOfEvent"
      :rest-of="restOf"
      @open="openEvent"
      @load-more="loadMoreLazy"
    />

    <div class="lab__h3">来源标签组 · AppSourceTags</div>
    <div class="lab-form">
      <AppSourceTags :sources="ACTIVITY_EVENTS[1].sources" :total="1" />
      <AppSourceTags :sources="ACTIVITY_EVENTS[0].sources" :total="2" />
      <AppSourceTags :sources="ACTIVITY_EVENTS[4].sources" :total="8" :rest="MANY_SOURCES" />
    </div>

    <div class="lab__h3">状态 · AppStatus</div>
    <div class="lab-row">
      <AppStatus tone="ok">已启用</AppStatus>
      <AppStatus tone="warn">有警告</AppStatus>
      <AppStatus tone="err">发不出去</AppStatus>
      <AppStatus tone="info">测试中</AppStatus>
      <AppStatus tone="neutral">已停用</AppStatus>
      <AppStatus tone="ok" busy>发送中</AppStatus>
    </div>

    <div class="lab__h3">标签页 · AppTabs</div>
    <AppTabs v-model="tab" :items="TAB_ITEMS" label="样例分组" />
  </div>
</template>
