import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from '@clerk/clerk-react'
import { PanelLeft, Plus, MessageSquare, Star, Settings, Search, MoreVertical, Trash2, Pencil } from 'lucide-react'
import {
  getRecentConversations,
  toggleStarred,
  deleteConversation,
  renameConversation,
} from '../lib/conversations'

/**
 * props:
 *   isSidebarOpen       boolean
 *   setIsSidebarOpen    (bool) => void
 *   activeConvId        string | null
 *   refreshKey          number
 *   onConversationSelect (conv) => void
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

  // Rename modal state
  const [renaming, setRenaming] = useState(null) // { id, title }

  // Keyboard shortcut: Shift+Cmd+, → /settings
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ',' && e.metaKey && e.shiftKey) {
        e.preventDefault()
        navigate('/settings')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const refresh = () => setRecents(getRecentConversations(20))

  useEffect(() => { refresh() }, [refreshKey])

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

  const handleStar = (id) => {
    toggleStarred(id)
    refresh()
  }

  const handleDelete = (id) => {
    deleteConversation(id)
    refresh()
    if (activeConvId === id) onConversationSelect?.(null)
  }

  const handleRenameSubmit = (id, newTitle) => {
    if (newTitle.trim()) {
      renameConversation(id, newTitle.trim())
      refresh()
    }
    setRenaming(null)
  }

  return (
    <>
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
                  onStar={() => handleStar(conv.id)}
                  onRename={() => setRenaming({ id: conv.id, title: conv.title })}
                  onDelete={() => handleDelete(conv.id)}
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
              title="Settings (⇧⌘,)"
            >
              <Settings size={20} />
            </button>
          </div>

        </div>
      </div>

      {/* Rename modal */}
      {renaming && (
        <RenameModal
          initialTitle={renaming.title}
          onSave={(t) => handleRenameSubmit(renaming.id, t)}
          onCancel={() => setRenaming(null)}
        />
      )}
    </>
  )
}

// ─── NavItem ─────────────────────────────────────────────────────────────────
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

// ─── ConvItem ─────────────────────────────────────────────────────────────────
function ConvItem({ conv, active, onClick, onStar, onRename, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const dotRef = useRef(null)

  const openMenu = (e) => {
    e.stopPropagation()
    const rect = dotRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left - 120 })
    setMenuOpen(true)
  }

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [menuOpen])

  return (
    <div
      className={`relative px-2 py-2 rounded-lg cursor-pointer text-sm leading-snug transition-colors duration-150 text-black flex items-center gap-1.5 group ${
        active ? 'bg-[#EBEBE6]' : 'hover:bg-[#EBEBE6]'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false) }}
      onClick={onClick}
    >
      {conv.starred && (
        <Star size={11} fill="var(--imessage-blue)" color="var(--imessage-blue)" className="flex-shrink-0" />
      )}
      <span className="truncate flex-1">{conv.title}</span>

      {/* Three-dot button — visible on hover or when menu is open */}
      {(hovered || menuOpen) && (
        <button
          ref={dotRef}
          onClick={openMenu}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-[var(--text-light)] hover:text-black bg-transparent border-none cursor-pointer p-0"
          onMouseDown={e => e.stopPropagation()}
        >
          <MoreVertical size={14} />
        </button>
      )}

      {/* Dropdown menu rendered via portal-like fixed positioning */}
      {menuOpen && (
        <DropdownMenu
          pos={menuPos}
          starred={conv.starred}
          onStar={() => { setMenuOpen(false); onStar() }}
          onRename={() => { setMenuOpen(false); onRename() }}
          onDelete={() => { setMenuOpen(false); onDelete() }}
        />
      )}
    </div>
  )
}

// ─── DropdownMenu (fixed-position) ───────────────────────────────────────────
function DropdownMenu({ pos, starred, onStar, onRename, onDelete }) {
  return (
    <div
      className="fixed z-50 bg-white rounded-xl shadow-lg border border-[var(--border)] py-1 w-36"
      style={{ top: pos.top, left: Math.max(4, pos.left) }}
      onMouseDown={e => e.stopPropagation()}
    >
      <MenuItem icon={<Star size={13} />} label={starred ? 'Unstar' : 'Star'} onClick={onStar} />
      <MenuItem icon={<Pencil size={13} />} label="Rename" onClick={onRename} />
      <div className="my-1 border-t border-[var(--border)]" />
      <MenuItem icon={<Trash2 size={13} />} label="Delete" onClick={onDelete} danger />
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[13px] bg-transparent border-none cursor-pointer text-left transition-colors ${
        danger ? 'text-red-500 hover:bg-red-50' : 'text-black hover:bg-[#F3F3F0]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── RenameModal ──────────────────────────────────────────────────────────────
function RenameModal({ initialTitle, onSave, onCancel }) {
  const [value, setValue] = useState(initialTitle)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onSave(value)
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onMouseDown={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[340px] overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-[16px] font-semibold text-black m-0 mb-4">Rename chat</h3>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={60}
            className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[14px] text-black outline-none"
            style={{ fontFamily: 'var(--sans)' }}
          />
        </div>
        <div className="px-6 pb-5 pt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[14px] text-[var(--text-light)] bg-transparent border border-[var(--border)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(value)}
            disabled={!value.trim()}
            className="px-4 py-2 rounded-xl text-[14px] text-white bg-black border-none cursor-pointer disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
