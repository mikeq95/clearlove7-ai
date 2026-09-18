/**
 * Parses the newline-delimited JSON stream written by api/explain.js's
 * streamOpenAI(). Each complete line is either {"c": "<content delta>"} or
 * {"r": "<reasoning delta>"}. Handles a line being split across two feed()
 * calls (an HTTP chunk boundary can land anywhere, regardless of how the
 * server grouped its writes).
 */
export function createReasoningStreamParser() {
  let buffer = ''

  function feed(text) {
    buffer += text
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    let content = ''
    let reasoning = ''
    for (const line of lines) {
      if (!line) continue
      try {
        const obj = JSON.parse(line)
        if (typeof obj.c === 'string') content += obj.c
        if (typeof obj.r === 'string') reasoning += obj.r
      } catch { /* ignore malformed/partial line */ }
    }
    return { content, reasoning }
  }

  return { feed }
}
