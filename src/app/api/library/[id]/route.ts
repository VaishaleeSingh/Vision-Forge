import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Generation from '@/models/Generation'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    await connectDB()
    const generation = await Generation.findOne({
      _id: id,
      userId: session.user.id,
    }).lean()

    if (!generation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ generation })
  } catch (error) {
    console.error('Library item fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    await connectDB()
    const gen = await Generation.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    })

    if (!gen) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Library delete error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
