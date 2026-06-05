'use client'

import { Settings } from 'lucide-react'

type AgentModelSelectProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  accentClass?: string
}

export function AgentModelSelect({
  value,
  onChange,
  disabled,
  accentClass = 'text-aqua-700',
}: AgentModelSelectProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#4a5568] min-w-0">
      <Settings size={14} className="shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`bg-transparent border-none outline-none font-semibold cursor-pointer text-xs sm:text-sm min-w-0 ${accentClass}`}
      >
        <option value="gemini-flash">Gemini 2.0 Flash</option>
        <option value="groq-llama">Llama 3 (Groq)</option>
      </select>
    </div>
  )
}
