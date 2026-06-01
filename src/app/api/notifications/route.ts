import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Generation from '@/models/Generation'
import AgentRun from '@/models/AgentRun'
import KnowledgeDocument from '@/models/Document'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    // Fetch latest 2 generations
    const recentGens = await Generation.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean()

    // Fetch latest 2 agent runs
    const recentAgents = await AgentRun.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(2)
      .lean()

    // Fetch latest 2 knowledge uploads
    const recentDocs = await KnowledgeDocument.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(2)
      .lean()

    const notifications: any[] = []

    for (const gen of recentGens) {
      notifications.push({
        id: gen._id.toString(),
        title: `New ${gen.type === 'text' ? (gen.metadata?.format === 'resume-screener' ? 'Resume Screen' : 'Text Generation') : 'Image'}`,
        message: gen.prompt,
        createdAt: gen.createdAt,
      })
    }

    for (const agent of recentAgents) {
      notifications.push({
        id: agent._id.toString(),
        title: `Agent Run: ${agent.agentType}`,
        message: agent.task,
        createdAt: agent.createdAt,
      })
    }

    for (const doc of recentDocs) {
      notifications.push({
        id: doc._id.toString(),
        title: 'Document Uploaded',
        message: `Processed: ${doc.originalName}`,
        createdAt: doc.createdAt,
      })
    }

    // Sort combined activities by descending date and take top 5
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const topNotifications = notifications.slice(0, 5)

    return NextResponse.json({ notifications: topNotifications })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
