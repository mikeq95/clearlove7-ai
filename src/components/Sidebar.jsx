import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from '@clerk/clerk-react'
import { PanelLeft, Plus, MessageSquare, Star, Settings, Search } from 'lucide-react'
import { getRecentConversations } from '../lib/conversations'

/**
 * props:
 *   isSidebarOpen       boolean
 *   setIsSidebarOpen    (bool) => void
 *   activeConvId        string | null   — highlights the active conversation
 *   refreshKey          number          — increment to re-fetch the recents list
 *   onConversationSelect (conv) => void — called when a conversation row is clicked
 */
export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  activeConvId = null,
  refreshKey = 0,
  onConversationSelect,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { openSignIn } = useClerk()
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [recents, setRecents] = useState([])

  useEffect(() => {
    setRecents(getRecentConversations(20))
  }, [refreshKey])

  const filteredRecents = useMemo(
    () => recents.filter(c => (c.title || '').toLowerCase().includes(searchQuery.toLowerCase())),
    [recents, searchQuery]
  )

  const handleConvClick = (conv) => {
    if (onConversationSelect) {
      onConversationSelect(conv)
    } else {
      if (conv.source === 'word' && conv.word) {
        navigate(`/?word=${encodeURIComponent(conv.word)}${conv.postId ? `&postId=${conv.postId}` : ''}`)
      } else {
        navigate('/')
      }
    }
  }

  return (
    <div
      className="flex-shrink-0 relative z-20 overflow-hidden"
      style={{
        width: isSidebarOpen ? 260 : 0,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        backgroundColor: '#F3F3F0',
        borderRight: isSidebarOpen ? '1px solid var(--border)' : 'none',
      }}
    >
      <div className="w-[260px] flex flex-col h-full">

        {/* Logo + collapse */}
        <div className="px-4 py-4 flex justify-between items-center">
          <h2 className="m-0 text-lg font-semibold text-black" style={{ fontFamily: 'Georgia, serif' }}>
            Clearlove7
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="bg-transparent border-none cursor-pointer p-1 flex text-[var(--text-light)]"
          >
            <PanelLeft size={18} />
          </button>
        </div>

        {/* Primary nav */}
        <div className="px-3 flex flex-col gap-0.5">
          <NavItem
            icon={
              <div className="w-[22px] h-[22px] rounded-full bg-[var(--border)] flex items-center justify-center">
                <Plus size={13} />
              </div>
            }
            label="New chat"
            onClick={() => { navigate('/'); onConversationSelect?.(null) }}
          />
          <NavItem
            icon={<MessageSquare size={16} />}
            label="Chats"
            onClick={() => navigate('/chats')}
            active={location.pathname === '/chats'}
          />
          <NavItem
            icon={<Star size={16} />}
            label="Starred"
            onClick={() => navigate('/starred')}
            active={location.pathname === '/starred'}
          />
        </div>

        {/* Search */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center px-2.5 py-1.5 bg-white border border-[var(--border)] rounded-lg">
            <Search size={13} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border-none outline-none bg-transparent ml-2 w-full text-[13px] text-black"
            />
          </div>
        </div>

        {/* Recents header */}
        <div className="px-5 pb-2">
          <h3 className="text-[11px] text-[var(--text-light)] m-0 font-semibold uppercase tracking-wider">
            Recents
          </h3>
        </div>

        {/* Conversation list */}
        <div className="px-3 flex-1 overflow-y-auto">
          {filteredRecents.length === 0 ? (
            <div className="px-2 py-2 text-[13px] text-[var(--text-light)]">
              No conversations yet
            </div>
          ) : (
            filteredRecents.map(conv => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={activeConvId === conv.id}
                onClick={() => handleConvClick(conv)}
              />
            ))
          )}
        </div>

        {/* Footer: user + settings */}
        <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
          <SignedIn>
            <div className="flex items-center gap-2.5">
              <UserButton />
              <span className="text-sm text-black font-medium">{user?.firstName || 'User'}</span>
            </div>
          </SignedIn>
          <SignedOut>
            <button
              onClick={() => openSignIn()}
              className="text-[13px] text-[var(--text-light)] bg-transparent border-none cursor-pointer p-0"
            >
              Sign in
            </button>
          </SignedOut>
          <button
            onClick={() => navigate('/settings')}
            className={`bg-transparent border-none cursor-pointer p-1 flex transition-colors ${
              location.pathname === '/settings' ? 'text-black' : 'text-[var(--text-light)]'
            }`}
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>

      </div>
    </div>
  )
}

function NavItem({ icon, label, onClick, active = false }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors duration-150 select-none ${
        active
          ? 'bg-[#EBEBE6] text-black font-medium'
          : 'text-[var(--text-light)] hover:bg-[#EBEBE6]'
      }`}
    >
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      {label}
    </div>
  )
}

function ConvItem({ conv, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`px-2 py-2 rounded-lg cursor-pointer text-sm leading-snug transition-colors duration-150 text-black flex items-center gap-1.5 ${
        active ? 'bg-[#EBEBE6]' : 'hover:bg-[#EBEBE6]'
      }`}
    >
      {conv.starred && (
        <Star size={11} fill="var(--imessage-blue)" color="var(--imessage-blue)" className="flex-shrink-0" />
      )}
      <span className="truncate">{conv.title}</span>
    </div>
  )
}
