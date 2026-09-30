export default {
  app: {
    name: 'Kestrel',
    tagline: 'Personal watching and event response',
  },
  nav: {
    dashboard: 'Overview',
    groups: 'Watch groups',
    settings: 'Settings',
  },
  common: {
    enabled: 'Enabled',
    disabled: 'Disabled',
    unknown: 'Unknown',
    refresh: 'Refresh',
    loading: 'Loading…',
    empty: 'Nothing here yet',
    cancel: 'Cancel',
    save: 'Save',
  },
  datasource: {
    sample: 'Sample data',
    api: 'From backend',
    sampleHint:
      'The backend API is not wired yet; this screen shows built-in sample data. It only illustrates the UI structure and does not mean collection or sending works.',
    apiHint: 'Data comes from /api/v2.',
    loadFailed: 'Backend request failed, fell back to sample data: {message}',
  },
  dashboard: {
    title: 'Overview',
    subtitle: 'Groups, sources, watchers and actions at a glance',
    stats: {
      groups: 'Groups',
      sources: 'Sources',
      watchers: 'Watchers',
      actions: 'Actions',
    },
    groupsTable: {
      name: 'Group',
      cards: 'Cards',
      status: 'Status',
    },
    empty: 'No groups yet.',
  },
  groups: {
    title: 'Watch groups',
    subtitle:
      'One group = one thing you care about; sources are collected at group level, watchers keep independent event streams',
    cards: {
      source: 'Source',
      watcher: 'Watcher',
      action: 'Action',
    },
    connector: 'Connector',
    focus: 'Focus',
    channel: 'Channel',
    trigger: 'Trigger',
    triggerInstant: 'On event',
    triggerDigest: 'Scheduled digest',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Interface preferences (stored in this browser)',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    apiBase: 'API prefix',
    runtime: 'Runtime',
    frontendVersion: 'Frontend version',
  },
}
