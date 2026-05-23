import { useState, useEffect, useRef } from 'react'
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import {
  PanelLeft, Plus, Search, MessageSquare, Star, FolderClosed, Settings,
  Eye, EyeOff, Check, Loader2, ChevronRight
} from 'lucide-react'

// ─── Shared Sidebar (mirrors MainPage) ──────────────────────────────────────
function Sidebar({ isSidebarOpen, setIsSidebarOpen }) {
  const navigate = useNavigate()
  const { openSignIn } = useClerk()
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState('')

  const navItem = (icon, label, onClick, active = false) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px', borderRadius: 8, cursor: 'pointer',
        color: active ? '#232323' : '#6f6f68',
        fontSize: 14, fontWeight: active ? 500 : 400,
        background: active ? '#efeee9' : 'transparent',
        transition: 'background 0.15s',
        userSelect: 'none'
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#efeee9' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      {label}
    </div>
  )

  return (
    <div style={{
      width: isSidebarOpen ? 260 : 0,
      transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      backgroundColor: '#f7f7f4',
      flexShrink: 0,
      borderRight: isSidebarOpen ? '1px solid #e8e5dc' : 'none',
      overflow: 'hidden'
    }}>
      <div style={{ width: 260, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Logo */}
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, fontFamily: 'Georgia, serif', color: '#232323' }}>
            Clearlove7
          </h2>
          <button onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6f6f68', display: 'flex' }}>
            <PanelLeft size={18} />
          </button>
        </div>

        {/* Primary actions */}
        <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItem(<div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dedbd2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></div>, 'New chat', () => navigate('/'))}
          {navItem(<MessageSquare size={16} />, 'Chats', () => {})}
          {navItem(<Star size={16} />, 'Starred', () => {})}
          {navItem(<FolderClosed size={16} />, 'Projects', () => {})}
        </div>

        {/* Search */}
        <div style={{ padding: '16px 12px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: '#fff', border: '1px solid #ebe8df', borderRadius: 8 }}>
            <Search size={13} color="#6f6f68" />
            <input
              type="text" placeholder="Search history..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', marginLeft: 8, width: '100%', fontSize: 13, color: '#232323' }}
            />
          </div>
        </div>

        <div style={{ padding: '0 20px 8px' }}>
          <h3 style={{ fontSize: 11, color: '#6f6f68', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recents</h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          <SignedOut>
            <div style={{ padding: '0 8px', color: '#6f6f68', fontSize: 13 }}>
              <p style={{ margin: '0 0 10px' }}>Sign in to save history</p>
              <button onClick={() => openSignIn()} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #ebe8df', background: '#fff', color: '#232323', cursor: 'pointer', fontSize: 13, width: '100%' }}>
                Log in / Sign up
              </button>
            </div>
          </SignedOut>
        </div>

        {/* Bottom user area */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e5dc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SignedIn>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserButton />
              <span style={{ fontSize: 14, color: '#232323', fontWeight: 500 }}>{user?.firstName || 'User'}</span>
            </div>
          </SignedIn>
          {navItem(<Settings size={15} />, '', () => {}, true /* active = settings page */)}
        </div>
      </div>
    </div>
  )
}

// ─── Toast component ──────────────────────────────────────────────────────────
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

// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider = () => <div style={{ borderTop: '1px solid #ebe8df', margin: '0' }} />

// ─── SettingRow ───────────────────────────────────────────────────────────────
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

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: '#6f6f68', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 0, paddingBottom: 12 }}>
      {title}
    </div>
  )
}

// ─── Segmented Control ────────────────────────────────────────────────────────
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

  // Settings state
  const [provider, setProvider] = useState('deepseek')
  const [model, setModel] = useState('deepseek-chat')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [themeColor, setThemeColor] = useState('#3b82f6')
  const [hexInput, setHexInput] = useState('#3b82f6')

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState('model')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // { ok: bool, message: string }
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null) // { message, type }

  const models = {
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    claude: ['claude-haiku-4-5', 'claude-sonnet-4-5'],
  }

  // Load saved values on first mount
  useEffect(() => {
    const color = localStorage.getItem('themeColor') || '#3b82f6'
    setThemeColor(color)
    setHexInput(color)
    document.documentElement.style.setProperty('--accent', color)

    const p = localStorage.getItem('provider') || 'deepseek'
    setProvider(p)
    const savedKey = localStorage.getItem(`apiKey_${p}`) || ''
    setApiKey(savedKey)
    const savedModel = localStorage.getItem('model')
    // Only use saved model if it belongs to the saved provider
    const validModels = p === 'deepseek'
      ? ['deepseek-chat', 'deepseek-reasoner']
      : ['claude-haiku-4-5', 'claude-sonnet-4-5']
    setModel(savedModel && validModels.includes(savedModel) ? savedModel : validModels[0])
  }, [])

  // Sync API key and reset model when provider changes
  useEffect(() => {
    const savedKey = localStorage.getItem(`apiKey_${provider}`) || ''
    setApiKey(savedKey)
    const defaultModel = models[provider][0]
    setModel(defaultModel)
    setTestResult(null)
  }, [provider]) // eslint-disable-line

  const handleSave = async () => {
    setSaving(true)
    localStorage.setItem(`apiKey_${provider}`, apiKey)
    localStorage.setItem('provider', provider)
    localStorage.setItem('model', model)
    localStorage.setItem('themeColor', themeColor)
    document.documentElement.style.setProperty('--accent', themeColor)
    await new Promise(r => setTimeout(r, 300)) // tiny visual delay
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
      setTestResult(res.ok ? { ok: true, message: '连接成功' } : { ok: false, message: 'Key 无效，请检查' })
    } catch {
      setTestResult({ ok: false, message: '网络请求失败' })
    }
    setTesting(false)
  }

  const handleHexInput = (val) => {
    setHexInput(val)
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setThemeColor(val)
      document.documentElement.style.setProperty('--accent', val)
    }
  }

  const navSections = [
    { id: 'general', label: '通用' },
    { id: 'model', label: '模型与 API' },
    { id: 'appearance', label: '外观' },
    { id: 'account', label: '账户' },
  ]

  // ── Input shared styles ──
  const inputSt = {
    padding: '9px 13px', borderRadius: 9,
    border: '1px solid #dedbd2', fontSize: 14,
    background: '#fff', color: '#232323', outline: 'none',
    width: '100%', boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s'
  }
  const selectSt = { ...inputSt, width: 'auto', minWidth: 240, cursor: 'pointer', appearance: 'auto' }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'var(--sans)', background: '#faf9f5', overflow: 'hidden' }}>

      {/* Global Sidebar */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Sidebar toggle (when closed) */}
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
          <div style={{ maxWidth: 1060, margin: '0 auto', padding: '64px 48px 96px' }}>

            {/* Page title */}
            <div style={{ marginBottom: 40 }}>
              <h1 style={{ fontSize: 26, fontWeight: 600, color: '#232323', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>设置</h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6f6f68' }}>管理你的 AI 配置与个人偏好</p>
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>

              {/* ── Left nav ── */}
              <div style={{ width: 200, flexShrink: 0 }}>
                {navSections.map(sec => (
                  <div
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    style={{
                      padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
                      fontSize: 15, fontWeight: activeSection === sec.id ? 500 : 400,
                      color: activeSection === sec.id ? '#232323' : '#6f6f68',
                      background: activeSection === sec.id ? '#efeee9' : 'transparent',
                      marginBottom: 2, transition: 'background 0.15s',
                      userSelect: 'none'
                    }}
                    onMouseEnter={e => { if (activeSection !== sec.id) e.currentTarget.style.background = '#efeee9' }}
                    onMouseLeave={e => { if (activeSection !== sec.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    {sec.label}
                  </div>
                ))}
              </div>

              {/* ── Right content ── */}
              <div style={{ flex: 1, minWidth: 0 }}>

                {/* ╔═ Model & API ═╗ */}
                {activeSection === 'model' && (
                  <div>
                    <SectionHeader title="模型与 API" />
                    <Divider />

                    <SettingRow
                      label="AI 供应商"
                      description="选择提供 AI 服务的厂商"
                      control={
                        <SegmentedControl
                          options={[{ value: 'deepseek', label: 'DeepSeek' }, { value: 'claude', label: 'Claude' }]}
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
                        <span>Key 仅保存在本机浏览器，不会上传至任何服务器。
                          {!apiKey && <span style={{ color: '#b45309', marginLeft: 6 }}>尚未填写</span>}
                        </span>
                      }
                      control={
                        <div style={{ position: 'relative', width: 320 }}>
                          <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder={`${provider === 'deepseek' ? 'sk-...' : 'sk-ant-...'}`}
                            style={{ ...inputSt, width: '100%', paddingRight: 40, fontFamily: showKey ? 'var(--mono)' : 'inherit', fontSize: showKey ? 13 : 14 }}
                            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={e => e.target.style.borderColor = '#dedbd2'}
                          />
                          <button onClick={() => setShowKey(v => !v)}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6f6f68', display: 'flex' }}>
                            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      }
                    />

                    {/* Test connection result */}
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

                    {/* Action buttons */}
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
                )}

                {/* ╔═ General ═╗ */}
                {activeSection === 'general' && (
                  <div>
                    <SectionHeader title="通用" />
                    <Divider />
                    <div style={{ display: 'flex', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid #ebe8df' }}>
                      <button onClick={handleSave}
                        style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: '#232323', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                        保存设置
                      </button>
                    </div>
                  </div>
                )}

                {/* ╔═ Appearance ═╗ */}
                {activeSection === 'appearance' && (
                  <div>
                    <SectionHeader title="外观" />
                    <Divider />
                    <SettingRow
                      label="主题颜色"
                      description="用于强调色、按钮、用户气泡等界面元素"
                      control={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 9, overflow: 'hidden', border: '1px solid #dedbd2', flexShrink: 0 }}>
                            <input
                              type="color" value={themeColor}
                              onChange={e => { setThemeColor(e.target.value); setHexInput(e.target.value); document.documentElement.style.setProperty('--accent', e.target.value) }}
                              style={{ position: 'absolute', inset: '-4px', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', cursor: 'pointer', border: 'none', padding: 0 }}
                            />
                          </div>
                          <input
                            type="text" value={hexInput}
                            onChange={e => handleHexInput(e.target.value)}
                            style={{ ...inputSt, width: 110, fontFamily: 'var(--mono)', fontSize: 13 }}
                            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={e => e.target.style.borderColor = '#dedbd2'}
                          />
                          {/* Color presets */}
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['#3b82f6', '#7c3aed', '#0f766e', '#b45309', '#be185d', '#334155'].map(c => (
                              <button key={c} onClick={() => { setThemeColor(c); setHexInput(c); document.documentElement.style.setProperty('--accent', c) }}
                                style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: themeColor === c ? '2px solid #232323' : '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
                            ))}
                          </div>
                        </div>
                      }
                      last
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid #ebe8df' }}>
                      <button onClick={handleSave}
                        style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: '#232323', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                        保存设置
                      </button>
                    </div>
                  </div>
                )}

                {/* ╔═ Account ═╗ */}
                {activeSection === 'account' && (
                  <div>
                    <SectionHeader title="账户" />
                    <Divider />
                    <SignedIn>
                      <SettingRow
                        label="账户管理"
                        description="查看和管理你的登录账号、安全设置"
                        control={<UserButton />}
                        last
                      />
                    </SignedIn>
                    <SignedOut>
                      <div style={{ padding: '32px 0', color: '#6f6f68', fontSize: 14 }}>
                        <p style={{ margin: '0 0 16px' }}>登录后可保存对话历史和个人偏好设置</p>
                      </div>
                    </SignedOut>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>
    </div>
  )
}
