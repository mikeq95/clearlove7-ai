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

// Stream SSE response → newline-delimited JSON chunks to the client.
// Each line is either {"c": "<content delta>"} or {"r": "<reasoning delta>"}.
// JSON.stringify escapes any literal newline inside the text itself, so
// splitting the outer stream on a raw "\n" byte is always unambiguous.
async function streamOpenAI(response, res, extractors) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Transfer-Encoding', 'chunked')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let lineBuffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    lineBuffer += decoder.decode(value, { stream: true })
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const r = extractors.reasoning?.(json)
        const c = extractors.content?.(json)
        if (r) res.write(JSON.stringify({ r }) + '\n')
        if (c) res.write(JSON.stringify({ c }) + '\n')
      } catch { /* ignore */ }
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

// Providers that speak the OpenAI chat-completions format as-is (message
// shape, SSE delta shape, image_url content parts) — only the endpoint URL
// differs, so they share one handler.
const OPENAI_COMPATIBLE_ENDPOINTS = {
  glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', // 智谱 AI
  kimi: 'https://api.moonshot.cn/v1/chat/completions', // Moonshot AI
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', // 阿里云百炼
}

async function handleOpenAICompatible(endpoint, { messages, model, apiKey, finalSystemPrompt, res }) {
  const apiMessages = [
    ...(finalSystemPrompt ? [{ role: 'system', content: finalSystemPrompt }] : []),
    ...messages.map(toOpenAIMessage),
  ]
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, stream: true, max_tokens: 4096, messages: apiMessages }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    return res.status(response.status).json({ error: err?.error?.message || 'Key 无效，请检查' })
  }
  return streamOpenAI(response, res, {
    content: json => json.choices?.[0]?.delta?.content,
  })
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

const MAX_MESSAGES = 100
const MAX_CONTENT_LENGTH = 20000
const MAX_IMAGE_LENGTH = 7_000_000 // base64 of a 5MB file is ~6.7MB
const MAX_KEY_LENGTH = 300

// Same-origin check: reject cross-site callers, but allow requests with no
// Origin header (some non-browser/older-browser same-origin requests omit it).
function isAllowedOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return '缺少 messages 参数'
  if (messages.length > MAX_MESSAGES) return '对话过长，请开启新对话'
  for (const m of messages) {
    if (typeof m.content === 'string' && m.content.length > MAX_CONTENT_LENGTH) return '消息内容过长'
    if (m.image && (typeof m.image !== 'string' || m.image.length > MAX_IMAGE_LENGTH)) return '图片过大'
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: '请求来源不允许' })

  const { messages, context, postId, provider, model, apiKey, systemPrompt } = req.body

  const validationError = validateMessages(messages)
  if (validationError) return res.status(400).json({ error: validationError })
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length > MAX_KEY_LENGTH) {
    return res.status(400).json({ error: '缺少 API Key' })
  }

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
      return streamOpenAI(response, res, {
        content: json => json.choices?.[0]?.delta?.content,
        reasoning: json => json.choices?.[0]?.delta?.reasoning_content,
      })

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
          try {
            const text = JSON.parse(line.slice(6))?.delta?.text
            if (text) res.write(JSON.stringify({ c: text }) + '\n')
          } catch { /* ignore */ }
        }
      }
      res.end()

    // ── GLM / Kimi / Qwen (OpenAI-compatible) ───────────────────────────────────
    } else if (provider in OPENAI_COMPATIBLE_ENDPOINTS) {
      return handleOpenAICompatible(OPENAI_COMPATIBLE_ENDPOINTS[provider], {
        messages, model, apiKey, finalSystemPrompt, res,
      })
    }

  } catch (e) {
    res.status(500).json({ error: '服务器错误：' + e.message })
  }
}
