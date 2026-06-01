import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Generation from '@/models/Generation'
import KnowledgeDocument from '@/models/Document'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const dbUser = await User.findOne({ email: session.user.email })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = dbUser._id

    // 1. Top Level Stats
    const totalGenerations = await Generation.countDocuments({ userId })
    
    const tokenAgg = await Generation.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalTokens: { $sum: "$tokensUsed" } } }
    ])
    const totalTokens = tokenAgg.length > 0 ? tokenAgg[0].totalTokens : 0

    const imagesCreated = await Generation.countDocuments({ userId, type: 'image' })
    const docsUploaded = await KnowledgeDocument.countDocuments({ userId })

    // 2. Area Chart Data (Last 7 Days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const dailyAgg = await Generation.aggregate([
      { $match: { userId, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          generations: { $sum: 1 },
          tokens: { $sum: "$tokensUsed" }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Fill in missing days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const areaData = []
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const dayName = days[d.getDay()]
      
      const record = dailyAgg.find(r => r._id === dateStr)
      areaData.push({
        day: dayName,
        date: dateStr,
        generations: record ? record.generations : 0,
        tokens: record ? record.tokens : 0
      })
    }

    // 3. Pie Chart Data (Distribution by type)
    const typeAgg = await Generation.aggregate([
      { $match: { userId } },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ])
    const pieData = typeAgg.map(t => ({ name: t._id, value: t.count }))

    // 4. Bar Chart Data (Model Usage)
    const modelAgg = await Generation.aggregate([
      { $match: { userId } },
      { $group: { _id: "$model", runs: { $sum: 1 }, tokens: { $sum: "$tokensUsed" } } },
      { $sort: { runs: -1 } },
      { $limit: 5 } // Top 5 models
    ])
    const barData = modelAgg.map(m => ({ model: m._id || 'Unknown', runs: m.runs, tokens: m.tokens }))

    return NextResponse.json({
      stats: {
        totalGenerations,
        totalTokens,
        imagesCreated,
        docsUploaded
      },
      areaData,
      pieData,
      barData
    })
  } catch (error) {
    console.error('[Analytics API]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
