import mongoose, { Schema, Document, Model } from 'mongoose'

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'error'

export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  originalName: string
  size: number
  mimeType: string
  status: DocumentStatus
  chunkCount: number
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:         { type: String, required: true },
    originalName: { type: String, required: true },
    size:         { type: Number, required: true },
    mimeType:     { type: String, required: true },
    status:       { type: String, enum: ['uploading','processing','ready','error'], default: 'uploading' },
    chunkCount:   { type: Number, default: 0 },
    errorMessage: { type: String },
  },
  { timestamps: true }
)

const KnowledgeDocument: Model<IDocument> =
  mongoose.models.KnowledgeDocument ||
  mongoose.model<IDocument>('KnowledgeDocument', DocumentSchema)

export default KnowledgeDocument
