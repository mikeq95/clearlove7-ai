import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from '@clerk/clerk-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Sparkles, Brain, Copy, RotateCcw, ThumbsUp, ThumbsDown, Search, Plus, Settings, PanelLeft, ArrowUp, MessageSquare, Star, FolderClosed } from 'lucide-react'

// Memoized message component to prevent lag while typing in the input box
const MessageRow = memo(({ msg, idx, loading, isLast, ProviderIcon, onCopy, onRegenerate }) => {
  return (
    <div className="message-row" style={{ width: '100%', display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
      {msg.role === 'user' ? (
        <div style={{ 
          background: 'var(--accent)', 
          padding: '12px 20px', 
          borderRadius: 24, 
          borderBottomRightRadius: 4,
          fontSize: 16, 
          lineHeight: 1.6, 
          color: '#fff', 
          textAlign: 'left',
          maxWidth: '80%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          wordBreak: 'break-word'
        }}>
          {msg.content}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 10, 
            background: 'transparent',
            border: '1px solid var(--border)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0,
            marginTop: 2
          }}>
            <ProviderIcon size={18} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
            
            <div className="markdown-body">
              {msg.content === '' && loading && isLast ? (
                <span style={{ color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Thinking<span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-light)', animation: 'blink 1s infinite' }} />
                </span>
              ) : (
                <ReactMarkdown
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <div style={{ position: 'relative', margin: '16px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <div style={{ background: '#f5f5f5', padding: '8px 16px', fontSize: 12, color: 'var(--text-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>{match[1]}</span>
                            <button onClick={() => onCopy(String(children).replace(/\n$/, ''))} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <Copy size={12} /> Copy
                            </button>
                          </div>
                          <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, padding: '16px' }}>
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className={className} style={{ background: 'var(--sidebar-hover)', padding: '3px 6px', borderRadius: 6, color: 'var(--text)', fontSize: '0.9em', fontFamily: 'var(--mono)' }} {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
            
            {/* Actions Bar */}
            {!loading && msg.content && (
              <div className="message-actions" style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button onClick={() => onCopy(msg.content)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }} title="Copy">
                  <Copy size={14} />
                </button>
                {isLast && (
                  <button onClick={onRegenerate} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }} title="Regenerate">
                    <RotateCcw size={14} />
                  </button>
                )}
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }} title="Good response">
                  <ThumbsUp size={14} />
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }} title="Bad response">
                  <ThumbsDown size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

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
  const [historyList, setHistoryList] = useState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const [provider, setProvider] = useState(localStorage.getItem('provider') || 'deepseek')
  const [model, setModel] = useState(localStorage.getItem('model') || 'deepseek-chat')

  const ProviderIcon = provider === 'deepseek' ? Brain : Sparkles

  useEffect(() => {
    // We use a softer default blue now if not set
    const color = localStorage.getItem('themeColor') || '#3b82f6'
    document.documentElement.style.setProperty('--accent', color)
  }, [])

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('history_list') || '[]')
    if (word) {
      const newItem = { word, postId, context, timestamp: Date.now() }
      const filtered = stored.filter(i => !(i.word === word && i.postId === postId))
      filtered.unshift(newItem)
      const newList = filtered.slice(0, 50)
      localStorage.setItem('history_list', JSON.stringify(newList))
      setHistoryList(newList)
    } else {
      setHistoryList(stored)
    }
  }, [word, postId, context])

  useEffect(() => {
    if (!word) {
      setMessages([])
      return
    }
    const cacheKey = `chat_${word}_${postId || context}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setMessages(JSON.parse(cached))
    } else {
      const initialMessage = { role: 'user', content: `请解释：${word}` }
      setMessages([initialMessage])
      explain([initialMessage])
    }
  }, [word, postId, context])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [inputValue])

  const explain = async (currentMessages) => {
    const style = localStorage.getItem('style') || '简洁'
    const apiKey = localStorage.getItem(`apiKey_${provider}`) || ''

    if (!apiKey) {
      setError(`请先在设置页填写 ${provider === 'deepseek' ? 'DeepSeek' : 'Claude'} API Key`)
      return
    }

    setLoading(true)
    setError(null)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages, word: word || currentMessages[currentMessages.length-1].content, context, postId, provider, model, apiKey, style })
      })

      if (!res.ok) {
        let err;
        try {
          err = await res.json()
        } catch (parseError) {
          throw new Error('网络连接中断或 API 发生故障。请确保使用 "vercel dev" 运行项目。')
        }
        throw new Error(err.error || '请求失败，请检查 API 配置。')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setMessages(prev => {
          const newMsg = [...prev]
          newMsg[newMsg.length - 1].content = full
          return newMsg
        })
      }

      if (word) {
        const cacheKey = `chat_${word}_${postId || context}`
        setMessages(prev => {
          localStorage.setItem(cacheKey, JSON.stringify(prev))
          return prev
        })
      }
    } catch (e) {
      setError(e.message)
      setMessages(prev => prev.slice(0, -1))
    }
    setLoading(false)
  }

  const handleSend = () => {
    if (!inputValue.trim() || loading) return
    const newMsg = { role: 'user', content: inputValue.trim() }
    const updatedMessages = [...messages, newMsg]
    setMessages(updatedMessages)
    setInputValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    
    // If we were on the welcome screen, submitting a message starts a new ad-hoc chat
    explain(updatedMessages)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRegenerate = () => {
    if (loading) return
    const updatedMessages = messages.slice(0, -1)
    setMessages(updatedMessages)
    explain(updatedMessages)
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
  }

  const handleProviderChange = (e) => {
    const p = e.target.value
    setProvider(p)
    localStorage.setItem('provider', p)
    const defaultModel = p === 'deepseek' ? 'deepseek-chat' : 'claude-haiku-4-5'
    setModel(defaultModel)
    localStorage.setItem('model', defaultModel)
  }

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => item.word.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [historyList, searchQuery])

  const isHome = !word && messages.length === 0

  const InputBox = () => (
    <div style={{ 
      width: '100%', 
      position: 'relative', 
      display: 'flex', 
      flexDirection: 'column', 
      background: '#fff', 
      borderRadius: 24, 
      padding: '12px', 
      border: '1px solid var(--border)',
      boxShadow: isHome ? '0 8px 32px rgba(0,0,0,0.06)' : '0 4px 12px rgba(0,0,0,0.04)',
      transition: 'all 0.3s ease'
    }}>
      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isHome ? "有什么我可以帮忙的？" : "回复 AI..."}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          fontSize: 16,
          lineHeight: 1.5,
          outline: 'none',
          resize: 'none',
          minHeight: 24,
          maxHeight: 200,
          fontFamily: 'inherit',
          color: 'var(--text)',
          textAlign: 'left'
        }}
        rows={1}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'var(--sidebar-bg)', border: 'none', color: 'var(--text-light)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Add attachment">
            <Plus size={18} />
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select 
            value={provider} 
            onChange={handleProviderChange}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-light)', 
              fontSize: 13, 
              cursor: 'pointer', 
              outline: 'none',
              fontWeight: 500
            }}
          >
            <option value="deepseek">DeepSeek</option>
            <option value="claude">Claude</option>
          </select>

          <button
            onClick={handleSend}
            disabled={loading || !inputValue.trim()}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: loading || !inputValue.trim() ? '#e5e5e5' : 'var(--accent)',
              color: loading || !inputValue.trim() ? '#a3a3a3' : '#fff',
              cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--bg)', fontFamily: 'var(--sans)' }}>
      {/* Sidebar */}
      <div style={{ 
        width: isSidebarOpen ? 260 : 0, 
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: 'var(--sidebar-bg)', 
        flexShrink: 0,
        borderRight: isSidebarOpen ? '1px solid var(--border)' : 'none',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', color: 'var(--text)' }}>
              Clearlove7
            </h2>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-light)', display: 'flex', alignItems: 'center' }}
              title="Close sidebar"
            >
              <PanelLeft size={18} />
            </button>
          </div>

          {/* Main Menu Items */}
          <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div 
              onClick={() => { navigate('/'); setMessages([]) }} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                padding: '8px', 
                borderRadius: 8, 
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 500,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={14} color="var(--text)" />
              </div>
              New chat
            </div>

            {/* Sidebar Expanded Items */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px', borderRadius: 8, cursor: 'pointer', color: 'var(--text-light)', fontSize: 14, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={16} /></div> Chats
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px', borderRadius: 8, cursor: 'pointer', color: 'var(--text-light)', fontSize: 14, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={16} /></div> Starred
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px', borderRadius: 8, cursor: 'pointer', color: 'var(--text-light)', fontSize: 14, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FolderClosed size={16} /></div> Projects
            </div>
          </div>

          <div style={{ padding: '24px 12px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <Search size={14} color="var(--text-light)" />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', marginLeft: 8, width: '100%', fontSize: 13, color: 'var(--text)' }}
              />
            </div>
          </div>
          
          <div style={{ padding: '0 20px 8px' }}>
            <h3 style={{ fontSize: 12, color: 'var(--text-light)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recents</h3>
          </div>

          <div style={{ padding: '0 12px', flex: 1, overflowY: 'auto' }}>
            <SignedIn>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredHistory.map((item, idx) => (
                   <div 
                     key={idx} 
                     onClick={() => navigate(`/?word=${item.word}${item.postId ? `&postId=${item.postId}` : ''}`)} 
                     style={{ 
                       padding: '8px', 
                       borderRadius: 8, 
                       cursor: 'pointer', 
                       background: word === item.word ? 'var(--sidebar-hover)' : 'transparent',
                       color: 'var(--text)',
                       fontSize: 14,
                       lineHeight: 1.4,
                       transition: 'background 0.2s',
                       whiteSpace: 'nowrap',
                       overflow: 'hidden',
                       textOverflow: 'ellipsis'
                     }}
                     onMouseEnter={(e) => { if (word !== item.word) e.currentTarget.style.background = 'var(--sidebar-hover)' }}
                     onMouseLeave={(e) => { if (word !== item.word) e.currentTarget.style.background = 'transparent' }}
                   >
                     {item.word}
                   </div>
                ))}
                {filteredHistory.length === 0 && <div style={{ padding: 12, fontSize: 13, color: 'var(--text-light)', textAlign: 'center' }}>No results found</div>}
              </div>
            </SignedIn>
            <SignedOut>
              <div style={{ padding: '0 8px', color: 'var(--text-light)', fontSize: 13 }}>
                <p style={{ margin: '0 0 12px' }}>Sign in to save history</p>
                <button onClick={() => openSignIn()} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, border: '1px solid var(--border)', width: '100%' }}>
                  Log in / Sign up
                </button>
              </div>
            </SignedOut>
          </div>

          <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SignedIn>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <UserButton />
                <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{user?.firstName || 'User'}</span>
              </div>
            </SignedIn>
            <button 
              onClick={() => navigate('/settings')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 4, display: 'flex' }}
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{ 
            position: 'absolute', 
            top: 16, 
            left: 16, 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            padding: 8, 
            color: 'var(--text-light)', 
            display: 'flex', 
            alignItems: 'center',
            zIndex: 10,
            opacity: isSidebarOpen ? 0 : 1,
            pointerEvents: isSidebarOpen ? 'none' : 'auto',
            transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateX(4px)'
          }}
          title="Open sidebar"
        >
          <PanelLeft size={20} />
        </button>

        {isHome ? (
          // Welcome Home State
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: 'var(--text-light)', padding: '0 24px' }}>
            <h1 style={{ fontSize: 32, fontWeight: 500, color: 'var(--text)', marginBottom: 40, margin: '0 0 40px 0', fontFamily: 'Georgia, serif' }}>
              今天想研究什么？
            </h1>
            <div style={{ width: '100%', maxWidth: 768 }}>
              <InputBox />
            </div>
          </div>
        ) : (
          // Chat State
          <>
            {/* 40px padding top for safety, bottom padding gives room for fixed input */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '60px 0 200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Box container exactly matches input box max-width */}
              <div style={{ width: '100%', maxWidth: 768, padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>
                
                {messages.map((msg, idx) => (
                  <MessageRow 
                    key={idx} 
                    msg={msg} 
                    idx={idx} 
                    loading={loading} 
                    isLast={idx === messages.length - 1} 
                    ProviderIcon={ProviderIcon} 
                    onCopy={handleCopy}
                    onRegenerate={handleRegenerate}
                  />
                ))}

                {error && (
                  <div style={{ padding: '16px', background: '#fdf2f2', border: '1px solid #f9dada', borderRadius: 12, color: '#b91c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>Error:</span>
                      <span>{error}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleRegenerate} style={{ background: '#b91c1c', border: 'none', padding: '6px 12px', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <RotateCcw size={14} /> Retry
                      </button>
                      {error.includes('配置') && (
                        <button onClick={() => navigate('/settings')} style={{ background: '#fff', border: '1px solid #f9dada', padding: '6px 12px', borderRadius: 6, color: '#b91c1c', cursor: 'pointer' }}>Settings</button>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Box fixed at bottom */}
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              padding: '0 24px 32px', // Bottom safe distance
              display: 'flex', 
              justifyContent: 'center',
              background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
              pointerEvents: 'none' // Let clicks pass through the gradient
            }}>
              <div style={{ width: '100%', maxWidth: 768, pointerEvents: 'auto' }}>
                <InputBox />
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-light)', marginTop: 12 }}>
                  Clearlove7 AI can make mistakes. Please verify important information.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
