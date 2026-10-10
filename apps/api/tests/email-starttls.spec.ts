import { describe, expect, it } from 'vitest'
import type { Channel } from '@kestrel/contracts'
import { createEmailSender } from '../src/modules/delivery/extra-senders.ts'

const channel: Channel = {
  id: 'test',
  name: 'mail',
  type: 'email',
  enabled: true,
  hasSecret: true,
  config: {
    host: 'smtp.example.invalid',
    port: '587',
    secure: 'false',
    from: 'sender@example.invalid',
    to: 'receiver@example.invalid',
    username: 'sender@example.invalid',
  },
  createdAt: '',
  updatedAt: '',
}
const message = {
  channel,
  secret: 'test-password-only',
  text: 'hello',
  title: 'test',
  url: null,
  sourceCount: 0,
  eventCount: 0,
  hitAt: null,
}

function mockConnection(capabilities: string) {
  const sent: string[] = []
  const replies = [
    '220 greeting',
    capabilities,
    '220 begin TLS',
    '250-smtp ready\r\n250 AUTH LOGIN',
    '334 username',
    '334 password',
    '235 accepted',
    '250 sender',
    '250 recipient',
    '354 data',
    '250 queued',
  ]
  let upgraded = false
  return {
    sent,
    connection: {
      read: async () => replies.shift() ?? '250 ok',
      write: async (command: string) => {
        sent.push(command)
        if (command.startsWith('AUTH') && !upgraded) throw new Error('AUTH before TLS')
      },
      upgradeTls: async () => {
        upgraded = true
      },
      close: () => {},
    },
  }
}

describe('邮件 SMTP TLS', () => {
  it('SMTP 凭证被拒绝时返回认证失败且不回传原始响应', async () => {
    const { connection } = mockConnection('250-smtp ready\r\n250-STARTTLS\r\n250 AUTH LOGIN')
    const replies = [
      '220 greeting',
      '250-STARTTLS\r\n250 AUTH LOGIN',
      '220 begin TLS',
      '250 AUTH LOGIN',
      '334 username',
      '334 password',
      '535 authentication failed',
    ]
    connection.read = async () => replies.shift() ?? '250 ok'
    await expect(
      createEmailSender({ connect: async () => connection as never }).send(message),
    ).rejects.toMatchObject({ code: 'delivery.emailAuth' })
  })
  it('587 服务器声明 STARTTLS 时先升级再重新 EHLO 与登录', async () => {
    const { sent, connection } = mockConnection('250-smtp ready\r\n250-STARTTLS\r\n250 AUTH LOGIN')
    await createEmailSender({ connect: async () => connection as never }).send(message)
    expect(sent.slice(0, 4)).toEqual(['EHLO kestrel', 'STARTTLS', 'EHLO kestrel', 'AUTH LOGIN'])
  })
  it('服务器不提供 STARTTLS 时不得明文发送用户名密码', async () => {
    const { sent, connection } = mockConnection('250-smtp ready\r\n250 AUTH LOGIN')
    await expect(
      createEmailSender({ connect: async () => connection as never }).send(message),
    ).rejects.toThrow(/TLS/)
    expect(sent.some((line) => line.startsWith('AUTH'))).toBe(false)
  })
})
