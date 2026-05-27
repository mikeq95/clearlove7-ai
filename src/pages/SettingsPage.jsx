import { useState, useEffect } from 'react'
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { PanelLeft, Eye, EyeOff, Check, Loader2 } from 'lucide-react'
import Sidebar from '../components/Sidebar'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#232323' : '#b91c1c',
      color: '#fff', padding: '10px 20px', borderRadius: 10,
      fontSize: 14, fontWeight: 500, zIndex: 9999,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'fadeUp 0.25s ease'
    }}>
      {type === 'success' ? <Check size={15} /> : null}
      {message}
    </div>
  )
}

const Divider = () => <div style={{ borderTop: '1px solid #ebe8df', margin: '0' }} />

function SettingRow({ label, description, control, last = false }) {
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 0', gap: 24, flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 15, color: '#232323', fontWeight: 500, marginBottom: description ? 4 : 0 }}>{label}</div>
          {description && <div style={{ fontSize: 13, color: '#6f6f68', lineHeight: 1.5 }}>{description}</div>}
        </div>
        <div style={{ flexShrink: 0 }}>{control}</div>
      </div>
      {!last && <Divider />}
    </>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', border: '1px solid #dedbd2', borderRadius: 10, overflow: 'hidden', background: '#faf9f5' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '7px 18px', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: value === opt.value ? 500 : 400,
            background: value === opt.value ? '#fff' : 'transparent',
            color: value === opt.value ? '#232323' : '#6f6f68',
            boxShadow: value === opt.value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
            margin: value === opt.value ? 3 : 0,
            borderRadius: value === opt.value ? 7 : 0
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const navigate = useNavigate()
  const [provider, setProvider] = useState('deepseek')
  const [model, setModel] = useState('deepseek-chat')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const models = {
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    claude: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'],
    glm: ['glm-4v-flash', 'glm-4-flash'],
  }

  useEffect(() => {
    const p = localStorage.getItem('provider') || 'deepseek'
    setProvider(p)
    setApiKey(localStorage.getItem(`apiKey_${p}`) || '')
    const savedModel = localStorage.getItem('model')
    const validModels = models[p] ?? models.deepseek
    setModel(savedModel && validModels.includes(savedModel) ? savedModel : validModels[0])
  }, [])

  useEffect(() => {
    setApiKey(localStorage.getItem(`apiKey_${provider}`) || '')
    setModel(models[provider][0])
    setTestResult(null)
  }, [provider]) // eslint-disable-line

  const handleSave = async () => {
    setSaving(true)
    localStorage.setItem(`apiKey_${provider}`, apiKey)
    localStorage.setItem('provider', provider)
    localStorage.setItem('model', model)
    await new Promise(r => setTimeout(r, 300))
    setSaving(false)
    setToast({ message: '设置已保存', type: 'success' })
  }

  const testConnection = async () => {
    if (!apiKey) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: '测试' }], word: '测试', provider, model, apiKey })
      })
      if (res.ok) {
        setTestResult({ ok: true, message: '连接成功' })
      } else {
        const data = await res.json().catch(() => ({}))
        setTestResult({ ok: false, message: data.error || 'Key 无效，请检查' })
      }
    } catch {
      setTestResult({ ok: false, message: '网络请求失败' })
    }
    setTesting(false)
  }

  const inputSt = {
    padding: '9px 13px', borderRadius: 9,
    border: '1px solid #dedbd2', fontSize: 14,
    background: '#fff', color: '#232323', outline: 'none',
    width: '100%', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.15s'
  }
  const selectSt = { ...inputSt, width: 'auto', minWidth: 240, cursor: 'pointer', appearance: 'auto' }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'var(--sans)', background: '#faf9f5', overflow: 'hidden' }}>

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        <button onClick={() => setIsSidebarOpen(true)}
          style={{
            position: 'absolute', top: 16, left: 16, background: 'none', border: 'none',
            cursor: 'pointer', padding: 8, color: '#6f6f68', display: 'flex', alignItems: 'center',
            zIndex: 10, opacity: isSidebarOpen ? 0 : 1, pointerEvents: isSidebarOpen ? 'none' : 'auto',
            transition: 'opacity 0.3s ease'
          }}>
          <PanelLeft size={20} />
        </button>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '64px 48px 96px' }}>

            <div style={{ marginBottom: 40 }}>
              <h1 style={{ fontSize: 26, fontWeight: 600, color: '#232323', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>设置</h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6f6f68' }}>管理你的 AI 配置</p>
            </div>

            <Divider />

            <SettingRow
              label="AI 供应商"
              description="选择提供 AI 服务的厂商"
              control={
                <SegmentedControl
                  options={[
                    { value: 'deepseek', label: 'DeepSeek' },
                    { value: 'claude', label: 'Claude' },
                    { value: 'glm', label: 'GLM' },
                  ]}
                  value={provider} onChange={setProvider}
                />
              }
            />
            <SettingRow
              label="模型"
              description="当前供应商下使用的具体模型版本"
              control={
                <select value={model} onChange={e => setModel(e.target.value)} style={selectSt}>
                  {models[provider].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              }
            />
            <SettingRow
              label="API Key"
              description={
                <span>
                  Key 保存在本地浏览器，仅在发起请求时传输至你自己的 Vercel 函数，不会被第三方存储。
                  {!apiKey && <span style={{ color: '#b45309', marginLeft: 6 }}>尚未填写</span>}
                </span>
              }
              control={
                <div style={{ position: 'relative', width: 320 }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={
                      provider === 'deepseek' ? 'sk-...' :
                      provider === 'claude' ? 'sk-ant-...' :
                      'your-glm-api-key'
                    }
                    style={{ ...inputSt, paddingRight: 40, fontFamily: showKey ? 'var(--mono)' : 'inherit', fontSize: showKey ? 13 : 14 }}
                    onFocus={e => e.target.style.borderColor = '#232323'}
                    onBlur={e => e.target.style.borderColor = '#dedbd2'}
                  />
                  <button onClick={() => setShowKey(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6f6f68', display: 'flex' }}>
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              }
              last
            />

            {testResult && (
              <div style={{
                padding: '10px 14px', borderRadius: 9, fontSize: 13, marginTop: 4, marginBottom: 8,
                background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                color: testResult.ok ? '#166534' : '#b91c1c',
                border: `1px solid ${testResult.ok ? '#bbf7d0' : '#fecaca'}`
              }}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid #ebe8df' }}>
              <button
                onClick={testConnection}
                disabled={!apiKey || testing}
                style={{
                  padding: '9px 18px', borderRadius: 9, border: '1px solid #dedbd2',
                  background: '#fff', color: '#232323', cursor: !apiKey || testing ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 500, opacity: !apiKey || testing ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
                }}
              >
                {testing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {testing ? '测试中...' : '测试连接'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '9px 22px', borderRadius: 9, border: 'none',
                  background: '#232323', color: '#fff', cursor: saving ? 'default' : 'pointer',
                  fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                  opacity: saving ? 0.7 : 1, transition: 'all 0.15s'
                }}
              >
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {saving ? '保存中...' : '保存设置'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>
    </div>
  )
}
