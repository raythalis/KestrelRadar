import type { ChannelType } from '@kestrel/contracts'

/**
 * 渠道类型 → 图标。
 * 注意：@mdi/font 7 起删掉了一批品牌图标（telegram / wechat 都没有），
 * 名字写错只会渲染成空白，所以这里配了守卫测试 `mdi-icons.spec.ts` 逐个对着字体文件校。
 */
export const CHANNEL_ICONS: Record<ChannelType, string> = {
  telegram: 'mdi-send',
  webhook: 'mdi-webhook',
}
