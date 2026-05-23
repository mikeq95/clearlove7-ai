import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [provider, setProvider] = useState('deepseek')
  const [model, setModel] = useState('deepseek-chat')
  const [apiKey, setApiKey] = useState('')
  const [style, setStyle] = useState('简洁')
  const [themeColor, setThemeColor] = useState('#2563eb')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const models = {
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    claude: ['claude-haiku-4-5', 'claude-sonnet-4-5'],
  }

  useEffect(() => {
    const saved = localStorage.getItem(`apiKey_${provider}`)
    if (saved) setApiKey(saved)
    else setApiKey('')
    setModel(models[provider][0])
    setTestResult(null)
  }, [provider])

  useEffect(() => {
    const savedColor = localStorage.getItem('themeColor')
    if (savedColor) setThemeColor(savedColor)
  }, [])

  const saveKey = () => {
    localStorage.setItem(`apiKey_${provider}`, apiKey)
    localStorage.setItem('provider', provider)
    localStorage.setItem('model', model)
    localStorage.setItem('style', style)
    localStorage.setItem('themeColor', themeColor)
    document.documentElement.style.setProperty('--accent', themeColor)
    alert('保存成功')
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: '测试' }], 
          word: '测试', 
          provider, 
          model, 
          apiKey, 
          style 
        })
      })
      if (res.ok) setTestResult('✅ 连接成功')
      else setTestResult('❌ Key 无效，请检查')
    } catch {
      setTestResult('❌ 请求失败')
    }
    setTesting(false)
  }

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px', fontFamily: 'var(--sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h2 style={{ margin: 0, color: 'var(--text)' }}>设置</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => navigate('/')} style={btnStyle}>返回</button>
          <UserButton />
        </div>
      </div>

      <label style={labelStyle}>AI 供应商</label>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {['deepseek', 'claude'].map(p => (
          <button key={p} onClick={() => setProvider(p)}
            style={{ ...btnStyle, background: provider === p ? 'var(--accent)' : 'var(--sidebar-bg)', color: provider === p ? '#fff' : 'var(--text)', border: 'none' }}>
            {p === 'deepseek' ? 'DeepSeek' : 'Claude'}
          </button>
        ))}
      </div>

      <label style={labelStyle}>模型</label>
      <select value={model} onChange={e => setModel(e.target.value)} style={inputStyle}>
        {models[provider].map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <label style={labelStyle}>API Key</label>
      <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
        placeholder={`输入 ${provider === 'deepseek' ? 'DeepSeek' : 'Claude'} API Key`}
        style={inputStyle} />
      <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4, marginBottom: 24 }}>Key 只保存在本机浏览器，不会上传到任何服务器</p>

      <label style={labelStyle}>默认解释风格</label>
      <select value={style} onChange={e => setStyle(e.target.value)} style={inputStyle}>
        {['简洁', '详细', '类比', '学术'].map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <label style={labelStyle}>主题颜色</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <input 
          type="color" 
          value={themeColor} 
          onChange={e => setThemeColor(e.target.value)}
          style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }}
        />
        <span style={{ fontSize: 14, color: 'var(--text-light)', fontFamily: 'var(--mono)' }}>{themeColor}</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={saveKey} style={{ ...btnStyle, background: 'var(--text)', color: 'var(--bg)', flex: 1, border: 'none' }}>保存</button>
        <button onClick={testConnection} disabled={!apiKey || testing}
          style={{ ...btnStyle, flex: 1 }}>
          {testing ? '测试中...' : '测试连接'}
        </button>
      </div>
      {testResult && <p style={{ marginTop: 12, textAlign: 'center', color: 'var(--text)' }}>{testResult}</p>}
    </div>
  )
}

const btnStyle = {
  padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)',
  cursor: 'pointer', fontSize: 14, background: 'var(--bg)', color: 'var(--text)',
  transition: 'all 0.2s'
}
const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 14, marginBottom: 16,
  boxSizing: 'border-box', background: 'var(--bg)', color: 'var(--text)',
  outline: 'none'
}
const labelStyle = {
  display: 'block', fontSize: 13, color: 'var(--text-light)', marginBottom: 8, fontWeight: 500
}
