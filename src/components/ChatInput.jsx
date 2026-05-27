import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Plus, X } from 'lucide-react'

const VISION_PROVIDERS = ['claude', 'glm']

function supportsImages() {
  return VISION_PROVIDERS.includes(localStorage.getItem('provider') || 'deepseek')
}

/**
 * props:
 *   loading   boolean
 *   onSend    ({ text, image? }) => void
 */
export default function ChatInput({ loading, onSend }) {
  const [inputValue, setInputValue] = useState('')
  const [imagePreview, setImagePreview] = useState(null) // base64 data-URL
  const [imageError, setImageError] = useState('')
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      setImageError('请选择图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('图片不能超过 5MB')
      return
    }

    setImageError('')
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handlePlusClick = () => {
    if (!supportsImages()) {
      setImageError('当前模型不支持图片，请在设置中切换到 Claude 或 GLM')
      setTimeout(() => setImageError(''), 3000)
      return
    }
    fileInputRef.current?.click()
  }

  const handleSend = () => {
    if ((!inputValue.trim() && !imagePreview) || loading) return
    onSend({ text: inputValue.trim(), image: imagePreview || undefined })
    setInputValue('')
    setImagePreview(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = (inputValue.trim() || imagePreview) && !loading

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex flex-col items-center"
      style={{
        background: 'var(--bottom-bar)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '10px 16px 24px',
      }}
    >
      <div style={{ maxWidth: 1500, width: '100%', padding: '0 72px' }} className="flex flex-col gap-2">

        {/* Error hint */}
        {imageError && (
          <div className="text-xs text-[#b45309] bg-[#fffbeb] border border-[#fcd34d] rounded-lg px-3 py-1.5">
            {imageError}
          </div>
        )}

        {/* Image preview */}
        {imagePreview && (
          <div className="relative inline-flex self-start ml-10">
            <img
              src={imagePreview}
              alt="待发送"
              className="h-20 rounded-xl border border-[var(--border)] object-cover"
            />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#555] text-white border-none cursor-pointer flex items-center justify-center"
            >
              <X size={11} strokeWidth={3} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* + button */}
          <button
            onClick={handlePlusClick}
            className="w-8 h-8 rounded-full bg-[#D1D1D6] text-white border-none cursor-pointer flex items-center justify-center flex-shrink-0 mb-0.5 transition-colors hover:bg-[#B8B8BD]"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>

          {/* Input pill */}
          <div className="flex-1 bg-white rounded-[20px] border border-[#C7C7CC] flex items-end shadow-[0_1px_2px_rgba(0,0,0,0.02)]" style={{ paddingLeft: 16, paddingRight: 4, paddingTop: 4, paddingBottom: 4 }}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="发消息…"
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-base leading-6 py-1 text-black resize-none"
              style={{
                minHeight: 24,
                maxHeight: 120,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                marginTop: 2,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`w-[26px] h-[26px] rounded-full border-none flex items-center justify-center flex-shrink-0 ml-2 mb-1.5 transition-colors duration-200 ${
                canSend ? 'cursor-pointer bg-[var(--imessage-blue)]' : 'cursor-default bg-[#E5E5EA]'
              }`}
            >
              <ArrowUp size={16} strokeWidth={3} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
