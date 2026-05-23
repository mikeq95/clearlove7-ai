import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useClerk } from '@clerk/clerk-react'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { openSignIn } = useClerk()
  const [historyList, setHistoryList] = useState([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('history_list')
      if (stored) {
        setHistoryList(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to parse history:', e)
    }
  }, [])

  const handleClearHistory = () => {
    localStorage.removeItem('history_list')
    setHistoryList([])
  }

  const handleItemClick = (item) => {
    const params = new URLSearchParams()
    params.set('word', item.word)
    if (item.postId) params.set('postId', item.postId)
    if (item.context) params.set('context', item.context)
    navigate(`/?${params.toString()}`)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>🕒 历史记录</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => navigate('/')} style={btnStyle}>返回</button>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <button onClick={() => openSignIn()} style={{ ...btnStyle, background: '#000', color: '#fff' }}>登录</button>
          </SignedOut>
        </div>
      </div>

      <SignedIn>
        {historyList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            暂无历史记录
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={handleClearHistory} style={{ ...btnStyle, color: '#cf1322', borderColor: '#ffccc7', background: '#fff3f3' }}>
                清空记录
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {historyList.map((item, index) => (
                <div 
                  key={index} 
                  onClick={() => handleItemClick(item)}
                  style={{ 
                    padding: '16px 20px', 
                    background: '#fafafa', 
                    borderRadius: 12, 
                    border: '1px solid #eee', 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.background = '#f0f0f0' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.background = '#fafafa' }}
                >
                  <div style={{ fontSize: 18, fontWeight: 'bold' }}>{item.word}</div>
                  <div style={{ fontSize: 12, color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.postId ? `来自文章：${item.postId}` : item.context ? '自定义上下文' : ''}</span>
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SignedIn>
      
      <SignedOut>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <p>登录后即可查看历史记录</p>
        </div>
      </SignedOut>
    </div>
  )
}

const btnStyle = {
  padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd',
  cursor: 'pointer', fontSize: 13, background: '#fff'
}
