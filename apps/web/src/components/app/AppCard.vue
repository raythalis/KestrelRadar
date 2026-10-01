<!-- AppCard：卡片/面板的唯一来源。分层靠细边框与底色，不用阴影（阴影只给浮层）。
     状态：default / interactive（整卡可点，例如点一下就进编辑）/ disabled（暂不可用）。 -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    note?: string
    /** 整卡可点：加键盘可达性与悬停反馈 */
    interactive?: boolean
    disabled?: boolean
    /** 只放内容、不带内边距（表格或分栏自己控制时用） */
    bare?: boolean
  }>(),
  { interactive: false, disabled: false, bare: false },
)

const emit = defineEmits<{ (e: 'activate'): void }>()
</script>

<template>
  <section
    class="app-card"
    :class="{ 'is-interactive': interactive && !disabled, 'is-disabled': disabled }"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive && !disabled ? 0 : undefined"
    data-test="app-card"
    @click="interactive && !disabled ? emit('activate') : undefined"
    @keydown.enter="interactive && !disabled ? emit('activate') : undefined"
    @keydown.space.prevent="interactive && !disabled ? emit('activate') : undefined"
  >
    <header v-if="title || note || $slots.head || $slots.actions" class="app-card__head">
      <slot name="head">
        <span v-if="title" class="app-card__title">{{ title }}</span>
        <span v-if="note" class="app-card__note">{{ note }}</span>
      </slot>
      <span class="app-spacer" />
      <slot name="actions" />
    </header>

    <div class="app-card__body" :class="{ 'app-card__body--bare': bare }">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="app-card__foot">
      <slot name="footer" />
    </footer>
  </section>
</template>
