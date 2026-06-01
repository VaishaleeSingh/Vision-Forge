import mongoose, { Schema, Document, Model } from 'mongoose'

export type AgentType = 'research' | 'content' | 'analysis'

export interface IAgentStep {
  step: number
  name: string
  status: 'pending' | 'running' | 'done' | 'error'
  content: string
}

export interface IAgentRun {
  userId: mongoose.Types.ObjectId
  agentType: AgentType
  task: string
  model: string
  steps: IAgentStep[]
  finalOutput: string
  tokensUsed: number
  createdAt: Date
  updatedAt: Date
}

const AgentStepSchema = new Schema<IAgentStep>({
  step:    { type: Number, required: true },
  name:    { type: String, required: true },
  status:  { type: String, enum: ['pending', 'running', 'done', 'error'], default: 'pending' },
  content: { type: String, default: '' },
})

const AgentRunSchema = new Schema<IAgentRun>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentType:   { type: String, enum: ['research', 'content', 'analysis'], required: true },
    task:        { type: String, required: true },
    model:       { type: String, default: 'gemini-2.0-flash' },
    steps:       { type: [AgentStepSchema], default: [] },
    finalOutput: { type: String, default: '' },
    tokensUsed:  { type: Number, default: 0 },
  },
  { timestamps: true }
)

AgentRunSchema.index({ userId: 1, createdAt: -1 })

const AgentRun: Model<IAgentRun> =
  mongoose.models.AgentRun || mongoose.model<IAgentRun>('AgentRun', AgentRunSchema)

export default AgentRun
