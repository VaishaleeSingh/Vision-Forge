import mongoose, { Schema, Document, Model } from 'mongoose'

export type GenerationType = 'text' | 'image'

export interface IGeneration {
  userId: mongoose.Types.ObjectId
  type: GenerationType
  prompt: string
  result: string      // text content or image URL
  model: string
  tokensUsed: number
  metadata: {
    tone?: string
    format?: string
    style?: string
    width?: number
    height?: number
    seed?: number
  }
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
}

const GenerationSchema = new Schema<IGeneration>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:       { type: String, enum: ['text', 'image'], required: true },
    prompt:     { type: String, required: true },
    result:     { type: String, required: true },
    model:      { type: String, default: 'gemini-2.0-flash' },
    tokensUsed: { type: Number, default: 0 },
    metadata:   { type: Schema.Types.Mixed, default: {} },
    isFavorite: { type: Boolean, default: false },
  },
  { timestamps: true }
)

GenerationSchema.index({ userId: 1, createdAt: -1 })
GenerationSchema.index({ userId: 1, type: 1 })

const Generation: Model<IGeneration> =
  mongoose.models.Generation || mongoose.model<IGeneration>('Generation', GenerationSchema)

export default Generation
