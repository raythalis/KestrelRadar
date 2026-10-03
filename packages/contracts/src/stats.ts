/**
 * 仪表盘要的汇总数据：数量、今日事件、今日投递、采集成功率、RSSHub 状态。
 * 只读，不落库；采集成功率按「轮次」算，不按条目数。
 */

export interface StatsCount {
  enabled: number
  total: number
}

export interface StatsCollection {
  /** 统计窗口（天），隐藏配置项，默认 7 */
  windowDays: number
  /** 窗口内的采集轮次总数 */
  rounds: number
  /** 其中请求成功的轮次（拿到了内容，含「成功但没条目」） */
  okRounds: number
  /** 成功率，0~1；窗口内没有轮次时为 null */
  rate: number | null
  /** 窗口内出现过失败的源数（副文案「X 个源偶发失败」用它） */
  failingSources: number
}

export interface StatsDelivery {
  sent: number
  failed: number
  /** 投递成功率，0~1；今天没有投递记录时为 null */
  rate: number | null
}

export interface StatsRsshub {
  configured: boolean
  ok: boolean
  baseUrl: string
  message: string
  checkedAt: string | null
}

export interface StatsOverview {
  counts: {
    discoveries: StatsCount
    monitors: StatsCount
    actions: StatsCount
    channels: StatsCount
  }
  events: {
    today: number
    yesterday: number
  }
  delivery: StatsDelivery
  collection: StatsCollection
  rsshub: StatsRsshub
}
