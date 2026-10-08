import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { FastifyInstance } from 'fastify'

import { AppError } from '../../plugins/errors.ts'
import { contentTypeFor, iconFileExtension, isValidIconFile } from './icon.service.ts'

/** 只读读图：文件名是内容哈希，可以长期缓存 */
export function registerIconRoutes(app: FastifyInstance, dir: string): void {
  app.get<{ Params: { file: string } }>('/icons/:file', async (request, reply) => {
    const { file } = request.params
    if (!isValidIconFile(file)) throw AppError.notFound('没有这张图标')
    let body: Buffer
    try {
      body = await readFile(join(dir, file))
    } catch {
      throw AppError.notFound('没有这张图标')
    }
    return reply
      .type(contentTypeFor(iconFileExtension(file)))
      .header('cache-control', 'public, max-age=31536000, immutable')
      .send(body)
  })
}
