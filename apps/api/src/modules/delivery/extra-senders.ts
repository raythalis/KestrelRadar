import { createConnection, type Socket } from 'node:net'
import { connect as tlsConnect, type TLSSocket } from 'node:tls'
import { createHmac } from 'node:crypto'

import type { Channel } from '@kestrel/contracts'

import {
  DeliveryError,
  resolveTimeout,
  type DeliverableMessage,
  type DeliverySender,
  type TimeoutOption,
} from './sender.ts'

type FetchLike = typeof fetch

function requireType(message: DeliverableMessage, type: Channel['type']): void {
  if (message.channel.type !== type)
    throw new DeliveryError('delivery.channelUnavailable', `渠道类型不是 ${type}`)
}

function webhookSender(
  type: 'wecom' | 'dingtalk' | 'feishu',
  options: { fetchImpl?: FetchLike; timeoutSeconds?: TimeoutOption } = {},
): DeliverySender {
  const doFetch = options.fetchImpl ?? fetch
  return {
    async send(message) {
      requireType(message, type)
      const url = message.channel.config.url
      if (!url)
        throw new DeliveryError('delivery.channelUnavailable', `${type} 渠道还没填 Webhook 地址`)
      let target = url
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      const text = message.text
      const signing = type === 'dingtalk' || type === 'feishu'
      const timestamp = signing
        ? String(type === 'dingtalk' ? Date.now() : Math.floor(Date.now() / 1000))
        : ''
      const sign =
        signing && message.channel.config.sign === 'true' && message.secret
          ? type === 'feishu'
            ? createHmac('sha256', `${timestamp}\n${message.secret}`).update('').digest('base64')
            : createHmac('sha256', message.secret)
                .update(`${timestamp}\n${message.secret}`)
                .digest('base64')
          : ''
      if (type === 'dingtalk' && sign)
        target += `${target.includes('?') ? '&' : '?'}timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
      const body =
        type === 'wecom'
          ? { msgtype: 'text', text: { content: text } }
          : type === 'dingtalk'
            ? { msgtype: 'text', text: { content: text }, at: { isAtAll: false } }
            : { ...(sign ? { timestamp, sign } : {}), msg_type: 'text', content: { text } }
      const controller = new AbortController()
      const timer = setTimeout(
        () => controller.abort(),
        resolveTimeout(options.timeoutSeconds, 15) * 1000,
      )
      try {
        const response = await doFetch(target, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = (await response.json().catch(() => null)) as {
          errcode?: number
          code?: number
        } | null
        if (payload && payload.errcode !== undefined && payload.errcode !== 0)
          throw new Error(`errcode ${payload.errcode}`)
        if (payload && payload.code !== undefined && payload.code !== 0)
          throw new Error(`code ${payload.code}`)
      } catch (error) {
        if ((error as Error).name === 'AbortError')
          throw new DeliveryError('delivery.channelUnavailable', `${type} 超时`)
        throw new DeliveryError(
          type === 'wecom'
            ? 'delivery.wecomFailed'
            : type === 'dingtalk'
              ? 'delivery.dingtalkFailed'
              : 'delivery.feishuFailed',
          (error as Error).message || undefined,
        )
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

export const createWecomSender = (
  options: { fetchImpl?: FetchLike; timeoutSeconds?: TimeoutOption } = {},
) => webhookSender('wecom', options)
export const createDingtalkSender = (
  options: { fetchImpl?: FetchLike; timeoutSeconds?: TimeoutOption } = {},
) => webhookSender('dingtalk', options)
export const createFeishuSender = (
  options: { fetchImpl?: FetchLike; timeoutSeconds?: TimeoutOption } = {},
) => webhookSender('feishu', options)

interface SmtpConnection {
  socket: Socket | TLSSocket
  read(): Promise<string>
  write(command: string): Promise<void>
  upgradeTls(): Promise<void>
  close(): void
}

function smtpConnection(
  host: string,
  port: number,
  secure: boolean,
  timeoutMs: number,
): Promise<SmtpConnection> {
  return new Promise((resolve, reject) => {
    let socket: Socket | TLSSocket = secure
      ? tlsConnect({ host, port, rejectUnauthorized: true })
      : createConnection({ host, port })
    const chunks: Buffer[] = []
    const onData = (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk))
      if (waiter) {
        const text = Buffer.concat(chunks).toString('utf8')
        chunks.length = 0
        const done = waiter
        waiter = null
        done(text)
      }
    }
    let waiter: ((value: string) => void) | null = null
    let failure: ((error: Error) => void) | null = reject
    const timer = setTimeout(() => socket.destroy(new Error('SMTP timeout')), timeoutMs)
    socket.on('data', onData)
    socket.once('error', (error) => failure?.(error))
    socket.once('connect', () => {
      clearTimeout(timer)
      failure = null
      resolve({
        socket,
        read: () =>
          new Promise((ok, bad) => {
            const text = Buffer.concat(chunks).toString('utf8')
            if (text) {
              chunks.length = 0
              ok(text)
            } else {
              waiter = ok
              socket.once('error', bad)
            }
          }),
        write: (command) =>
          new Promise((ok, bad) =>
            socket.write(`${command}\r\n`, (error) => (error ? bad(error) : ok())),
          ),
        upgradeTls: () =>
          new Promise((ok, bad) => {
            socket.removeListener('data', onData)
            chunks.length = 0
            const upgraded = tlsConnect({
              socket,
              host,
              servername: host,
              rejectUnauthorized: true,
            })
            const timeout = setTimeout(
              () => upgraded.destroy(new Error('SMTP TLS timeout')),
              timeoutMs,
            )
            upgraded.once('secureConnect', () => {
              clearTimeout(timeout)
              socket = upgraded
              socket.on('data', onData)
              ok()
            })
            upgraded.once('error', (error) => {
              clearTimeout(timeout)
              bad(error)
            })
          }),
        close: () => socket.end(),
      })
    })
  })
}

export function createEmailSender(
  options: { timeoutSeconds?: TimeoutOption; connect?: typeof smtpConnection } = {},
): DeliverySender {
  const connect = options.connect ?? smtpConnection
  return {
    async send(message) {
      requireType(message, 'email')
      const { host, port = '587', secure = 'false', from, to, username } = message.channel.config
      const password = message.secret
      if (!host || !from || !to || !password)
        throw new DeliveryError('delivery.emailFailed', '邮件 SMTP 配置不完整')
      const smtp = await connect(
        host,
        Number(port),
        secure === 'true',
        resolveTimeout(options.timeoutSeconds, 15) * 1000,
      )
      try {
        const expect = async (code: string) => {
          const response = await smtp.read()
          if (!response.startsWith(code)) throw new Error(response.trim())
        }
        await expect('220')
        await smtp.write('EHLO kestrel')
        const greeting = await smtp.read()
        if (!greeting.startsWith('250')) throw new Error(greeting.trim())
        if (secure !== 'true') {
          if (!/STARTTLS/i.test(greeting)) throw new Error('SMTP 服务器不支持 TLS')
          await smtp.write('STARTTLS')
          await expect('220')
          await smtp.upgradeTls()
          await smtp.write('EHLO kestrel')
          await expect('250')
        }
        await smtp.write(`AUTH LOGIN`)
        await expect('334')
        await smtp.write(Buffer.from(username ?? from).toString('base64'))
        await expect('334')
        await smtp.write(Buffer.from(password).toString('base64'))
        await expect('235')
        await smtp.write(`MAIL FROM:<${from}>`)
        await expect('250')
        await smtp.write(`RCPT TO:<${to}>`)
        await expect('250')
        await smtp.write('DATA')
        await expect('354')
        await smtp.write(
          `From: ${from}\r\nTo: ${to}\r\nSubject: ${message.title}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${message.text}\r\n.`,
        )
        await expect('250')
        await smtp.write('QUIT')
      } catch (error) {
        const detail = (error as Error).message || ''
        const code = /timeout/i.test(detail)
          ? 'delivery.emailTimeout'
          : /auth|535|530|534/i.test(detail)
            ? 'delivery.emailAuth'
            : /tls|starttls|certificate/i.test(detail)
              ? 'delivery.emailTls'
              : 'delivery.emailFailed'
        throw new DeliveryError(code, undefined)
      } finally {
        smtp.close()
      }
    },
  }
}
