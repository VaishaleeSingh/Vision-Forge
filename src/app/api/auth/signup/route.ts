import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { name, email, password } = parsed.data
    const normalizedEmail = email.toLowerCase()

    await connectDB()

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Sign in instead.' },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      provider: 'credentials',
    })

    return NextResponse.json(
      {
        message: 'Account created successfully',
        userId: user._id.toString(),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('[Signup]', error)
    const message =
      error instanceof Error && /querySrv|ECONNREFUSED|MongoNetwork/i.test(error.message)
        ? 'Database connection failed. Check MONGODB_URI in .env (use a standard mongodb:// URI if mongodb+srv fails on Windows).'
        : 'Failed to create account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
