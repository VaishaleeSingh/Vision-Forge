import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IDocumentChunk extends Document {
  documentId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  content: string
  embedding: number[]   // 768-dim from Gemini text-embedding-004
  metadata: {
    chunkIndex: number
    pageNumber?: number
    source: string
    charStart?: number
    charEnd?: number
  }
  createdAt: Date
}

const DocumentChunkSchema = new Schema<IDocumentChunk>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', required: true, index: true },
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content:    { type: String, required: true },
    embedding:  { type: [Number], required: true },
    metadata:   { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

DocumentChunkSchema.index({ documentId: 1, 'metadata.chunkIndex': 1 })
// NOTE: Create Atlas Vector Search index via MongoDB Atlas UI:
// Collection: documentchunks | Field: embedding | Dimensions: 768 | Similarity: cosine

const DocumentChunk: Model<IDocumentChunk> =
  mongoose.models.DocumentChunk ||
  mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema)

export default DocumentChunk
