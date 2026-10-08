export const RSS_TWO_ITEMS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>示例源</title>
    <link>https://example.com</link>
    <item>
      <title><![CDATA[第一篇文章]]></title>
      <link>https://example.com/post/1?utm_source=rss&amp;utm_medium=feed</link>
      <description><![CDATA[<p>第一篇的摘要内容。</p>]]></description>
      <pubDate>Tue, 30 Sep 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>第二篇文章</title>
      <link>https://example.com/post/2</link>
      <description>第二篇没有发布时间。</description>
    </item>
  </channel>
</rss>
`

export const RSS_THREE_ITEMS = RSS_TWO_ITEMS.replace(
  '  </channel>',
  `  <item>
      <title>第三篇文章</title>
      <link>https://example.com/post/3</link>
      <description>刚刚发布的一篇。</description>
      <pubDate>Wed, 01 Oct 2026 03:00:00 GMT</pubDate>
    </item>
  </channel>`,
)

export const ATOM_ONE_ITEM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom 示例</title>
  <entry>
    <title>Atom 里的一篇</title>
    <link rel="alternate" type="text/html" href="https://example.com/atom/1"/>
    <summary>Atom 摘要。</summary>
    <updated>2026-10-01T02:00:00Z</updated>
  </entry>
</feed>
`

export const PAGE_WITH_FEED_LINK = `<!DOCTYPE html>
<html>
  <head>
    <title>示例站点</title>
    <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss" />
  </head>
  <body><h1>站点首页</h1></body>
</html>
`

export const PAGE_WITHOUT_FEED = `<!DOCTYPE html>
<html>
  <head><title>没有订阅源的页面</title></head>
  <body><p>正文。</p></body>
</html>
`
