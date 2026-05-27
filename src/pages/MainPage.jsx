import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { PanelLeft, ArrowDown } from 'lucide-react'
import { createConversation, findOrCreateWordConv, getMessages } from '../lib/conversations'
import Sidebar from '../components/Sidebar'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import { useChat } from '../hooks/useChat'

export default function MainPage() {
  const [searchParams] = useSearchParams()
  const word = searchParams.get('word')
  const context = searchParams.get('context')
  const postId = searchParams.get('postId')

  const navigate = useNavigate()
  const { user } = useUser()

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const [activeConvId, setActiveConvId] = useState(null)

  const currentConvId = useRef(null)
  const scrollContainerRef = useRef(null)
  const isNearBottomRef = useRef(true)   // sync ref: used inside effects to avoid stale closure
  const touchStartYRef = useRef(0)
  const [isNearBottom, setIsNearBottom] = useState(true) // state: drives the scroll-to-bottom button

  const { messages, setMessages, loading, error, setError, sendToAPI } = useChat({
    word,
    context,
    postId,
    onSaved: () => setSidebarRefreshKey(k => k + 1),
  })

  // Wire up scroll tracking. Key insight: wheel fires synchronously before scroll,
  // so setting the ref here stops the next messages-effect from auto-scrolling
  // before the browser even paints the scroll position change.
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      isNearBottomRef.current = near
      setIsNearBottom(near)
    }

    // Upward wheel → immediately kill auto-scroll (synchronous, no race)
    const onWheel = (e) => {
      if (e.deltaY < 0) {
        isNearBottomRef.current = false
        setIsNearBottom(false)
      }
    }

    // Touch equivalent for mobile
    const onTouchStart = (e) => { touchStartYRef.current = e.touches[0].clientY }
    const onTouchMove = (e) => {
      if (e.touches[0].clientY > touchStartYRef.current) {
        isNearBottomRef.current = false
        setIsNearBottom(false)
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  // Scroll to bottom on new content — only if user is still at the bottom
  useEffect(() => {
    if (!isNearBottomRef.current) return
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight })
  }, [messages])

  const scrollToBottom = () => {
    isNearBottomRef.current = true
    setIsNearBottom(true)
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' })
  }

  // Auto-trigger explanation when a word param arrives
  useEffect(() => {
    if (!word) {
      setMessages([])
      setError(null)
      currentConvId.current = null
      setActiveConvId(null)
      return
    }

    const convId = findOrCreateWordConv(word, postId)
    currentConvId.current = convId
    setActiveConvId(convId)

    const cached = getMessages(convId)
    if (cached.length > 0) {
      isNearBottomRef.current = true
      setMessages(cached)
    } else {
      const initial = { role: 'user', content: `请解释：${word}`, timestamp: Date.now() }
      setMessages([initial])
      sendToAPI([initial], convId)
    }
  }, [word, postId]) // eslint-disable-line

  const handleSend = ({ text, image } = {}) => {
    if (!text?.trim() && !image) return
    const userMsg = {
      role: 'user',
      content: text || '',
      ...(image ? { image } : {}),
      timestamp: Date.now(),
    }
    const updatedMessages = [...messages, userMsg]
    // User just sent — always snap back to bottom
    isNearBottomRef.current = true
    setIsNearBottom(true)
    setMessages(updatedMessages)

    let convId = currentConvId.current
    if (!convId && !word) {
      convId = createConversation('chat', null, null, userMsg.content)
      currentConvId.current = convId
      setActiveConvId(convId)
    }

    sendToAPI(updatedMessages, convId)
  }

  const handleConversationSelect = useCallback((conv) => {
    if (!conv) {
      setMessages([])
      setError(null)
      currentConvId.current = null
      setActiveConvId(null)
      navigate('/')
      return
    }
    if (conv.source === 'word' && conv.word) {
      navigate(`/?word=${encodeURIComponent(conv.word)}${conv.postId ? `&postId=${conv.postId}` : ''}`)
    } else {
      currentConvId.current = conv.id
      setActiveConvId(conv.id)
      // Always scroll to bottom when switching conversations
      isNearBottomRef.current = true
      setIsNearBottom(true)
      setMessages(getMessages(conv.id))
      navigate('/')
    }
  }, [navigate, setMessages, setError])

  return (
    <div className="flex h-screen w-screen bg-[var(--bg)] relative">

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeConvId={activeConvId}
        refreshKey={sidebarRefreshKey}
        onConversationSelect={handleConversationSelect}
      />

      {/* Main chat area */}
      <div className="flex-1 relative flex flex-col h-screen overflow-hidden">

        {/* Sidebar re-open button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 bg-transparent border-none cursor-pointer p-2 text-[var(--text-light)] flex items-center z-30"
          >
            <PanelLeft size={20} />
          </button>
        )}

        {/* Top nav bar */}
        <div
          className="absolute top-0 left-0 right-0 z-10 h-[60px] flex items-center justify-center border-b border-[var(--border)]"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-[#E5E5EA] flex items-center justify-center text-base mb-0.5">
              🤖
            </div>
            <div className="text-xs font-medium text-black">Clearlove7 AI</div>
          </div>
        </div>

        <MessageList
          messages={messages}
          loading={loading}
          error={error}
          word={word}
          user={user}
          scrollRef={scrollContainerRef}
        />

        {/* Scroll-to-bottom button: appears when user scrolls up during streaming */}
        {!isNearBottom && loading && (
          <button
            onClick={scrollToBottom}
            className="absolute z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[var(--border)] shadow-md cursor-pointer text-[var(--text-light)] hover:text-black transition-colors"
            style={{ bottom: 100, right: 24 }}
          >
            <ArrowDown size={16} />
          </button>
        )}

        <ChatInput loading={loading} onSend={handleSend} />
      </div>
    </div>
  )
}
