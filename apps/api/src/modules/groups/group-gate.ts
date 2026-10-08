import type { Db } from '../../db/index.ts'
import type { ActionRepo } from '../actions/action.repo.ts'
import type { DiscoveryRepo } from '../discoveries/discovery.repo.ts'
import type { MonitorRepo } from '../monitors/monitor.repo.ts'
import type { GroupRepo } from './group.repo.ts'

/**
 * 分组开关与组内卡片的联动（口径：分组开关和内部卡片状态保持一致）。
 *
 * - 关分组＝组内发现 / 监听 / 动作一起停用，开分组＝一起启用；三条 update 放在同一个事务里，
 *   中途失败整批回滚，不会出现「分开关了但里面还有几条在跑」。
 * - 反向同理：组内**只要有一条启用**，分组就算启用；一条都不启用（或组里没有卡片）时分组才停用。
 * - 空分组不参与反向推导：没有卡片可参照，分组自己的开关说了算。
 */
export function createGroupGate(deps: {
  db: Db
  groups: GroupRepo
  discoveries: DiscoveryRepo
  monitors: MonitorRepo
  actions: ActionRepo
}) {
  const { db, groups, discoveries, monitors, actions } = deps

  function childrenOf(groupId: string) {
    return [
      ...discoveries.list().filter((row) => row.groupId === groupId),
      ...monitors.list().filter((row) => row.groupId === groupId),
      ...actions.list().filter((row) => row.groupId === groupId),
    ]
  }

  return {
    /** 分组开关往下传 */
    applyToChildren(groupId: string, enabled: boolean): void {
      db.exec('begin')
      try {
        discoveries.setEnabledByGroup(groupId, enabled)
        monitors.setEnabledByGroup(groupId, enabled)
        actions.setEnabledByGroup(groupId, enabled)
        db.exec('commit')
      } catch (error) {
        db.exec('rollback')
        throw error
      }
    },

    /**
     * 新建卡片时只往一个方向对：分组关着，新卡片建成就停用。
     * 不反推分组开关——否则「分组停用后又新建一条源」会把分组自己重新打开，
     * 让「停用分组」这个显式操作被新建动作悄悄推翻。
     */
    inheritOnCreate(
      groupId: string,
      child: { kind: 'discovery' | 'monitor' | 'action'; id: string },
    ): void {
      const group = groups.get(groupId)
      if (!group || group.enabled) return
      if (child.kind === 'discovery') discoveries.update(child.id, { enabled: false })
      else if (child.kind === 'monitor') monitors.update(child.id, { enabled: false })
      else actions.update(child.id, { enabled: false })
    },

    /**
     * 卡片开关往上传：组里有一条启用，分组就启用；一条都没有才停用。
     * 只改分组自己那一位，不往下传——否则「打开一条源」会把整组的东西一起打开。
     */
    syncFromChildren(groupId: string): void {
      const children = childrenOf(groupId)
      if (children.length === 0) return
      const anyEnabled = children.some((row) => row.enabled)
      const group = groups.get(groupId)
      if (group && group.enabled !== anyEnabled) groups.update(groupId, { enabled: anyEnabled })
    },
  }
}

export type GroupGate = ReturnType<typeof createGroupGate>
