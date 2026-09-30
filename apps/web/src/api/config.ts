import type {
  Action,
  ConfigSnapshot,
  CreateActionInput,
  CreateDiscoveryInput,
  CreateGroupInput,
  CreateMonitorInput,
  CreateMessageTemplateInput,
  Discovery,
  DiscoveryTestResult,
  Group,
  MessageTemplate,
  Monitor,
  UpdateActionInput,
  UpdateDiscoveryInput,
  UpdateGroupInput,
  UpdateMessageTemplateInput,
  UpdateMonitorInput,
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
