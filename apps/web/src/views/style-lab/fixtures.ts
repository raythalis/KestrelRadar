import type {
  CardStat,
  ChannelType,
  EventSourceRef,
  Incident,
  RecentEvent,
} from '@kestrel/contracts'

import { CHANNEL_ICONS, DISCOVERY_ICONS, MONITOR_ICONS } from '@/components/biz/icons'
import type { Group } from '@kestrel/contracts'

/**
 * `/style-lab` 的卡片 fixture：只放数据与状态，不放结构、不放样式、不 import 组件。
 * 字段与真实 Biz Card 的 props 一一对应，值取自真实生产里的取值域；
 * 给到卡片，卡片自己决定长什么样。
 */

const minutesAgo = (n: number): string => new Date(Date.now() - n * 60_000).toISOString()

/** 背面汇总（与仪表盘同窗口）：rate 为 null 表示窗口内没有记录，卡片显示「—」 */
const statOf = (rate: number | null, total: number, daily: number[]): CardStat => ({
  rate,
  total,
  daily,
})

/* ------------------------------------------------------------------ 发现卡 */

export interface SourceFixture {
  name: string
  kindLabelKey: string
  icon: string
  enabled: boolean
  target: string
  cron: string
  nextRunAt?: string | null
  stat?: CardStat | null
}

export const SOURCE_FIXTURES: SourceFixture[] = [
  {
    name: 'Hacker News',
    kindLabelKey: 'discovery.kind.rss',
    icon: DISCOVERY_ICONS.rss,
    enabled: true,
    target: 'https://news.ycombinator.com/rss',
    cron: '*/30 * * * *',
    nextRunAt: minutesAgo(-12),
    stat: statOf(0.98, 186, [3, 5, 4, 6, 5, 7, 6]),
  },
  {
    name: 'GitHub 趋势',
    kindLabelKey: 'discovery.kind.rsshub',
    icon: DISCOVERY_ICONS.rsshub,
    enabled: true,
    // 认不出的表达式：卡片自己会显示「自定义时间」并把原串挂 tooltip
    target: '/github/trending/daily/any',
    cron: '0 9 1,15 * *',
    nextRunAt: minutesAgo(-180),
    stat: statOf(0.92, 62, [2, 2, 3, 2, 1, 3, 2]),
  },
  {
    name: '少数派新文章',
    kindLabelKey: 'discovery.kind.web',
    icon: DISCOVERY_ICONS.web,
    enabled: false,
    target: 'https://sspai.com',
    cron: '0 */2 * * *',
    nextRunAt: null,
    stat: statOf(0.76, 24, [1, 0, 2, 1, 1, 0, 1]),
  },
]

/* ------------------------------------------------------------------ 监听卡 */

export interface MonitorFixture {
  name: string
  mode: 'follow_global' | 'algorithm' | 'algorithm_llm'
  icon: string
  keywords: string[]
  matchMode: 'any' | 'all' | null
  intentText: string
  sensitivity: 'low' | 'medium' | 'high'
  enabled: boolean
  stat?: CardStat | null
}

export const MONITOR_FIXTURES: MonitorFixture[] = [
  {
    name: 'AI 模型动向',
    mode: 'follow_global',
    icon: MONITOR_ICONS.follow_global,
    keywords: [],
    matchMode: null,
    intentText: '',
    sensitivity: 'medium',
    enabled: true,
    stat: statOf(0.18, 96, [2, 3, 5, 4, 6, 5, 7]),
  },
  {
    name: '硬件价格',
    mode: 'algorithm',
    icon: MONITOR_ICONS.algorithm,
    keywords: ['降价', '国行', '预售'],
    matchMode: 'any',
    intentText: '',
    sensitivity: 'high',
    enabled: true,
    stat: statOf(0.42, 37, [1, 2, 1, 3, 2, 2, 1]),
  },
  {
    name: '开源模型发布',
    mode: 'algorithm_llm',
    icon: MONITOR_ICONS.algorithm_llm,
    keywords: ['权重', '开源', '模型', '发布', '微调', '量化', '推理', '基准'],
    matchMode: 'all',
    intentText: '只看真正放出权重或代码的发布，厂商预告不算',
    sensitivity: 'low',
    enabled: true,
    stat: statOf(null, 0, []),
  },
]

/* ------------------------------------------------------------------ 动作卡 */

export interface ActionFixture {
  name: string
  triggerType: 'instant' | 'digest'
  icon: string
  cron: string | null
  channelName: string
  templateNameKey: string
  enabled: boolean
  stat?: CardStat | null
}

export const ACTION_FIXTURES: ActionFixture[] = [
  {
    name: '重要更新即时推',
    triggerType: 'instant',
    icon: CHANNEL_ICONS.telegram,
    cron: null,
    channelName: 'Telegram · 主账号',
    templateNameKey: 'action.templateBuiltin',
    enabled: true,
    stat: statOf(1, 32, [1, 2, 0, 3, 2, 1, 2]),
  },
  {
    name: '每天早报',
    triggerType: 'digest',
    icon: CHANNEL_ICONS.webhook,
    cron: '30 8 * * *',
    channelName: 'Webhook · 自建服务',
    templateNameKey: 'action.templateBuiltin',
    enabled: true,
    stat: statOf(0.96, 21, [1, 1, 1, 1, 1, 1, 0]),
  },
]

/* ------------------------------------------------------------------ 渠道卡 */

export interface ChannelFixture {
  name: string
  type: ChannelType
  enabled: boolean
  lastPushedAt: string | null
  tone: 'ok' | 'warn' | 'err' | 'neutral'
  probe: 'idle' | 'testing' | 'ok' | 'warn' | 'fail'
}

export const CHANNEL_FIXTURES: ChannelFixture[] = [
  {
    name: 'Telegram · 主账号',
    type: 'telegram',
    enabled: true,
    lastPushedAt: minutesAgo(25),
    tone: 'ok',
    probe: 'ok',
  },
  {
    name: 'Webhook · 自建服务',
    type: 'webhook',
    enabled: true,
    lastPushedAt: null,
    tone: 'neutral',
    probe: 'idle',
  },
  {
    name: 'Telegram · 备份机器人',
    type: 'telegram',
    enabled: true,
    lastPushedAt: minutesAgo(140),
    tone: 'ok',
    probe: 'fail',
  },
]

/* ---------------------------------------------------------------------------
   分组面板的样例数据。字段与生产一致：GroupPanel 只吃 group / counts / expanded。
   --------------------------------------------------------------------------- */
function groupOf(id: string, name: string, description: string, enabled: boolean): Group {
  const now = new Date().toISOString()
  return { id, name, description, enabled, createdAt: now, updatedAt: now }
}

export const GROUP_FIXTURE: Group = groupOf(
  'g-demo',
  'AI 模型与硬件',
  '盯开源模型发布、显卡价格与评测动向',
  true,
)

export const GROUP_COUNTS = {
  discoveries: SOURCE_FIXTURES.length,
  monitors: MONITOR_FIXTURES.length,
  actions: ACTION_FIXTURES.length,
}
export const GROUP_EMPTY_COUNTS = { discoveries: 0, monitors: 1, actions: 0 }

/** 面板自己的几种形态：折叠、空分组、停用 */
export const GROUP_STATES: {
  key: string
  caption: string
  group: Group
  counts: typeof GROUP_COUNTS
  expanded: boolean
}[] = [
  {
    key: 'collapsed',
    caption: '折叠：只有摘要行（箭头朝右、计数与开关都在）',
    group: groupOf('g-2', '游戏与动漫', '订阅更新与折扣', true),
    counts: GROUP_COUNTS,
    expanded: false,
  },
  {
    key: 'empty',
    caption: '空分组：列底出现「新增」空态，点它加第一条',
    group: groupOf('g-3', '还没配内容的分组', '', true),
    counts: GROUP_EMPTY_COUNTS,
    expanded: true,
  },
  {
    key: 'off',
    caption: '停用：只由开关表达，整块不压暗、不另挂标签',
    group: groupOf('g-4', '暂时停掉的分组', '里面的卡片也会一起停用', false),
    counts: GROUP_COUNTS,
    expanded: true,
  },
]

/* ---------------------------------------------------------------------------
   表单样例的文本。只放文案与选项，不放结构。
   --------------------------------------------------------------------------- */
export const FORM_TEXT = {
  name: '开源模型周报',
  nameHint: '这个名字会出现在卡片标题上',
  address: '地址',
  addressValue: 'https://example.com/feed.xml',
  addressError: '这个地址打不开，检查是否要带 http',
  rsshubPrefix: 'https://rsshub.example.com',
  route: '/github/trending/daily/any',
  channel: 'Telegram · 主账号',
  summary: '只挑真正放出权重或代码的发布，厂商预告不算。',
  summaryHint: '写给自己的备注，只有自己看得到',
}

export const SELECT_ITEMS = ['Telegram · 主账号', 'Webhook · 自建服务', '企业微信 · 通知群']

export const TAB_ITEMS = [
  { value: 'discoveries', label: '发现', count: 3, icon: 'mdi-rss' },
  { value: 'monitors', label: '监听', count: 2, icon: 'mdi-bell-outline' },
  { value: 'actions', label: '动作', count: 1, icon: 'mdi-send-outline' },
]

/* ---------- 活跃区（最近事件 / 异常记录）样例数据：字段与接口一一对应 ---------- */

export const ACTIVITY_EVENTS: RecentEvent[] = [
  {
    id: 'ev-unread',
    title: 'Vue 3.6 正式版发布，响应式性能提升约 40%',
    url: 'https://example.com/vue-36',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'rsshub',
    sources: [
      { discoveryId: 'd-github', name: 'GitHub 趋势', url: 'https://example.com/vue-36' },
      { discoveryId: 'd-ithome', name: 'IT之家', url: 'https://example.com/vue-36-ithome' },
    ],
    sourceCount: 3,
    sourceNames: ['GitHub 趋势', 'IT之家', '少数派'],
    itemCount: 3,
    firstItemAt: minutesAgo(180),
    lastItemAt: minutesAgo(20),
    readAt: null,
  },
  {
    id: 'ev-read',
    title: 'Fastify v6 路线图公开：默认 ESM、Node 22 起',
    url: 'https://example.com/fastify-v6',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'rss',
    sources: [
      { discoveryId: 'd-hn', name: 'Hacker News 榜单', url: 'https://example.com/fastify-v6' },
    ],
    sourceCount: 1,
    sourceNames: ['Hacker News 榜单'],
    itemCount: 1,
    firstItemAt: minutesAgo(420),
    lastItemAt: minutesAgo(35),
    readAt: minutesAgo(200),
  },
  {
    id: 'ev-no-url',
    title: '某源这次只抓到标题，没有原文链接',
    url: null,
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'web',
    sources: [{ discoveryId: 'd-sspai', name: '少数派', url: null }],
    sourceCount: 1,
    sourceNames: ['少数派'],
    itemCount: 1,
    firstItemAt: minutesAgo(300),
    lastItemAt: minutesAgo(300),
    readAt: null,
  },
  {
    id: 'ev-4',
    title: 'pnpm 10 发布：默认禁用构建脚本，需显式白名单',
    url: 'https://example.com/pnpm-10',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'rsshub',
    sources: [{ discoveryId: 'd-sspai', name: '少数派', url: 'https://example.com/pnpm-10' }],
    sourceCount: 1,
    sourceNames: ['少数派'],
    itemCount: 1,
    firstItemAt: minutesAgo(360),
    lastItemAt: minutesAgo(360),
    readAt: minutesAgo(300),
  },
  {
    id: 'ev-5',
    title: 'SQLite 3.50 发布：新增 JSON 聚合与并发写改进',
    url: 'https://example.com/sqlite-350',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'rss',
    sources: [
      { discoveryId: 'd-ithome', name: 'IT之家', url: 'https://example.com/sqlite-350' },
      { discoveryId: 'd-sspai', name: '少数派', url: 'https://example.com/sqlite-350-sspai' },
    ],
    sourceCount: 4,
    sourceNames: ['IT之家', '少数派'],
    itemCount: 4,
    firstItemAt: minutesAgo(600),
    lastItemAt: minutesAgo(600),
    readAt: null,
  },
  {
    id: 'ev-6',
    title: 'Vite 7 进入 beta，默认启用 Rolldown 打包',
    url: 'https://example.com/vite-7',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'web',
    sources: [{ discoveryId: 'd-github', name: 'GitHub 趋势', url: 'https://example.com/vite-7' }],
    sourceCount: 1,
    sourceNames: ['GitHub 趋势'],
    itemCount: 1,
    firstItemAt: minutesAgo(720),
    lastItemAt: minutesAgo(720),
    readAt: minutesAgo(700),
  },
]

/** 「+N」展开时补上的其余来源（接口按需取回来的那一份） */
export const REST_SOURCES: EventSourceRef[] = [
  { discoveryId: 'd-rsshub', name: 'RSSHub', url: 'https://example.com/sqlite-350-rsshub' },
  { discoveryId: 'd-github', name: 'GitHub 趋势', url: 'https://example.com/sqlite-350-github' },
]

/** 来源特别多的一档：用来看 +N 浮层「超过 4 条就滚」的样子 */
export const MANY_SOURCES: EventSourceRef[] = [
  { discoveryId: 'd-sspai', name: '少数派', url: 'https://example.com/a-sspai' },
  { discoveryId: 'd-ithome', name: 'IT之家', url: 'https://example.com/a-ithome' },
  { discoveryId: 'd-hn', name: 'Hacker News 榜单', url: 'https://example.com/a-hn' },
  { discoveryId: 'd-github', name: 'GitHub 趋势', url: 'https://example.com/a-github' },
  { discoveryId: 'd-rsshub', name: 'RSSHub', url: 'https://example.com/a-rsshub' },
  { discoveryId: 'd-web', name: '某个没有链接的来源', url: null },
]

/** 10 条那一档用的补数：把外部分页/内部滚动这类「条数变多」的状态摆出来 */
export const EXTRA_ACTIVITY_EVENTS: RecentEvent[] = [
  {
    id: 'ev-7',
    title: 'Node 24 进入维护期，官方建议新项目直接用 26',
    url: 'https://example.com/node-24',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'rss',
    sources: [{ discoveryId: 'd-ithome', name: 'IT之家', url: 'https://example.com/node-24' }],
    sourceCount: 1,
    sourceNames: ['IT之家'],
    itemCount: 1,
    firstItemAt: minutesAgo(780),
    lastItemAt: minutesAgo(780),
    readAt: null,
  },
  {
    id: 'ev-8',
    title: 'RSSHub 新增豆瓣电影、掘金与 V2EX 热帖三个路由',
    url: 'https://example.com/rsshub-routes',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'rsshub',
    sources: [
      { discoveryId: 'd-rsshub', name: 'RSSHub', url: 'https://example.com/rsshub-routes' },
      { discoveryId: 'd-sspai', name: '少数派', url: 'https://example.com/rsshub-routes-sspai' },
    ],
    sourceCount: 2,
    sourceNames: ['RSSHub', '少数派'],
    itemCount: 2,
    firstItemAt: minutesAgo(840),
    lastItemAt: minutesAgo(820),
    readAt: minutesAgo(800),
  },
  {
    id: 'ev-9',
    title: 'TypeScript 6.0 beta：默认打开严格模式，废弃一批旧装饰器写法',
    url: 'https://example.com/ts-6',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'rss',
    sources: [{ discoveryId: 'd-sspai', name: '少数派', url: 'https://example.com/ts-6' }],
    sourceCount: 1,
    sourceNames: ['少数派'],
    itemCount: 1,
    firstItemAt: minutesAgo(900),
    lastItemAt: minutesAgo(900),
    readAt: minutesAgo(880),
  },
  {
    id: 'ev-10',
    title: '新的开源嵌入模型放出，同尺寸下检索分数提高一档',
    url: 'https://example.com/embed-model',
    groupId: 'g1',
    groupName: 'AI 与开发',
    kind: 'web',
    sources: [
      {
        discoveryId: 'd-hn',
        name: 'Hacker News 榜单',
        url: 'https://example.com/embed-model',
      },
    ],
    sourceCount: 1,
    sourceNames: ['Hacker News 榜单'],
    itemCount: 1,
    firstItemAt: minutesAgo(960),
    lastItemAt: minutesAgo(960),
    readAt: null,
  },
]

/** 外部列表最多 6 条：这一档给 10 条，用来看「6 条 + 底栏」和「查看全部列 10 条」 */
export const MANY_ACTIVITY_EVENTS: RecentEvent[] = [...ACTIVITY_EVENTS, ...EXTRA_ACTIVITY_EVENTS]

/** 事件列表上出现过的来源清单（筛选浮层的选项按它来） */
export const ACTIVITY_SOURCE_NAMES = [
  'IT之家',
  '少数派',
  'GitHub 趋势',
  'Hacker News 榜单',
  'RSSHub',
]

/** 一件事的「其余来源」（点 +N 时才按需取回来的那份） */
export interface EventRestSources {
  id: string
  sources: EventSourceRef[]
}

/** 样例里先给全，这样 +N 浮层里能看到具体是哪几家、点得进去 */
export const ACTIVITY_REST_SOURCES: EventRestSources[] = [
  {
    id: 'ev-unread',
    sources: [{ discoveryId: 'd-sspai', name: '少数派', url: 'https://example.com/vue-36-sspai' }],
  },
  { id: 'ev-5', sources: REST_SOURCES },
]

export const ACTIVITY_INCIDENTS: Incident[] = [
  {
    id: 'in-collection',
    kind: 'collection',
    targetId: 'd-ithome',
    targetName: 'IT之家',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'fetch.http404',
    message: '地址返回 404，检查订阅地址是不是变了',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(180),
    createdAt: minutesAgo(12),
  },
  {
    id: 'in-delivery',
    kind: 'delivery',
    targetId: 'c-tg',
    targetName: 'Telegram · 主账号',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'delivery.telegramTimeout',
    message: 'Telegram 超时',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(90),
    createdAt: minutesAgo(45),
  },
  {
    id: 'in-judge',
    kind: 'judgment',
    targetId: 'g1',
    targetName: 'AI 与开发',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'judge.parseFailed',
    message: '这条内容判不出归属，已跳过',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(300),
    createdAt: minutesAgo(150),
  },
  {
    id: 'in-collection-2',
    kind: 'collection',
    targetId: 'd-github',
    targetName: 'GitHub 趋势',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'fetch.timeout',
    message: '超过 30 秒没有回应',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(420),
    createdAt: minutesAgo(240),
  },
]

export const EXTRA_ACTIVITY_INCIDENTS: Incident[] = [
  {
    id: 'in-sspai-timeout',
    kind: 'collection',
    targetId: 'd-sspai',
    targetName: '少数派',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'fetch.timeout',
    message: '超过 30 秒没有回应',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(240),
    createdAt: minutesAgo(60),
  },
  {
    id: 'in-github-429',
    kind: 'collection',
    targetId: 'd-github',
    targetName: 'GitHub 趋势',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'fetch.http429',
    message: '被限流了，等一会儿会自己重试',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(300),
    createdAt: minutesAgo(120),
  },
  {
    id: 'in-rsshub-route',
    kind: 'collection',
    targetId: 'd-rsshub',
    targetName: 'RSSHub',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'fetch.parseFailed',
    message: '抓回来了，但一条都没解析出来',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(360),
    createdAt: minutesAgo(180),
  },
  {
    id: 'in-sspai-403',
    kind: 'collection',
    targetId: 'd-sspai',
    targetName: '少数派',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'fetch.http403',
    message: '地址拒绝访问，可能需要换 UA 或登录',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(480),
    createdAt: minutesAgo(300),
  },
  {
    id: 'in-delivery-wecom',
    kind: 'delivery',
    targetId: 'c-wecom',
    targetName: '企业微信 · 通知群',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'delivery.webhookFailed',
    message: '推送返回 500，这条没发出去',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(540),
    createdAt: minutesAgo(360),
  },
  {
    id: 'in-judge-2',
    kind: 'judgment',
    targetId: 'g1',
    targetName: 'AI 与开发',
    groupId: 'g1',
    groupName: 'AI 与开发',
    code: 'judge.lowScore',
    message: '分数都低于阈值，这条被丢掉了',
    detail: null,
    status: 'open',
    dismissedAt: null,
    firstSeenAt: minutesAgo(600),
    createdAt: minutesAgo(420),
  },
]

/** 异常列表这一档给 10 条，用来看卡片内滚动（上限 20 条的版面） */
export const MANY_ACTIVITY_INCIDENTS: Incident[] = [
  ...ACTIVITY_INCIDENTS,
  ...EXTRA_ACTIVITY_INCIDENTS,
]

/** 「查看全部」懒加载那一档的补数：滚到底再补一页（生产里是 cursor 分页，这里只是样例数据） */
export const LAZY_EXTRA_EVENTS: RecentEvent[] = [
  {
    id: 'lazy-1',
    title: 'RSSHub 路由更新：微博热搜改用新接口',
    url: 'https://example.com/lazy-1',
    groupId: 'g1',
    groupName: '111',
    kind: 'rsshub',
    sources: [{ discoveryId: 'd-rsshub', name: 'RSSHub', url: 'https://example.com/lazy-1' }],
    sourceCount: 1,
    sourceNames: ['RSSHub'],
    itemCount: 1,
    firstItemAt: minutesAgo(1000),
    lastItemAt: minutesAgo(1000),
    readAt: null,
  },
  {
    id: 'lazy-2',
    title: 'Vite 7 正式版发布，构建默认走 Rolldown',
    url: 'https://example.com/lazy-2',
    groupId: 'g1',
    groupName: '111',
    kind: 'rss',
    sources: [{ discoveryId: 'd-sspai', name: '少数派', url: 'https://example.com/lazy-2' }],
    sourceCount: 1,
    sourceNames: ['少数派'],
    itemCount: 1,
    firstItemAt: minutesAgo(1080),
    lastItemAt: minutesAgo(1080),
    readAt: minutesAgo(1000),
  },
  {
    id: 'lazy-3',
    title: 'Datasette 1.0a 发布，插件生态回归',
    url: 'https://example.com/lazy-3',
    groupId: 'g1',
    groupName: '111',
    kind: 'web',
    sources: [{ discoveryId: 'd-hn', name: 'Hacker News 榜单', url: 'https://example.com/lazy-3' }],
    sourceCount: 1,
    sourceNames: ['Hacker News 榜单'],
    itemCount: 1,
    firstItemAt: minutesAgo(1160),
    lastItemAt: minutesAgo(1160),
    readAt: null,
  },
  {
    id: 'lazy-4',
    title: 'Obsidian 1.9 支持原生表格编辑',
    url: 'https://example.com/lazy-4',
    groupId: 'g1',
    groupName: '111',
    kind: 'rss',
    sources: [{ discoveryId: 'd-ithome', name: 'IT之家', url: 'https://example.com/lazy-4' }],
    sourceCount: 1,
    sourceNames: ['IT之家'],
    itemCount: 1,
    firstItemAt: minutesAgo(1240),
    lastItemAt: minutesAgo(1240),
    readAt: minutesAgo(1200),
  },
  {
    id: 'lazy-5',
    title: 'SQLite 3.51 发布，新增向量检索函数',
    url: 'https://example.com/lazy-5',
    groupId: 'g1',
    groupName: '111',
    kind: 'rss',
    sources: [{ discoveryId: 'd-sspai', name: '少数派', url: 'https://example.com/lazy-5' }],
    sourceCount: 1,
    sourceNames: ['少数派'],
    itemCount: 1,
    firstItemAt: minutesAgo(1320),
    lastItemAt: minutesAgo(1320),
    readAt: null,
  },
  {
    id: 'lazy-6',
    title: 'pnpm 10.2 修掉 workspace 依赖提升的坑',
    url: 'https://example.com/lazy-6',
    groupId: 'g1',
    groupName: '111',
    kind: 'rss',
    sources: [{ discoveryId: 'd-github', name: 'GitHub 趋势', url: 'https://example.com/lazy-6' }],
    sourceCount: 1,
    sourceNames: ['GitHub 趋势'],
    itemCount: 1,
    firstItemAt: minutesAgo(1400),
    lastItemAt: minutesAgo(1400),
    readAt: minutesAgo(1300),
  },
  {
    id: 'lazy-7',
    title: 'Fastify v6.1 跟上 Node 24 的权限模型',
    url: 'https://example.com/lazy-7',
    groupId: 'g1',
    groupName: '111',
    kind: 'rss',
    sources: [{ discoveryId: 'd-ithome', name: 'IT之家', url: 'https://example.com/lazy-7' }],
    sourceCount: 1,
    sourceNames: ['IT之家'],
    itemCount: 1,
    firstItemAt: minutesAgo(1480),
    lastItemAt: minutesAgo(1480),
    readAt: null,
  },
  {
    id: 'lazy-8',
    title: 'Hacker News 热议：本地优先软件的十年',
    url: 'https://example.com/lazy-8',
    groupId: 'g1',
    groupName: '111',
    kind: 'web',
    sources: [{ discoveryId: 'd-hn', name: 'Hacker News 榜单', url: 'https://example.com/lazy-8' }],
    sourceCount: 1,
    sourceNames: ['Hacker News 榜单'],
    itemCount: 1,
    firstItemAt: minutesAgo(1560),
    lastItemAt: minutesAgo(1560),
    readAt: minutesAgo(1500),
  },
]

/** 懒加载池的填充部分：按模板铺到 50 条，好看清「每批 20 条」的翻页（纯样例数据） */
const LAZY_TOPICS = [
  'Vue',
  'Vite',
  'pnpm',
  'Node',
  'TypeScript',
  'SQLite',
  'Fastify',
  'RSSHub',
  'Obsidian',
  'Datasette',
  'Stash',
  'Home Assistant',
] as const
const LAZY_SOURCE_NAMES = ['少数派', 'IT之家', 'GitHub 趋势', 'Hacker News 榜单', 'RSSHub'] as const

export const LAZY_FILLER_EVENTS: RecentEvent[] = Array.from({ length: 32 }, (_, i) => {
  const source = LAZY_SOURCE_NAMES[i % LAZY_SOURCE_NAMES.length]
  const kind = i % 3 === 0 ? 'web' : i % 3 === 1 ? 'rss' : 'rsshub'
  const index = i + 1
  return {
    id: `lazy-fill-${index}`,
    title: `${LAZY_TOPICS[i % LAZY_TOPICS.length]} ${3 + (i % 2)}.${i % 12} 更新（模拟第 ${index} 条）`,
    url: `https://example.com/lazy-fill-${index}`,
    groupId: 'g1',
    groupName: '111',
    kind,
    sources: [
      { discoveryId: `d-${index}`, name: source, url: `https://example.com/lazy-fill-${index}` },
    ],
    sourceCount: 1,
    sourceNames: [source],
    itemCount: 1,
    firstItemAt: minutesAgo(1700 + index * 60),
    lastItemAt: minutesAgo(1700 + index * 60),
    readAt: i % 3 === 0 ? null : minutesAgo(1700 + index * 60 - 30),
  } as RecentEvent
})
