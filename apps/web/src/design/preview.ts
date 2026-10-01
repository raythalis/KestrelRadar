// /design 预览页的数据来源：全部从 design/tokens 推导，页面与它能展示的规范不会两边漂。
// 只服务开发验收，不参与产品逻辑。

import {
  type ThemeDefinition,
  TYPE,
  BREAKPOINTS,
  DENSITY,
  ELEVATION,
  LINE_HEIGHT,
  PAGE_WIDTHS,
  RADIUS,
  SPACE,
  WEIGHT,
  colorVars,
} from '@/design/tokens'

import type { DesignCopyKey } from './lab-copy'

/** 预览页的文案函数（由页面传进来，这个模块自己不碰 i18n） */
export type DesignCopy = (key: DesignCopyKey, params?: Record<string, string | number>) => string

export type DesignTokenKind = 'color' | 'space' | 'radius' | 'shadow' | 'type' | 'value'

export interface DesignTokenItem {
  name: string
  value: string
  /** 颜色项用它显示色块（有些色值是 rgba，直接用 value 当背景） */
  preview?: string
  style?: Record<string, string>
}

export interface DesignTokenGroup {
  title: string
  note: string
  kind: DesignTokenKind
  items: DesignTokenItem[]
}

/** 色值：当前主题的全部语义变量 */
export function colorItems(theme: ThemeDefinition): DesignTokenItem[] {
  return Object.entries(colorVars(theme.tokens))
    .filter(([name]) => name !== '--k-radius' && name !== '--k-shadow')
    .map(([name, value]) => ({ name, value, preview: value }))
}

export function spaceItems(): DesignTokenItem[] {
  return SPACE.map((value, index) => ({ name: `--k-space-${index + 1}`, value: `${value}px` }))
}

export function radiusItems(): DesignTokenItem[] {
  return Object.entries(RADIUS).map(([key, value]) => ({ name: `--k-radius-${key}`, value }))
}

export function shadowItems(theme: ThemeDefinition): DesignTokenItem[] {
  const set = ELEVATION[theme.dark ? 'dark' : 'light']
  return Object.entries(set).map(([key, value]) => ({ name: `--k-elev-${key}`, value }))
}

export function typeItems(copy: DesignCopy): DesignTokenItem[] {
  const items: DesignTokenItem[] = []
  for (const [key, value] of Object.entries(TYPE)) {
    items.push({ name: `--k-fs-${key}`, value, style: { fontSize: String(value) } })
  }
  for (const [key, value] of Object.entries(LINE_HEIGHT)) {
    items.push({
      name: copy('preview.lineHeight', { key }),
      value,
      style: { fontSize: TYPE.body, lineHeight: value },
    })
  }
  for (const [key, value] of Object.entries(WEIGHT)) {
    items.push({
      name: copy('preview.weight', { key }),
      value,
      style: { fontSize: TYPE.body, fontWeight: value },
    })
  }
  return items
}

export function valueItems(copy: DesignCopy): DesignTokenItem[] {
  return [
    ...Object.entries(DENSITY).map(([key, value]) => ({
      name: copy('preview.density', { key }),
      value,
    })),
    ...Object.entries(BREAKPOINTS).map(([key, value]) => ({
      name: copy('preview.breakpoint', { key }),
      value: `≥${value}px`,
    })),
    ...Object.entries(PAGE_WIDTHS).map(([key, value]) => ({
      name: copy('preview.pageWidth', { key }),
      value: value > 0 ? `${value}px` : copy('demo.widthFull'),
    })),
  ]
}

export function designGroups(theme: ThemeDefinition, copy: DesignCopy): DesignTokenGroup[] {
  return [
    { title: 'Color', note: copy('preview.colorNote', { theme: theme.id }), kind: 'color', items: colorItems(theme) },
    { title: 'Typography', note: copy('preview.typeNote'), kind: 'type', items: typeItems(copy) },
    { title: 'Spacing', note: copy('preview.spaceNote'), kind: 'space', items: spaceItems() },
    { title: 'Radius', note: copy('preview.radiusNote'), kind: 'radius', items: radiusItems() },
    { title: 'Elevation', note: copy('preview.shadowNote'), kind: 'shadow', items: shadowItems(theme) },
    {
      title: 'Density / Breakpoints / Page width',
      note: copy('preview.valueNote'),
      kind: 'value',
      items: valueItems(copy),
    },
  ]
}
