// App* 组件全局注册：页面只写 <AppCard>，不用逐个 import。
// 类型声明在 src/components.d.ts（vue-tsc 靠它认识全局组件）。
import type { App } from 'vue'

import AppButton from '@/components/app/AppButton.vue'
import AppCard from '@/components/app/AppCard.vue'
import AppDialog from '@/components/app/AppDialog.vue'
import AppEmptyState from '@/components/app/AppEmptyState.vue'
import AppHeader from '@/components/app/AppHeader.vue'
import AppHint from '@/components/app/AppHint.vue'
import AppInput from '@/components/app/AppInput.vue'
import AppPage from '@/components/app/AppPage.vue'
import AppSection from '@/components/app/AppSection.vue'
import AppSelect from '@/components/app/AppSelect.vue'
import AppTagsInput from '@/components/app/AppTagsInput.vue'
import AppTextarea from '@/components/app/AppTextarea.vue'
import AppSidebar from '@/components/app/AppSidebar.vue'
import AppSkeleton from '@/components/app/AppSkeleton.vue'
import AppStatus from '@/components/app/AppStatus.vue'
import AppSwitch from '@/components/app/AppSwitch.vue'
import AppTag from '@/components/app/AppTag.vue'

const components = {
  AppButton,
  AppCard,
  AppDialog,
  AppEmptyState,
  AppHeader,
  AppHint,
  AppInput,
  AppPage,
  AppSection,
  AppSelect,
  AppTagsInput,
  AppTextarea,
  AppSidebar,
  AppSkeleton,
  AppStatus,
  AppSwitch,
  AppTag,
}

export default {
  install(app: App): void {
    for (const [name, component] of Object.entries(components)) {
      app.component(name, component)
    }
  },
}
