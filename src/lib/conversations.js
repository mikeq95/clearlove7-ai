/**
 * conversations.js
 * Lightweight localStorage-backed conversation store.
 * 
 * Schema: localStorage['conversations'] = JSON.stringify(ConversationMeta[])
 * Messages: localStorage['conv_messages_${id}'] = JSON.stringify(Message[])
 *
 * ConversationMeta: { id, title, source, word, postId, starred, createdAt, updatedAt }
 * Message: { role: 'user'|'assistant', content: string }
 */

const STORE_KEY = 'conversations'

/** Generate a simple unique ID */
function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** Read all conversation metadata (sorted newest first) */
export function getConversations() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Write the full metadata list back */
function saveConversations(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list))
}

/**
 * Create a new conversation.
 * @param {'chat'|'word'} source
 * @param {string|null} word
 * @param {string|null} postId
 * @param {string} firstUserMsg — used to generate the title
 * @returns {string} new conversation id
 */
export function createConversation(source, word, postId, firstUserMsg) {
  const id = uid()
  const title = word
    ? `解释：${word}`
    : (firstUserMsg || '新对话').slice(0, 40)

  const meta = {
    id,
    title,
    source,          // 'chat' | 'word'
    word: word || null,
    postId: postId || null,
    starred: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const list = getConversations()
  list.unshift(meta)
  saveConversations(list.slice(0, 200)) // cap at 200
  return id
}

/** Get messages for a conversation */
export function getMessages(id) {
  try {
    const raw = localStorage.getItem(`conv_messages_${id}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Save/overwrite messages for a conversation, also bumps updatedAt */
export function saveMessages(id, messages) {
  localStorage.setItem(`conv_messages_${id}`, JSON.stringify(messages))
  const list = getConversations()
  const idx = list.findIndex(c => c.id === id)
  if (idx !== -1) {
    list[idx].updatedAt = Date.now()
    saveConversations(list)
  }
}

/** Toggle the starred flag for a conversation. Returns new starred value. */
export function toggleStarred(id) {
  const list = getConversations()
  const idx = list.findIndex(c => c.id === id)
  if (idx === -1) return false
  list[idx].starred = !list[idx].starred
  saveConversations(list)
  return list[idx].starred
}

/** Delete a conversation and its messages */
export function deleteConversation(id) {
  const list = getConversations().filter(c => c.id !== id)
  saveConversations(list)
  localStorage.removeItem(`conv_messages_${id}`)
}

/**
 * Find or create a conversation for a word-explanation session.
 * Returns the existing id if one already exists for this word+postId combo,
 * otherwise creates a new one.
 */
export function findOrCreateWordConv(word, postId) {
  const list = getConversations()
  const existing = list.find(c => c.source === 'word' && c.word === word && c.postId === (postId || null))
  if (existing) return existing.id
  return createConversation('word', word, postId, null)
}

/** Get starred conversations */
export function getStarredConversations() {
  return getConversations().filter(c => c.starred)
}

/** Get the most recent N conversations for the sidebar */
export function getRecentConversations(n = 20) {
  return getConversations().slice(0, n)
}
