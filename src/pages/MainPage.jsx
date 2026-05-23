import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from '@clerk/clerk-react'
import ReactMarkdown from 'react-markdown'
import { ArrowUp, Plus, PanelLeft, MessageSquare, Star, Search, Settings } from 'lucide-react'
import {
  createConversation, findOrCreateWordConv,
  getMessages, saveMessages, getRecentConversations
} from '../lib/conversations'

// ─── Utility: Group Messages ──────────────────────────────────────────────────
function groupMessages(messages) {
  const groups = []
  let currentGroup = null

  messages.forEach((msg, index) => {
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
  const { openSignIn } = useClerk()
  const { user } = useUser()

  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [recents, setRecents] = useState([])
  
  const currentConvId = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const provider = localStorage.getItem('provider') || 'deepseek'
  const model = localStorage.getItem('model') || 'deepseek-chat'

  // Load sidebar recents
  const refreshRecents = useCallback(() => {
    setRecents(getRecentConversations(20))
  }, [])

  useEffect(() => { refreshRecents() }, [])

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    
    // Determine dynamic system prompt
    const systemPromptWord = `你是一个阅读辅助助手，帮助用户理解文章中不熟悉的词语或概念。

用户正在阅读一篇文章，点击了其中一个词语来问你。

回答规则：
1. 先简要给出该词语的通用定义
2. 再结合文章内容，说明这个词在本文语境中的具体含义、用途或作用
3. 如果文章内容与该词语高度相关，可以展开说明其技术细节或背景
4. 回答结构清晰，适当使用编号列表
5. 语言简洁，不要过度展开，除非用户在后续追问中要求

之后用户可能会继续追问，保持对话上下文，根据用户问题灵活调整回答深度和角度。`

    const systemPromptChat = `你是 Clearlove7 AI，一个智能助手，可以回答用户任何问题。
语言简洁，回答准确，根据用户的问题灵活调整回答深度。`

    const systemPrompt = word ? systemPromptWord : systemPromptChat

    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }])

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          word: word || currentMessages[currentMessages.length - 1]?.content || '',
          context, postId, provider, model, apiKey, style, systemPrompt
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
      refreshRecents()
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
      refreshRecents()
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
  const filteredRecents = useMemo(() => recents.filter(c => (c.title || '').toLowerCase().includes(searchQuery.toLowerCase())), [recents, searchQuery])

  // ── Sidebar helpers ──
  const navItem = (icon, label, onClick, active = false) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px', borderRadius: 8,
        cursor: 'pointer', color: active ? 'var(--text)' : 'var(--text-light)',
        fontSize: 14, fontWeight: active ? 500 : 400,
        background: active ? 'var(--sidebar-hover)' : 'transparent',
        transition: 'background 0.15s', userSelect: 'none'
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      {label}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg)', position: 'relative' }}>
      
      {/* ── Sidebar ── */}
      <div style={{
        width: isSidebarOpen ? 260 : 0,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        backgroundColor: '#F3F3F0', flexShrink: 0,
        borderRight: isSidebarOpen ? '1px solid var(--border)' : 'none',
        overflow: 'hidden', position: 'relative', zIndex: 20
      }}>
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', color: '#000' }}>
              Clearlove7
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-light)', display: 'flex' }}>
              <PanelLeft size={18} />
            </button>
          </div>

          <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItem(
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={13} /></div>,
              'New chat',
              () => { navigate('/'); setMessages([]); currentConvId.current = null }
            )}
            {navItem(<MessageSquare size={16} />, 'Chats', () => navigate('/chats'))}
            {navItem(<Star size={16} />, 'Starred', () => navigate('/starred'))}
          </div>

          <div style={{ padding: '16px 12px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}>
              <Search size={13} color="var(--text-light)" />
              <input type="text" placeholder="Search history..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', marginLeft: 8, width: '100%', fontSize: 13, color: '#000' }}
              />
            </div>
          </div>

          <div style={{ padding: '0 20px 8px' }}>
            <h3 style={{ fontSize: 11, color: 'var(--text-light)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recents</h3>
          </div>

          <div style={{ padding: '0 12px', flex: 1, overflowY: 'auto' }}>
            {filteredRecents.length === 0 ? <div style={{ padding: '8px', fontSize: 13, color: 'var(--text-light)' }}>No conversations yet</div> : filteredRecents.map(conv => (
              <div key={conv.id}
                onClick={() => {
                  if (conv.source === 'word' && conv.word) {
                    navigate(`/?word=${encodeURIComponent(conv.word)}${conv.postId ? `&postId=${conv.postId}` : ''}`)
                  } else {
                    currentConvId.current = conv.id
                    const msgs = getMessages(conv.id)
                    setMessages(msgs)
                    navigate('/')
                  }
                }}
                style={{
                  padding: '8px', borderRadius: 8, cursor: 'pointer',
                  background: currentConvId.current === conv.id ? '#EBEBE6' : 'transparent',
                  color: '#000', fontSize: 14, lineHeight: 1.4, transition: 'background 0.15s',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
                onMouseEnter={e => { if (currentConvId.current !== conv.id) e.currentTarget.style.background = '#EBEBE6' }}
                onMouseLeave={e => { if (currentConvId.current !== conv.id) e.currentTarget.style.background = 'transparent' }}
              >
                {conv.starred && <Star size={11} fill="var(--imessage-blue)" color="var(--imessage-blue)" style={{ flexShrink: 0 }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SignedIn>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserButton />
                <span style={{ fontSize: 14, color: '#000', fontWeight: 500 }}>{user?.firstName || 'User'}</span>
              </div>
            </SignedIn>
            <SignedOut>
              <button onClick={() => openSignIn()} style={{ fontSize: 13, color: 'var(--text-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Sign in</button>
            </SignedOut>
            <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 4, display: 'flex' }} title="Settings">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* Open Sidebar Button */}
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)}
            style={{
              position: 'absolute', top: 16, left: 16, background: 'none', border: 'none',
              cursor: 'pointer', padding: 8, color: 'var(--text-light)', display: 'flex', alignItems: 'center',
              zIndex: 30
            }}>
            <PanelLeft size={20} />
          </button>
        )}

        {/* Top Nav Bar (Blur) */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 2 }}>
              🤖
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#000' }}>Clearlove7 AI</div>
          </div>
        </div>

        {/* Message List */}
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
                  
                  // iMessage UI: Corners & Tails
                  const radiusTopLeft = 20
                  const radiusTopRight = 20
                  const radiusBottomLeft = isUser ? 20 : (isLastInGroup ? 4 : 20)
                  const radiusBottomRight = isUser ? (isLastInGroup ? 4 : 20) : 20
                  const borderRadius = `${radiusTopLeft}px ${radiusTopRight}px ${radiusBottomRight}px ${radiusBottomLeft}px`
                  
                  // Gap: 6px between different messages usually, but same sender consecutive = 2px
                  // Handled by mapping spacing below
                  const marginBottom = isLastInGroup ? 0 : 2

                  return (
                    <div key={mIdx} className="bubble-enter" style={{ 
                      display: 'flex', 
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      marginBottom: marginBottom,
                      alignItems: 'flex-end'
                    }}>
                      
                      {/* AI Avatar */}
                      {!isUser && (
                        <div style={{ width: 32, height: 32, flexShrink: 0, marginRight: 6, visibility: isLastInGroup ? 'visible' : 'hidden' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            🤖
                          </div>
                        </div>
                      )}

                      <div className={isUser ? "user-bubble" : ""} style={{
                        background: isUser ? 'var(--imessage-blue)' : '#E9E9EB',
                        color: isUser ? '#FFFFFF' : '#000000',
                        padding: '8px 16px',
                        borderRadius: borderRadius,
                        maxWidth: '70%',
                        wordBreak: 'break-word',
                        position: 'relative'
                      }}>
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
                        <div style={{ width: 32, height: 32, flexShrink: 0, marginLeft: 6, visibility: isLastInGroup ? 'visible' : 'hidden' }}>
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
              flex: 1, background: '#FFFFFF', borderRadius: 20, border: '1px solid #C7C7CC',
              display: 'flex', alignItems: 'flex-end', padding: '4px 4px 4px 16px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
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
    </div>
  )
}
