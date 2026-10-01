<!-- Design System 预览页（开发用）
     路径：/design（只在开发环境注册，生产构建不会打包这个页面）
     作用：直接看 Foundation 与核心组件在桌面/手机两种宽度下的真实渲染，
     不再靠文字描述决定视觉。页面自身只用 App* 样式类与 Vuetify，不写任何色值。 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useDisplay } from 'vuetify'

import { findTheme, THEMES } from '@/design/tokens'
import { designGroups, spaceItems, type DesignTokenGroup } from '@/design/preview'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
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
  if (w >= 1440) return 'xl（≥1440 宽屏）'
  if (w >= 1280) return 'lg（1280–1439）'
  if (w >= 900) return 'md（900–1279 桌面布局）'
  if (w >= 600) return 'sm（600–899 大手机）'
  return 'xs（<600 手机）'
})

const dialogOpen = ref(false)
const switchOn = ref(true)
const textField = ref('')
const selectValue = ref('standard')
const showToast = ref(false)

function flashToast(): void {
  showToast.value = true
  window.setTimeout(() => (showToast.value = false), 2200)
}

// 主题一变，色值清单跟着变（数据全部来自 tokens，页面不另存一份）
const groups = computed<DesignTokenGroup[]>(() => designGroups(findTheme(ui.theme) ?? THEMES[0]))
</script>

<template>
  <div class="app-page app-page--wide" data-test="design-page">
    <div class="app-page__head">
      <div>
        <h1 class="app-page__title">Design System 预览</h1>
        <p class="app-page__note">
          开发/验收页面，不在产品导航里。下面的色值、字号、间距、圆角全部来自
          <span class="font-mono">design/tokens</span>，页面里不写这些数值。
        </p>
      </div>
      <div class="app-page__actions">
        <span class="app-tag font-mono">
          视口 {{ viewport }}px · {{ activeBreakpoint }} · Vuetify {{ breakpointName }}
        </span>
      </div>
    </div>

    <!-- Foundation：Token 一览 -->
    <section class="app-section" data-test="design-foundation">
      <div class="app-section__head">
        <h2 class="app-section__title">Foundation</h2>
        <span class="app-section__note">色值 / 字号 / 间距 / 圆角 / 阴影，随主题切换实时变化</span>
      </div>

      <div class="app-stack">
        <div v-for="group in groups" :key="group.title" class="app-card">
          <div class="app-card__head">
            <span class="app-card__title">{{ group.title }}</span>
            <span class="app-card__note">{{ group.note }}</span>
          </div>
          <div class="app-card__body">
            <div class="ds-token-grid">
              <div v-for="item in group.items" :key="item.name" class="ds-token">
                <div
                  v-if="group.kind === 'color'"
                  class="ds-token__swatch"
                  :style="{ background: item.preview ?? item.value }"
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
                <span
                  v-else-if="group.kind === 'type'"
                  class="ds-token__sample"
                  :style="item.style"
                >
                  示例 Aa 123
                </span>
                <span v-else class="ds-token__sample">{{ item.value }}</span>
                <span class="ds-token__name font-mono">{{ item.name }}</span>
                <span class="ds-token__value font-mono">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 核心组件 -->
    <section class="app-section" data-test="design-components">
      <div class="app-section__head">
        <h2 class="app-section__title">Core Components</h2>
        <span class="app-section__note">第一版只做最常用的几个</span>
      </div>

      <div class="ds-cols">
        <!-- Button -->
        <div class="app-card">
          <div class="app-card__head"><span class="app-card__title">Button</span></div>
          <div class="app-card__body app-stack">
            <div class="app-row">
              <button class="app-btn app-btn--primary">主要操作</button>
              <button class="app-btn">次要操作</button>
              <button class="app-btn app-btn--ghost">次要文字</button>
              <button class="app-btn app-btn--danger">删除</button>
            </div>
            <div class="app-row">
              <button class="app-btn app-btn--sm">小号按钮</button>
              <button class="app-btn app-btn--sm app-btn--primary">小号主要</button>
              <button class="app-btn" disabled>禁用</button>
            </div>
            <div class="app-hint app-hint--info">
              移动端（&lt;900）按钮自动抬到 {{ '44px' }} 触摸高度，见当前视口。
            </div>
          </div>
        </div>

        <!-- Input / Select / Switch -->
        <div class="app-card">
          <div class="app-card__head">
            <span class="app-card__title">Input / Select / Switch</span>
          </div>
          <div class="app-card__body app-stack">
            <div class="app-field">
              <label class="app-field__label">RSSHub 实例地址</label>
              <v-text-field v-model="textField" placeholder="http://192.168.5.100:1200" />
              <span class="app-field__hint">只填实例根地址，路由路径在发现里单独填。</span>
            </div>
            <div class="app-field">
              <label class="app-field__label">判定模式</label>
              <v-select
                v-model="selectValue"
                :items="[
                  { title: '自带算法', value: 'standard' },
                  { title: '灰区交给模型复核', value: 'assisted' },
                ]"
              />
              <span class="app-field__error" v-if="false">错误态示例</span>
            </div>
            <div class="app-switch-row">
              <div>
                <div class="app-field__label">启用这个分组</div>
                <div class="app-field__hint">关掉后不再采集，也不会推送。</div>
              </div>
              <v-switch v-model="switchOn" color="primary" hide-details />
            </div>
          </div>
        </div>

        <!-- Status / Badge / Tag -->
        <div class="app-card">
          <div class="app-card__head">
            <span class="app-card__title">Status / Badge / Tag</span>
          </div>
          <div class="app-card__body app-stack">
            <div class="app-row" style="flex-wrap: wrap">
              <span class="app-status app-status--action app-status--ok">
                <span class="app-status__dot" />试抓成功，抓到 100 条
              </span>
              <span class="app-status app-status--warn"
                ><span class="app-status__dot" />连通但没抓</span
              >
              <span class="app-status app-status--err"
                ><span class="app-status__dot" />连接失败</span
              >
              <span class="app-status app-status--busy">
                <span class="app-status__dot" />测试中…
              </span>
              <span class="app-status"><span class="app-status__dot" />还没试过</span>
            </div>
            <div class="app-row" style="flex-wrap: wrap">
              <span class="app-tag app-tag--accent">RSSHub 路由</span>
              <span class="app-tag">网页</span>
              <span class="app-tag app-tag--ok">已启用</span>
              <span class="app-tag app-tag--err">已停用</span>
              <span class="app-badge">2 发现</span>
              <span class="app-badge">1 监听</span>
            </div>
          </div>
        </div>

        <!-- Card / Surface -->
        <div class="app-card">
          <div class="app-card__head">
            <span class="app-card__title">Card / Surface</span>
            <span class="app-card__note">靠边框与底色分层，不用阴影</span>
            <span class="app-spacer" />
            <button class="app-btn app-btn--sm">操作</button>
          </div>
          <div class="app-card__body app-stack">
            <div class="app-surface">
              内嵌面板（app-surface）：卡片里再分一层时用它，避免第二层边框。
            </div>
            <div class="app-empty">
              <span class="app-empty__title">还没有分组</span>
              <span class="app-empty__note">先建一个——一个分组就是一件你关注的事。</span>
            </div>
            <div class="app-card__foot" style="border: 0; padding: 0">
              <span class="app-card__note">卡足放次要操作与说明</span>
              <span class="app-spacer" />
              <button class="app-btn app-btn--sm app-btn--danger">删除</button>
            </div>
          </div>
        </div>

        <!-- Hint / Toast -->
        <div class="app-card">
          <div class="app-card__head"><span class="app-card__title">Hint / Toast</span></div>
          <div class="app-card__body app-stack">
            <div class="app-hint app-hint--info">普通说明</div>
            <div class="app-hint app-hint--ok">保存成功</div>
            <div class="app-hint app-hint--warn">这个动作还没选渠道，命中后不会发出去</div>
            <div class="app-hint app-hint--err">令牌不对，Telegram 返回 401</div>
            <div class="app-row">
              <button class="app-btn app-btn--sm" @click="flashToast">触发一次 Toast</button>
              <span class="app-card__note">Toast 组件在 P1 落地，这里先看视觉</span>
            </div>
          </div>
        </div>

        <!-- Skeleton / Loading -->
        <div class="app-card">
          <div class="app-card__head"><span class="app-card__title">Loading / Skeleton</span></div>
          <div class="app-card__body app-stack">
            <div class="app-skeleton app-skeleton--title" style="width: 40%" />
            <div class="app-skeleton app-skeleton--text" style="width: 80%" />
            <div class="app-skeleton app-skeleton--text" style="width: 65%" />
            <div class="app-skeleton app-skeleton--block" />
          </div>
        </div>

        <!-- Dialog -->
        <div class="app-card">
          <div class="app-card__head"><span class="app-card__title">Dialog</span></div>
          <div class="app-card__body app-stack">
            <div class="app-card__note">桌面居中弹窗；移动端在 P1 会换成底部抽屉。</div>
            <div class="app-row">
              <button class="app-btn app-btn--sm app-btn--primary" @click="dialogOpen = true">
                打开弹窗
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 页面宽度策略 -->
    <section class="app-section" data-test="design-page-widths">
      <div class="app-section__head">
        <h2 class="app-section__title">页面宽度策略</h2>
        <span class="app-section__note">AppPage 的能力，不写死一个全局 max-width</span>
      </div>
      <div class="app-card">
        <div class="app-card__body app-stack">
          <div v-for="w in ['narrow', 'default', 'wide', 'full']" :key="w" class="ds-width">
            <span class="app-tag font-mono">app-page--{{ w }}</span>
            <div class="ds-width__bar" :class="`ds-width__bar--${w}`" />
            <span class="app-card__note font-mono">
              {{ w === 'full' ? '不限宽' : `max-width: var(--k-page-${w})` }}
            </span>
          </div>
          <div class="app-hint app-hint--info">
            建议：设置、表单用 narrow；普通页面 default；仪表盘与多列配置用 wide；确实需要占满时用
            full。具体像素待真机截图确认。
          </div>
        </div>
      </div>
    </section>

    <!-- 间距对照 -->
    <section class="app-section" data-test="design-space">
      <div class="app-section__head">
        <h2 class="app-section__title">间距阶梯</h2>
        <span class="app-section__note">只用这七档，不再出现随手写的 px</span>
      </div>
      <div class="app-card">
        <div class="app-card__body app-stack">
          <div v-for="item in spaceItems()" :key="item.name" class="ds-space">
            <span class="app-badge">{{ item.name }}</span>
            <span class="ds-space__bar" :style="{ width: item.value }" />
            <span class="app-card__note font-mono">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </section>

    <v-dialog v-model="dialogOpen" max-width="460">
      <v-card class="app-overlay" data-test="design-dialog">
        <div class="app-card__head"><span class="app-card__title">弹窗标题</span></div>
        <div class="app-card__body app-stack">
          <div class="app-field">
            <label class="app-field__label">名称</label>
            <v-text-field placeholder="分组名称" />
          </div>
          <div class="app-hint app-hint--info">弹窗只放这一个表单，操作在底部。</div>
        </div>
        <div class="app-card__foot">
          <button class="app-btn app-btn--ghost" @click="dialogOpen = false">取消</button>
          <span class="app-spacer" />
          <button class="app-btn app-btn--primary" @click="dialogOpen = false">保存</button>
        </div>
      </v-card>
    </v-dialog>

    <transition name="ds-toast">
      <div v-if="showToast" class="ds-toast app-overlay" data-test="design-toast">保存成功</div>
    </transition>
  </div>
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

/* 手机：色值清单一律横排一行，省掉大面积空白，页面短一半 */
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
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
  }

  .ds-token__bar,
  .ds-token__radius,
  .ds-token__shadow {
    width: 36px;
    flex: 0 0 36px;
  }

  .ds-token__radius,
  .ds-token__shadow {
    height: 24px;
  }

  .ds-token__name {
    flex: 0 0 auto;
  }

  .ds-token__value {
    margin-left: auto;
    text-align: right;
  }
}

.ds-token__name {
  font-size: var(--k-fs-label);
  color: var(--k-text);
}

.ds-token__value {
  font-size: var(--k-fs-label);
  color: var(--k-text-faint);
  word-break: break-all;
}

.ds-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--k-space-3);
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
  transform: translateX(-50%);
  padding: var(--k-space-2) var(--k-space-4);
  font-size: var(--k-fs-body);
  z-index: 40;
}

.ds-toast-enter-active,
.ds-toast-leave-active {
  transition: opacity 0.18s ease;
}

.ds-toast-enter-from,
.ds-toast-leave-to {
  opacity: 0;
}
</style>
