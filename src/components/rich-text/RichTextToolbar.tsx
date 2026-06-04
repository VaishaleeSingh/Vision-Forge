'use client'

import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline,
  Link2,
  Link2Off,
  Smile,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EMOJI_PICKER } from './constants'

interface RichTextToolbarProps {
  editor: Editor | null
  className?: string
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        active
          ? 'bg-aqua-100 text-aqua-700'
          : 'text-[#4a5568] hover:bg-beige-100 hover:text-[#1a2332]',
      )}
    >
      {children}
    </button>
  )
}

export function RichTextToolbar({ editor, className }: RichTextToolbarProps) {
  const [emojiOpen, setEmojiOpen] = useState(false)
  const emojiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!emojiOpen) return
    const onOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [emojiOpen])

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    const href = url.startsWith('http') ? url : `https://${url}`
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[var(--border-default)] bg-beige-50/80 rounded-t-xl',
        className,
      )}
    >
      <ToolbarButton
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline size={15} />
      </ToolbarButton>

      <span className="w-px h-5 bg-[var(--border-default)] mx-1" />

      <ToolbarButton
        title="Add link"
        active={editor.isActive('link')}
        onClick={setLink}
      >
        <Link2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        title="Remove link"
        disabled={!editor.isActive('link')}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Link2Off size={15} />
      </ToolbarButton>

      <span className="w-px h-5 bg-[var(--border-default)] mx-1" />

      <div className="relative" ref={emojiRef}>
        <ToolbarButton
          title="Insert emoji"
          active={emojiOpen}
          onClick={() => setEmojiOpen((o) => !o)}
        >
          <Smile size={15} />
        </ToolbarButton>
        {emojiOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 p-2 glass-card shadow-lg grid grid-cols-6 gap-1 w-[200px]">
            {EMOJI_PICKER.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="text-lg p-1 rounded hover:bg-aqua-50 transition-colors"
                onClick={() => {
                  editor.chain().focus().insertContent(emoji).run()
                  setEmojiOpen(false)
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
