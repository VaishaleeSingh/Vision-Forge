'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  X,
  Loader2,
  FlaskConical,
  Database,
  Target,
  Cpu,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Sparkles,
  Users,
  Factory,
  Banknote,
  Shield,
  ClipboardCheck,
  Mail,
} from 'lucide-react'
import { RichTextOutput } from '@/components/rich-text'
import { formatDatasetAnalysisReport, type ParsedCsv } from '@/features/agents/csv-dataset'
import {
  ML_MODEL_PRESETS,
  type MlModelPreset,
  type MlModelPresetId,
} from '@/features/ml/model-presets'
import { cn } from '@/lib/utils'

export type MlTrainResult = {
  metrics?: Record<string, unknown>
  modelType?: string
  businessSummary?: string
  trainingKind?: string
  error?: string
}

type MlTrainingWorkbenchProps = {
  selectedPreset: MlModelPreset | null
  onPresetSelect: (id: MlModelPresetId) => void
  goal: string
  onGoalChange: (v: string) => void
  csvDataset: ParsedCsv | null
  csvLoading: boolean
  csvInsightLoading: boolean
  csvAiInsight: string | null
  trainLoading: boolean
  mlTrainResult: MlTrainResult | null
  disabled?: boolean
  onFileSelect: (file: File | null) => void
  onClearDataset: () => void
  onTrain: () => void
}

const PIPELINE_STEPS = [
  { id: 'model', label: 'Choose model', icon: Target },
  { id: 'data', label: 'Upload CSV', icon: Upload },
  { id: 'inspect', label: 'Profile', icon: Database },
  { id: 'train', label: 'Train', icon: Cpu },
] as const

function stepStatus(
  id: (typeof PIPELINE_STEPS)[number]['id'],
  props: MlTrainingWorkbenchProps,
): 'done' | 'active' | 'pending' {
  const { selectedPreset, csvDataset, trainLoading, mlTrainResult } = props
  if (id === 'model') return selectedPreset ? 'done' : 'active'
  if (id === 'data') {
    if (!selectedPreset) return 'pending'
    return csvDataset ? 'done' : 'active'
  }
  if (id === 'inspect') return csvDataset ? 'done' : 'pending'
  if (id === 'train') {
    if (trainLoading) return 'active'
    if (mlTrainResult && !mlTrainResult.error) return 'done'
    if (csvDataset && selectedPreset) return 'active'
    return 'pending'
  }
  return 'pending'
}

const PRESET_ICONS = {
  users: Users,
  factory: Factory,
  banknote: Banknote,
  shield: Shield,
  clipboard: ClipboardCheck,
  mail: Mail,
} as const

function PresetIcon({ preset, className }: { preset: MlModelPreset; className?: string }) {
  const Icon = PRESET_ICONS[preset.icon]
  return <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', className)} />
}

function MetricTile({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg sm:rounded-xl border p-2 sm:p-3 text-center min-w-0 overflow-hidden',
        highlight
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : 'border-slate-600 bg-slate-800/60',
      )}
    >
      <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-slate-400 mb-0.5 sm:mb-1 leading-tight line-clamp-2">
        {label}
      </p>
      <p
        className={cn(
          'text-sm sm:text-base md:text-lg font-bold font-mono tabular-nums leading-tight break-words',
          highlight ? 'text-emerald-400' : 'text-slate-100',
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 leading-tight line-clamp-2">{sub}</p>
      )}
    </div>
  )
}

export function MlTrainingWorkbench(props: MlTrainingWorkbenchProps) {
  const {
    selectedPreset,
    onPresetSelect,
    goal,
    onGoalChange,
    csvDataset,
    csvLoading,
    csvInsightLoading,
    csvAiInsight,
    trainLoading,
    mlTrainResult,
    disabled,
    onFileSelect,
    onClearDataset,
    onTrain,
  } = props

  const [showExplain, setShowExplain] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const canTrain = !!selectedPreset && !!csvDataset && !trainLoading && !disabled
  const analysis = csvDataset?.analysis
  const metrics = mlTrainResult?.metrics

  return (
    <div className="rounded-xl sm:rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-xl overflow-hidden min-w-0 w-full">
      {/* Header */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-700/80 bg-slate-950/50 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                <FlaskConical size={11} className="shrink-0" />
                Real ML Training
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono hidden sm:inline">
                Python · sklearn
              </span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white">ML Training Lab</h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed break-words">
              Six business models — tabular &amp; NLP. Real Python training with measured test-set metrics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowExplain((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
          >
            How to explain this
            {showExplain ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <AnimatePresence>
          {showExplain && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 text-[10px] sm:text-[11px] text-slate-300">
                {ML_MODEL_PRESETS.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg bg-slate-800/80 border border-slate-700 p-2 sm:p-2.5 min-w-0"
                  >
                    <p className="font-semibold text-emerald-400 truncate">{p.title}</p>
                    <p className="text-slate-500 text-[9px] sm:text-[10px] mt-0.5">{p.domain}</p>
                    <p className="mt-1 leading-snug line-clamp-3 break-words">{p.demoPitch}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step rail */}
      <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-slate-800 flex flex-wrap gap-1.5 sm:gap-3 overflow-x-auto">
        {PIPELINE_STEPS.map((step, i) => {
          const Icon = step.icon
          const status = stepStatus(step.id, props)
          return (
            <div key={step.id} className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                  status === 'done' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                  status === 'active' && 'bg-slate-700 text-white border border-slate-600',
                  status === 'pending' && 'text-slate-500',
                )}
              >
                {status === 'done' ? (
                  <CheckCircle2 size={14} className="shrink-0" />
                ) : (
                  <Icon size={14} className="shrink-0" />
                )}
                <span className="truncate">{step.label}</span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <span className="text-slate-600 hidden sm:inline">→</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Model picker */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-800 grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 min-w-0">
        {ML_MODEL_PRESETS.map((preset) => {
          const active = selectedPreset?.id === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onPresetSelect(preset.id)}
              className={cn(
                'text-left rounded-lg sm:rounded-xl border p-2.5 sm:p-3 transition-all disabled:opacity-50 min-w-0 w-full overflow-hidden',
                active
                  ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70',
              )}
            >
              <div className="flex items-start gap-2 sm:gap-2.5 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0',
                    active ? 'bg-emerald-600/30 text-emerald-400' : 'bg-slate-700 text-slate-400',
                  )}
                >
                  <PresetIcon preset={preset} className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-white leading-tight line-clamp-2">
                    {preset.title}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-emerald-500/80 font-medium truncate">
                    {preset.domain}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                    {preset.subtitle}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">{preset.algorithm}</p>
                </div>
                {active && (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 sm:w-[18px] sm:h-[18px]" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="p-3 sm:p-6 grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-6 min-w-0">
        {/* Left: data + goal */}
        <div className="space-y-3 sm:space-y-4 min-w-0">
          {!selectedPreset ? (
            <div className="min-h-[140px] sm:min-h-[180px] flex items-center justify-center rounded-xl border border-dashed border-slate-600 text-xs sm:text-sm text-slate-500 text-center px-3 sm:px-4 leading-relaxed">
              Select a model above, then upload your labeled CSV to train.
            </div>
          ) : (
            <>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={disabled || csvLoading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileSelect(file)
            }}
          />

          {!csvDataset ? (
            <div className="space-y-2">
              <button
                type="button"
                disabled={disabled || csvLoading}
                onClick={() => fileRef.current?.click()}
                className="w-full min-h-[140px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 hover:border-emerald-500/60 hover:bg-slate-800/50 transition-all disabled:opacity-50"
              >
                {csvLoading ? (
                  <Loader2 size={28} className="animate-spin text-emerald-500" />
                ) : (
                  <FileSpreadsheet size={28} className="text-emerald-500/80" />
                )}
                <span className="text-sm text-slate-300">
                  {csvLoading ? 'Reading CSV…' : 'Click to upload CSV'}
                </span>
                <span className="text-[10px] text-slate-500">Max 5MB · must match model schema below</span>
              </button>
              <p className="text-[10px] text-slate-500 font-mono break-all leading-relaxed">
                Required columns: {selectedPreset.expectedColumns.join(', ')}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{csvDataset.fileName}</p>
                  <p className="text-xs text-slate-400">
                    {csvDataset.totalRows} rows · {csvDataset.headers.length} columns
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onClearDataset}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400"
                >
                  <X size={16} />
                </button>
              </div>

              {analysis && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-700">
                    <p className="text-slate-500 text-[10px] uppercase">Problem</p>
                    <p className="text-emerald-400 font-semibold capitalize">
                      {analysis.suggestedProblemType}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-700">
                    <p className="text-slate-500 text-[10px] uppercase">Target</p>
                    <p className="text-white font-semibold truncate">
                      {analysis.suggestedTarget ?? '—'}
                    </p>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto max-h-24 rounded-lg border border-slate-700 text-[10px]">
                <table className="w-full text-left text-slate-300">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-700">
                      {csvDataset.headers.map((h) => (
                        <th key={h} className="px-2 py-1 font-semibold text-emerald-400/90 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvDataset.rows.slice(0, 3).map((row, ri) => (
                      <tr key={ri} className="border-b border-slate-800">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1 whitespace-nowrap max-w-[100px] truncate">
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                disabled={disabled || csvLoading}
                onClick={() => fileRef.current?.click()}
                className="text-xs text-emerald-400 hover:underline"
              >
                Replace file
              </button>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">
              Business goal (for stakeholder summary)
            </label>
            <textarea
              value={goal}
              onChange={(e) => onGoalChange(e.target.value)}
              disabled={disabled}
              rows={2}
              placeholder={selectedPreset.defaultGoal}
              className="w-full rounded-xl border border-slate-600 bg-slate-950 text-slate-100 text-sm px-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 resize-none text-xs sm:text-sm"
            />
          </div>

          <button
            type="button"
            disabled={!canTrain}
            onClick={onTrain}
            className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3.5 px-2 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-w-0"
          >
            {trainLoading ? (
              <>
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span className="truncate">Training…</span>
              </>
            ) : (
              <>
                <Cpu size={16} className="shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden">Train model</span>
                  <span className="hidden sm:inline">Train {selectedPreset.title}</span>
                </span>
              </>
            )}
          </button>
            </>
          )}
        </div>

        {/* Right: analysis + results */}
        <div className="space-y-3 sm:space-y-4 min-w-0 overflow-hidden">
          {csvDataset && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-2.5 sm:p-3 max-h-32 sm:max-h-36 overflow-y-auto overflow-x-hidden text-xs min-w-0">
              <p className="text-slate-400 text-[10px] uppercase font-semibold mb-2 flex items-center gap-1">
                <Database size={12} className="text-emerald-500" />
                Dataset profile
              </p>
              <div className="text-slate-300 min-w-0 break-words">
                <RichTextOutput
                  content={formatDatasetAnalysisReport(csvDataset.analysis)}
                  format="markdown"
                  proseClassName="prose-invert prose-xs sm:prose-sm max-w-none break-words text-slate-300"
                />
              </div>
            </div>
          )}

          {(csvInsightLoading || csvAiInsight) && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 max-h-32 overflow-y-auto">
              <p className="text-slate-400 text-[10px] uppercase font-semibold mb-2 flex items-center gap-1">
                {csvInsightLoading ? (
                  <Loader2 size={12} className="animate-spin text-emerald-500" />
                ) : (
                  <Sparkles size={12} className="text-amber-400" />
                )}
                AI dataset hint (optional)
              </p>
              {csvAiInsight ? (
                <RichTextOutput content={csvAiInsight} format="markdown" proseClassName="prose-invert prose-xs" />
              ) : (
                <p className="text-xs text-slate-500">Generating recommendation…</p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-600 bg-slate-950/80 p-3 sm:p-4 min-h-[160px] sm:min-h-[200px] min-w-0 overflow-hidden">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-emerald-500" />
              Training results
            </p>

            {!mlTrainResult && !trainLoading && (
              <p className="text-xs sm:text-sm text-slate-500 text-center py-6 sm:py-8 px-2 leading-relaxed">
                {selectedPreset
                  ? 'Upload your CSV and train to see measured metrics here.'
                  : 'Choose a model type to begin.'}
              </p>
            )}

            {trainLoading && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
                <p className="text-xs text-slate-400">Running scripts/train_*.py on server…</p>
              </div>
            )}

            {mlTrainResult?.error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {mlTrainResult.error}
              </div>
            )}

            {mlTrainResult && !mlTrainResult.error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex flex-wrap gap-1.5 sm:gap-2 min-w-0">
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-mono border border-emerald-500/30 break-all max-w-full">
                    {mlTrainResult.modelType}
                  </span>
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-slate-800 text-slate-400 text-[10px] sm:text-xs">
                    {mlTrainResult.trainingKind}
                  </span>
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-slate-800 text-slate-500 text-[10px] sm:text-xs">
                    Saved · MongoDB
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 min-w-0">
                  {metrics?.accuracy != null && (
                    <MetricTile
                      label="Test accuracy"
                      value={`${((metrics.accuracy as number) * 100).toFixed(1)}%`}
                      highlight
                    />
                  )}
                  {metrics?.f1Macro != null && (
                    <MetricTile label="F1 macro" value={String(metrics.f1Macro)} />
                  )}
                  {metrics?.cvMeanAccuracy != null && (
                    <MetricTile
                      label="CV accuracy"
                      value={`${((metrics.cvMeanAccuracy as number) * 100).toFixed(1)}%`}
                      sub="more stable on small data"
                    />
                  )}
                  {metrics?.r2 != null && (
                    <MetricTile label="R² score" value={String(metrics.r2)} highlight />
                  )}
                  {metrics?.mae != null && (
                    <MetricTile label="MAE" value={String(metrics.mae)} />
                  )}
                  {metrics?.trainRows != null && (
                    <MetricTile
                      label="Train / test"
                      value={`${metrics.trainRows} / ${metrics.testRows}`}
                      sub="rows"
                    />
                  )}
                </div>

                {Array.isArray(metrics?.improvementTips) &&
                  (metrics.improvementTips as string[]).length > 0 && (
                    <ul className="text-[11px] text-slate-400 list-disc pl-4 space-y-1">
                      {(metrics.improvementTips as string[]).map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  )}

                {mlTrainResult.businessSummary && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <p className="text-[10px] uppercase text-slate-500 font-semibold mb-2">
                      Stakeholder summary
                    </p>
                    <div className="text-xs text-slate-300 max-h-32 overflow-y-auto">
                      <RichTextOutput
                        content={mlTrainResult.businessSummary}
                        format="markdown"
                        proseClassName="prose-invert prose-xs"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
