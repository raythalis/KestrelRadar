<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ActionCard from '@/components/biz/ActionCard.vue'
import ChannelCard from '@/components/biz/ChannelCard.vue'
import GroupPanel from '@/components/biz/GroupPanel.vue'
import MonitorCard from '@/components/biz/MonitorCard.vue'
import { monitorModeView } from '@/components/biz/monitor-mode'
import SourceCard from '@/components/biz/SourceCard.vue'
import {
  ACTION_FIXTURES,
  CHANNEL_FIXTURES,
  GROUP_COUNTS,
  GROUP_FIXTURE,
  MONITOR_FIXTURES,
  SOURCE_FIXTURES,
  type ActionFixture,
  type ChannelFixture,
  type MonitorFixture,
  type SourceFixture,
} from './fixtures'

/** 样例里全局判定档位：跟「跟随全局」的那张卡一起演示 LLM+ */
const GLOBAL_MODE = 'algorithm_llm' as const

/**
 * 卡片样例 = 真实 Biz Card + 真实所在容器。
 * 数据源 / 监听 / 动作三张卡在生产页面里长在分组面板的三列插槽里，
 * 所以这里也挂真 GroupPanel（列头、列底新增、折叠都由它给），不自己拼三列。
 */
const { t } = useI18n()

const sources = reactive<SourceFixture[]>(SOURCE_FIXTURES.map((item) => ({ ...item })))
const monitors = reactive<MonitorFixture[]>(MONITOR_FIXTURES.map((item) => ({ ...item })))
const actions = reactive<ActionFixture[]>(ACTION_FIXTURES.map((item) => ({ ...item })))
const channels = reactive<ChannelFixture[]>(CHANNEL_FIXTURES.map((item) => ({ ...item })))

const groupExpanded = ref(true)

function sourceProps(item: SourceFixture) {
  return {
    name: item.name,
    kindLabel: t(item.kindLabelKey),
    icon: item.icon,
    enabled: item.enabled,
    target: item.target,
    cron: item.cron,
    nextRunAt: item.nextRunAt ?? null,
    stat: item.stat ?? null,
    windowDays: 7,
  }
}

function monitorProps(item: MonitorFixture) {
  const mode = monitorModeView(item.mode, GLOBAL_MODE, t)
  return {
    name: item.name,
    modeLabel: mode.label,
    llmPlus: mode.llmPlus,
    icon: item.icon,
    keywords: item.keywords,
    matchLabel:
      item.keywords.length && item.matchMode ? t(`monitor.matchMode.${item.matchMode}`) : '',
    intentText: item.intentText,
    sensitivityLabel: t(`monitor.sensitivity.${item.sensitivity}`),
    enabled: item.enabled,
    stat: item.stat ?? null,
    windowDays: 7,
  }
}

function actionProps(item: ActionFixture) {
  return {
    name: item.name,
    triggerLabel: t(`action.trigger.${item.triggerType}`),
    icon: item.icon,
    cron: item.cron,
    channelName: item.channelName,
    templateName: t(item.templateNameKey),
    enabled: item.enabled,
    stat: item.stat ?? null,
    windowDays: 7,
  }
}

/** 卡面上的启停只在样例内生效（改的是 fixture 的状态，不是生产数据） */
const channelCount = computed(() => channels.length)
</script>

<template>
  <div class="lab-parts">
    <div class="lab__h3">数据源 / 监听 / 动作 · 分组面板里的三列</div>
    <p class="lab__meta">
      这三张卡在生产页面里长在分组面板的三列插槽里：列头、列底的新增按钮、折叠都由面板负责。
      样例给面板的只是 group / counts / expanded 三个 prop，卡片本体和插槽内容和生产一致。
    </p>

    <GroupPanel
      :group="GROUP_FIXTURE"
      :counts="GROUP_COUNTS"
      :expanded="groupExpanded"
      @toggle="groupExpanded = !groupExpanded"
      @edit="() => {}"
      @delete="() => {}"
      @toggle-enabled="() => {}"
      @add="() => {}"
    >
      <template #discoveries>
        <SourceCard
          v-for="item in sources"
          :key="item.name"
          v-bind="sourceProps(item)"
          @test="() => {}"
          @toggle="(value: boolean) => (item.enabled = value)"
          @edit="() => {}"
          @delete="() => {}"
        />
      </template>

      <template #monitors>
        <MonitorCard
          v-for="item in monitors"
          :key="item.name"
          v-bind="monitorProps(item)"
          :linked="false"
          @hover="() => {}"
          @toggle="(value: boolean) => (item.enabled = value)"
          @edit="() => {}"
          @delete="() => {}"
        />
      </template>

      <template #actions>
        <ActionCard
          v-for="item in actions"
          :key="item.name"
          v-bind="actionProps(item)"
          :linked="false"
          @hover="() => {}"
          @toggle="(value: boolean) => (item.enabled = value)"
          @edit="() => {}"
          @delete="() => {}"
        />
      </template>
    </GroupPanel>

    <div class="lab__h3">渠道卡 · ChannelCard（{{ channelCount }} 张）</div>
    <p class="lab__meta">
      渠道卡不在分组里，生产页面用一整排网格摆它；这里同样是页面级网格，不是自己搭的容器。
    </p>

    <div class="k2-grid">
      <ChannelCard
        v-for="item in channels"
        :key="item.name"
        :name="item.name"
        :type="item.type"
        :enabled="item.enabled"
        :last-pushed-at="item.lastPushedAt"
        :tone="item.tone"
        :probe="item.probe"
        @test="() => {}"
        @edit="() => {}"
        @delete="() => {}"
      />
    </div>
  </div>
</template>
