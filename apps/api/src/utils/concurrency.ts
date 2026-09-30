/** 有限并发：一轮抓取同时最多发这么多个请求，避免把源和本机都压垮 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let cursor = 0
  const size = Math.max(1, Math.min(limit, items.length))

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      const item = items[index]
      if (item === undefined) continue
      results[index] = await worker(item)
    }
  }

  await Promise.all(Array.from({ length: size }, () => run()))
  return results
}
