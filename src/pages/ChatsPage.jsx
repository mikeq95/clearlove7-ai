import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PanelLeft, Search, Trash2, Star, MessageSquare } from 'lucide-react'
import { getConversations, deleteConversation, toggleStarred } from '../lib/conversations'
import Sidebar from '../components/Sidebar'

export default function ChatsPage() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState(() => getConversations())
  const [query, setQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const load = () => setConversations(getConversations())

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (!window.confirm('删除这条对话？')) return
    deleteConversation(id)
    load()
  }

  const handleStar = (e, id) => {
    e.stopPropagation()
    toggleStarred(id)
    load()
  }

  const handleOpen = (conv) => {
    if (conv.source === 'word' && conv.word) {
      navigate(`/?word=${encodeURIComponent(conv.word)}${conv.postId ? `&postId=${conv.postId}` : ''}`)
    } else {
      navigate('/', { state: { convId: conv.id } })
    }
  }

  const filtered = conversations.filter(c =>
    (c.title || '').toLowerCase().includes(query.toLowerCase())
  )

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = (now - d) / 1000
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'var(--sans)', background: 'var(--bg)', overflow: 'hidden' }}>

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)}
            style={{ position: 'absolute', top: 16, left: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', zIndex: 10 }}>
            <PanelLeft size={20} />
          </button>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', padding: '56px 32px 80px' }}>

            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>所有对话</h1>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-light)' }}>共 {conversations.length} 条记录，保存在本机浏览器中</p>
            </div>

            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20 }}>
              <Search size={15} color="var(--text-light)" />
              <input type="text" placeholder="搜索对话..." value={query} onChange={e => setQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', marginLeft: 10, width: '100%', fontSize: 15, color: 'var(--text)' }} />
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-light)' }}>
                <MessageSquare size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 15 }}>没有找到对话</p>
              </div>
            )}

            {filtered.map(conv => (
              <div key={conv.id}
                onClick={() => handleOpen(conv)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid var(--border)', background: '#fff', marginBottom: 8,
                  transition: 'box-shadow 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: 'var(--text-light)', flexShrink: 0 }}>
                    {conv.source === 'word' ? <MessageSquare size={16} /> : <MessageSquare size={16} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.starred && <Star size={11} fill="var(--accent)" color="var(--accent)" style={{ marginRight: 5, verticalAlign: 'middle' }} />}
                      {conv.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>
                      {formatDate(conv.updatedAt)} · {conv.source === 'word' ? '词语解释' : '聊天'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 12 }}>
                  <button onClick={e => handleStar(e, conv.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: conv.starred ? 'var(--accent)' : 'var(--text-light)', padding: '5px 7px', borderRadius: 6 }}
                    title={conv.starred ? '取消收藏' : '收藏'}>
                    <Star size={15} fill={conv.starred ? 'currentColor' : 'none'} />
                  </button>
                  <button onClick={e => handleDelete(e, conv.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '5px 7px', borderRadius: 6 }}
                    title="删除">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
