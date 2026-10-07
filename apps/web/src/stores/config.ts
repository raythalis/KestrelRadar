import { SETTINGS_DEFAULTS, type Settings } from '@kestrel/contracts'

import type {
  ConfigSnapshot,
  CardStats,
  CreateActionInput,
  CreateChannelInput,
  CreateDiscoveryInput,
  CreateMessageTemplateInput,
  CreateModelProviderInput,
  CreateMonitorInput,
  DiscoveryTestResult,
  Group,
  MessageTemplate,
  ModelProvider,
  UpdateActionInput,
  UpdateDiscoveryInput,
  UpdateChannelInput,
  UpdateMessageTemplateInput,
  UpdateModelProviderInput,
  UpdateMonitorInput,
  UpdateSettingsInput,
} from '@kestrel/contracts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  createAction as createActionApi,
  createChannel as createChannelApi,
  createProvider as createProviderApi,
  createTemplate as createTemplateApi,
  createDiscovery as createDiscoveryApi,
  createGroup as createGroupApi,
  createMonitor as createMonitorApi,
  fetchAvailableModels as fetchAvailableModelsApi,
  fetchConfig,
  removeAction as removeActionApi,
  removeDiscovery as removeDiscoveryApi,
  removeGroup as removeGroupApi,
  removeChannel as removeChannelApi,
  removeMonitor as removeMonitorApi,
  removeProvider as removeProviderApi,
  removeTemplate as removeTemplateApi,
  resetSetting as resetSettingApi,
  testDiscovery as testDiscoveryApi,
  updateAction as updateActionApi,
  updateDiscovery as updateDiscoveryApi,
  updateGroup as updateGroupApi,
  updateChannel as updateChannelApi,
  updateMonitor as updateMonitorApi,
  updateProvider as updateProviderApi,
  updateSettings as updateSettingsApi,
  updateTemplate as updateTemplateApi,
} from '@/api/config'
import { fetchCardStats } from '@/api/cardStats'
import { ApiError } from '@/api/http'

export const useConfigStore = defineStore('config', () => {
  const snapshot = ref<ConfigSnapshot | null>(null)
  /** 卡片背面的按对象汇总（只有发现 / 监听 / 动作三张，跟配置一起加载） */
  const cardStats = ref<CardStats | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')

  const groups = computed(() => snapshot.value?.groups ?? [])
  const channels = computed(() => snapshot.value?.channels ?? [])
  const templates = computed<MessageTemplate[]>(() => snapshot.value?.templates ?? [])
  const settings = computed<Settings>(() => snapshot.value?.settings ?? SETTINGS_DEFAULTS)
  const providers = computed<ModelProvider[]>(() => snapshot.value?.modelProviders ?? [])
  const providerName = (providerId: string): string =>
    providers.value.find((provider) => provider.id === providerId)?.name ?? ''

  const counts = computed(() => ({
    groups: snapshot.value?.groups.length ?? 0,
    discoveries: snapshot.value?.discoveries.length ?? 0,
    monitors: snapshot.value?.monitors.length ?? 0,
    actions: snapshot.value?.actions.length ?? 0,
    channels: snapshot.value?.channels.length ?? 0,
  }))

  function discoveriesOf(groupId: string) {
    return (snapshot.value?.discoveries ?? []).filter((item) => item.groupId === groupId)
  }

  function monitorsOf(groupId: string) {
    return (snapshot.value?.monitors ?? []).filter((item) => item.groupId === groupId)
  }

  function actionsOf(groupId: string) {
    return (snapshot.value?.actions ?? []).filter((item) => item.groupId === groupId)
  }

  function templateById(id: string | null): MessageTemplate | null {
    if (!id) return null
    return templates.value.find((template) => template.id === id) ?? null
  }

  /** 动作没选模板（= 系统内置）时，界面上显示内置默认模板的正文 */
  function resolvedTemplateContent(id: string | null): string {
    const found = templateById(id)
    if (found) return found.content
    return templates.value.find((template) => template.builtin)?.content ?? ''
  }

  function channelName(channelId: string): string {
    return channels.value.find((channel) => channel.id === channelId)?.name ?? ''
  }

  /** 这个动作被哪些监听引用（为空表示跟随分组、被所有监听用） */
  function monitorNamesUsingAction(actionId: string): string[] {
    return (snapshot.value?.monitors ?? [])
      .filter((monitor) => monitor.actionIds.includes(actionId))
      .map((monitor) => monitor.name)
  }

  async function load(): Promise<void> {
    loading.value = true
    errorMessage.value = ''
    // 汇总只是卡片背面，拿不到不影响配置本身
    const [snapshotResult, statsResult] = await Promise.allSettled([
      fetchConfig(),
      fetchCardStats(),
    ])
    try {
      if (snapshotResult.status === 'fulfilled') snapshot.value = snapshotResult.value
      else throw snapshotResult.reason
    } catch (error) {
      errorMessage.value = error instanceof ApiError ? error.message : '读取配置失败'
    } finally {
      loading.value = false
    }
    if (statsResult.status === 'fulfilled') cardStats.value = statsResult.value
  }

  /** 所有写操作都走这里：出错只记消息，不打断界面 */
  async function write(work: () => Promise<unknown>): Promise<boolean> {
    saving.value = true
    errorMessage.value = ''
    try {
      await work()
      await load()
      return true
    } catch (error) {
      errorMessage.value = error instanceof ApiError ? error.message : '操作失败'
      return false
    } finally {
      saving.value = false
    }
  }

  const createGroup = (input: { name: string; description: string }) =>
    write(() => createGroupApi({ ...input, enabled: true }))

  const saveGroup = (id: string, patch: Partial<Pick<Group, 'name' | 'description'>>) =>
    write(() => updateGroupApi(id, patch))

  /** 分组可以批量删除；后端没有批量接口，这里逐条删 */
  const removeGroups = (ids: string[]) =>
    write(async () => {
      for (const id of ids) await removeGroupApi(id)
    })

  const setGroupEnabled = (group: Group, enabled: boolean) =>
    write(() => updateGroupApi(group.id, { enabled }))

  const createDiscovery = (input: CreateDiscoveryInput) => write(() => createDiscoveryApi(input))

  const saveDiscovery = (id: string, patch: UpdateDiscoveryInput) =>
    write(() => updateDiscoveryApi(id, patch))

  const createMonitor = (input: CreateMonitorInput) => write(() => createMonitorApi(input))

  const saveMonitor = (id: string, patch: UpdateMonitorInput) =>
    write(() => updateMonitorApi(id, patch))

  const createAction = (input: CreateActionInput) => write(() => createActionApi(input))

  const saveAction = (id: string, patch: UpdateActionInput) =>
    write(() => updateActionApi(id, patch))

  const createTemplate = (input: CreateMessageTemplateInput) =>
    write(() => createTemplateApi(input))

  const saveTemplate = (id: string, patch: UpdateMessageTemplateInput) =>
    write(() => updateTemplateApi(id, patch))

  const removeTemplate = (id: string) => write(() => removeTemplateApi(id))

  const saveSettings = (patch: UpdateSettingsInput) => write(() => updateSettingsApi(patch))

  const resetSetting = (key: string) => write(() => resetSettingApi(key))

  const createChannel = (input: CreateChannelInput) => write(() => createChannelApi(input))

  const saveChannel = (id: string, patch: UpdateChannelInput) =>
    write(() => updateChannelApi(id, patch))

  const removeChannel = (id: string) => write(() => removeChannelApi(id))

  /** 某个供应商现场报回来的模型清单；问不到就是空数组，界面上静默 */
  async function availableModels(providerId: string): Promise<string[]> {
    try {
      return await fetchAvailableModelsApi(providerId)
    } catch {
      return []
    }
  }

  const createProvider = (input: CreateModelProviderInput) => write(() => createProviderApi(input))

  const saveProvider = (id: string, patch: UpdateModelProviderInput) =>
    write(() => updateProviderApi(id, patch))

  const removeProvider = (id: string) => write(() => removeProviderApi(id))

  const setDiscoveryEnabled = (id: string, enabled: boolean) =>
    write(() => updateDiscoveryApi(id, { enabled }))

  const removeDiscovery = (id: string) => write(() => removeDiscoveryApi(id))

  /** 手动测试：结果直接返回给卡片就地显示 */
  async function testDiscovery(id: string): Promise<DiscoveryTestResult | null> {
    saving.value = true
    errorMessage.value = ''
    try {
      const result = await testDiscoveryApi(id)
      await load()
      return result
    } catch (error) {
      errorMessage.value = error instanceof ApiError ? error.message : '测试失败'
      return null
    } finally {
      saving.value = false
    }
  }

  const setMonitorEnabled = (id: string, enabled: boolean) =>
    write(() => updateMonitorApi(id, { enabled }))

  const removeMonitor = (id: string) => write(() => removeMonitorApi(id))

  const setActionEnabled = (id: string, enabled: boolean) =>
    write(() => updateActionApi(id, { enabled }))

  const removeAction = (id: string) => write(() => removeActionApi(id))

  return {
    snapshot,
    cardStats,
    loading,
    saving,
    errorMessage,
    groups,
    channels,
    templates,
    settings,
    counts,
    discoveriesOf,
    monitorsOf,
    actionsOf,
    channelName,
    templateById,
    resolvedTemplateContent,
    monitorNamesUsingAction,
    createTemplate,
    saveTemplate,
    removeTemplate,
    load,
    createGroup,
    saveGroup,
    removeGroups,
    setGroupEnabled,
    createDiscovery,
    saveDiscovery,
    createMonitor,
    saveMonitor,
    createAction,
    saveAction,
    setDiscoveryEnabled,
    removeDiscovery,
    testDiscovery,
    setMonitorEnabled,
    removeMonitor,
    setActionEnabled,
    removeAction,
    saveSettings,
    resetSetting,
    createChannel,
    saveChannel,
    removeChannel,
    createProvider,
    saveProvider,
    removeProvider,
    availableModels,
    providers,
    providerName,
  }
})
