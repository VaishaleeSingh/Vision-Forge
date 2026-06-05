'use client'

import { Play, Loader2, Sparkles } from 'lucide-react'
import { AgentModelSelect } from '@/components/agents/AgentModelSelect'

type MlAgentPlanningPanelProps = {
  model: string
  onModelChange: (v: string) => void
  runRealTraining: boolean
  onRunRealTrainingChange: (v: boolean) => void
  isRunning: boolean
  canRun: boolean
  onRun: () => void
}

export function MlAgentPlanningPanel({
  model,
  onModelChange,
  runRealTraining,
  onRunRealTrainingChange,
  isRunning,
  canRun,
  onRun,
}: MlAgentPlanningPanelProps) {
  return (
    <div className="glass-card p-3 sm:p-5 space-y-3 sm:space-y-4 border border-violet-200/60 bg-gradient-to-br from-white to-violet-50/30 min-w-0 w-full overflow-hidden">
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Sparkles size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-block px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 border border-violet-200 mb-1">
            AI planning only
          </span>
          <h3 className="text-xs sm:text-sm font-semibold text-[#1a2332] leading-tight">
            Agent pipeline (9 steps)
          </h3>
          <p className="text-[11px] sm:text-xs text-[#718096] mt-0.5 leading-relaxed break-words">
            LLM plans the ML workflow using your goal from the Training Lab above — does not replace
            Python training.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={runRealTraining}
          onChange={(e) => onRunRealTrainingChange(e.target.checked)}
          disabled={isRunning}
          className="mt-0.5 h-4 w-4 rounded border-violet-300 text-violet-600"
        />
        <span className="text-[11px] sm:text-xs text-[#4a5568] leading-relaxed break-words min-w-0">
          After agents finish, auto-run <strong>real training</strong> again using the ML Lab above
        </span>
      </label>

      <AgentModelSelect
        value={model}
        onChange={onModelChange}
        disabled={isRunning}
        accentClass="text-violet-700"
      />

      <button
        onClick={onRun}
        disabled={!canRun || isRunning}
        className="w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 px-2 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all min-w-0"
      >
        {isRunning ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Agents running…
          </>
        ) : (
          <>
            <Play size={16} />
            Run AI planning pipeline
          </>
        )}
      </button>
    </div>
  )
}
