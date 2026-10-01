<!-- ChannelCard：通知渠道卡片（业务组件层）。
     左侧色条＝渠道状态（跟 tone 走）；右下角圆点＝测试连通性按钮，它自己有一套状态：
     未测（空心圈，不呼吸）→ 点一下 → 测试中（转圈，期间不能再点）→
     连通（绿，呼吸）／有警告（黄，不呼吸）／失败（红，不呼吸）。
     圆点悬停只写「测试连通性」，状态靠颜色和动效表达，不写状态字；
     停用的渠道不出现圆点（停用就该去编辑里启用，留着也不能点）；测试中不给再点。
     编辑保存后由页面把 probe 退回 idle（凭证可能变了，旧结论作废）。
     点击整张卡片＝编辑；右上角 ×＝删除；启用开关在编辑表单里，不占卡片位置。
     类型文案与图标都由渠道类型枚举决定，页面不手写。
     只出事件，不碰 store：数据、测试结果与写操作都由页面负责（结果只留在前端内存里）。
     卡上不写「被几个动作用着」这类影响面信息——那是删除确认时才需要知道的。 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChannelType } from '@kestrel/contracts'

import { CHANNEL_ICONS } from './icons'

const props = withDefaults(
  defineProps<{
    name: string
    /** 渠道类型（枚举值）：第二行文案与图标都跟着它走 */
    type: ChannelType
    enabled: boolean
    /** 渠道状态：只决定左侧色条颜色 */
    tone?: 'ok' | 'warn' | 'err' | 'neutral'
    /** 测试圆点自己的状态：未测 / 测试中 / 连通 / 有警告 / 失败 */
    probe?: 'idle' | 'testing' | 'ok' | 'warn' | 'fail'
  }>(),
  { tone: 'neutral', probe: 'idle' },
)

const emit = defineEmits<{ edit: []; test: []; delete: [] }>()

const { t } = useI18n()

const icon = computed(() => CHANNEL_ICONS[props.type])
const kindLabel = computed(() => t(`channel.type.${props.type}`))

/** 圆点悬停提示只写它是什么，不写状态；测试中不能再点 */
const testing = computed(() => props.probe === 'testing')
/** 测试中不给再点 */
const probeDisabled = computed(() => testing.value)
</script>

<template>
  <div
    class="biz-card"
    :class="[`biz-card--${tone}`, { 'is-off': !enabled }]"
    role="button"
    tabindex="0"
    data-test="channel-card"
    @click="emit('edit')"
    @keydown.enter.prevent="emit('edit')"
  >
    <div class="biz-card__head">
      <span class="biz-card__icon" data-test="channel-icon">
        <v-icon size="18">{{ icon }}</v-icon>
      </span>
      <span class="biz-card__heading">
        <span class="biz-card__title" data-test="channel-name">{{ name }}</span>
        <span class="biz-card__kind" data-test="channel-kind">{{ kindLabel }}</span>
      </span>
      <span class="app-spacer" />
      <button
        type="button"
        class="biz-card__remove"
        data-test="channel-delete"
        :title="t('common.delete')"
        :aria-label="t('common.delete')"
        @click.stop="emit('delete')"
      >
        <v-icon size="16">mdi-close</v-icon>
      </button>
    </div>

    <div class="biz-card__foot">
      <span class="app-spacer" />
      <button
        v-if="enabled"
        type="button"
        class="biz-card__probe"
        :class="`biz-card__probe--${probe}`"
        data-test="channel-test"
        :title="t('channel.probe')"
        :aria-label="t('channel.probe')"
        :aria-busy="testing || undefined"
        :disabled="probeDisabled"
        @click.stop="emit('test')"
      />
    </div>
  </div>
</template>
