import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [provider, setProvider] = useState('deepseek')
  const [model, setModel] = useState('deepseek-chat')
  const [apiKey, setApiKey] = useState('')
  const [style, setStyle] = useState('简洁')
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

  const saveKey = () => {
    localStorage.setItem(`apiKey_${provider}`, apiKey)
    localStorage.setItem('provider', provider)
    localStorage.setItem('model', model)
    localStorage.setItem('style', style)
    alert('保存成功')
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: '测试', provider, model, apiKey, style })
      })
      if (res.ok) setTestResult('✅ 连接成功')
      else setTestResult('❌ Key 无效，请检查')
    } catch {
      setTestResult('❌ 请求失败')
    }
    setTesting(false)
  }

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h2 style={{ margin: 0 }}>设置</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => navigate('/')} style={btnStyle}>返回</button>
          <UserButton />
        </div>
      </div>

      <label style={labelStyle}>AI 供应商</label>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {['deepseek', 'claude'].map(p => (
          <button key={p} onClick={() => setProvider(p)}
            style={{ ...btnStyle, background: provider === p ? '#000' : '#eee', color: provider === p ? '#fff' : '#000' }}>
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
      <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Key 只保存在本机浏览器，不会上传到任何服务器</p>

      <label style={labelStyle}>默认解释风格</label>
      <select value={style} onChange={e => setStyle(e.target.value)} style={inputStyle}>
        {['简洁', '详细', '类比', '学术'].map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={saveKey} style={{ ...btnStyle, background: '#000', color: '#fff', flex: 1 }}>保存</button>
        <button onClick={testConnection} disabled={!apiKey || testing}
          style={{ ...btnStyle, flex: 1 }}>
          {testing ? '测试中...' : '测试连接'}
        </button>
      </div>
      {testResult && <p style={{ marginTop: 12, textAlign: 'center' }}>{testResult}</p>}
    </div>
  )
}

const btnStyle = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd',
  cursor: 'pointer', fontSize: 14, background: '#fff'
}
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #ddd', fontSize: 14, marginBottom: 16,
  boxSizing: 'border-box'
}
const labelStyle = {
  display: 'block', fontSize: 13, color: '#666', marginBottom: 6
}
