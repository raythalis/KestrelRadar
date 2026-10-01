// 业务组件层共用的类型。
// 单独放一个文件是因为 <script setup> 里不允许 export 语句。

/** 渠道弹窗交出去的值（页面负责拼成 create/update 入参） */
export interface ChannelDialogValues {
  name: string
  type: 'telegram' | 'webhook'
  enabled: boolean
  /** Telegram 用 */
  chatId: string
  /** Webhook 用 */
  url: string
  /** 密钥输入框的当前值；空字符串＝不改动已保存的密钥 */
  secret: string
}

/** 「读取会话」读回来的会话 */
export interface ChannelChat {
  id: string
  title: string
}
