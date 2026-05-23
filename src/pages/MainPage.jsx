import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import ReactMarkdown from 'react-markdown'
import { ArrowUp, Plus, ChevronLeft } from 'lucide-react'
import {
  createConversation, findOrCreateWordConv,
  getMessages, saveMessages, getRecentConversations
} from '../lib/conversations'

// ─── Utility: Group Messages ──────────────────────────────────────────────────
// Groups messages by role and time (5 minutes gap)
function groupMessages(messages) {
  const groups = []
  let currentGroup = null

  messages.forEach((msg, index) => {
    // We assume msg.timestamp exists, if not we fallback (e.g. for old data)
    const msgTime = msg.timestamp || Date.now()
    
    let isNewGroup = false
    let showTimestamp = false

    if (!currentGroup) {
      isNewGroup = true
      showTimestamp = true
    } else {
      const prevMsg = messages[index - 1]
      const prevTime = prevMsg.timestamp || Date.now()
      
      if (msgTime - prevTime > 5 * 60 * 1000) {
        // > 5 minutes gap
        isNewGroup = true
        showTimestamp = true
      } else if (msg.role !== currentGroup.role) {
        isNewGroup = true
      }
    }

    if (isNewGroup) {
      currentGroup = {
        role: msg.role,
        showTimestamp,
        timestamp: msgTime,
        messages: [msg]
      }
      groups.push(currentGroup)
    } else {
      currentGroup.messages.push(msg)
    }
  })

  return groups
}

// ─── Format Timestamp ─────────────────────────────────────────────────────────
function formatTimestamp(ts) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${mins}`

  if (isToday) return `今天 ${timeStr}`
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
    return `昨天 ${timeStr}`
  }

  return `${d.getMonth() + 1}月${d.getDate()}日 ${timeStr}`
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MainPage() {
  const [searchParams] = useSearchParams()
  const word = searchParams.get('word')
  const context = searchParams.get('context')
  const postId = searchParams.get('postId')
  
  const navigate = useNavigate()
  const { user } = useUser()

  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const currentConvId = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // We can still read provider from local storage but we won't show it in the UI heavily
  const provider = localStorage.getItem('provider') || 'deepseek'
  const model = localStorage.getItem('model') || 'deepseek-chat'

  // ── Word-explanation mode & Initialization ──
  useEffect(() => {
    if (!word) {
      setMessages([])
      setError(null)
      currentConvId.current = null
      return
    }

    const convId = findOrCreateWordConv(word, postId)
    currentConvId.current = convId

    const cached = getMessages(convId)
    if (cached.length > 0) {
      setMessages(cached)
    } else {
      const initialMessage = { role: 'user', content: `请解释：${word}`, timestamp: Date.now() }
      setMessages([initialMessage])
      sendToAPI([initialMessage], convId)
    }
  }, [word, postId]) // eslint-disable-line

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  // ── API Call ──
  const sendToAPI = async (currentMessages, convId) => {
    const style = localStorage.getItem('style') || '简洁'
    const apiKey = localStorage.getItem(`apiKey_${provider}`) || ''

    if (!apiKey) {
      setError('请先在设置页填写 API Key')
      return
    }

    setLoading(true)
    setError(null)
    
    // Add empty assistant message placeholder with timestamp
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }])

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          word: word || currentMessages[currentMessages.length - 1]?.content || '',
          context, postId, provider, model, apiKey, style
        })
      })

      if (!res.ok) throw new Error('请求失败，请检查 API 配置')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value)
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: full }
          return next
        })
      }

      setMessages(prev => {
        if (convId) saveMessages(convId, prev)
        return prev
      })
    } catch (e) {
      setError(e.message)
      setMessages(prev => prev.slice(0, -1))
    }
    setLoading(false)
  }

  // ── Send ──
  const handleSend = () => {
    if (!inputValue.trim() || loading) return

    const userMsg = { role: 'user', content: inputValue.trim(), timestamp: Date.now() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    let convId = currentConvId.current
    if (!convId && !word) {
      convId = createConversation('chat', null, null, userMsg.content)
      currentConvId.current = convId
    }

    sendToAPI(updatedMessages, convId)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const groupedMessages = useMemo(() => groupMessages(messages), [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--bg)', position: 'relative' }}>
      
      {/* ── Top Nav Bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        height: 60, display: 'flex', alignItems: 'center', padding: '0 16px',
        background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)'
      }}>
        <button onClick={() => navigate('/chats')} style={{ background: 'none', border: 'none', color: 'var(--imessage-blue)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 16, padding: 0 }}>
          <ChevronLeft size={22} style={{ marginLeft: -6 }} /> 
          返回
        </button>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateX(-20px)' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 2 }}>
            🤖
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#000' }}>Clearlove7 AI</div>
        </div>
      </div>

      {/* ── Message List ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '76px 16px 100px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
          
          {messages.length === 0 && !word && (
            <div style={{ textAlign: 'center', marginTop: '30vh', color: 'var(--text-light)', fontSize: 15 }}>
              发条消息开始聊天吧
            </div>
          )}

          {groupedMessages.map((group, gIdx) => (
            <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
              
              {/* Timestamp */}
              {group.showTimestamp && (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-light)', margin: '16px 0 12px', fontWeight: 500 }}>
                  {formatTimestamp(group.timestamp)}
                </div>
              )}

              {/* Message Group */}
              {group.messages.map((msg, mIdx) => {
                const isUser = msg.role === 'user'
                const isLastInGroup = mIdx === group.messages.length - 1
                const isFirstInGroup = mIdx === 0
                
                // Calculate border radius for iMessage style
                const radiusTopLeft = isUser ? 18 : (isFirstInGroup ? 18 : 6)
                const radiusTopRight = isUser ? (isFirstInGroup ? 18 : 6) : 18
                const radiusBottomLeft = isUser ? 18 : (isLastInGroup ? 4 : 6)
                const radiusBottomRight = isUser ? (isLastInGroup ? 4 : 6) : 18
                
                const borderRadius = `${radiusTopLeft}px ${radiusTopRight}px ${radiusBottomRight}px ${radiusBottomLeft}px`

                return (
                  <div key={mIdx} className="bubble-enter" style={{ 
                    display: 'flex', 
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: isLastInGroup ? 0 : 2,
                    alignItems: 'flex-end' // align avatars to bottom
                  }}>
                    
                    {/* AI Avatar */}
                    {!isUser && (
                      <div style={{ width: 32, height: 32, flexShrink: 0, marginRight: 8, visibility: isLastInGroup ? 'visible' : 'hidden' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          🤖
                        </div>
                      </div>
                    )}

                    <div className={isUser ? "user-bubble" : ""} style={{
                      background: isUser ? 'var(--imessage-blue)' : 'var(--imessage-gray)',
                      color: isUser ? '#FFFFFF' : '#000000',
                      padding: '8px 16px',
                      borderRadius: borderRadius,
                      maxWidth: '70%',
                      wordBreak: 'break-word',
                      position: 'relative'
                    }}>
                      {/* Empty assistant content means loading */}
                      {!isUser && msg.content === '' && loading && isLastInGroup ? (
                        <div style={{ padding: '4px 2px', display: 'flex', gap: 4 }}>
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      ) : (
                        <div className="markdown-body">
                          {isUser ? (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                          ) : (
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          )}
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div style={{ width: 32, height: 32, flexShrink: 0, marginLeft: 8, visibility: isLastInGroup ? 'visible' : 'hidden' }}>
                        {user?.imageUrl ? (
                          <img src={user.imageUrl} alt="user" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D1D1D6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                            {user?.firstName?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {error && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div style={{ display: 'inline-block', background: '#fdf2f2', color: '#b91c1c', padding: '8px 16px', borderRadius: 16, fontSize: 14 }}>
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} style={{ height: 1 }} />
        </div>
      </div>

      {/* ── Bottom Input Bar ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--bottom-bar)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        padding: '10px 16px 24px', display: 'flex', justifyContent: 'center'
      }}>
        <div style={{ maxWidth: 800, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          
          <button style={{ 
            width: 32, height: 32, borderRadius: '50%', background: '#D1D1D6', color: '#fff',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginBottom: 2
          }}>
            <Plus size={20} strokeWidth={2.5} />
          </button>

          <div style={{ 
            flex: 1, background: '#FFFFFF', borderRadius: 20, border: '1px solid var(--border)',
            display: 'flex', alignItems: 'flex-end', padding: '4px 4px 4px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="iMessage"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 16, lineHeight: '24px', padding: '4px 0', minHeight: 24, maxHeight: 120,
                resize: 'none', color: '#000', fontFamily: 'inherit', marginTop: 2
              }}
              rows={1}
            />
            
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || loading}
              style={{
                width: 26, height: 26, borderRadius: '50%', border: 'none',
                background: !inputValue.trim() || loading ? '#E5E5EA' : 'var(--imessage-blue)',
                color: '#fff', cursor: !inputValue.trim() || loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginLeft: 8, transition: 'background 0.2s'
              }}
            >
              <ArrowUp size={16} strokeWidth={3} />
            </button>
          </div>

        </div>
      </div>

    </div>
  )
}
