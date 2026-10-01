<!-- Design System 预览页（开发用）
     路径：/design（只在开发环境注册，生产构建不会打包这个页面）
     作用：用真实 App* 组件把 Foundation 与组件状态矩阵摊开，桌面/手机两种宽度下直接看渲染结果。
     页面自身只用 App* 与 Vuetify，不写任何色值、间距、圆角。 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useDisplay } from 'vuetify'

import { findTheme, THEMES } from '@/design/tokens'
import { designGroups, spaceItems } from '@/design/preview'
import ActionCard from '@/components/biz/ActionCard.vue'
import ChannelCard from '@/components/biz/ChannelCard.vue'
import CronPicker from '@/components/biz/CronPicker.vue'
import FormDialog from '@/components/biz/FormDialog.vue'
import SourceCard from '@/components/biz/SourceCard.vue'
import { useUiStore } from '@/stores/ui'
import DesignGroup from '@/views/design/DesignGroup.vue'

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

// 主题一变，色值清单跟着变（数据全部来自 tokens，页面不另存一份）
const groups = computed(() => designGroups(findTheme(ui.theme) ?? THEMES[0]))

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

const selectItems = [
  { title: '自带算法', value: 'standard' },
  { title: '灰区交给模型复核', value: 'assisted' },
]
</script>

<template>
  <AppPage
    width="wide"
    title="Design System 预览"
    note="开发/验收页面，不在产品导航里。下面的色值、字号、间距、圆角全部来自 design/tokens，组件全部来自 App* 组件层，页面里不写这些数值。"
  >
    <template #actions>
      <span class="app-tag font-mono" data-test="design-viewport">
        视口 {{ viewport }}px · {{ activeBreakpoint }} · Vuetify {{ breakpointName }}
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
                示例 Aa 123
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
        title="Foundation · Spacing 阶梯"
        note="只用这七档，不再出现随手写的 px"
        :open="open['Foundation · Spacing 阶梯'] ?? false"
        @update:open="(value) => setOpen('Foundation · Spacing 阶梯', value)"
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
        note="状态：default / hover / active / disabled / loading / danger"
        :open="open['AppButton'] ?? false"
        @update:open="(value) => setOpen('AppButton', value)"
      >
        <div class="ds-cols">
          <AppCard title="变体与尺寸" note="hover 与 active 用鼠标或手指直接试">
            <div class="app-stack">
              <div class="app-row ds-wrap">
                <AppButton variant="primary">主要操作</AppButton>
                <AppButton>次要操作</AppButton>
                <AppButton variant="ghost">弱化操作</AppButton>
                <AppButton variant="danger">删除</AppButton>
              </div>
              <div class="app-row ds-wrap">
                <AppButton size="sm" variant="primary">小号主要</AppButton>
                <AppButton size="sm">小号</AppButton>
                <AppButton size="sm" variant="ghost">小号弱化</AppButton>
              </div>
            </div>
          </AppCard>

          <AppCard title="不可用与加载" note="loading 会自动禁用，避免重复提交">
            <div class="app-stack">
              <div class="app-row ds-wrap">
                <AppButton disabled>禁用</AppButton>
                <AppButton variant="primary" disabled>禁用主要</AppButton>
                <AppButton loading>保存中</AppButton>
                <AppButton variant="primary" loading>提交中</AppButton>
              </div>
              <AppButton variant="primary" block>撑满宽度（弹窗底部与移动端）</AppButton>
            </div>
          </AppCard>
        </div>
      </DesignGroup>

      <!-- AppInput / AppSelect -->
      <DesignGroup
        title="AppInput / AppSelect"
        note="状态：default / focus / filled / disabled / readonly / error / 校验提示"
        :open="open['AppInput / AppSelect'] ?? false"
        @update:open="(value) => setOpen('AppInput / AppSelect', value)"
      >
        <div class="ds-cols">
          <AppCard title="AppInput" note="focus 点进去看；filled 就是有值的样子">
            <div class="app-stack">
              <AppInput
                v-model="inputValue"
                label="RSSHub 实例地址"
                hint="只填实例根地址，路由路径在发现里单独填"
              />
              <AppInput
                :model-value="''"
                label="空值（默认态）"
                placeholder="http://192.168.5.100:1200"
              />
              <AppInput
                :model-value="'已填好的值'"
                label="只读"
                readonly
                hint="这条来自模板，不能改"
              />
              <AppInput :model-value="'x'" label="禁用" disabled />
              <AppInput
                :model-value="'http://192.168.5.100:9999'"
                label="错误态"
                error="连不上这个地址（连接被拒绝）"
              />
              <AppInput
                v-model="inputValue"
                label="带动作"
                hint="试抓这类动作放在输入框右侧"
                action-label="试抓"
              />
            </div>
          </AppCard>

          <AppCard title="AppSelect" note="选项较少时用下拉，别用长列表占地方">
            <div class="app-stack">
              <AppSelect
                v-model="selectValue"
                label="判定模式"
                :items="selectItems"
                hint="灰区的处理方式"
              />
              <AppSelect
                :model-value="null"
                label="默认态"
                :items="selectItems"
                placeholder="请选择"
              />
              <AppSelect :model-value="'standard'" label="禁用" :items="selectItems" disabled />
              <AppSelect :model-value="'standard'" label="只读" :items="selectItems" readonly />
              <AppSelect
                :model-value="'bad'"
                label="错误态"
                :items="selectItems"
                error="这个模式已经不存在了"
              />
            </div>
          </AppCard>
        </div>
      </DesignGroup>

      <!-- AppSwitch -->
      <DesignGroup
        title="AppSwitch"
        note="状态：on / off / disabled"
        :open="open['AppSwitch'] ?? false"
        @update:open="(value) => setOpen('AppSwitch', value)"
      >
        <AppCard>
          <div class="app-stack">
            <AppSwitch v-model="switchOn" label="启用这个分组" hint="关掉后不再采集，也不会推送" />
            <AppSwitch v-model="readonlySwitch" label="开关打开的样子" hint="on" />
            <AppSwitch v-model="disabledSwitch" label="禁用" hint="没有权限时用这一态" disabled />
          </div>
        </AppCard>
      </DesignGroup>

      <!-- AppStatus -->
      <DesignGroup
        title="AppStatus"
        note="状态色只表达状态：success / warning / error / info / neutral（另有 busy 进行中）"
        :open="open['AppStatus'] ?? false"
        @update:open="(value) => setOpen('AppStatus', value)"
      >
        <AppCard>
          <div class="app-stack">
            <div class="app-row ds-wrap">
              <AppStatus tone="ok">连通，抓到 100 条</AppStatus>
              <AppStatus tone="warn">连通但没抓到内容</AppStatus>
              <AppStatus tone="err">连接失败</AppStatus>
              <AppStatus tone="info">还没试过</AppStatus>
              <AppStatus tone="neutral">已停用</AppStatus>
              <AppStatus busy>测试中…</AppStatus>
            </div>
            <div class="app-row ds-wrap">
              <AppStatus tone="ok" action>点一下试抓（action 态）</AppStatus>
              <AppStatus tone="neutral" :dot="false">不带状态点的纯文字徽标</AppStatus>
            </div>
            <div class="app-row ds-wrap">
              <span class="app-tag app-tag--accent">RSSHub 路由</span>
              <span class="app-tag">网页</span>
              <span class="app-tag app-tag--ok">已启用</span>
              <span class="app-tag app-tag--err">已停用</span>
              <span class="app-badge">2 发现</span>
              <span class="app-badge">1 监听</span>
            </div>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- AppCard -->
      <DesignGroup
        title="AppCard"
        note="状态：default / interactive（整卡可点）/ disabled"
        :open="open['AppCard'] ?? false"
        @update:open="(value) => setOpen('AppCard', value)"
      >
        <div class="ds-cols">
          <AppCard title="普通卡片" note="标题 + 说明 + 内容 + 卡足">
            <div class="app-stack">
              <div class="app-surface">内嵌面板：卡片里再分一层时用它，别叠第二层边框</div>
              <div class="app-hint app-hint--info">卡片靠细边框与底色分层，不用阴影</div>
            </div>
            <template #footer>
              <span class="app-card__note">卡足放次要操作与说明</span>
              <span class="app-spacer" />
              <AppButton size="sm" variant="danger">删除</AppButton>
            </template>
          </AppCard>

          <div class="app-stack">
            <AppCard title="可点卡片" note="点整张卡进编辑" interactive>
              <span class="app-card__note">这一态用于配置页：整卡可点，键盘 Enter 也能进</span>
            </AppCard>
            <AppCard title="不可用" note="没权限或服务未连通时" disabled>
              <span class="app-card__note">灰掉，点不动</span>
            </AppCard>
          </div>
        </div>
      </DesignGroup>

      <!-- AppDialog -->
      <DesignGroup
        title="AppDialog"
        note="状态：normal / loading / error / 移动端底部抽屉（<900px 自动贴底）"
        :open="open['AppDialog'] ?? false"
        @update:open="(value) => setOpen('AppDialog', value)"
      >
        <AppCard>
          <div class="app-stack">
            <div class="app-row ds-wrap">
              <AppButton size="sm" variant="primary" @click="dialog = 'normal'">普通弹窗</AppButton>
              <AppButton size="sm" @click="dialog = 'loading'">加载中</AppButton>
              <AppButton size="sm" variant="danger" @click="dialog = 'error'">错误</AppButton>
            </div>
            <div class="app-hint app-hint--info">
              在手机上打开它会从底部升起（底部抽屉，顶部圆角），桌面上是居中弹窗。关掉可以用右上角、取消按钮或
              Esc。
            </div>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- AppEmptyState -->
      <DesignGroup
        title="AppEmptyState"
        note="两种用法：纯说明 / 带一个动作"
        :open="open['AppEmptyState'] ?? false"
        @update:open="(value) => setOpen('AppEmptyState', value)"
      >
        <div class="ds-cols">
          <AppCard>
            <AppEmptyState
              icon="mdi-tray-arrow-down"
              title="还没有抓过内容"
              note="选一个发现，点试抓看看能拿到什么"
            />
          </AppCard>
          <AppCard>
            <AppEmptyState title="还没有分组" note="一个分组就是一件你关注的事">
              <template #actions>
                <AppButton size="sm" variant="primary">新建分组</AppButton>
              </template>
            </AppEmptyState>
          </AppCard>
        </div>
      </DesignGroup>

      <!-- AppSkeleton -->
      <DesignGroup
        title="AppSkeleton"
        note="版面：text / card / list / page"
        :open="open['AppSkeleton'] ?? false"
        @update:open="(value) => setOpen('AppSkeleton', value)"
      >
        <div class="ds-cols">
          <AppCard title="text 与 card">
            <div class="app-stack">
              <AppSkeleton variant="text" />
              <AppSkeleton variant="card" :rows="2" />
            </div>
          </AppCard>
          <AppCard title="list 与 page">
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
        note="语气：info / ok / warn / err"
        :open="open['AppHint'] ?? false"
        @update:open="(value) => setOpen('AppHint', value)"
      >
        <AppCard>
          <div class="app-stack">
            <AppHint tone="info">普通说明：RSSHub 缓存只有 5 分钟</AppHint>
            <AppHint tone="ok">保存成功</AppHint>
            <AppHint tone="warn">这个动作还没选渠道，命中后不会发出去</AppHint>
            <AppHint tone="err">令牌不对，Telegram 返回 401</AppHint>
            <div class="app-row">
              <AppButton size="sm" @click="flashToast">触发一次 Toast</AppButton>
              <span class="app-card__note">Toast 用 AppHint 的样式浮在底部，避免多一套视觉</span>
            </div>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- AppPage / AppSection -->
      <DesignGroup
        title="AppPage / AppSection"
        note="内容宽度策略与分节：页面只声明用哪一档"
        :open="open['AppPage / AppSection'] ?? false"
        @update:open="(value) => setOpen('AppPage / AppSection', value)"
      >
        <AppCard>
          <div class="app-stack">
            <div v-for="w in ['narrow', 'default', 'wide', 'full']" :key="w" class="ds-width">
              <span class="app-tag font-mono">AppPage :width="{{ w }}"</span>
              <div class="ds-width__bar" :class="`ds-width__bar--${w}`" />
              <span class="app-card__note font-mono">
                {{ w === 'full' ? '不限宽' : `max-width: var(--k-page-${w})` }}
              </span>
            </div>
            <AppHint tone="info">
              设置、表单用 narrow；普通页 default；仪表盘与多列配置 wide；确实要占满时 full。
            </AppHint>
            <AppSection title="AppSection" note="页面内的分节：标题 + 说明 + 右侧操作">
              <template #actions>
                <AppButton size="sm">试抓</AppButton>
              </template>
              <div class="app-surface">分节内容</div>
            </AppSection>
          </div>
        </AppCard>
      </DesignGroup>

      <!-- 业务组件层（P1.5） -->
      <DesignGroup
        title="业务组件 · P1.5"
        note="从页面里沉下来的复用件：表单弹窗外壳、cron 选择器、渠道卡、数据源卡、动作卡"
        :open="open['业务组件 · P1.5'] ?? false"
        @update:open="(value) => setOpen('业务组件 · P1.5', value)"
      >
        <div class="app-stack">
          <AppCard title="FormDialog" note="状态：normal / 保存中(busy) / 错误 / 手机端贴底">
            <div class="app-stack">
              <div class="app-row ds-wrap">
                <AppButton
                  size="sm"
                  variant="primary"
                  data-test="biz-dialog-normal"
                  @click="bizDialog = 'normal'"
                  >打开表单弹窗</AppButton
                >
                <AppButton size="sm" data-test="biz-dialog-busy" @click="bizDialog = 'busy'"
                  >保存中示例</AppButton
                >
                <AppButton
                  size="sm"
                  variant="danger"
                  data-test="biz-dialog-error"
                  @click="bizDialog = 'error'"
                  >保存失败</AppButton
                >
              </div>
              <AppHint tone="info">
                标题、说明、取消/保存、保存中转圈、错误条、手机贴底都在这一个壳里；页面只管往里放字段。
              </AppHint>
            </div>
          </AppCard>

          <AppCard title="CronPicker" note="点输入框展开生成器；表达式不合规时给报错">
            <div class="app-stack">
              <CronPicker v-model="cronDaily" label="定时汇总时间" hint="例如 0 8 * * *" />
              <CronPicker v-model="cronStep" label="每 5 分钟" />
              <CronPicker v-model="cronBad" label="写错的表达式" />
            </div>
          </AppCard>

          <div class="ds-cols">
            <AppCard
              title="ChannelCard"
              note="状态：连通 / 未测 / 有警告 / 不通 / 测试中 / 停用 / 不可用"
            >
              <div class="app-card-grid">
                <ChannelCard
                  name="我的 Telegram"
                  icon="mdi-send"
                  kind-label="Telegram"
                  :enabled="true"
                  tone="ok"
                  status-text="连通"
                  detail="目标会话 1231487971"
                  verified-at="刚刚"
                  :used-by="2"
                />
                <ChannelCard
                  name="企业微信"
                  icon="mdi-account-group-outline"
                  kind-label="企业微信"
                  :enabled="true"
                  tone="neutral"
                  status-text="还没测过"
                  detail="Bot 已配置"
                  :used-by="0"
                />
                <ChannelCard
                  name="微信"
                  icon="mdi-wechat"
                  kind-label="微信"
                  :enabled="false"
                  tone="warn"
                  status-text="出站窗口约 10 分钟"
                  detail="仅双向对话用"
                  :used-by="0"
                />
                <ChannelCard
                  name="Webhook"
                  icon="mdi-webhook"
                  kind-label="自定义"
                  :enabled="true"
                  tone="err"
                  status-text="连接失败"
                  detail="https://example.com/hook"
                  :used-by="1"
                  busy
                />
                <ChannelCard
                  name="没权限的渠道"
                  icon="mdi-lock-outline"
                  kind-label="Telegram"
                  :enabled="true"
                  tone="neutral"
                  status-text="只读"
                  detail="需要管理员权限才能改"
                  :disabled="true"
                />
              </div>
            </AppCard>

            <div class="app-stack">
              <AppCard
                title="SourceCard"
                note="状态：未试过 / 有内容 / 通但空 / 不通 / 抓取中 / 停用"
              >
                <div class="app-card-grid">
                  <SourceCard
                    name="B 站排行榜"
                    icon="mdi-video-outline"
                    kind-label="RSSHub 路由"
                    :enabled="true"
                    target="/bilibili/ranking/all"
                    instance="http://192.168.5.100:1200"
                    frequency="每 30 分钟"
                    tone="ok"
                    status-text="抓到 100 条"
                    :found-item-count="100"
                  />
                  <SourceCard
                    name="刚加的数据源"
                    icon="mdi-rss"
                    kind-label="RSSHub 路由"
                    :enabled="true"
                    target="/github/trending/daily"
                    instance="http://192.168.5.100:1200"
                    frequency="每 1 小时"
                    tone="neutral"
                    status-text="还没抓过"
                  />
                  <SourceCard
                    name="抓得到但没内容"
                    icon="mdi-web"
                    kind-label="网页"
                    :enabled="true"
                    target="https://example.com/blog"
                    frequency="每 6 小时"
                    tone="warn"
                    status-text="连通但没内容"
                    message="路由能打开，但没解析出条目，检查选择器"
                    :found-item-count="0"
                  />
                  <SourceCard
                    name="路由写错了"
                    icon="mdi-rss"
                    kind-label="RSSHub 路由"
                    :enabled="true"
                    target="/bilibili/ranking/dance"
                    instance="http://192.168.5.100:1200"
                    tone="err"
                    status-text="连接失败"
                    message="404：这个路由前缀不存在"
                  />
                  <SourceCard
                    name="已停用的源"
                    icon="mdi-rss"
                    kind-label="RSSHub 路由"
                    :enabled="false"
                    target="/hackernews/best"
                    instance="http://192.168.5.100:1200"
                    frequency="每 30 分钟"
                    tone="neutral"
                    status-text="已停用"
                  />
                </div>
              </AppCard>

              <AppCard title="ActionCard" note="状态：正常 / 定时汇总 / 缺渠道 / 停用">
                <div class="app-card-grid">
                  <ActionCard
                    name="推给 Telegram"
                    icon="mdi-bell-ring-outline"
                    trigger-label="实时推送"
                    channel-name="我的 Telegram"
                    template-name="默认模板"
                    :enabled="true"
                    :referenced-count="1"
                  />
                  <ActionCard
                    name="早报汇总"
                    icon="mdi-clock-outline"
                    trigger-label="定时汇总"
                    cron-expression="0 8 * * *"
                    channel-name="企业微信"
                    template-name="简报模板"
                    :enabled="true"
                    :referenced-count="2"
                  />
                  <ActionCard
                    name="还没选渠道的动作"
                    icon="mdi-bell-off-outline"
                    trigger-label="实时推送"
                    template-name="默认模板"
                    :enabled="true"
                    :referenced-count="1"
                  />
                  <ActionCard
                    name="已停用的动作"
                    icon="mdi-bell-outline"
                    trigger-label="实时推送"
                    channel-name="我的 Telegram"
                    :enabled="false"
                    :referenced-count="0"
                  />
                </div>
              </AppCard>
            </div>
          </div>
        </div>
      </DesignGroup>

      <!-- AppSidebar / AppHeader -->
      <DesignGroup
        title="AppSidebar / AppHeader"
        note="外壳：桌面常驻左栏 + 顶栏；窄屏抽屉 + 底部导航"
        :open="open['AppSidebar / AppHeader'] ?? false"
        @update:open="(value) => setOpen('AppSidebar / AppHeader', value)"
      >
        <AppCard>
          <div class="app-stack">
            <AppHint tone="info">
              你正在看的这个页面的左栏、顶栏与底部导航就是它们。桌上常驻左栏；手机上点左上角汉堡出抽屉，底部五个入口。
            </AppHint>
            <div class="app-row ds-wrap">
              <span class="app-tag font-mono">AppSidebar</span>
              <span class="app-tag font-mono">AppHeader</span>
              <span class="app-tag font-mono">items 同一份，两处渲染</span>
            </div>
          </div>
        </AppCard>
      </DesignGroup>
    </div>

    <AppDialog
      v-model="dialogOpen"
      :title="dialog === 'error' ? '保存失败' : '新建分组'"
      :loading="dialog === 'loading'"
      :error="dialog === 'error' ? '服务器返回 500：数据库写入失败' : undefined"
    >
      <div class="app-stack">
        <AppInput :model-value="''" label="名称" placeholder="例如：AI 圈动态" required />
        <AppSwitch v-model="switchOn" label="立刻启用" hint="关掉就先存着，不采集" />
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="dialog = 'none'">取消</AppButton>
        <span class="app-spacer" />
        <AppButton variant="primary" @click="dialog = 'none'">保存</AppButton>
      </template>
    </AppDialog>

    <FormDialog
      v-model="bizDialogOpen"
      :title="bizDialog === 'error' ? '保存失败' : '新建动作'"
      note="表单弹窗只管字段，标题按钮错误条都由外壳负责"
      :busy="bizDialog === 'busy'"
      :error="bizDialog === 'error' ? '服务器返回 500：数据库写入失败' : undefined"
    >
      <div class="app-stack">
        <AppInput :model-value="''" label="动作名称" placeholder="例如：推给 Telegram" required />
        <CronPicker v-model="cronDaily" label="汇总时间" />
      </div>
    </FormDialog>

    <transition name="ds-toast">
      <div v-if="toastVisible" class="ds-toast app-overlay" data-test="design-toast">保存成功</div>
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
