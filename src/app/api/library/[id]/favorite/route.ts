import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Generation from '@/models/Generation'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: Request, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    await connectDB()
    const gen = await Generation.findOne({
      _id: id,
      userId: session.user.id,
    })

    if (!gen) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    gen.isFavorite = !gen.isFavorite
    await gen.save()

    return NextResponse.json({ success: true, isFavorite: gen.isFavorite })
  } catch (error) {
    console.error('Favorite toggle error:', error)
    return NextResponse.json({ error: 'Failed to update favorite' }, { status: 500 })
  }
}
