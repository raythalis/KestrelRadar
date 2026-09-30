import { SETTINGS_DEFAULTS, type Settings } from '@kestrel/contracts'
import type {
  ConfigSnapshot,
  CreateMessageTemplateInput,
  MessageTemplate,
  CreateActionInput,
  CreateDiscoveryInput,
  CreateMonitorInput,
  DiscoveryTestResult,
  Group,
  UpdateActionInput,
  UpdateDiscoveryInput,
  UpdateMessageTemplateInput,
  UpdateMonitorInput,
} from '@kestrel/contracts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  createAction as createActionApi,
  createTemplate as createTemplateApi,
  createDiscovery as createDiscoveryApi,
  createGroup as createGroupApi,
  createMonitor as createMonitorApi,
  fetchConfig,
  removeAction as removeActionApi,
  removeDiscovery as removeDiscoveryApi,
  removeGroup as removeGroupApi,
  removeMonitor as removeMonitorApi,
  removeTemplate as removeTemplateApi,
  testDiscovery as testDiscoveryApi,
  updateAction as updateActionApi,
  updateDiscovery as updateDiscoveryApi,
  updateGroup as updateGroupApi,
  updateMonitor as updateMonitorApi,
  updateTemplate as updateTemplateApi,
} from '@/api/config'
import { ApiError } from '@/api/http'

export const useConfigStore = defineStore('config', () => {
  const snapshot = ref<ConfigSnapshot | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')

  const groups = computed(() => snapshot.value?.groups ?? [])
  const channels = computed(() => snapshot.value?.channels ?? [])
  const templates = computed<MessageTemplate[]>(() => snapshot.value?.templates ?? [])
  const settings = computed<Settings>(() => snapshot.value?.settings ?? SETTINGS_DEFAULTS)

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

  /** 动作没选模板（= 系统内置）时，界面上显示跟随界面语言的那套内置内容 */
  function resolvedTemplateContent(id: string | null): string {
    const found = templateById(id)
    if (found) return found.content
    const builtin =
      templates.value.find(
        (template) => template.builtin && template.id.endsWith(settings.value.language),
      ) ?? templates.value.find((template) => template.builtin)
    return builtin?.content ?? ''
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
    try {
      snapshot.value = await fetchConfig()
    } catch (error) {
      errorMessage.value = error instanceof ApiError ? error.message : '读取配置失败'
    } finally {
      loading.value = false
    }
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
  }
})
