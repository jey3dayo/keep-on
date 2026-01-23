import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/user'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentUserId = await getCurrentUserId()
  if (!currentUserId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const habits = await prisma.habit.findMany({
    where: { userId: currentUserId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ habits })
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentUserId = await getCurrentUserId()
  if (!currentUserId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, emoji } = body

  // バリデーション
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (name.length > 100) {
    return NextResponse.json({ error: 'Name is too long (max 100 characters)' }, { status: 400 })
  }

  if (emoji && typeof emoji !== 'string') {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 })
  }

  const habit = await prisma.habit.create({
    data: {
      userId: currentUserId,
      name: name.trim(),
      emoji: emoji || null,
    },
  })

  return NextResponse.json({ habit }, { status: 201 })
}
