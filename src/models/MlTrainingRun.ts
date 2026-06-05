import mongoose, { Schema, Document, Model } from 'mongoose'
import type { MlModelPresetId } from '@/features/ml/model-presets'

export type MlTrainingStatus = 'running' | 'completed' | 'failed'
export type MlTrainingKind = 'tabular' | 'text_classifier'

interface IMlMetrics {
  problemType?: string
  accuracy?: number
  f1Macro?: number
  r2?: number
  mae?: number
  rmse?: number
  trainRows?: number
  testRows?: number
  classes?: string[]
  vocabularySize?: number
  reportSummary?: Record<string, unknown>
  [key: string]: unknown
}

interface IMlTrainingRun {
  userId: mongoose.Types.ObjectId
  modelPresetId?: MlModelPresetId
  fileName: string
  targetColumn: string
  problemType: string
  trainingKind: MlTrainingKind
  status: MlTrainingStatus
  modelType?: string
  metrics?: IMlMetrics
  artifactPath?: string
  textColumn?: string
  featureColumns?: string[]
  error?: string
  businessSummary?: string
  createdAt: Date
  updatedAt: Date
}

const MlTrainingRunSchema = new Schema<IMlTrainingRun>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    modelPresetId: {
      type: String,
      enum: [
        'customer-churn',
        'co-emission-risk',
        'loan-default-risk',
        'fraud-detection',
        'qa-defect-severity',
        'phishing-email',
      ],
    },
    fileName: { type: String, required: true },
    targetColumn: { type: String, required: true },
    problemType: { type: String, default: 'classification' },
    trainingKind: { type: String, enum: ['tabular', 'text_classifier'], default: 'tabular' },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
    },
    modelType: { type: String },
    metrics: { type: Schema.Types.Mixed },
    artifactPath: { type: String },
    textColumn: { type: String },
    featureColumns: { type: [String], default: [] },
    error: { type: String },
    businessSummary: { type: String },
  },
  { timestamps: true },
)

MlTrainingRunSchema.index({ userId: 1, createdAt: -1 })

const MlTrainingRun: Model<IMlTrainingRun> =
  mongoose.models.MlTrainingRun ||
  mongoose.model<IMlTrainingRun>('MlTrainingRun', MlTrainingRunSchema)

export default MlTrainingRun
