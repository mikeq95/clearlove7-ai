async function getPostContent(postId) {
  try {
    const res = await fetch('https://mikeq95.github.io/blog/rss.xml')
    const xml = await res.text()
    const items = xml.split('<item>')
    for (const item of items) {
      if (item.includes(postId)) {
        const contentMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)
        if (contentMatch) return contentMatch[1].replace(/<[^>]+>/g, '').slice(0, 3000)
        const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)
        if (descMatch) return descMatch[1].replace(/<[^>]+>/g, '').slice(0, 3000)
      }
    }
  } catch (e) {
    console.error('RSS fetch failed:', e)
  }
  return null
}

// Stream SSE response → plain text chunks to the client
async function streamOpenAI(response, res, extractText) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Transfer-Encoding', 'chunked')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const text = extractText(JSON.parse(data))
        if (text) res.write(text)
      } catch {}
    }
  }
  res.end()
}

/**
 * Convert a client message `{ role, content, image? }` into the format
 * expected by each provider's API.
 *
 * image is a base64 data-URL: "data:<mime>;base64,<data>"
 */
function toOpenAIMessage(msg) {
  if (!msg.image) return { role: msg.role, content: msg.content }
  const parts = [
    { type: 'image_url', image_url: { url: msg.image } },
  ]
  if (msg.content) parts.push({ type: 'text', text: msg.content })
  return { role: msg.role, content: parts }
}

function toClaudeMessage(msg) {
  if (!msg.image) return { role: msg.role, content: msg.content }
  // Extract mime type and base64 data from the data-URL
  const match = msg.image.match(/^data:([^;]+);base64,(.+)$/)
  const mediaType = match ? match[1] : 'image/jpeg'
  const data = match ? match[2] : ''
  const parts = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
  ]
  if (msg.content) parts.push({ type: 'text', text: msg.content })
  return { role: msg.role, content: parts }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages, word, context, postId, provider, model, apiKey, systemPrompt } = req.body

  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: '缺少 messages 参数' })
  if (!apiKey) return res.status(400).json({ error: '缺少 API Key' })

  let finalSystemPrompt = systemPrompt || ''
  if (postId) {
    const articleContent = await getPostContent(postId)
    if (articleContent) finalSystemPrompt += `\n\n文章全文：\n${articleContent}`
  } else if (context) {
    finalSystemPrompt += `\n\n上下文：${context}`
  }

  try {
    // ── DeepSeek ──────────────────────────────────────────────────────────────
    if (provider === 'deepseek') {
      let apiMessages
      if (model === 'deepseek-reasoner') {
        // deepseek-reasoner 不支持 system role
        apiMessages = [
          { role: 'user', content: finalSystemPrompt + '\n\n' + messages[0].content },
          ...messages.slice(1).map(m => ({ role: m.role, content: m.content })),
        ]
      } else {
        apiMessages = [
          ...(finalSystemPrompt ? [{ role: 'system', content: finalSystemPrompt }] : []),
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ]
      }

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, stream: true, messages: apiMessages }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return res.status(response.status).json({ error: err?.error?.message || 'Key 无效，请检查' })
      }
      return streamOpenAI(response, res, json => json.choices?.[0]?.delta?.content)

    // ── Claude ────────────────────────────────────────────────────────────────
    } else if (provider === 'claude') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          stream: true,
          ...(finalSystemPrompt ? { system: finalSystemPrompt } : {}),
          messages: messages.map(toClaudeMessage),
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return res.status(response.status).json({ error: err?.error?.message || 'Key 无效，请检查' })
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Transfer-Encoding', 'chunked')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try { const text = JSON.parse(line.slice(6))?.delta?.text; if (text) res.write(text) } catch {}
        }
      }
      res.end()

    // ── GLM (智谱 AI, OpenAI-compatible) ──────────────────────────────────────
    } else if (provider === 'glm') {
      const apiMessages = [
        ...(finalSystemPrompt ? [{ role: 'system', content: finalSystemPrompt }] : []),
        ...messages.map(toOpenAIMessage),
      ]
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, stream: true, max_tokens: 4096, messages: apiMessages }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        return res.status(response.status).json({ error: err?.error?.message || 'Key 无效，请检查' })
      }
      return streamOpenAI(response, res, json => json.choices?.[0]?.delta?.content)
    }

  } catch (e) {
    res.status(500).json({ error: '服务器错误：' + e.message })
  }
}
