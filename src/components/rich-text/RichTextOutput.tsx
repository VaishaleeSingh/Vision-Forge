'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import ReactMarkdown from 'react-markdown'
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
        class: cn('rich-text-editor prose prose-sm max-w-none py-2 px-1', className),
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML() && content !== editor.getText()) {
      editor.commands.setContent(plainToEditorHtml(content), { emitUpdate: false })
    }
  }, [editor, content])

  return <EditorContent editor={editor} />
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
          'prose prose-sm md:prose-base prose-slate max-w-none text-primary prose-headings:font-bold prose-headings:text-aqua-800 prose-a:text-aqua-600',
          isLoading && 'streaming-cursor',
          proseClassName,
          className,
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    )
  }

  if (format === 'plain') {
    return (
      <p className={cn('text-sm text-[#2d3748] whitespace-pre-wrap', className)}>
        {content}
      </p>
    )
  }

  return (
    <div className={cn('rounded-lg', className)}>
      <HtmlViewer content={content} className={proseClassName} />
    </div>
  )
}
