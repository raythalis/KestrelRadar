// App* 组件共用的类型。
// 单独放一个文件是因为 <script setup> 里不允许 export 语句。

/** 导航条目（AppSidebar 用；标签由外壳按 i18n 生成） */
export interface AppNavItem {
  name: string
  icon: string
  label: string
}

/** 下拉选项（AppSelect 用） */
export interface AppSelectItem {
  title: string
  value: string | number
}

/** 标签项（AppTabs 用）；count 是可选的尾部计数，icon 是可选的 mdi 图标名 */
export interface AppTabItem {
  value: string
  label: string
  count?: number
  icon?: string
}
