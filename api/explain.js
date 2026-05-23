async function getPostContent(postId) {
  try {
    const res = await fetch('https://mikeq95.github.io/blog/rss.xml')
    const xml = await res.text()
    const items = xml.split('<item>')
    for (const item of items) {
      if (item.includes(postId)) {
        const contentMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)
        if (contentMatch) {
          return contentMatch[1].replace(/<[^>]+>/g, '').slice(0, 3000)
        }
        const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)
        if (descMatch) {
          return descMatch[1].replace(/<[^>]+>/g, '').slice(0, 3000)
        }
      }
    }
  } catch (e) {
    console.error('RSS fetch failed:', e)
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages, word, context, postId, provider, model, apiKey, systemPrompt } = req.body

  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: '缺少 messages 参数' })
  if (!apiKey) return res.status(400).json({ error: '缺少 API Key' })

  let articleContent = null
  if (postId) {
    articleContent = await getPostContent(postId)
  }

  let finalSystemPrompt = systemPrompt || ''
  if (articleContent) {
    finalSystemPrompt += `\n\n文章全文：\n${articleContent}`
  } else if (context) {
    finalSystemPrompt += `\n\n上下文：${context}`
  }

  try {
    if (provider === 'deepseek') {
      let apiMessages = messages;
      if (model === 'deepseek-reasoner') {
        // deepseek-reasoner 不支持 system role，需要将其合并到第一个 user message 中
        const firstMessage = messages[0];
        apiMessages = [
          { role: 'user', content: finalSystemPrompt + '\n\n' + firstMessage.content },
          ...messages.slice(1)
        ];
      } else {
        apiMessages = [{ role: 'system', content: finalSystemPrompt }, ...messages];
      }

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: apiMessages
        })
      })

      if (!response.ok) return res.status(401).json({ error: 'Key 无效，请检查' })

      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Transfer-Encoding', 'chunked')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const text = json.choices?.[0]?.delta?.content
            if (text) res.write(text)
          } catch {}
        }
      }
      res.end()

    } else if (provider === 'claude') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          stream: true,
          system: finalSystemPrompt,
          messages
        })
      })

      if (!response.ok) return res.status(401).json({ error: 'Key 无效，请检查' })

      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Transfer-Encoding', 'chunked')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          try {
            const json = JSON.parse(data)
            const text = json.delta?.text
            if (text) res.write(text)
          } catch {}
        }
      }
      res.end()
    }
  } catch (e) {
    res.status(500).json({ error: '服务器错误：' + e.message })
  }
}
