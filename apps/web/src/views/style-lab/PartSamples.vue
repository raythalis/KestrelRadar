<!-- PartSamples：v2 的通用零件总览（仅开发环境的 /style-lab 用）。
     目的：把页面、卡片、弹窗共用的最小零件各摆一件——按钮、图标按钮、芯片、图标容器、
     开关、卡片零件、数值、菜单、图标尺寸（骨架、空态、标签页都在 App 组件样例里看真组件）。
     边界：只摆 v2 已经存在的零件（styles/v2.scss 的 --k2-*），不为这一页新造视觉；
     表单类零件（字段、输入框、长文本、下拉、标签输入、采集时间）在 FieldSamples 里。 -->
<template>
  <div class="lab__cols lab__cols--wide">
    <div>
      <div class="lab__h3">按钮 · 一张卡最多一个实心</div>
      <div class="lab-parts">
        <div class="lab-row">
          <button type="button" class="k2-btn k2-btn--primary" data-test="part-btn-primary">
            保存
          </button>
          <button type="button" class="k2-btn k2-btn--ghost" data-test="part-btn-ghost">
            取消
          </button>
          <button type="button" class="k2-btn k2-btn--danger" data-test="part-btn-danger">
            删除
          </button>
        </div>
        <div class="lab-row">
          <button type="button" class="k2-btn k2-btn--primary k2-btn--sm">小号</button>
          <button type="button" class="k2-btn k2-btn--primary" disabled>禁用</button>
          <button type="button" class="k2-link">
            文字链
            <v-icon size="16">mdi-arrow-right</v-icon>
          </button>
        </div>
      </div>
    </div>

    <div>
      <div class="lab__h3">图标按钮 · 页头动作、卡片与分组头都用它</div>
      <div class="lab-parts">
        <div class="lab-row">
          <button type="button" class="k2-iconbtn" data-test="part-iconbtn" aria-label="更多">
            <v-icon size="18">mdi-dots-horizontal</v-icon>
          </button>
          <button
            type="button"
            class="k2-iconbtn k2-iconbtn--primary"
            data-test="part-iconbtn-primary"
            aria-label="新建分组"
          >
            <v-icon size="18">mdi-plus</v-icon>
          </button>
          <button
            type="button"
            class="k2-iconbtn k2-iconbtn--danger"
            data-test="part-iconbtn-danger"
            aria-label="删除"
          >
            <v-icon size="18">mdi-delete-outline</v-icon>
          </button>
          <button
            type="button"
            class="k2-iconbtn k2-iconbtn--danger-hover"
            data-test="part-iconbtn-danger-hover"
            aria-label="忽视"
          >
            <v-icon size="18">mdi-close</v-icon>
          </button>
        </div>
        <div class="lab-row">
          <button type="button" class="k2-iconbtn" aria-label="全部收起">
            <v-icon size="18">mdi-unfold-less-horizontal</v-icon>
          </button>
          <button type="button" class="k2-iconbtn" aria-label="全部展开">
            <v-icon size="18">mdi-unfold-more-horizontal</v-icon>
          </button>
        </div>
        <p class="lab__note">
          前三个是常驻状态；最后一个平时中性、悬停才变红（列表里的关闭 / 忽视这种低权重危险动作）。
        </p>
      </div>
    </div>

    <div>
      <div class="lab__h3">芯片与标签</div>
      <div class="lab-parts">
        <div class="lab-row">
          <span class="k2-chip k2-t-success"><span class="k2-chip__dot" />已连接</span>
          <span class="k2-chip k2-t-warning">有警告</span>
          <span class="k2-chip k2-t-danger">不可用</span>
          <span class="k2-chip k2-t-info">已停用</span>
          <span class="k2-chip k2-t-neutral">未配置</span>
        </div>
        <div class="lab-row">
          <span class="k2-chip k2-t-primary">主要</span>
          <span class="k2-chip k2-chip--tag">发布</span>
          <span class="k2-chip k2-chip--tag">开源</span>
          <span class="k2-chip k2-chip--tag">权重</span>
        </div>
        <p class="lab__note">
          上面一行是状态芯片（柔和底 + 深色字），下面一行是关键词标签（更轻、更小、不带圆点）。
        </p>
      </div>
    </div>

    <div>
      <div class="lab__h3">图标容器 · 卡片左上的方块</div>
      <div class="lab-parts">
        <div class="lab-row">
          <span class="k2-tile k2-t-info"><v-icon size="20">mdi-rss</v-icon></span>
          <span class="k2-tile k2-t-success"><v-icon size="20">mdi-bell-outline</v-icon></span>
          <span class="k2-tile k2-t-warning"><v-icon size="20">mdi-send</v-icon></span>
          <span class="k2-tile k2-t-danger"
            ><v-icon size="20">mdi-alert-circle-outline</v-icon></span
          >
          <span class="k2-tile k2-t-neutral"><v-icon size="20">mdi-folder-outline</v-icon></span>
        </div>
        <div class="lab-row">
          <span class="k2-tile k2-tile--sm k2-t-info"><v-icon size="16">mdi-rss</v-icon></span>
          <span class="k2-tile k2-tile--sm k2-t-primary"><v-icon size="16">mdi-plus</v-icon></span>
        </div>
      </div>
    </div>

    <div>
      <div class="lab__h3">开关</div>
      <div class="lab-parts">
        <div class="lab-row">
          <button
            type="button"
            class="k2-switch k2-switch--on"
            aria-label="启用"
            data-test="part-switch-on"
          >
            <span class="k2-switch__dot" />
          </button>
          <button type="button" class="k2-switch" aria-label="停用" data-test="part-switch-off">
            <span class="k2-switch__dot" />
          </button>
          <button type="button" class="k2-switch" disabled aria-label="停用">
            <span class="k2-switch__dot" />
          </button>
        </div>
        <p class="lab__note">开 / 关 / 禁用三态；开关行（左边两行字、右边开关）见表单零件。</p>
      </div>
    </div>

    <div>
      <div class="lab__h3">卡片零件 · 卡片自己怎么拼</div>
      <div class="lab-parts">
        <div class="k2-card">
          <div class="k2-card__head">
            <span class="k2-tile k2-t-info"><v-icon size="20">mdi-rss</v-icon></span>
            <span class="k2-card__heading">
              <span class="k2-card__title">Hacker News</span>
              <span class="k2-card__sub">RSSHub 路由</span>
            </span>
            <button type="button" class="k2-iconbtn" aria-label="更多">
              <v-icon size="18">mdi-dots-horizontal</v-icon>
            </button>
          </div>
          <span class="k2-card__detail k2-card__detail--mono">/hackernews/best</span>
          <div class="k2-card__row">
            <span class="k2-card__taglabel">关键词</span>
            <span class="k2-chip k2-chip--tag">发布</span>
            <span class="k2-chip k2-chip--tag">开源</span>
            <span class="k2-card__tagmore">+2</span>
          </div>
          <div class="k2-card__when">
            <span class="k2-card__when-plan">每小时一次</span>
            <span class="k2-card__when-next">下次 12:30</span>
          </div>
          <div class="k2-card__foot">
            <span class="k2-card__meta">3 分钟前抓过</span>
            <button type="button" class="k2-iconbtn k2-card__flipbtn" aria-label="看背面">
              <v-icon size="18">mdi-poll</v-icon>
            </button>
          </div>
        </div>
        <p class="lab__note">
          卡头＝图标容器 + 标题两行 + 右上角动作；下面是等宽详情、关键词行、采集计划两行、卡脚。
        </p>
      </div>
    </div>

    <div>
      <div class="lab__h3">卡片变体 · 默认 / 顶部色晕 / 扁平 / 选中 / 可点</div>
      <div class="lab-parts">
        <div class="lab-row">
          <div class="k2-card k2-card--sm lab-box-sm">
            <span class="k2-card__title">默认</span>
          </div>
          <div class="k2-card k2-card--sm k2-card--wash lab-box-sm">
            <span class="k2-card__title">色晕</span>
          </div>
          <div class="k2-card k2-card--sm k2-card--flat lab-box-sm">
            <span class="k2-card__title">扁平</span>
          </div>
          <div class="k2-card k2-card--sm k2-card--current lab-box-sm">
            <span class="k2-card__title">选中</span>
          </div>
        </div>
        <p class="lab__note">
          可点卡片（悬停抬起、整卡触发）就是默认卡加 k2-card--interactive，点一下试试。
        </p>
        <div class="k2-card k2-card--interactive lab-box-md">
          <span class="k2-card__title">可点</span>
          <span class="k2-card__sub">整卡都能点</span>
        </div>
      </div>
    </div>

    <div>
      <div class="lab__h3">数值与指标</div>
      <div class="lab-parts">
        <div class="k2-card k2-card--flat">
          <div class="k2-metric">
            <span class="k2-metric__label">今日事件</span>
            <span class="k2-metric__line">
              <span class="k2-num">186<span class="k2-unit">条</span></span>
              <span class="k2-row__sub">较昨日 +12%</span>
            </span>
            <span class="k2-metric__accent" />
          </div>
        </div>
        <div class="lab-row">
          <span class="k2-num k2-num--sm">24<span class="k2-unit">个</span></span>
          <span class="k2-num k2-num--text">连通</span>
        </div>
        <p class="lab__note">
          大数字走等宽字、单位缩小；数值位放的是词（连通这种）时回 sans，字号降一档。
        </p>
      </div>
    </div>

    <div>
      <div class="lab__h3">小菜单 · 卡片右上角那个 ⋯</div>
      <div class="lab-parts">
        <div class="k2-menu lab-menu">
          <button type="button" class="k2-menu__item">
            <v-icon size="18">mdi-pencil-outline</v-icon>编辑
          </button>
          <button type="button" class="k2-menu__item">
            <v-icon size="18">mdi-pause</v-icon>停用
          </button>
          <button type="button" class="k2-menu__item k2-menu__item--danger">
            <v-icon size="18">mdi-delete-outline</v-icon>删除
          </button>
        </div>
      </div>
    </div>

    <div>
      <div class="lab__h3">图标尺寸与关联高亮</div>
      <div class="lab-parts">
        <div class="lab-row">
          <v-icon class="k2-icon--sm">mdi-rss</v-icon>
          <v-icon class="k2-icon--md">mdi-rss</v-icon>
          <v-icon class="k2-icon--lg">mdi-rss</v-icon>
        </div>
        <div class="lab-row">
          <span class="k2-mark">桌面端点亮一项，同组一起亮</span>
          <span class="k2-ellipsis lab-truncate">太长的名字会被省略号截断而不是换行</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这一页只摆静态零件，不需要状态：按钮点了不做事是有意的（看形状，不看行为）。
</script>
