import type {
  Action,
  Channel,
  ChannelTestResult,
  ConfigSnapshot,
  CreateChannelInput,
  CreateModelInput,
  CreateModelProviderInput,
  CreateActionInput,
  CreateDiscoveryInput,
  CreateGroupInput,
  CreateMonitorInput,
  CreateMessageTemplateInput,
  Discovery,
  DiscoveryTestResult,
  Group,
  MessageTemplate,
  Model,
  ModelProvider,
  Monitor,
  Settings,
  TelegramChat,
  UpdateActionInput,
  UpdateChannelInput,
  UpdateDiscoveryInput,
  UpdateGroupInput,
  UpdateMessageTemplateInput,
  UpdateModelInput,
  UpdateModelProviderInput,
  UpdateMonitorInput,
  UpdateSettingsInput,
} from '@kestrel/contracts'

import { http } from '@/api/http'

/** GET /api/config —— 分组 / 发现 / 监听 / 动作 / 渠道 / 模型 / 设置的只读快照 */
export async function fetchConfig(): Promise<ConfigSnapshot> {
  const { data } = await http.get<ConfigSnapshot>('/config')
  return data
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const { data } = await http.post<Group>('/groups', input)
  return data
}

export async function updateGroup(id: string, patch: UpdateGroupInput): Promise<Group> {
  const { data } = await http.patch<Group>(`/groups/${id}`, patch)
  return data
}

export async function removeGroup(id: string): Promise<void> {
  await http.delete(`/groups/${id}`)
}

export async function createDiscovery(input: CreateDiscoveryInput): Promise<Discovery> {
  const { data } = await http.post<Discovery>('/discoveries', input)
  return data
}

export async function updateDiscovery(id: string, patch: UpdateDiscoveryInput): Promise<Discovery> {
  const { data } = await http.patch<Discovery>(`/discoveries/${id}`, patch)
  return data
}

export async function removeDiscovery(id: string): Promise<void> {
  await http.delete(`/discoveries/${id}`)
}

/** 手动测试：只探测连通性，不写条目 */
export async function testDiscovery(id: string): Promise<DiscoveryTestResult> {
  const { data } = await http.post<DiscoveryTestResult>(`/discoveries/${id}/test`)
  return data
}

export async function createMonitor(input: CreateMonitorInput): Promise<Monitor> {
  const { data } = await http.post<Monitor>('/monitors', input)
  return data
}

export async function updateMonitor(id: string, patch: UpdateMonitorInput): Promise<Monitor> {
  const { data } = await http.patch<Monitor>(`/monitors/${id}`, patch)
  return data
}

export async function removeMonitor(id: string): Promise<void> {
  await http.delete(`/monitors/${id}`)
}

export async function createAction(input: CreateActionInput): Promise<Action> {
  const { data } = await http.post<Action>('/actions', input)
  return data
}

export async function updateAction(id: string, patch: UpdateActionInput): Promise<Action> {
  const { data } = await http.patch<Action>(`/actions/${id}`, patch)
  return data
}

export async function removeAction(id: string): Promise<void> {
  await http.delete(`/actions/${id}`)
}

export async function createTemplate(input: CreateMessageTemplateInput): Promise<MessageTemplate> {
  const { data } = await http.post<MessageTemplate>('/templates', input)
  return data
}

export async function updateTemplate(
  id: string,
  patch: UpdateMessageTemplateInput,
): Promise<MessageTemplate> {
  const { data } = await http.patch<MessageTemplate>(`/templates/${id}`, patch)
  return data
}

export async function removeTemplate(id: string): Promise<void> {
  await http.delete(`/templates/${id}`)
}

/** 全局设置：只提交改过的项 */
export async function updateSettings(patch: UpdateSettingsInput): Promise<Settings> {
  const { data } = await http.patch<Settings>('/settings', patch)
  return data
}

export async function resetSetting(key: string): Promise<Settings> {
  const { data } = await http.delete<Settings>(`/settings/${key}`)
  return data
}

export async function createChannel(input: CreateChannelInput): Promise<Channel> {
  const { data } = await http.post<Channel>('/channels', input)
  return data
}

export async function updateChannel(id: string, patch: UpdateChannelInput): Promise<Channel> {
  const { data } = await http.patch<Channel>(`/channels/${id}`, patch)
  return data
}

export async function removeChannel(id: string): Promise<void> {
  await http.delete(`/channels/${id}`)
}

/** 真发一条测试消息，有副作用，只能手动点 */
export async function testChannel(id: string): Promise<ChannelTestResult> {
  const { data } = await http.post<ChannelTestResult>(`/channels/${id}/test`)
  return data
}

/** 读取会话：给 token（正在填）或给渠道 id（用库里存的 token） */
export async function readTelegramChats(input: {
  token?: string
  channelId?: string
}): Promise<TelegramChat[]> {
  const { data } = await http.post<TelegramChat[]>('/channels/telegram/chats', input)
  return data
}

export async function createProvider(input: CreateModelProviderInput): Promise<ModelProvider> {
  const { data } = await http.post<ModelProvider>('/model-providers', input)
  return data
}

export async function updateProvider(
  id: string,
  patch: UpdateModelProviderInput,
): Promise<ModelProvider> {
  const { data } = await http.patch<ModelProvider>(`/model-providers/${id}`, patch)
  return data
}

export async function removeProvider(id: string): Promise<void> {
  await http.delete(`/model-providers/${id}`)
}

export async function createModel(providerId: string, input: CreateModelInput): Promise<Model> {
  const { data } = await http.post<Model>(`/model-providers/${providerId}/models`, input)
  return data
}

export async function updateModel(id: string, patch: UpdateModelInput): Promise<Model> {
  const { data } = await http.patch<Model>(`/models/${id}`, patch)
  return data
}

export async function removeModel(id: string): Promise<void> {
  await http.delete(`/models/${id}`)
}
