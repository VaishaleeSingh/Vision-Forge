import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Generation from '@/models/Generation'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // 'text' | 'image' | null
  const search = searchParams.get('search') // string | null
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 50)

  try {
    await connectDB()

    const query: Record<string, any> = { userId: session.user.id }
    if (type && ['text', 'image'].includes(type)) {
      query.type = type
    }
    
    if (search) {
      query.prompt = { $regex: search, $options: 'i' }
    }

    const [generations, total] = await Promise.all([
      Generation.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Generation.countDocuments(query),
    ])

    return NextResponse.json({
      generations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Library fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, isFavorite } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    await connectDB()
    const gen = await Generation.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { isFavorite },
      { new: true }
    )
    if (!gen) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, isFavorite: gen.isFavorite })
  } catch (error) {
    console.error('Favorite toggle error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    await connectDB()
    const gen = await Generation.findOneAndDelete({ _id: id, userId: session.user.id })
    if (!gen) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
