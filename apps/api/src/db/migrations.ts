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
