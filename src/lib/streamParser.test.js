import { describe, expect, it } from 'vitest'
import { createReasoningStreamParser } from './streamParser'

describe('createReasoningStreamParser', () => {
  it('parses a single complete content line', () => {
    const parser = createReasoningStreamParser()
    const result = parser.feed('{"c":"hello"}\n')
    expect(result).toEqual({ content: 'hello', reasoning: '' })
  })

  it('parses a single complete reasoning line', () => {
    const parser = createReasoningStreamParser()
    const result = parser.feed('{"r":"thinking..."}\n')
    expect(result).toEqual({ content: '', reasoning: 'thinking...' })
  })

  it('reassembles a line split across two feed() calls at an arbitrary offset', () => {
    const parser = createReasoningStreamParser()
    const line = '{"c":"partial answer text"}\n'
    const splitAt = 7 // lands mid-key, well before the closing brace
    const first = parser.feed(line.slice(0, splitAt))
    expect(first).toEqual({ content: '', reasoning: '' })
    const second = parser.feed(line.slice(splitAt))
    expect(second).toEqual({ content: 'partial answer text', reasoning: '' })
  })

  it('parses multiple lines batched into one feed() call, in order', () => {
    const parser = createReasoningStreamParser()
    const result = parser.feed('{"r":"first "}\n{"r":"second"}\n{"c":"answer"}\n')
    expect(result).toEqual({ content: 'answer', reasoning: 'first second' })
  })

  it('never misfires on a text value containing an embedded escaped newline', () => {
    const parser = createReasoningStreamParser()
    const payload = JSON.stringify({ c: 'line one\nline two' }) + '\n'
    const result = parser.feed(payload)
    expect(result).toEqual({ content: 'line one\nline two', reasoning: '' })
  })

  it('keeps reasoning and content channels independent across mixed events', () => {
    const parser = createReasoningStreamParser()
    const result = parser.feed('{"r":"a"}\n{"c":"b"}\n{"r":"c"}\n{"c":"d"}\n')
    expect(result).toEqual({ content: 'bd', reasoning: 'ac' })
  })

  it('skips blank lines without throwing', () => {
    const parser = createReasoningStreamParser()
    const result = parser.feed('\n\n{"c":"x"}\n\n')
    expect(result).toEqual({ content: 'x', reasoning: '' })
  })

  it('ignores a malformed line without throwing', () => {
    const parser = createReasoningStreamParser()
    const result = parser.feed('not json\n{"c":"ok"}\n')
    expect(result).toEqual({ content: 'ok', reasoning: '' })
  })

  it('holds an incomplete trailing line in the buffer until the rest arrives', () => {
    const parser = createReasoningStreamParser()
    const first = parser.feed('{"c":"complete"}\n{"c":"incom')
    expect(first).toEqual({ content: 'complete', reasoning: '' })
    const second = parser.feed('plete"}\n')
    expect(second).toEqual({ content: 'incomplete', reasoning: '' })
  })
})
