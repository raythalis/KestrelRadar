<script setup lang="ts">
import { ref } from 'vue'

import AppButton from '@/components/app/AppButton.vue'
import AppEmptyState from '@/components/app/AppEmptyState.vue'
import AppHint from '@/components/app/AppHint.vue'
import AppInput from '@/components/app/AppInput.vue'
import AppSelect from '@/components/app/AppSelect.vue'
import AppPanel from '@/components/app/AppPanel.vue'
import AppSkeleton from '@/components/app/AppSkeleton.vue'
import AppSourceTags from '@/components/app/AppSourceTags.vue'
import EventRow from '@/components/biz/EventRow.vue'
import IncidentCard from '@/components/biz/IncidentCard.vue'
import AppStatus from '@/components/app/AppStatus.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'
import AppTabs from '@/components/app/AppTabs.vue'
import AppTextarea from '@/components/app/AppTextarea.vue'
import { formatDateTime, timeAgo } from '@/utils/format'

import { ACTIVITY_EVENTS, ACTIVITY_INCIDENTS, FORM_TEXT, SELECT_ITEMS, TAB_ITEMS } from './fixtures'

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

/** 样例里的动作只提示，不跳转、不写库：这里展示的是组件长什么样 */
function openEvent(event: { title: string }): void {
  window.console.info('[style-lab] 点开事件：', event.title)
}

function openSources(): void {
  window.console.info('[style-lab] 展开完整来源列表')
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
      两栏同高的定高面板：头部固定、内容区自己滚、底部可选一条入口；事件行挂来源标签（最多两个，多的收成
      +N）；未读圆点是实心的（看过之后不会再亮）；异常卡只放首次出现、最近发生、当前状态。
    </p>
    <div class="lab__cols lab__cols--activity">
      <AppPanel>
        <template #head>
          <span class="k2-panel__mark" aria-hidden="true" />
          <span class="k2-sec__title">最近事件</span>
          <span class="k2-panel__badge">{{ ACTIVITY_EVENTS.length }}</span>
          <span class="k2-panel__actions">
            <span class="k2-chip k2-chip--soft">
              <v-icon size="13">mdi-filter-variant</v-icon>
              筛选
            </span>
          </span>
          <span class="k2-panel__sub">24h内关注的事件动态</span>
        </template>
        <EventRow
          v-for="event in ACTIVITY_EVENTS"
          :key="event.id"
          :event="event"
          :time="eventTime(event.lastItemAt)"
          @open="openEvent"
          @more="openSources"
        />
        <template #foot>
          <button type="button" class="k2-panel__more">
            查看全部事件
            <v-icon size="14">mdi-chevron-right</v-icon>
          </button>
        </template>
      </AppPanel>
      <AppPanel class="k2-t-danger">
        <template #head>
          <span class="k2-panel__mark" aria-hidden="true" />
          <span class="k2-sec__title">异常记录</span>
          <span class="k2-panel__badge">{{ ACTIVITY_INCIDENTS.length }}</span>
          <span class="k2-panel__actions">
            <span class="k2-chip k2-chip--soft">
              <v-icon size="13">mdi-filter-variant</v-icon>
              筛选
            </span>
          </span>
          <span class="k2-panel__sub">同一处异常60分钟内重复只更新时间，最多展示20条</span>
        </template>
        <div class="k2-rows">
          <IncidentCard
            v-for="incident in ACTIVITY_INCIDENTS"
            :key="incident.id"
            :incident="incident"
            :first-seen="`首次出现 ${formatDateTime(incident.firstSeenAt)}`"
            :last-seen="`最近发生 ${formatDateTime(incident.createdAt)}`"
            status="待处理"
            dismiss-label="忽视"
            @dismiss="noop"
          />
        </div>
      </AppPanel>
    </div>

    <div class="lab__h3">来源标签组 · AppSourceTags</div>
    <div class="lab-form">
      <AppSourceTags :sources="ACTIVITY_EVENTS[1].sources" :total="1" />
      <AppSourceTags :sources="ACTIVITY_EVENTS[0].sources" :total="2" />
      <AppSourceTags :sources="ACTIVITY_EVENTS[0].sources" :total="4" @more="openSources" />
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
