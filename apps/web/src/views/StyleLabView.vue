<!-- StyleLabView：视觉方向 v2 的完整 token 体系 + 组件预览（仅开发环境注册，/style-lab）。
     目的：把整套 v2 token（颜色 / 排版 / 间距 / 圆角 / 阴影 / 密度 / 动效）与用它做出来的组件一次性看到。
     边界：v2 是一套独立 token，不引用 v1 的 --k-*；现有页面与 v1 token 一行未改。
     本页的 --k2-* 只写在预览容器上，不外溢到 <html>。 -->
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

import {
  V2_DENSITY,
  V2_ICON,
  V2_LEADING,
  V2_MOTION,
  V2_NEUTRAL,
  V2_RADIUS,
  V2_SHADOW,
  V2_SPACE,
  V2_TYPE,
  V2_WEIGHT,
  applyV2Vars,
} from '@/design/v2/tokens'
import AppSkeleton from '@/components/app/AppSkeleton.vue'
import CardSamples from './style-lab/CardSamples.vue'
import AppShowcase from './style-lab/AppShowcase.vue'
import PartSamples from './style-lab/PartSamples.vue'
import FormSamples from './style-lab/FormSamples.vue'
import GroupSamples from './style-lab/GroupSamples.vue'
import '@/styles/lab.scss'
import '@/styles/v2.scss'

const dark = ref(document.documentElement.dataset.theme === 'dark')
const lab = ref<HTMLElement | null>(null)

/** 亮暗只作用在预览容器上：不写 <html>、不动用户当前主题 */
function paint(): void {
  const el = lab.value
  if (!el) return
  // 换一套变量前先关过渡并强制重排：让新主题一次落地，不被动画拖住
  el.classList.add('k2-instant')
  applyV2Vars(dark.value, el)
  void el.offsetHeight
  el.classList.remove('k2-instant')
}

onMounted(paint)
// 直接重算：写 CSS 变量不需要等一帧，也不该依赖 rAF（后台标签页会被节流）
watch(dark, () => nextTick(paint))

/** 字阶示例文案（演示用文字，不是 token 值） */
const TYPE_SAMPLE: Record<keyof typeof V2_TYPE, string> = {
  display: 'Kestrel',
  h1: '今日事件概览',
  h2: '采集成功率 97.6%',
  title: '渠道与动作',
  subtitle: 'Hacker News 完成一次抓取',
  bodyLg: '共 186 条事件进入候选池',
  body: '正文、卡片副标题用这一档',
  caption: '时间、来源与说明文字',
}

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral'

/* ---------------------------------------------------------------- token 清单 */

/** 密度值去掉 px 后缀，标尺上只显示数字 */
const px = (value: string): string => value.replace('px', '')

/** 中性阶取键：n0 → '0'（变量名是 --k2-n-0） */
const neutral = Object.keys(V2_NEUTRAL).map((key) => key.slice(1))

const surfaceSwatches = [
  { name: 'bg', v: '--k2-c-bg' },
  { name: 'surface', v: '--k2-c-surface' },
  { name: 'surface2', v: '--k2-c-surface2' },
  { name: 'surface3', v: '--k2-c-surface3' },
  { name: 'border', v: '--k2-c-border' },
  { name: 'border-soft', v: '--k2-c-border-soft' },
]

const brandSwatches = [
  { name: 'primary', v: '--k2-c-primary' },
  { name: 'primary-hover', v: '--k2-c-primary-hover' },
  { name: 'primary-active', v: '--k2-c-primary-active' },
  { name: 'primary-soft', v: '--k2-c-primary-soft' },
  { name: 'on-primary', v: '--k2-c-on-primary' },
]

const semantic = ['success', 'warning', 'danger', 'info'] as const

const textSwatches = [
  { name: 'text', v: '--k2-c-text' },
  { name: 'text-muted', v: '--k2-c-text-muted' },
  { name: 'text-faint', v: '--k2-c-text-faint' },
]

const stateSwatches = [
  { name: 'focus-ring', v: '--k2-c-focus-ring' },
  { name: 'overlay', v: '--k2-c-overlay' },
  { name: 'disabled-bg', v: '--k2-c-disabled-bg' },
  { name: 'disabled-text', v: '--k2-c-disabled-text' },
  { name: 'skeleton', v: '--k2-c-skeleton' },
  { name: 'skeleton-sheen', v: '--k2-c-skeleton-sheen' },
  { name: 'track', v: '--k2-c-track' },
  { name: 'mark', v: '--k2-c-mark' },
  { name: 'mark-border', v: '--k2-c-mark-border' },
  { name: 'wash-hover', v: '--k2-c-wash-hover' },
]

const TYPE_WEIGHT = {
  display: 'bold',
  h1: 'semibold',
  h2: 'semibold',
  title: 'semibold',
  subtitle: 'medium',
  bodyLg: 'regular',
  body: 'regular',
  caption: 'regular',
} as const

/** 展示顺序：从大到小；数值一律从 V2_TYPE / V2_WEIGHT 取，不手写 */
const typeRamp = (Object.keys(TYPE_WEIGHT) as (keyof typeof V2_TYPE)[]).map((key) => ({
  name: `${key} ${px(V2_TYPE[key])} · ${V2_WEIGHT[TYPE_WEIGHT[key]]}`,
  v: `--k2-fs-${key}`,
  w: `--k2-fw-${TYPE_WEIGHT[key]}`,
  sample: TYPE_SAMPLE[key],
}))

const leadingRamp = Object.entries(V2_LEADING).map(([key, value]) => ({
  name: `${key} ${value}`,
  v: `--k2-lh-${key}`,
}))

const weightRamp = Object.entries(V2_WEIGHT).map(([key, value]) => ({
  name: `${key} ${value}`,
  v: `--k2-fw-${key}`,
}))

const spaceSteps = V2_SPACE.map((value, index) => ({
  n: `s-${index + 1}`,
  v: `--k2-s-${index + 1}`,
  px: value,
}))

const radiusSteps = Object.entries(V2_RADIUS).map(([key, value]) => ({
  name: key,
  v: `--k2-r-${key}`,
  label: `r-${key} ${value}`,
}))
const shadowSteps = Object.entries(V2_SHADOW.light).map(([key]) => ({
  name: key,
  v: `--k2-shadow-${key}`,
  label: `shadow-${key}`,
}))

const motionSteps = [
  { label: `fast ${V2_MOTION.fast}` },
  { label: `base ${V2_MOTION.base}` },
  { label: `ease · ${V2_MOTION.ease}` },
  { label: `lift · 悬停抬升 ${V2_MOTION.lift}` },
]

const iconSteps = [
  { key: 'sm', cls: 'k2-icon--sm', icon: 'mdi-rss' },
  { key: 'md', cls: 'k2-icon--md', icon: 'mdi-send' },
  { key: 'lg', cls: 'k2-icon--lg', icon: 'mdi-bell-outline' },
].map((i) => ({
  name: `${i.key} ${V2_ICON[i.key as keyof typeof V2_ICON]}`,
  cls: i.cls,
  icon: i.icon,
}))

const chips: { text: string; tone: Tone }[] = [
  { text: '已连接', tone: 'success' },
  { text: '有警告', tone: 'warning' },
  { text: '失败', tone: 'danger' },
  { text: '进行中', tone: 'info' },
  { text: '启用中', tone: 'primary' },
  { text: '已停用', tone: 'neutral' },
]
</script>

<template>
  <div ref="lab" class="k2 lab">
    <header class="lab__head">
      <div>
        <h1 class="lab__title">视觉方向 v2 · 完整 token 与组件</h1>
        <p class="lab__note">
          这是一套独立的设计 token：颜色、排版、间距、圆角、阴影、密度、动效全部重新定义，不引用现有
          v1 的任何变量。下面是 token 本身，以及用它拼出来的业务组件；现有页面与样式一行没改。
        </p>
      </div>
      <button type="button" class="k2-btn k2-btn--ghost" @click="dark = !dark">
        <i :class="dark ? 'mdi mdi-weather-sunny' : 'mdi mdi-weather-night'" />
        {{ dark ? '看亮色' : '看暗色' }}
      </button>
    </header>

    <section class="lab__sec">
      <h2 class="lab__h2">颜色 · 中性阶与表面</h2>
      <div class="sw sw--neutral">
        <div v-for="k in neutral" :key="k" class="sw__item">
          <span class="sw__chip" :style="{ background: `var(--k2-n-${k})` }" />
          <span class="sw__label">n{{ k }}</span>
        </div>
      </div>
      <div class="sw">
        <div v-for="s in surfaceSwatches" :key="s.name" class="sw__item">
          <span class="sw__chip sw__chip--wide" :style="{ background: `var(${s.v})` }" />
          <span class="sw__label">{{ s.name }}</span>
        </div>
      </div>
      <div class="sw">
        <div v-for="s in brandSwatches" :key="s.name" class="sw__item">
          <span class="sw__chip sw__chip--wide" :style="{ background: `var(${s.v})` }" />
          <span class="sw__label">{{ s.name }}</span>
        </div>
      </div>
      <div class="sw">
        <div v-for="t in textSwatches" :key="t.name" class="sw__item">
          <span class="sw__chip sw__chip--wide" :style="{ background: `var(${t.v})` }" />
          <span class="sw__label">{{ t.name }}</span>
        </div>
      </div>
      <div class="sw sw--semantic">
        <div v-for="s in semantic" :key="s" class="sw__item sw__item--sem">
          <span class="sw__chip" :style="{ background: `var(--k2-c-${s})` }" />
          <span class="sw__chip" :style="{ background: `var(--k2-c-${s}-soft)` }" />
          <span
            class="sw__chip sw__chip--ink"
            :style="{ background: `var(--k2-c-${s}-soft)`, color: `var(--k2-c-${s}-ink)` }"
            >Aa</span
          >
          <span class="sw__label">{{ s }}</span>
        </div>
      </div>
      <div class="sw">
        <div v-for="s in stateSwatches" :key="s.name" class="sw__item">
          <span class="sw__chip sw__chip--wide" :style="{ background: `var(${s.v})` }" />
          <span class="sw__label">{{ s.name }}</span>
        </div>
      </div>
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">排版 · 字号 / 行高 / 字重</h2>
      <div class="ramp">
        <div v-for="t in typeRamp" :key="t.name" class="ramp__row">
          <span class="ramp__meta">{{ t.name }}</span>
          <span :style="{ fontSize: `var(${t.v})`, fontWeight: `var(${t.w})` }">{{
            t.sample
          }}</span>
        </div>
      </div>
      <div class="lab__cols">
        <div>
          <div class="lab__h3">行高</div>
          <div
            v-for="l in leadingRamp"
            :key="l.name"
            class="ramp__line"
            :style="{ lineHeight: `var(${l.v})` }"
          >
            <span class="ramp__meta">{{ l.name }}</span>
            <span>同一段文字在不同行高下的呼吸感，正文默认走 snug。</span>
          </div>
        </div>
        <div>
          <div class="lab__h3">字重</div>
          <div v-for="w in weightRamp" :key="w.name" class="ramp__row">
            <span class="ramp__meta">{{ w.name }}</span>
            <span :style="{ fontWeight: `var(${w.v})`, fontSize: 'var(--k2-fs-bodyLg)' }">
              采集成功率 97.6%
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">间距 · 圆角 · 阴影 · 动效</h2>
      <div class="scale">
        <div v-for="s in spaceSteps" :key="s.n" class="scale__item">
          <span
            class="scale__bar"
            :style="{ blockSize: `var(${s.v})`, inlineSize: `var(${s.v})` }"
          />
          <span class="sw__label">{{ s.n }} · {{ s.px }}</span>
        </div>
      </div>
      <div class="scale">
        <div v-for="r in radiusSteps" :key="r.name" class="scale__item">
          <span class="scale__box" :style="{ borderRadius: `var(${r.v})` }" />
          <span class="sw__label">{{ r.label }}</span>
        </div>
      </div>
      <div class="scale">
        <div v-for="s in shadowSteps" :key="s.name" class="scale__item">
          <span class="scale__box scale__box--white" :style="{ boxShadow: `var(${s.v})` }" />
          <span class="sw__label">{{ s.label }}</span>
        </div>
      </div>
      <div class="sw">
        <div v-for="m in motionSteps" :key="m.label" class="sw__item">
          <span class="sw__label">{{ m.label }}</span>
        </div>
      </div>
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">控件尺寸</h2>
      <div class="lab__controls">
        <button type="button" class="k2-btn k2-btn--primary">
          默认按钮 {{ px(V2_DENSITY.controlH) }}
        </button>
        <button type="button" class="k2-btn k2-btn--ghost k2-btn--sm">
          小按钮 {{ px(V2_DENSITY.controlHSm) }}
        </button>
        <input class="k2-input" :placeholder="`输入框 ${px(V2_DENSITY.fieldH)}`" />
        <button
          type="button"
          class="k2-btn k2-btn--ghost"
          :style="{ blockSize: 'var(--k2-touch-h)' }"
        >
          触摸端最小点击区 {{ px(V2_DENSITY.touchH) }}
        </button>
      </div>
      <div class="k2-card k2-card--flat k2-card--sm lab__gap-top">
        <div class="k2-rows">
          <div class="k2-row k2-t-neutral">
            <span class="k2-tile k2-tile--sm"><i class="mdi mdi-star" /></span>
            <span class="k2-row__main">
              <span class="k2-row__title">列表行高 {{ px(V2_DENSITY.rowH) }}</span>
              <span class="k2-row__sub">行高与图标容器都比 v1 放大，换来的是一眼能看清</span>
            </span>
            <span class="k2-row__side"><i class="mdi mdi-chevron-right" /></span>
          </div>
        </div>
      </div>
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">状态 · 加载 · 进度 · 高亮</h2>
      <div class="lab__cols">
        <div>
          <div class="lab__h3">键盘焦点环</div>
          <div class="lab__controls">
            <button type="button" class="k2-btn k2-btn--primary k2-focus-demo">焦点在按钮上</button>
            <input class="k2-input k2-focus-demo" placeholder="焦点在输入框上" />
          </div>
          <p class="lab__note">
            实际页面里只在键盘 Tab 到时出现（:focus-visible），这里摊开看得见。
          </p>
        </div>
        <div>
          <div class="lab__h3">禁用态</div>
          <div class="lab__controls">
            <button type="button" class="k2-btn k2-btn--disabled">不能点的按钮</button>
            <input class="k2-input" disabled placeholder="不能填的输入框" />
          </div>
          <p class="lab__note">底色与文字各用一个专门的色，不靠整体降透明度，字不会糊。</p>
        </div>
      </div>
      <div class="lab__cols lab__gap-top">
        <div>
          <div class="lab__h3">加载骨架</div>
          <AppSkeleton variant="list" />
        </div>
        <div>
          <div class="lab__h3">进度与占比</div>
          <div class="lab__bars">
            <div class="k2-t-success">
              <div class="k2-track"><div class="k2-track__fill" style="inline-size: 92%" /></div>
              <span class="sw__label">采集成功率 92%</span>
            </div>
            <div class="k2-t-info">
              <div class="k2-track"><div class="k2-track__fill" style="inline-size: 64%" /></div>
              <span class="sw__label">投递成功率 64%</span>
            </div>
            <div class="k2-t-warning">
              <div class="k2-track"><div class="k2-track__fill" style="inline-size: 28%" /></div>
              <span class="sw__label">失败占比 28%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="lab__gap-top">
        <div class="lab__h3">关联高亮（桌面端：点一项，同组其他项一起亮）</div>
        <div class="k2-card k2-card--flat k2-card--sm">
          <div class="k2-rows">
            <div class="k2-row k2-t-primary">
              <span class="k2-tile k2-tile--sm"><i class="mdi mdi-rss" /></span>
              <span class="k2-row__main">
                <span class="k2-row__title"><span class="k2-mark">Hacker News 榜单更新</span></span>
                <span class="k2-row__sub">命中关键词：Rust</span>
              </span>
              <span class="k2-row__side">12:40</span>
            </div>
            <div class="k2-row k2-t-neutral">
              <span class="k2-tile k2-tile--sm"><i class="mdi mdi-web" /></span>
              <span class="k2-row__main">
                <span class="k2-row__title">少数派新文章</span>
                <span class="k2-row__sub">同一分组里的其他事件</span>
              </span>
              <span class="k2-row__side">11:02</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">图标尺寸</h2>
      <div class="sw">
        <div v-for="i in iconSteps" :key="i.name" class="sw__item">
          <span class="sw__chip sw__chip--wide" style="display: grid; place-items: center">
            <i class="mdi" :class="[i.icon, i.cls]" />
          </span>
          <span class="sw__label">{{ i.name }}</span>
        </div>
      </div>
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">卡片 · 正反面与翻面（发现 / 监听 / 动作）</h2>
      <p class="lab__note">
        翻面只认卡脚右下角那个按钮（三根竖线，看数据），卡片本身点不动；正反面同一高度。卡面不放开关：编辑、停用
        / 启用、删除都收在右上角小菜单里，卡面只显示启用状态；菜单点空白处或按 Esc
        都会收。卡片正文中文一律和标题一样是 sans，等宽只留给 URL
        和路由这类机器串。采集计划给人话（每 30 分钟、每周一
        09:00），认不出的写「自定义时间」并把表达式放进
        tooltip，下一行单独写下次采集时间。监听卡关键词用 tag 摆（必须包含 / 包含任意 + 关键词 +
        收起数量），模式跟随时只写「跟随全局」。
      </p>
      <CardSamples />
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">分组面板与通知渠道</h2>
      <p class="lab__note">
        分组头给名称、简介、三列计数与启停；三列是发现 / 监听 / 动作，列底是新增。
      </p>
      <GroupSamples />
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">设置页控件</h2>
      <p class="lab__note">分线可拖动，排除词可增删，主题三态（亮 / 暗 / 跟随系统）用模式图标。</p>
      <FormSamples />
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">通用零件（页面、卡片与弹窗共用）</h2>
      <p class="lab__note">
        按钮、图标按钮、芯片、图标容器、提示条、开关、列表行、卡片零件、数值、标签页、菜单、空态、骨架、弹窗骨架、图标尺寸各摆一件。真实页面与弹窗只拼这些零件，不再各写一套。
      </p>
      <PartSamples />
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">App 组件（表单与页面零件）</h2>
      <p class="lab__note">
        表单类控件在生产里只出现在弹窗表单里，这里按弹窗宽度与真实排布摆；页面级零件按各自真实用法单独摆。
      </p>
      <AppShowcase />
    </section>

    <section class="lab__sec">
      <h2 class="lab__h2">芯片、按钮与卡片状态</h2>
      <div class="lab__controls">
        <span v-for="c in chips" :key="c.text" class="k2-chip" :class="`k2-t-${c.tone}`">
          <span class="k2-chip__dot" />{{ c.text }}
        </span>
        <span class="k2-chip k2-t-neutral">中性</span>
        <button type="button" class="k2-btn k2-btn--primary">
          <i class="mdi mdi-play" />立即执行
        </button>
        <button type="button" class="k2-btn k2-btn--ghost">编辑</button>
        <button type="button" class="k2-link">查看全部<i class="mdi mdi-chevron-right" /></button>
      </div>
      <div class="k2-grid lab__gap-top">
        <article class="k2-card k2-card--current k2-t-primary">
          <div class="k2-card__head">
            <span class="k2-tile"><i class="mdi mdi-check-circle" /></span>
            <span class="k2-card__heading">
              <span class="k2-card__title">选中态</span>
              <span class="k2-card__sub">品牌色描边 + 抬起一档阴影</span>
            </span>
          </div>
        </article>
        <article class="k2-card k2-card--flat k2-t-neutral">
          <div class="k2-card__head">
            <span class="k2-tile"><i class="mdi view-dashboard-outline-outline" /></span>
            <span class="k2-card__heading">
              <span class="k2-card__title">平铺态</span>
              <span class="k2-card__sub">指标卡与列表容器用这一档，不抢焦点</span>
            </span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.lab {
  padding-block: var(--k2-page-pad) var(--k2-s-10);
  max-inline-size: var(--k2-w-wide);
  margin-inline: auto;
  color: var(--k2-c-text);
}

.lab__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--k2-s-6);
  margin-block-end: var(--k2-s-7);
}

.lab__title {
  margin: 0 0 var(--k2-s-2);
  font-size: var(--k2-fs-h1);
  font-weight: var(--k2-fw-bold);
  line-height: var(--k2-lh-tight);
}

.lab__sec {
  margin-block-end: var(--k2-s-9);
}

.lab__h2 {
  margin: 0 0 var(--k2-s-4);
  font-size: var(--k2-fs-subtitle);
  font-weight: var(--k2-fw-semibold);
}

/* ---------- token 色卡 ---------- */
.sw {
  display: flex;
  flex-wrap: wrap;
  gap: var(--k2-s-4);
  margin-block-end: var(--k2-s-3);
}

.sw--neutral {
  gap: var(--k2-s-2);
}

.sw__item {
  display: flex;
  flex-direction: column;
  gap: var(--k2-s-1);
  align-items: center;
}

.sw__item--sem {
  flex-direction: row;
  align-items: center;
  gap: var(--k2-s-2);
}

.sw__chip {
  inline-size: 44px;
  block-size: 44px;
  border-radius: var(--k2-r-sm);
  border: 1px solid var(--k2-c-border);
}

.sw__chip--wide {
  inline-size: 72px;
}

.sw__chip--ink {
  inline-size: auto;
  block-size: 44px;
  display: inline-grid;
  place-items: center;
  padding-inline: var(--k2-s-3);
  font-size: var(--k2-fs-body);
  font-weight: var(--k2-fw-semibold);
  border: 0;
}

.sw__label {
  color: var(--k2-c-text-muted);
  font-size: var(--k2-fs-caption);
}

/* ---------- 字阶 / 间距 / 圆角 / 阴影标尺 ---------- */
.ramp {
  display: flex;
  flex-direction: column;
  gap: var(--k2-s-2);
}

.ramp__row {
  display: flex;
  align-items: baseline;
  gap: var(--k2-s-4);
  min-block-size: 40px;
}

.ramp__meta {
  flex: none;
  inline-size: 150px;
  color: var(--k2-c-text-faint);
  font-size: var(--k2-fs-caption);
}

.ramp__line {
  display: flex;
  gap: var(--k2-s-4);
  margin-block-end: var(--k2-s-3);
}

.scale {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--k2-s-4);
  margin-block-end: var(--k2-s-5);
}

.scale__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--k2-s-2);
}

.scale__bar {
  display: block;
  border-radius: var(--k2-r-xs);
  background: var(--k2-c-primary-soft);
  border: 1px solid var(--k2-c-primary);
}

.scale__box {
  display: block;
  inline-size: 56px;
  block-size: 56px;
  background: var(--k2-c-surface3);
  border: 1px solid var(--k2-c-border);
}

.scale__box--white {
  background: var(--k2-c-surface);
  border-color: var(--k2-c-border-soft);
}

.k2-card.is-off {
  opacity: 0.62;
}

.lab__note {
  margin: var(--k2-s-2) 0 0;
  font-size: var(--k2-fs-caption);
  color: var(--k2-c-text-muted);
}

.lab__bars {
  display: flex;
  flex-direction: column;
  gap: var(--k2-s-4);
}

@media (max-width: 900px) {
  .lab {
    padding: var(--k2-page-pad-mobile);
  }
  .ramp__meta {
    inline-size: 110px;
  }
}
</style>
