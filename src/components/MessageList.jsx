import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

function groupMessages(messages) {
  const groups = []
  let currentGroup = null

  messages.forEach((msg, index) => {
    const msgTime = msg.timestamp || Date.now()
    let isNewGroup = false
    let showTimestamp = false

    if (!currentGroup) {
      isNewGroup = true
      showTimestamp = true
    } else {
      const prevTime = messages[index - 1].timestamp || Date.now()
      if (msgTime - prevTime > 5 * 60 * 1000) {
        isNewGroup = true
        showTimestamp = true
      } else if (msg.role !== currentGroup.role) {
        isNewGroup = true
      }
    }

    if (isNewGroup) {
      currentGroup = { role: msg.role, showTimestamp, timestamp: msgTime, messages: [msg] }
      groups.push(currentGroup)
    } else {
      currentGroup.messages.push(msg)
    }
  })
  return groups
}

function formatTimestamp(ts) {
  const d = new Date(ts)
  const now = new Date()
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${mins}`

  const sameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

  if (sameDay(d, now)) return `今天 ${timeStr}`

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (sameDay(d, yesterday)) return `昨天 ${timeStr}`

  return `${d.getMonth() + 1}月${d.getDate()}日 ${timeStr}`
}

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
      className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-md border text-xs cursor-pointer transition-all duration-200 ${
        copied
          ? 'bg-[#e6f4ea] border-[#ddd] text-[#2e7d32]'
          : 'bg-[#f5f5f5] border-[#ddd] text-[#555]'
      }`}
    >
      {copied ? '已复制 ✓' : '复制'}
    </button>
  )
}

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const codeString = String(children).replace(/\n$/, '')
    return !inline && match ? (
      <div className="relative">
        <CopyButton code={codeString} />
        <SyntaxHighlighter style={oneLight} language={match[1]} PreTag="div" {...props}>
          {codeString}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={className} {...props}>{children}</code>
    )
  },
}

export default function MessageList({ messages, loading, error, word, user, scrollRef }) {
  const groupedMessages = useMemo(() => groupMessages(messages), [messages])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto flex flex-col"
      style={{ padding: '76px 16px 100px' }}
    >
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: '0 72px', display: 'flex', flexDirection: 'column' }}>

        {messages.length === 0 && !word && (
          <div className="text-center text-[var(--text-light)] text-[15px]" style={{ marginTop: '30vh' }}>
            发条消息开始聊天吧
          </div>
        )}

        {groupedMessages.map((group, gIdx) => (
          <div key={gIdx} className="flex flex-col mb-2">

            {group.showTimestamp && (
              <div className="text-center text-xs text-[var(--text-light)] font-medium my-4">
                {formatTimestamp(group.timestamp)}
              </div>
            )}

            {group.messages.map((msg, mIdx) => {
              const isUser = msg.role === 'user'
              const isLastInGroup = mIdx === group.messages.length - 1
              const bubbleClass = isUser ? 'user-bubble' : 'ai-bubble'
              const tailClass = isLastInGroup ? ' has-tail' : ''

              return (
                <div
                  key={mIdx}
                  className="bubble-enter flex items-end w-full"
                  style={{
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: isLastInGroup ? 0 : 2,
                  }}
                >
                  {/* AI Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 flex-shrink-0 mr-1.5" style={{ visibility: isLastInGroup ? 'visible' : 'hidden' }}>
                      <div className="w-8 h-8 rounded-full bg-[#E5E5EA] flex items-center justify-center text-lg">
                        🤖
                      </div>
                    </div>
                  )}

                  <div
                    className={`${bubbleClass}${tailClass}`}
                    style={{
                      background: isUser ? 'var(--imessage-blue)' : '#E9E9EB',
                      color: isUser ? '#FFFFFF' : '#000000',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      maxWidth: '70%',
                      wordBreak: 'break-word',
                      position: 'relative',
                    }}
                  >
                    {/* Image attachment (user messages only) */}
                    {isUser && msg.image && (
                      <img
                        src={msg.image}
                        alt="附件"
                        className="rounded-xl max-w-[240px] max-h-[200px] object-cover mb-1 block"
                      />
                    )}

                    {!isUser && msg.content === '' && loading && isLastInGroup ? (
                      <div className="flex gap-1 py-1 px-0.5">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    ) : msg.content ? (
                      <div className="markdown-body">
                        {isUser ? (
                          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                        ) : (
                          <ReactMarkdown components={markdownComponents}>
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="w-8 h-8 flex-shrink-0 ml-1.5" style={{ visibility: isLastInGroup ? 'visible' : 'hidden' }}>
                      {user?.imageUrl ? (
                        <img src={user.imageUrl} alt="user" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#D1D1D6] flex items-center justify-center text-white text-sm font-bold">
                          {user?.firstName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {error && (
          <div className="text-center mt-4">
            <div className="inline-block bg-[#fdf2f2] text-[#b91c1c] px-4 py-2 rounded-2xl text-sm">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
