import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

function CopyButton({ code }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className={`px-2.5 py-0.5 rounded-md border text-xs cursor-pointer transition-all duration-200 ${
        copied
          ? 'bg-[#e6f4ea] border-[#ddd] text-[#2e7d32]'
          : 'bg-[#f5f5f5] border-[#ddd] text-[#555]'
      }`}
    >
      {copied ? '已复制 ✓' : '复制'}
    </button>
  )
}

export default function CodeBlock({ language, code, ...props }) {
  return (
    <div className="my-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs"
        style={{ background: 'rgba(0,0,0,0.05)', color: '#555' }}
      >
        <span style={{ fontFamily: 'var(--mono)' }}>{language || 'text'}</span>
        <CopyButton code={code} />
      </div>
      <SyntaxHighlighter
        style={oneLight}
        language={language}
        PreTag="div"
        showLineNumbers
        lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#999', userSelect: 'none' }}
        customStyle={{ margin: 0, padding: '10px 12px', fontSize: 13 }}
        {...props}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
