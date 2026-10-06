<script setup lang="ts">
import { ref } from 'vue'

import AppButton from '@/components/app/AppButton.vue'
import AppEmptyState from '@/components/app/AppEmptyState.vue'
import AppHint from '@/components/app/AppHint.vue'
import AppInput from '@/components/app/AppInput.vue'
import AppSelect from '@/components/app/AppSelect.vue'
import AppSkeleton from '@/components/app/AppSkeleton.vue'
import AppStatus from '@/components/app/AppStatus.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'
import AppTabs from '@/components/app/AppTabs.vue'
import AppTextarea from '@/components/app/AppTextarea.vue'
import { FORM_TEXT, SELECT_ITEMS, TAB_ITEMS } from './fixtures'

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
