<!-- 样例 · 设置页真组件（S4）
     目的：把「设置分类 + 真分线组件 + 真排除词组件 + 真弹窗（含真 CronPicker）」摊开看。
     上下文：与生产 SettingsForm 相同的最小结构
             .k2-card.k2-set > .k2-set__row > (.k2-set__label + .k2-set__control)
     边界：只用真生产组件与 .k2-* / --k2-* 零件，不复制 SettingsForm 的完整模板。 -->
<script setup lang="ts">
import { ref } from 'vue'

import AppInput from '@/components/app/AppInput.vue'
import ConfirmDialog from '@/components/biz/ConfirmDialog.vue'
import CronPicker from '@/components/biz/CronPicker.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import GroupDialog from '@/components/biz/GroupDialog.vue'
import ExcludeWordsField from '@/components/settings/ExcludeWordsField.vue'
import ScoreBandField from '@/components/settings/ScoreBandField.vue'

type ThemeMode = 'light' | 'dark' | 'system'

const themeModes: { key: ThemeMode; label: string; icon: string }[] = [
  { key: 'light', label: '亮色', icon: 'mdi-weather-sunny' },
  { key: 'dark', label: '暗色', icon: 'mdi-weather-night' },
  { key: 'system', label: '跟随系统', icon: 'mdi-monitor' },
]
const theme = ref<ThemeMode>('system')

/** 真 ScoreBandField：与生产同一组件、同一套 props 语义（低 30 / 高 70） */
const bandLow = ref(30)
const bandHigh = ref(70)

/** 真 ExcludeWordsField */
const excludeWords = ref(['广告', '抽奖', '优惠券'])

/** 真 CronPicker：生产里长在弹窗里（SourceDialog / ActionDialog） */
const cron = ref('0 8 * * *')

/** 真弹窗：默认关闭，点按钮才开 */
const actionOpen = ref(false)
const actionName = ref('每日早报')
const confirmOpen = ref(false)
const groupOpen = ref(false)

/** RSSHub */
const rsshub = ref('http://192.168.5.100:1200')
const rsshubState = ref<'idle' | 'testing' | 'ok' | 'fail'>('idle')

function testRsshub(): void {
  rsshubState.value = 'testing'
  window.setTimeout(() => {
    rsshubState.value = 'ok'
  }, 600)
}

const pushTimeout = ref(15)
</script>

<template>
  <div class="lab-setgrid">
    <!-- 设置分类（二级菜单）：窄栏 -->
    <div>
      <div class="lab__h3">设置分类</div>
      <div class="k2-card k2-card--flat lab-settings">
        <nav class="lab-setnav">
          <button
            v-for="(item, i) in ['通用', '采集', '通知', '模型', '数据']"
            :key="item"
            type="button"
            class="lab-setnav__item"
            :class="{ 'lab-setnav__item--on': i === 1 }"
          >
            {{ item }}
          </button>
        </nav>
      </div>
    </div>

    <!-- 该分类下的设置行：宽栏 -->
    <div>
      <div class="lab__h3">采集</div>
      <div class="k2-card k2-card--flat">
        <div class="lab-setlist">
          <div class="lab-setrow">
            <span class="lab-setrow__main">
              <span class="k2-row__title">推送超时（秒）</span>
              <span class="k2-row__sub">单次推送最多等多久，超时算这一轮失败</span>
            </span>
            <input
              v-model.number="pushTimeout"
              class="lab-input lab-input--num"
              type="number"
              min="5"
              max="120"
            />
          </div>
          <div class="lab-setrow">
            <span class="lab-setrow__main">
              <span class="k2-row__title">RSSHub 地址</span>
              <span class="k2-row__sub">填了才走 RSSHub 路由，20 秒内复用上一次探测结果</span>
            </span>
            <span class="lab-setrow__side">
              <input v-model="rsshub" class="lab-input lab-input--url" />
              <button
                type="button"
                class="k2-btn k2-btn--ghost k2-btn--sm"
                :disabled="rsshubState === 'testing'"
                data-test="rsshub-test"
                @click="testRsshub"
              >
                <i class="mdi" :class="rsshubState === 'testing' ? 'mdi-refresh' : 'mdi-play'" />
                {{ rsshubState === 'testing' ? '测试中' : '测试' }}
              </button>
            </span>
          </div>
          <div class="lab-setrow">
            <span class="lab-setrow__main">
              <span class="k2-row__title">主题</span>
              <span class="k2-row__sub">默认跟随系统，切换即时生效</span>
            </span>
            <span class="lab-seg">
              <button
                v-for="m in themeModes"
                :key="m.key"
                type="button"
                class="lab-seg__item"
                :class="{ 'lab-seg__item--on': theme === m.key }"
                :data-test="`theme-${m.key}`"
                @click="theme = m.key"
              >
                <i :class="`mdi ${m.icon}`" />{{ m.label }}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 真设置组件 + 真设置行上下文 -->
  <div class="lab__gap-top">
    <div class="lab__h3">打分与排除（真组件 · 生产设置行上下文）</div>
    <div class="k2-card k2-set" data-test="lab-settings-card">
      <div class="k2-set__row">
        <div class="k2-set__label">
          <span class="k2-field__label">低分线与高分线</span>
          <span class="k2-field__hint">拖动两条线决定哪些事件被丢弃、哪些进入推送</span>
        </div>
        <div class="k2-set__control">
          <ScoreBandField
            :high="bandHigh"
            :low="bandLow"
            data-test="lab-score-bands"
            @update:high="bandHigh = $event"
            @update:low="bandLow = $event"
          />
        </div>
      </div>

      <div class="k2-set__row">
        <div class="k2-set__label">
          <span class="k2-field__label">全局排除词</span>
          <span class="k2-field__hint">命中任意一个词的事件直接丢弃，不进入打分</span>
        </div>
        <div class="k2-set__control">
          <ExcludeWordsField v-model="excludeWords" test-id="lab-exclude" />
        </div>
      </div>
    </div>
  </div>

  <div class="lab__cols lab__gap-top lab__cols--wide">
    <!-- 弹窗触发器（真弹窗默认关闭） -->
    <div>
      <div class="lab__h3">弹窗（真组件 · 默认关闭）</div>
      <div class="k2-card k2-card--flat lab-dialogbar">
        <button
          type="button"
          class="k2-btn k2-btn--ghost"
          data-test="open-action-dialog"
          @click="actionOpen = true"
        >
          编辑动作（含真 CronPicker）
        </button>
        <button
          type="button"
          class="k2-btn k2-btn--ghost"
          data-test="open-group-dialog"
          @click="groupOpen = true"
        >
          新建分组
        </button>
      </div>
    </div>

    <!-- 危险操作 -->
    <div>
      <div class="lab__h3">危险操作</div>
      <div class="k2-card k2-card--sm k2-t-danger">
        <div class="k2-card__head">
          <span class="k2-tile k2-tile--sm"><i class="mdi mdi-alert-circle" /></span>
          <span class="k2-card__heading">
            <span class="k2-row__title">重置全部设置</span>
            <span class="k2-row__sub">所有设置项一次性回到默认值，需要二次确认</span>
          </span>
        </div>
        <div class="k2-card__foot">
          <button
            type="button"
            class="k2-btn k2-btn--danger"
            data-test="reset-all"
            @click="confirmOpen = true"
          >
            重置全部设置
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 真 FormDialog：内容里放真 AppInput + 真 CronPicker -->
  <FormDialog
    v-model="actionOpen"
    title="编辑动作"
    note="动作开启后，命中时按下面的频率投递"
    :width="520"
    submit-label="保存"
    @submit="actionOpen = false"
    @cancel="actionOpen = false"
  >
    <div class="lab-fieldstack">
      <AppInput v-model="actionName" label="名称" />
      <CronPicker v-model="cron" label="投递频率" data-test="lab-cron-picker" />
    </div>
  </FormDialog>

  <!-- 真 GroupDialog -->
  <GroupDialog v-model="groupOpen" @submit="groupOpen = false" @cancel="groupOpen = false" />

  <!-- 真 ConfirmDialog：替换原先手写的仿制确认框 -->
  <ConfirmDialog
    v-model="confirmOpen"
    title="确认重置全部设置？"
    message="这会重置所有设置项，包括推送超时、排除词与分线；已采集的数据不受影响。"
    confirm-label="确认重置"
    @confirm="confirmOpen = false"
  />
</template>

<style scoped>
.lab-settings {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  min-block-size: 320px;
}

.lab-setnav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--k2-s-3);
  box-shadow: inset -1px 0 0 var(--k2-c-border-soft);
}

.lab-setnav__item {
  padding: var(--k2-s-3);
  border: 0;
  border-radius: var(--k2-r-sm);
  background: none;
  color: var(--k2-c-text-muted);
  font-family: inherit;
  font-size: var(--k2-fs-body);
  text-align: start;
  cursor: pointer;
}

.lab-setnav__item:hover {
  background: var(--k2-c-wash-hover);
}

.lab-setnav__item--on {
  background: var(--k2-c-primary-soft);
  color: var(--k2-c-primary-ink);
  font-weight: var(--k2-fw-medium);
}

.lab-setlist {
  display: flex;
  flex-direction: column;
}

.lab-setrow {
  display: flex;
  align-items: center;
  gap: var(--k2-s-5);
  padding: var(--k2-s-5);
}

.lab-setrow + .lab-setrow {
  box-shadow: inset 0 1px 0 var(--k2-c-border-soft);
}

.lab-setrow__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-inline-size: 0;
}

.lab-setrow__side {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--k2-s-2);
}

.lab-input {
  block-size: var(--k2-control-h);
  padding: 0 var(--k2-s-3);
  border: 1px solid var(--k2-c-border);
  border-radius: var(--k2-r-sm);
  background: var(--k2-c-surface2);
  color: var(--k2-c-text);
  font-family: inherit;
  font-size: var(--k2-fs-body);
}

.lab-input--num {
  inline-size: 88px;
  text-align: end;
}

.lab-input--url {
  inline-size: 260px;
  font-family: var(--k2-font-mono);
  font-size: var(--k2-fs-caption);
}

.lab-seg {
  display: inline-flex;
  flex: none;
  padding: 2px;
  border-radius: var(--k2-r-md);
  background: var(--k2-c-surface3);
}

.lab-seg__item {
  display: inline-flex;
  align-items: center;
  gap: var(--k2-s-2);
  padding: var(--k2-s-2) var(--k2-s-4);
  border: 0;
  border-radius: var(--k2-r-sm);
  background: none;
  color: var(--k2-c-text-muted);
  font-family: inherit;
  font-size: var(--k2-fs-body);
  cursor: pointer;
}

.lab-seg__item--on {
  background: var(--k2-c-surface);
  color: var(--k2-c-text);
  box-shadow: var(--k2-shadow-xs);
}

/* 弹窗触发器一排 */
.lab-dialogbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--k2-s-3);
  padding: var(--k2-s-5);
}

/* 弹窗正文里的字段纵排（宽度由 Dialog 自己给） */
.lab-fieldstack {
  display: flex;
  flex-direction: column;
  gap: var(--k2-s-5);
}
</style>
