/**
 * 失败文案表：后端对外说的「人话」只有这一份，按错误码引用。
 *
 * 规矩：
 * - 码用来统计与分类（哪一类失败最多），文案用来展示给用户；
 * - 带参数的文案一律走函数，不在别处手拼字符串；
 * - 文案与接入前逐字一致，只换存放位置，不改用户看到的话；
 * - 以后要加英文，只需要在这个文件里补一份。
 */
export const FAILURE_CODES = [
  // 采集：请求层
  'fetch.timeout',
  'fetch.http404',
  'fetch.http401or403',
  'fetch.httpStatus',
  'fetch.network',
  // 采集：内容层
  'rsshub.baseMissing',
  'web.noFeedLink',
  'feed.noEntry',
  'feed.parseFailed',
  'discovery.missing',
  'collection.failed',
  // 模型
  'llm.unavailable',
  'llm.failed',
  // 投递：Webhook
  'delivery.webhookNoUrl',
  'delivery.webhookStatus',
  'delivery.webhookTimeout',
  'delivery.webhookFailed',
  // 投递：Telegram
  'delivery.notTelegram',
  'delivery.telegramNoToken',
  'delivery.telegramNoChat',
  'delivery.telegramTokenMissing',
  'delivery.telegramTimeout',
  'delivery.telegramAuth',
  'delivery.telegramFailed',
  // 投递：其他
  'delivery.channelUnavailable',
  'delivery.failed',
] as const

export type FailureCode = (typeof FAILURE_CODES)[number]

export interface FailureCopyParams {
  /** 超时秒数 */
  seconds?: number
  /** HTTP 状态码 */
  status?: number
  /** 对方原话（Telegram 的 description 之类） */
  reason?: string
}

const COPY: Record<FailureCode, (params: FailureCopyParams) => string> = {
  'fetch.timeout': ({ seconds }) => `连接超时（超过 ${seconds ?? 30} 秒没有回应）`,
  'fetch.http404': () => '地址返回 404，路由或地址可能写错了',
  'fetch.http401or403': ({ status }) => `地址返回 ${status ?? 401}，可能需要访问密钥`,
  'fetch.httpStatus': ({ status }) => `对方服务器返回 ${status ?? 0}`,
  'fetch.network': () => '连不上（域名解析失败或网络不通）',
  'rsshub.baseMissing': () => '还没有配置 RSSHub 实例地址（见全局设置）',
  'web.noFeedLink': () => '页面能打开，但里面没有 RSS/Atom 订阅源，建议改用 RSSHub 路由',
  'feed.noEntry': () => '订阅源里当前没有条目',
  'feed.parseFailed': () => '不是有效的订阅源，建议改用 RSSHub 路由',
  'discovery.missing': () => '发现不存在',
  'collection.failed': () => '采集失败',
  'llm.unavailable': () => '还没有配置可用的判定模型',
  'llm.failed': () => '模型调用失败',
  'delivery.webhookNoUrl': () => '这个 Webhook 渠道还没填地址',
  'delivery.webhookStatus': ({ status }) => `Webhook 返回 ${status ?? 0}`,
  'delivery.webhookTimeout': () => 'Webhook 超时',
  'delivery.webhookFailed': () => 'Webhook 投递失败',
  'delivery.notTelegram': () => '这个渠道不是 Telegram',
  'delivery.telegramNoToken': () => '这个 Telegram 渠道还没填 bot token',
  'delivery.telegramNoChat': () => '这个 Telegram 渠道还没选会话（chat id）',
  'delivery.telegramTokenMissing': () => '先填 bot token 再读取会话',
  'delivery.telegramTimeout': () => 'Telegram 超时',
  'delivery.telegramAuth': ({ reason }) => `bot token 不对：${reason ?? 'Unauthorized'}`,
  'delivery.telegramFailed': () => 'Telegram 请求失败',
  'delivery.channelUnavailable': () => '通知渠道不可用',
  'delivery.failed': () => '投递失败',
}

/** 取一条文案；带参数的把参数一起给进来 */
export function failureCopy(code: FailureCode, params: FailureCopyParams = {}): string {
  return COPY[code](params)
}
