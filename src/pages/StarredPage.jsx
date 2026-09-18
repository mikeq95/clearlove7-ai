import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PanelLeft, Star, Trash2 } from 'lucide-react'
import { getStarredConversations, deleteConversation, toggleStarred } from '../lib/conversations'
import Sidebar from '../components/Sidebar'

export default function StarredPage() {
  const navigate = useNavigate()
  const [starred, setStarred] = useState(() => getStarredConversations())
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const load = () => setStarred(getStarredConversations())

  const handleOpen = (conv) => {
    if (conv.source === 'word' && conv.word) {
      navigate(`/?word=${encodeURIComponent(conv.word)}${conv.postId ? `&postId=${conv.postId}` : ''}`)
    } else {
      navigate('/', { state: { convId: conv.id } })
    }
  }

  const handleUnstar = (e, id) => {
    e.stopPropagation()
    toggleStarred(id)
    load()
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (!window.confirm('删除这条对话？')) return
    deleteConversation(id)
    load()
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
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
              <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
                <Star size={20} fill="var(--accent)" color="var(--accent)" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                收藏的对话
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-light)' }}>共 {starred.length} 条收藏</p>
            </div>

            {starred.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-light)' }}>
                <Star size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--text)' }}>还没有收藏</p>
                <p style={{ margin: 0, fontSize: 14 }}>在对话中点击 ☆ 图标即可收藏</p>
              </div>
            )}

            {starred.map(conv => (
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
                  <Star size={16} fill="var(--accent)" color="var(--accent)" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>
                      {formatDate(conv.updatedAt)} · {conv.source === 'word' ? '词语解释' : '聊天'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 12 }}>
                  <button onClick={e => handleUnstar(e, conv.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '5px 7px', borderRadius: 6 }}
                    title="取消收藏">
                    <Star size={15} fill="currentColor" />
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
