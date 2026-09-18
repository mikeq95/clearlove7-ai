import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

export default function ThinkingPanel({ reasoning, streaming }) {
  const [expanded, setExpanded] = useState(false)

  if (!reasoning) return null

  return (
    <div className="thinking-panel">
      <button className="thinking-panel-header" onClick={() => setExpanded(v => !v)}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className={`thinking-label${streaming ? ' is-streaming' : ''}`}>
          {streaming ? '正在思考…' : '已深度思考'}
        </span>
      </button>
      {expanded && <div className="thinking-body">{reasoning}</div>}
    </div>
  )
}
