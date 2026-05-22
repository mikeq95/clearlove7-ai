import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useClerk } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

const BUTTONS = [
  { label: '简单解释', prompt: '用最简单的话解释' },
  { label: '深入解释', prompt: '深入详细地解释' },
  { label: '举例说明', prompt: '用具体例子说明' },
  { label: '和本文关系', prompt: '结合上下文说明它在文中的含义' },
  { label: '一句话解释', prompt: '用一句话解释' },
]

export default function MainPage() {
  const [searchParams] = useSearchParams()
  const word = searchParams.get('word')
  const context = searchParams.get('context')
  const navigate = useNavigate()
  const { openSignIn } = useClerk()

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeBtn, setActiveBtn] = useState(null)
  const resultRef = useRef(null)

  const getSettings = () => ({
    provider: localStorage.getItem('provider') || 'deepseek',
    model: localStorage.getItem('model') || 'deepseek-chat',
    style: localStorage.getItem('style') || '简洁',
    apiKey: localStorage.getItem(`apiKey_${localStorage.getItem('provider') || 'deepseek'}`) || '',
  })

  const explain = async (promptPrefix) => {
    const { provider, model, style, apiKey } = getSettings()

    if (!apiKey) {
      setError('请先去设置页填写 API Key')
      return
    }

    const cacheKey = `cache_${word}_${context}_${provider}_${model}_${promptPrefix}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setResult(cached)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setResult('')

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, context, provider, model, apiKey, style, promptPrefix })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '请求失败')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setResult(prev => prev + chunk)
      }

      localStorage.setItem(cacheKey, full)
    } catch (e) {
      setError(e.message)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (word) explain('用' + (getSettings().style) + '的方式解释')
  }, [word])

  if (!word) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12, color: '#999' }}>
        <p style={{ fontSize: 48 }}>🔍</p>
        <p>请从博客点击高亮词语跳转过来</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>🔍 {word}</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <SignedIn>
            <button onClick={() => navigate('/settings')} style={btnStyle}>设置</button>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <button onClick={() => openSignIn()} style={{ ...btnStyle, background: '#000', color: '#fff' }}>登录</button>
          </SignedOut>
        </div>
      </div>

      {context && (
        <p style={{ fontSize: 13, color: '#999', marginBottom: 24, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8 }}>
          📄 上下文：{context}
        </p>
      )}

      <SignedOut>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <p>登录后即可查看 AI 解释</p>
          <button onClick={() => openSignIn()} style={{ ...btnStyle, background: '#000', color: '#fff', marginTop: 12 }}>
            登录 / 注册
          </button>
        </div>
      </SignedOut>

      <SignedIn>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {BUTTONS.map(b => (
            <button key={b.label}
              onClick={() => { setActiveBtn(b.label); explain(b.prompt) }}
              style={{ ...btnStyle, background: activeBtn === b.label ? '#000' : '#fff', color: activeBtn === b.label ? '#fff' : '#000' }}>
              {b.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fff3f3', border: '1px solid #ffccc7', borderRadius: 8, color: '#cf1322', marginBottom: 16 }}>
            {error}
            {error.includes('设置') && (
              <button onClick={() => navigate('/settings')} style={{ marginLeft: 12, ...btnStyle, fontSize: 12 }}>去设置</button>
            )}
          </div>
        )}

        <div ref={resultRef} style={{ minHeight: 200, padding: '20px', background: '#fafafa', borderRadius: 12, border: '1px solid #eee', lineHeight: 1.8, fontSize: 15, whiteSpace: 'pre-wrap' }}>
          {loading && !result && <span style={{ color: '#999' }}>AI 思考中...</span>}
          {result}
          {loading && <span style={{ display: 'inline-block', width: 8, height: 16, background: '#999', marginLeft: 2, animation: 'blink 1s infinite' }} />}
        </div>
      </SignedIn>
    </div>
  )
}

const btnStyle = {
  padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd',
  cursor: 'pointer', fontSize: 13, background: '#fff'
}
