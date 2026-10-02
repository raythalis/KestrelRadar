<!-- AppStatus：状态点/徽标。颜色只表达状态：ok / warn / err / info / neutral。
     busy 用于"测试中"这类进行中状态（点会闪）。带 action 时可点（例如点一下试抓）。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'ok' | 'warn' | 'err' | 'info' | 'neutral'
    busy?: boolean
    /** 可点：显示手型并带一点反馈（打点、试抓这类操作） */
    action?: boolean
    dot?: boolean
  }>(),
  { tone: 'neutral', busy: false, action: false, dot: true },
)

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()
</script>

<template>
  <component
    :is="action ? 'button' : 'span'"
    :type="action ? 'button' : undefined"
    class="app-status"
    :class="[`app-status--${busy ? 'busy' : tone}`, action ? 'app-status--action' : '']"
    data-test="app-status"
    @click="action ? emit('click', $event) : undefined"
  >
    <span v-if="dot" class="app-status__dot" />
    <slot />
  </component>
</template>
