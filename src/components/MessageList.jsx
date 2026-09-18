import { useMemo, lazy, Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import ThinkingPanel from './ThinkingPanel'

const CodeBlock = lazy(() => import('./CodeBlock'))

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

const markdownComponents = {
  // Strip react-markdown's default <pre> wrapper around fenced code — CodeBlock
  // renders its own bordered card, and the global .markdown-body pre rule would
  // otherwise double-box it.
  pre({ children }) {
    return children
  },
  code({ node: _, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const codeString = String(children).replace(/\n$/, '')
    return !inline && match ? (
      <Suspense fallback={<pre className="whitespace-pre-wrap">{codeString}</pre>}>
        <CodeBlock language={match[1]} code={codeString} {...props} />
      </Suspense>
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
              const hasReasoning = !isUser && !!msg.reasoning
              const isStreamingContent = !isUser && loading && isLastInGroup && msg.content !== ''

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

                    {hasReasoning && (
                      <ThinkingPanel
                        reasoning={msg.reasoning}
                        streaming={loading && isLastInGroup && msg.content === ''}
                      />
                    )}

                    {!isUser && msg.content === '' && !hasReasoning && loading && isLastInGroup ? (
                      <div className="flex gap-1 py-1 px-0.5">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    ) : msg.content ? (
                      <div className={`markdown-body${isStreamingContent ? ' is-streaming' : ''}`}>
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
