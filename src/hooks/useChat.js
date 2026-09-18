import { useState, useCallback, useRef } from 'react'
import { saveMessages } from '../lib/conversations'
import { createReasoningStreamParser } from '../lib/streamParser'

const SYSTEM_PROMPT_WORD = `你是一个阅读辅助助手，帮助用户理解文章中不熟悉的词语或概念。

用户正在阅读一篇文章，点击了其中一个词语来问你。

回答规则：
1. 先简要给出该词语的通用定义
2. 再结合文章内容，说明这个词在本文语境中的具体含义、用途或作用
3. 如果文章内容与该词语高度相关，可以展开说明其技术细节或背景
4. 回答结构清晰，适当使用编号列表
5. 语言简洁，不要过度展开，除非用户在后续追问中要求

之后用户可能会继续追问，保持对话上下文，根据用户问题灵活调整回答深度和角度。`

const SYSTEM_PROMPT_CHAT = `你是 Clearlove7 AI，一个智能助手，可以回答用户任何问题。
语言简洁，回答准确，根据用户的问题灵活调整回答深度。`

/**
 * Manages messages, loading, error state and the streaming API call.
 *
 * provider / model / apiKey are read inside sendToAPI (at call time) so
 * changes saved in SettingsPage take effect on the next send without a refresh.
 */
export function useChat({ word, context, postId, onSaved } = {}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const controllerRef = useRef(null)

  const persistFinal = useCallback((convId) => {
    let persisted = true
    setMessages(prev => {
      if (convId) persisted = saveMessages(convId, prev)
      return prev
    })
    if (convId && !persisted) {
      setError('本地存储空间已满，这条回复未能保存，建议在"所有对话"里清理一些旧对话')
    }
    onSaved?.()
  }, [onSaved])

  const sendToAPI = useCallback(async (currentMessages, convId) => {
    const provider = localStorage.getItem('provider') || 'deepseek'
    const model = localStorage.getItem('model') || 'deepseek-chat'
    const apiKey = localStorage.getItem(`apiKey_${provider}`) || ''

    if (!apiKey) {
      setError('请先在设置页填写 API Key')
      return
    }

    setLoading(true)
    setError(null)

    const systemPrompt = word ? SYSTEM_PROMPT_WORD : SYSTEM_PROMPT_CHAT
    const controller = new AbortController()
    controllerRef.current = controller

    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }])

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: currentMessages.map(m => ({
            role: m.role,
            content: m.content,
            ...(m.image ? { image: m.image } : {}),
          })),
          word: word || currentMessages[currentMessages.length - 1]?.content || '',
          context,
          postId,
          provider,
          model,
          apiKey,
          systemPrompt,
        }),
      })

      if (!res.ok) throw new Error('请求失败，请检查 API 配置')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      const parser = createReasoningStreamParser()
      let full = ''
      let fullReasoning = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const { content, reasoning } = parser.feed(decoder.decode(value, { stream: true }))
        if (content) full += content
        if (reasoning) fullReasoning += reasoning
        if (content || reasoning) {
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: full,
              ...(fullReasoning ? { reasoning: fullReasoning } : {}),
            }
            return next
          })
        }
      }

      persistFinal(convId)
    } catch (e) {
      if (e.name === 'AbortError') {
        // User hit "stop" — keep whatever was streamed so far instead of discarding it.
        persistFinal(convId)
      } else {
        setError(e.message)
        setMessages(prev => prev.slice(0, -1))
      }
    }

    controllerRef.current = null
    setLoading(false)
  }, [word, context, postId, persistFinal])

  const stop = useCallback(() => {
    controllerRef.current?.abort()
  }, [])

  return { messages, setMessages, loading, error, setError, sendToAPI, stop }
}
