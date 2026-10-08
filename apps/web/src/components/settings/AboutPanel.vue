<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

/**
 * 版本号与仓库地址来自构建配置（根 package.json），打包时注入成常量。
 * 两条都只有标签，没有二级说明。
 */
const version = __APP_VERSION__
const repository = __REPO_URL__
</script>

<template>
  <section class="k2-card k2-set" data-test="pane-about">
    <div class="k2-card__head">
      <div class="k2-card__heading">
        <span class="k2-card__title">{{ t('settings.tab.about') }}</span>
      </div>
    </div>
    <div class="k2-set__row">
      <span class="k2-set__label">{{ t('settings.about.version') }}</span>
      <div class="k2-set__control">
        <span data-test="about-version">{{ version }}</span>
      </div>
    </div>
    <div class="k2-set__row">
      <span class="k2-set__label">{{ t('settings.about.repository') }}</span>
      <div class="k2-set__control">
        <a
          class="k2-link"
          :href="repository"
          target="_blank"
          rel="noopener noreferrer"
          data-test="about-repository"
        >
          {{ repository }}
        </a>
      </div>
    </div>
  </section>
</template>
