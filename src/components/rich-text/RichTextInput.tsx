'use client'

import { useEffect, useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { cn } from '@/lib/utils'
import { RichTextToolbar } from './RichTextToolbar'
import { getEditorValue, plainToEditorHtml } from './utils'

export interface RichTextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minHeight?: number
  /** Plain text for API calls (default) or HTML */
  outputFormat?: 'plain' | 'html'
  onSubmit?: () => void
  submitHint?: string
  showCharCount?: boolean
  label?: string
  /** Compact single-line style for chat bars */
  variant?: 'default' | 'compact'
  /** Chat mode: Enter sends, Shift+Enter newline */
  enterToSubmit?: boolean
  onEnterSubmit?: () => void
  onEditorReady?: (editor: Editor) => void
}

export function RichTextInput({
  value,
  onChange,
  placeholder = 'Start typing…',
  disabled = false,
  className,
  minHeight = 120,
  outputFormat = 'plain',
  onSubmit,
  submitHint,
  showCharCount = false,
  label,
  variant = 'default',
  enterToSubmit = false,
  onEnterSubmit,
  onEditorReady,
}: RichTextInputProps) {
  const emitChange = useCallback(
    (editor: NonNullable<ReturnType<typeof useEditor>>) => {
      onChange(
        getEditorValue(
          () => editor.getHTML(),
          () => editor.getText(),
          outputFormat,
        ),
      )
    },
    [onChange, outputFormat],
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: variant === 'compact' ? false : undefined,
        orderedList: variant === 'compact' ? false : undefined,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'rich-text-link' },
      }),
    ],
    content: plainToEditorHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          'rich-text-editor prose prose-sm max-w-none focus:outline-none',
          variant === 'compact' ? 'min-h-[40px] py-2 px-3' : 'min-h-[80px] py-3 px-3',
        ),
        'data-placeholder': placeholder,
      },
      handleKeyDown: (_view, event) => {
        const submitAction = onEnterSubmit ?? onSubmit
        const submitOnEnter = enterToSubmit || !!onSubmit
        if (
          submitOnEnter &&
          submitAction &&
          event.key === 'Enter' &&
          !event.shiftKey
        ) {
          event.preventDefault()
          submitAction()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: ed }) => emitChange(ed),
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  useEffect(() => {
    if (editor) onEditorReady?.(editor)
  }, [editor, onEditorReady])

  useEffect(() => {
    if (!editor) return
    const current =
      outputFormat === 'html' ? editor.getHTML() : editor.getText()
    if (current !== value) {
      editor.commands.setContent(plainToEditorHtml(value), { emitUpdate: false })
    }
  }, [editor, value, outputFormat])

  const charCount = editor?.getText().length ?? value.length

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <div
        className={cn(
          'input-base overflow-hidden p-0 flex flex-col',
          disabled && 'opacity-60 pointer-events-none',
          variant === 'compact' && 'rounded-xl',
        )}
      >
        <RichTextToolbar editor={editor} />
        <div
          style={{ minHeight: variant === 'compact' ? 44 : minHeight }}
          className="flex-1 overflow-y-auto bg-white"
        >
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
      {(showCharCount || submitHint) && (
        <p className="text-xs text-muted text-right">
          {showCharCount && <span>{charCount} chars</span>}
          {showCharCount && submitHint && <span> · </span>}
          {submitHint}
        </p>
      )}
    </div>
  )
}
