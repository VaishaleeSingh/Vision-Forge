'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { plainToEditorHtml } from './utils'

export interface RichTextOutputProps {
  content: string
  /** AI markdown (default) or formatted HTML from the editor */
  format?: 'markdown' | 'html' | 'plain'
  className?: string
  proseClassName?: string
  isLoading?: boolean
  emptyState?: React.ReactNode
}

/** Shared responsive prose + overflow-safe markdown elements */
export const richTextOutputProseClass = cn(
  'rich-text-output',
  'w-full min-w-0 max-w-full',
  'prose prose-xs sm:prose-sm md:prose-base prose-slate max-w-none',
  'text-primary',
  'prose-headings:font-bold prose-headings:text-aqua-800 prose-headings:break-words',
  'prose-p:break-words prose-p:leading-relaxed',
  'prose-a:text-aqua-600 prose-a:break-all',
  'prose-strong:break-words',
  'prose-li:break-words',
  'prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg',
  'prose-pre:overflow-x-auto prose-pre:max-w-full prose-pre:text-[0.7rem] sm:prose-pre:text-sm',
  'prose-code:break-words prose-code:text-[0.8em] sm:prose-code:text-sm',
  'prose-code:before:content-none prose-code:after:content-none',
)

const markdownComponents: Components = {
  table: ({ children, ...props }) => (
    <div className="my-3 w-full min-w-0 -mx-0.5 overflow-x-auto rounded-lg border border-beige-200 bg-white/80">
      <table
        className="w-full min-w-max text-left text-[0.7rem] sm:text-xs md:text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-beige-50 border-b border-beige-200" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-2 py-1.5 sm:px-3 sm:py-2 font-semibold whitespace-nowrap" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-2 py-1.5 sm:px-3 sm:py-2 align-top break-words max-w-[12rem] sm:max-w-none" {...props}>
      {children}
    </td>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="my-3 w-full min-w-0 max-w-full overflow-x-auto rounded-lg bg-beige-50 p-2 sm:p-3 text-[0.7rem] sm:text-xs md:text-sm"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className={cn(className, 'block min-w-0')} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-beige-100 px-1 py-0.5 text-[0.85em] break-words"
        {...props}
      >
        {children}
      </code>
    )
  },
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all underline-offset-2"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-4 sm:pl-5 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-4 sm:pl-5 space-y-1" {...props}>
      {children}
    </ol>
  ),
}

function HtmlViewer({ content, className }: { content: string; className?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      Link.configure({ openOnClick: true }),
    ],
    content: plainToEditorHtml(content),
    editable: false,
    editorProps: {
      attributes: {
        class: cn(
          'rich-text-editor rich-text-output w-full min-w-0 max-w-full prose prose-sm sm:prose-base max-w-none py-2 px-1 break-words',
          className,
        ),
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML() && content !== editor.getText()) {
      editor.commands.setContent(plainToEditorHtml(content), { emitUpdate: false })
    }
  }, [editor, content])

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto">
      <EditorContent editor={editor} />
    </div>
  )
}

export function RichTextOutput({
  content,
  format = 'markdown',
  className,
  proseClassName,
  isLoading,
  emptyState,
}: RichTextOutputProps) {
  if (!content && !isLoading) {
    return emptyState ? <>{emptyState}</> : null
  }

  if (format === 'markdown') {
    return (
      <div
        className={cn(
          richTextOutputProseClass,
          isLoading && 'streaming-cursor',
          proseClassName,
          className,
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  if (format === 'plain') {
    return (
      <p
        className={cn(
          'rich-text-output w-full min-w-0 max-w-full text-xs sm:text-sm text-[#2d3748] whitespace-pre-wrap break-words',
          className,
        )}
      >
        {content}
      </p>
    )
  }

  return (
    <div className={cn('rich-text-output w-full min-w-0 max-w-full rounded-lg', className)}>
      <HtmlViewer content={content} className={proseClassName} />
    </div>
  )
}
