import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', gap: 12, fontFamily: 'var(--sans, sans-serif)',
        background: '#faf9f5', color: '#232323', textAlign: 'center', padding: 24,
      }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>出了点问题</div>
        <div style={{ fontSize: 14, color: '#6f6f68', maxWidth: 360 }}>
          页面遇到了一个未预期的错误。你的对话记录仍保存在本地浏览器中，刷新后应该会恢复正常。
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8, padding: '9px 18px', borderRadius: 9, border: 'none',
            background: '#232323', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
          }}
        >
          刷新页面
        </button>
      </div>
    )
  }
}
