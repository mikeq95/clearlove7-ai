import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createConversation,
  deleteConversation,
  findOrCreateWordConv,
  getConversations,
  getMessages,
  getRecentConversations,
  getStarredConversations,
  renameConversation,
  saveMessages,
  toggleStarred,
} from './conversations'

beforeEach(() => {
  localStorage.clear()
})

describe('createConversation', () => {
  it('creates a chat conversation titled from the first message', () => {
    const id = createConversation('chat', null, null, '你好，帮我写点东西')
    const [meta] = getConversations()
    expect(meta.id).toBe(id)
    expect(meta.source).toBe('chat')
    expect(meta.title).toBe('你好，帮我写点东西')
    expect(meta.starred).toBe(false)
  })

  it('creates a word conversation titled "解释：<word>"', () => {
    createConversation('word', '幂等', 'post-1', null)
    const [meta] = getConversations()
    expect(meta.title).toBe('解释：幂等')
    expect(meta.word).toBe('幂等')
    expect(meta.postId).toBe('post-1')
  })

  it('truncates an overly long title to 40 characters', () => {
    const long = 'a'.repeat(100)
    createConversation('chat', null, null, long)
    const [meta] = getConversations()
    expect(meta.title.length).toBe(40)
  })

  it('falls back to "新对话" when there is no first message', () => {
    createConversation('chat', null, null, '')
    const [meta] = getConversations()
    expect(meta.title).toBe('新对话')
  })

  it('caps the conversation list at 200 entries', () => {
    for (let i = 0; i < 205; i++) createConversation('chat', null, null, `msg ${i}`)
    expect(getConversations().length).toBe(200)
  })

  it('puts the newest conversation first', () => {
    createConversation('chat', null, null, 'first')
    createConversation('chat', null, null, 'second')
    const list = getConversations()
    expect(list[0].title).toBe('second')
    expect(list[1].title).toBe('first')
  })
})

describe('messages', () => {
  it('round-trips messages through saveMessages/getMessages', () => {
    const id = createConversation('chat', null, null, 'hi')
    const messages = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }]
    const ok = saveMessages(id, messages)
    expect(ok).toBe(true)
    expect(getMessages(id)).toEqual(messages)
  })

  it('returns an empty array for a conversation with no saved messages', () => {
    expect(getMessages('does-not-exist')).toEqual([])
  })

  it('round-trips a message that has a reasoning field', () => {
    const id = createConversation('chat', null, null, 'hi')
    const messages = [{ role: 'assistant', content: 'answer', reasoning: 'chain of thought' }]
    saveMessages(id, messages)
    expect(getMessages(id)).toEqual(messages)
  })

  it('round-trips a message that has no reasoning field', () => {
    const id = createConversation('chat', null, null, 'hi')
    const messages = [{ role: 'assistant', content: 'answer' }]
    saveMessages(id, messages)
    expect(getMessages(id)).toEqual(messages)
    expect(getMessages(id)[0].reasoning).toBeUndefined()
  })

  it('bumps updatedAt when messages are saved', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const id = createConversation('chat', null, null, 'hi')
    vi.setSystemTime(2000)
    saveMessages(id, [{ role: 'user', content: 'hi' }])
    const [meta] = getConversations()
    expect(meta.updatedAt).toBe(2000)
    vi.useRealTimers()
  })

  it('does not throw and reports failure when localStorage.setItem throws', () => {
    const id = createConversation('chat', null, null, 'hi')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const ok = saveMessages(id, [{ role: 'user', content: 'hi' }])
    expect(ok).toBe(false)
    spy.mockRestore()
  })
})

describe('toggleStarred', () => {
  it('flips starred and returns the new value', () => {
    const id = createConversation('chat', null, null, 'hi')
    expect(toggleStarred(id)).toBe(true)
    expect(getConversations()[0].starred).toBe(true)
    expect(toggleStarred(id)).toBe(false)
  })

  it('returns false for an id that does not exist', () => {
    expect(toggleStarred('missing')).toBe(false)
  })
})

describe('getStarredConversations', () => {
  it('returns only starred conversations', () => {
    const a = createConversation('chat', null, null, 'a')
    createConversation('chat', null, null, 'b')
    toggleStarred(a)
    const starred = getStarredConversations()
    expect(starred).toHaveLength(1)
    expect(starred[0].id).toBe(a)
  })
})

describe('deleteConversation', () => {
  it('removes the conversation and its messages', () => {
    const id = createConversation('chat', null, null, 'hi')
    saveMessages(id, [{ role: 'user', content: 'hi' }])
    deleteConversation(id)
    expect(getConversations()).toHaveLength(0)
    expect(getMessages(id)).toEqual([])
  })
})

describe('findOrCreateWordConv', () => {
  it('reuses an existing conversation for the same word+postId', () => {
    const first = findOrCreateWordConv('幂等', 'post-1')
    const second = findOrCreateWordConv('幂等', 'post-1')
    expect(second).toBe(first)
    expect(getConversations()).toHaveLength(1)
  })

  it('creates a new conversation for a different postId', () => {
    const first = findOrCreateWordConv('幂等', 'post-1')
    const second = findOrCreateWordConv('幂等', 'post-2')
    expect(second).not.toBe(first)
    expect(getConversations()).toHaveLength(2)
  })

  it('treats a missing postId consistently as null', () => {
    const first = findOrCreateWordConv('幂等', null)
    const second = findOrCreateWordConv('幂等', undefined)
    expect(second).toBe(first)
  })
})

describe('getRecentConversations', () => {
  it('defaults to the 20 most recent conversations', () => {
    for (let i = 0; i < 25; i++) createConversation('chat', null, null, `msg ${i}`)
    expect(getRecentConversations()).toHaveLength(20)
  })

  it('respects a custom limit', () => {
    for (let i = 0; i < 5; i++) createConversation('chat', null, null, `msg ${i}`)
    expect(getRecentConversations(3)).toHaveLength(3)
  })
})

describe('renameConversation', () => {
  it('renames, trims, and caps the title at 60 characters', () => {
    const id = createConversation('chat', null, null, 'original')
    renameConversation(id, `  ${'b'.repeat(70)}  `)
    const [meta] = getConversations()
    expect(meta.title.length).toBe(60)
    expect(meta.title.startsWith(' ')).toBe(false)
  })

  it('is a no-op for an id that does not exist', () => {
    expect(() => renameConversation('missing', 'new title')).not.toThrow()
  })
})
