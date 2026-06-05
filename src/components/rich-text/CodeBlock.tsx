'use client'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'

const IDE_CODE_STYLE: React.CSSProperties = {
  margin: 0,
  padding: '1rem 1.125rem',
  background: '#1e1e1e',
  borderRadius: '0.5rem',
  fontSize: '0.8125rem',
  lineHeight: 1.55,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
}

const IDE_WRAPPER =
  'vf-code-block my-3 w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-[#2d2d2d] shadow-sm'

export function InlineCode({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        'vf-inline-code rounded px-1.5 py-0.5 font-mono text-[0.85em] font-normal',
        'bg-[#1e1e1e] text-[#9cdcfe] border border-[#3c3c3c]',
        className,
      )}
    >
      {children}
    </code>
  )
}

export function MarkdownCodeBlock({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const raw = String(children ?? '').replace(/\n$/, '')
  const languageMatch = /language-(\w+)/.exec(className || '')
  const language = languageMatch?.[1] ?? 'text'

  if (!raw.includes('\n') && raw.length < 80 && !languageMatch) {
    return <InlineCode>{children}</InlineCode>
  }

  return (
    <div className={IDE_WRAPPER}>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#858585]">
          {language}
        </span>
        <span className="text-[10px] text-[#6e6e6e] hidden sm:inline">VisionForge</span>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          PreTag="div"
          CodeTag="code"
          customStyle={IDE_CODE_STYLE}
          showLineNumbers={raw.split('\n').length > 2}
          lineNumberStyle={{
            minWidth: '2.25em',
            paddingRight: '1em',
            color: '#6e6e6e',
            userSelect: 'none',
          }}
          wrapLongLines={false}
        >
          {raw}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
