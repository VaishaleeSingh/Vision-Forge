/** Strip HTML tags for API payloads that expect plain text */
export function richTextToPlain(html: string): string {
  if (!html || !html.includes('<')) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.replace(/\u00a0/g, ' ').trim() ?? ''
}

/** Escape plain text for safe HTML insertion in the editor */
export function plainToEditorHtml(text: string): string {
  if (!text) return ''
  if (text.includes('<') && /<(p|strong|em|u|a|br)\b/i.test(text)) return text
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

export function getEditorValue(
  getHtml: () => string,
  getText: () => string,
  format: 'plain' | 'html',
): string {
  return format === 'html' ? getHtml() : getText()
}
