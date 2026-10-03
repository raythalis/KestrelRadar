import type { DatabaseSync } from 'node:sqlite'

export interface Migration {
  readonly name: string
  readonly sql: string
}

/**
 * 迁移按顺序追加，永不修改已发布的条目。
 * 库里的 user_version 记录已执行到第几条。
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    name: '001-config-layer',
    sql: `
      create table groups (
        id text primary key,
        name text not null,
        description text not null default '',
        enabled integer not null default 1,
        created_at text not null,
        updated_at text not null
      );

      create table discoveries (
        id text primary key,
        group_id text not null references groups (id) on delete cascade,
        name text not null,
        kind text not null check (kind in ('rsshub', 'rss', 'web')),
        target text not null,
        access_key text,
        cron_expression text not null,
        enabled integer not null default 1,
        created_at text not null,
        updated_at text not null
      );
      create index idx_discoveries_group on discoveries (group_id);

      create table channels (
        id text primary key,
        name text not null,
        type text not null check (type in ('telegram', 'webhook')),
        config text not null default '{}',
        secret text,
        enabled integer not null default 1,
        created_at text not null,
        updated_at text not null
      );

      create table actions (
        id text primary key,
        group_id text not null references groups (id) on delete cascade,
        name text not null,
        trigger_type text not null check (trigger_type in ('instant', 'digest')),
        channel_id text not null references channels (id) on delete restrict,
        cron_expression text,
        template text not null default '',
        include_delivered integer not null default 0,
        enabled integer not null default 1,
        created_at text not null,
        updated_at text not null
      );
      create index idx_actions_group on actions (group_id);
      create index idx_actions_channel on actions (channel_id);

      create table monitors (
        id text primary key,
        group_id text not null references groups (id) on delete cascade,
        name text not null,
        mode text not null check (mode in ('follow_global', 'algorithm', 'algorithm_llm')),
        sensitivity text not null check (sensitivity in ('low', 'medium', 'high')),
        intent_text text not null default '',
        include_keywords text not null default '[]',
        exclude_keywords text not null default '[]',
        use_global_excludes integer not null default 1,
        enabled integer not null default 1,
        created_at text not null,
        updated_at text not null
      );
      create index idx_monitors_group on monitors (group_id);

      create table monitor_actions (
        monitor_id text not null references monitors (id) on delete cascade,
        action_id text not null references actions (id) on delete cascade,
        primary key (monitor_id, action_id)
      );

      create table model_providers (
        id text primary key,
        name text not null,
        kind text not null check (kind in ('openai_compatible', 'ollama')),
        base_url text not null,
        api_key text,
        enabled integer not null default 1,
        sort_order integer not null default 0,
        created_at text not null,
        updated_at text not null
      );

      create table models (
        id text primary key,
        provider_id text not null references model_providers (id) on delete cascade,
        model_name text not null,
        enabled integer not null default 1,
        sort_order integer not null default 0,
        created_at text not null,
        updated_at text not null,
        unique (provider_id, model_name)
      );
      create index idx_models_provider on models (provider_id);

      create table settings (
        key text primary key,
        value text not null,
        updated_at text not null
      );
    `,
  },
  {
    name: '002-collection',
    sql: `
      alter table discoveries add column last_checked_at text;
      alter table discoveries add column route_ok integer;
      alter table discoveries add column content_ok integer;
      alter table discoveries add column last_check_message text not null default '';
      alter table discoveries add column latest_item_at text;
      alter table discoveries add column baseline_established_at text;
      alter table discoveries add column baseline_item_count integer;

      create table items (
        id text primary key,
        discovery_id text not null references discoveries (id) on delete cascade,
        fingerprint text not null,
        title text not null,
        url text,
        summary text not null default '',
        source_published_at text,
        first_seen_at text not null,
        last_seen_at text not null,
        unique (discovery_id, fingerprint)
      );
      create index idx_items_discovery on items (discovery_id);
      create index idx_items_first_seen on items (first_seen_at);
      create index idx_items_source_published on items (source_published_at);
    `,
  },
  {
    name: '003-rsshub-key-global',
    sql: `
      -- RSSHub 只有一个实例，密钥跟实例地址一起放全局设置，发现上不再单独存
      alter table discoveries drop column access_key;
    `,
  },
  {
    name: '004-judgment',
    sql: `
      alter table monitors add column match_mode text not null default 'any';

      create table judgments (
        id text primary key,
        item_id text not null references items (id) on delete cascade,
        monitor_id text not null references monitors (id) on delete cascade,
        decision text not null check (decision in ('pass', 'drop')),
        band text not null check (band in ('high', 'gray', 'low')),
        score integer not null default 0,
        matched_keywords text not null default '[]',
        layer text not null check (layer in ('keywords', 'excludes', 'score', 'llm')),
        reasons text not null default '[]',
        llm_reason text,
        created_at text not null,
        unique (item_id, monitor_id)
      );
      create index idx_judgments_monitor on judgments (monitor_id, decision);
      create index idx_judgments_item on judgments (item_id);
    `,
  },
  {
    name: '005-events',
    sql: `
      create table events (
        id text primary key,
        group_id text not null references groups (id) on delete cascade,
        title text not null,
        url text,
        url_key text,
        first_item_at text not null,
        last_item_at text not null,
        status text not null default 'new' check (status in ('new', 'delivered', 'updated', 'archived')),
        delivered_at text,
        created_at text not null,
        updated_at text not null
      );
      create index idx_events_group on events (group_id, status);
      create index idx_events_last_item on events (last_item_at);
      create index idx_events_url_key on events (group_id, url_key);

      create table event_items (
        event_id text not null references events (id) on delete cascade,
        item_id text not null references items (id) on delete cascade,
        discovery_id text not null references discoveries (id) on delete cascade,
        added_at text not null,
        primary key (event_id, item_id)
      );
      create index idx_event_items_item on event_items (item_id);
      create index idx_event_items_event on event_items (event_id);
    `,
  },
  {
    name: '006-delivery',
    sql: `
      alter table actions add column merge_messages integer not null default 1;

      create table deliveries (
        id text primary key,
        action_id text not null references actions (id) on delete cascade,
        channel_id text not null references channels (id) on delete cascade,
        trigger_type text not null check (trigger_type in ('instant', 'digest')),
        event_ids text not null default '[]',
        status text not null check (status in ('sent', 'failed')),
        message text not null default '',
        error text,
        created_at text not null
      );
      create index idx_deliveries_action on deliveries (action_id, created_at);
      create index idx_deliveries_created on deliveries (created_at);

      create table delivered_items (
        action_id text not null references actions (id) on delete cascade,
        item_id text not null references items (id) on delete cascade,
        delivery_id text not null references deliveries (id) on delete cascade,
        created_at text not null,
        primary key (action_id, item_id)
      );
      create index idx_delivered_items_item on delivered_items (item_id);
    `,
  },
  {
    name: '007-message-templates',
    sql: `
      create table message_templates (
        id text primary key,
        name text not null,
        content text not null,
        created_at text not null,
        updated_at text not null
      );

      -- 动作不再自己存模板正文，改成引用一个模板：null = 跟随界面语言的内置模板
      alter table actions add column template_id text;
      alter table actions drop column template;
    `,
  },
  {
    name: '008-incidents-and-runs',
    sql: `
      -- 异常：一轮运行里的一个错误就是一条记录（日志语义）。
      -- 库里只留最近若干条（默认 20，隐藏配置项），用户忽视只改 status，不删。
      create table incidents (
        id text primary key,
        kind text not null check (kind in ('collection', 'judgment', 'delivery')),
        target_id text not null,
        target_name text not null default '',
        group_id text,
        group_name text not null default '',
        code text not null,
        message text not null,
        detail text,
        status text not null default 'open' check (status in ('open', 'dismissed')),
        dismissed_at text,
        first_seen_at text not null,
        created_at text not null
      );
      create index idx_incidents_created on incidents (created_at);
      create index idx_incidents_status on incidents (status, created_at);
      create index idx_incidents_lookup on incidents (kind, target_id, code, created_at);

      -- 采集轮次流水：只服务统计（成功率、偶发失败的源数），界面上不直接展示。
      -- 故意不挂外键：源被删掉之后，历史轮次仍然算得出来。
      create table collection_runs (
        id text primary key,
        discovery_id text not null,
        route_ok integer not null,
        content_ok integer not null,
        found_count integer not null default 0,
        new_count integer not null default 0,
        duration_ms integer not null default 0,
        code text,
        message text not null default '',
        created_at text not null
      );
      create index idx_collection_runs_created on collection_runs (created_at);
      create index idx_collection_runs_discovery on collection_runs (discovery_id, created_at);
    `,
  },
  {
    name: '009-discovery-icon',
    sql: `
      -- 网站图标：后端拉回来存本地，库里只记文件名（界面用自有读图接口取）
      alter table discoveries add column icon_file text;
    `,
  },
]

export function runMigrations(conn: DatabaseSync): void {
  const row = conn.prepare('pragma user_version').get() as { user_version: number }
  for (let index = row.user_version; index < MIGRATIONS.length; index += 1) {
    const migration = MIGRATIONS[index]
    if (!migration) throw new Error(`迁移缺失：第 ${index + 1} 条`)
    conn.exec('begin')
    try {
      conn.exec(migration.sql)
      conn.exec(`pragma user_version = ${index + 1}`)
      conn.exec('commit')
    } catch (error) {
      conn.exec('rollback')
      throw new Error(`迁移失败（${migration.name}）：${(error as Error).message}`)
    }
  }
}
